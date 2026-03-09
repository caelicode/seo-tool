import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";
import { fetchSearchAnalytics, daysAgo } from "@/lib/gsc";

// POST /api/keywords/sync - Sync keyword rankings from GSC data
export async function POST(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const accessToken = req.cookies.get("gsc_access_token")?.value;
  const refreshToken = req.cookies.get("gsc_refresh_token")?.value || null;

  try {
    const body = await req.json();
    if (!body.siteId) {
      return NextResponse.json(
        { error: "siteId is required" },
        { status: 400 }
      );
    }

    const site = await prisma.site.findUnique({
      where: { id: body.siteId },
      include: { keywords: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    let synced = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If GSC is connected, pull live data
    if (accessToken && site.gscPropertyId) {
      const rows = await fetchSearchAnalytics(
        accessToken,
        refreshToken,
        site.gscPropertyId,
        {
          startDate: daysAgo(7),
          endDate: daysAgo(1),
          dimensions: ["query"],
          rowLimit: 2000,
        }
      );

      // Build a map of query -> metrics
      const queryMap = new Map<
        string,
        { position: number; clicks: number; impressions: number; ctr: number }
      >();
      for (const row of rows) {
        const query = row.keys?.[0];
        if (query) {
          queryMap.set(query.toLowerCase(), {
            position: row.position || 0,
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
          });
        }
      }

      // Update rankings for tracked keywords
      for (const kw of site.keywords) {
        const data = queryMap.get(kw.keyword.toLowerCase());
        if (data) {
          await prisma.keywordRanking.upsert({
            where: {
              keywordId_date: { keywordId: kw.id, date: today },
            },
            update: {
              position: data.position,
              clicks: data.clicks,
              impressions: data.impressions,
              ctr: data.ctr,
            },
            create: {
              keywordId: kw.id,
              date: today,
              position: data.position,
              clicks: data.clicks,
              impressions: data.impressions,
              ctr: data.ctr,
            },
          });
          synced++;
        }
      }

      // Auto-discover: add top queries not yet tracked (top 20 by clicks)
      if (body.autoDiscover) {
        const trackedKeywords = new Set(
          site.keywords.map((k) => k.keyword.toLowerCase())
        );
        const topQueries = Array.from(queryMap.entries())
          .sort((a, b) => b[1].clicks - a[1].clicks)
          .slice(0, 20);

        for (const [query, data] of topQueries) {
          if (!trackedKeywords.has(query)) {
            try {
              const newKw = await prisma.keyword.create({
                data: {
                  siteId: site.id,
                  keyword: query,
                },
              });
              await prisma.keywordRanking.create({
                data: {
                  keywordId: newKw.id,
                  date: today,
                  position: data.position,
                  clicks: data.clicks,
                  impressions: data.impressions,
                  ctr: data.ctr,
                },
              });
              synced++;
            } catch {
              // Duplicate, skip
            }
          }
        }
      }
    } else {
      // Fall back to stored SearchAnalytics data
      for (const kw of site.keywords) {
        const analytics = await prisma.searchAnalytics.aggregate({
          where: {
            siteId: site.id,
            query: kw.keyword,
          },
          _avg: { position: true, ctr: true },
          _sum: { clicks: true, impressions: true },
        });

        if (analytics._avg.position !== null) {
          await prisma.keywordRanking.upsert({
            where: {
              keywordId_date: { keywordId: kw.id, date: today },
            },
            update: {
              position: analytics._avg.position || 0,
              clicks: analytics._sum.clicks || 0,
              impressions: analytics._sum.impressions || 0,
              ctr: analytics._avg.ctr || 0,
            },
            create: {
              keywordId: kw.id,
              date: today,
              position: analytics._avg.position || 0,
              clicks: analytics._sum.clicks || 0,
              impressions: analytics._sum.impressions || 0,
              ctr: analytics._avg.ctr || 0,
            },
          });
          synced++;
        }
      }
    }

    return NextResponse.json({ success: true, synced });
  } catch (error) {
    console.error("Keyword sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync keywords" },
      { status: 500 }
    );
  }
}
