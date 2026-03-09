import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { google } from "googleapis";

/**
 * Cron endpoint: Sync keyword rankings for ALL sites with GSC connected.
 *
 * Designed to be called by:
 * - Vercel Cron Jobs (vercel.json config)
 * - External scheduler (e.g., cron-job.org)
 * - Manual trigger from the dashboard
 *
 * Secured via CRON_SECRET env var or ADMIN_API_KEY.
 */

function validateCronRequest(req: NextRequest): boolean {
  // Vercel Cron sends this header automatically
  const cronSecret = req.headers.get("authorization");
  if (cronSecret === `Bearer ${process.env.CRON_SECRET}`) return true;

  // Fallback to admin API key
  const apiKey = process.env.ADMIN_API_KEY;
  if (!apiKey) return true; // No auth configured

  const headerKey = req.headers.get("x-api-key");
  const cookieKey = req.cookies.get("api_key")?.value;
  return headerKey === apiKey || cookieKey === apiKey;
}

export async function GET(req: NextRequest) {
  if (!validateCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { siteId: string; domain: string; synced: number; error?: string }[] = [];

  try {
    // Find all sites with GSC connected and OAuth tokens
    const sites = await prisma.site.findMany({
      where: {
        gscPropertyId: { not: null },
      },
      select: {
        id: true,
        domain: true,
        gscPropertyId: true,
      },
    });

    if (sites.length === 0) {
      return NextResponse.json({
        message: "No sites with GSC configured",
        results: [],
      });
    }

    // Get OAuth tokens (stored in a simple JSON approach, or env-based)
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        { error: "Google OAuth not configured" },
        { status: 500 }
      );
    }

    // Read tokens from the global store
    const { getTokens } = await import("@/lib/gsc-tokens");
    const tokens = getTokens();

    if (!tokens) {
      return NextResponse.json(
        { error: "No GSC OAuth tokens found. Please authenticate via the Search Console page first." },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials(tokens);

    const searchConsole = google.searchconsole({ version: "v1", auth: oauth2Client });

    // Sync each site
    for (const site of sites) {
      try {
        let synced = 0;

        // Get all tracked keywords for this site
        const keywords = await prisma.keyword.findMany({
          where: { siteId: site.id },
        });

        if (keywords.length === 0) {
          results.push({ siteId: site.id, domain: site.domain, synced: 0 });
          continue;
        }

        // Query GSC for each keyword
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        const formatDate = (d: Date) => d.toISOString().split("T")[0];

        for (const kw of keywords) {
          try {
            const response = await searchConsole.searchanalytics.query({
              siteUrl: site.gscPropertyId!,
              requestBody: {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                dimensions: ["query"],
                dimensionFilterGroups: [
                  {
                    filters: [
                      {
                        dimension: "query",
                        operator: "equals",
                        expression: kw.keyword,
                      },
                    ],
                  },
                ],
              },
            });

            const row = response.data.rows?.[0];
            if (row) {
              await prisma.keywordRanking.upsert({
                where: {
                  keywordId_date: {
                    keywordId: kw.id,
                    date: new Date(formatDate(endDate)),
                  },
                },
                update: {
                  position: row.position || 0,
                  clicks: row.clicks || 0,
                  impressions: row.impressions || 0,
                  ctr: row.ctr || 0,
                },
                create: {
                  keywordId: kw.id,
                  date: new Date(formatDate(endDate)),
                  position: row.position || 0,
                  clicks: row.clicks || 0,
                  impressions: row.impressions || 0,
                  ctr: row.ctr || 0,
                },
              });
              synced++;
            }
          } catch {
            // Skip individual keyword failures
          }
        }

        // Also auto-discover top keywords
        try {
          const topResponse = await searchConsole.searchanalytics.query({
            siteUrl: site.gscPropertyId!,
            requestBody: {
              startDate: formatDate(startDate),
              endDate: formatDate(endDate),
              dimensions: ["query"],
              rowLimit: 20,
            },
          });

          const existingKeywords = new Set(keywords.map((k) => k.keyword.toLowerCase()));

          for (const row of topResponse.data.rows || []) {
            const query = row.keys?.[0];
            if (!query || existingKeywords.has(query.toLowerCase())) continue;

            try {
              const newKw = await prisma.keyword.create({
                data: { siteId: site.id, keyword: query },
              });
              await prisma.keywordRanking.create({
                data: {
                  keywordId: newKw.id,
                  date: new Date(formatDate(endDate)),
                  position: row.position || 0,
                  clicks: row.clicks || 0,
                  impressions: row.impressions || 0,
                  ctr: row.ctr || 0,
                },
              });
              synced++;
            } catch {
              // Duplicate, skip
            }
          }
        } catch {
          // Auto-discover failed, not critical
        }

        results.push({ siteId: site.id, domain: site.domain, synced });
      } catch (err) {
        results.push({
          siteId: site.id,
          domain: site.domain,
          synced: 0,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      message: `Synced ${results.length} sites`,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron sync-keywords error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
