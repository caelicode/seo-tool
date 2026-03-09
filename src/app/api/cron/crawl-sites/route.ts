import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { crawlPage, discoverPages, checkLink } from "@/lib/crawler";

/**
 * Cron endpoint: Auto-crawl ALL sites to detect SEO issues.
 *
 * Runs weekly (or on-demand) to keep issue data fresh.
 * Secured via CRON_SECRET env var or ADMIN_API_KEY.
 */

function validateCronRequest(req: NextRequest): boolean {
  const cronSecret = req.headers.get("authorization");
  if (cronSecret === `Bearer ${process.env.CRON_SECRET}`) return true;

  const apiKey = process.env.ADMIN_API_KEY;
  if (!apiKey) return true;

  const headerKey = req.headers.get("x-api-key");
  const cookieKey = req.cookies.get("api_key")?.value;
  return headerKey === apiKey || cookieKey === apiKey;
}

export const maxDuration = 300; // 5 minutes max (Vercel Pro)

export async function GET(req: NextRequest) {
  if (!validateCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { siteId: string; domain: string; pagesFound: number; issuesFound: number; error?: string }[] = [];

  try {
    const sites = await prisma.site.findMany({
      select: {
        id: true,
        domain: true,
        sitemapUrl: true,
      },
    });

    for (const site of sites) {
      try {
        let pagesFound = 0;
        let issuesFound = 0;

        // Create crawl record
        const crawl = await prisma.crawl.create({
          data: {
            siteId: site.id,
            status: "running",
          },
        });

        // Discover and crawl pages
        const pageUrls = await discoverPages(site.domain, site.sitemapUrl);

        for (const url of pageUrls) {
          const result = await crawlPage(url);
          pagesFound++;

          // Upsert page record
          const page = await prisma.page.upsert({
            where: {
              siteId_url: { siteId: site.id, url },
            },
            update: {
              title: result.title,
              description: result.description,
              h1: result.h1,
              statusCode: result.statusCode,
              lastCrawled: new Date(),
            },
            create: {
              siteId: site.id,
              url,
              title: result.title,
              description: result.description,
              h1: result.h1,
              statusCode: result.statusCode,
              lastCrawled: new Date(),
            },
          });

          // Save issues
          for (const issue of result.issues) {
            await prisma.pageIssue.create({
              data: {
                pageId: page.id,
                crawlId: crawl.id,
                type: issue.type,
                severity: issue.severity,
                detail: issue.detail,
              },
            });
            issuesFound++;
          }

          // Check a sample of internal links
          const linksToCheck = result.links.slice(0, 5);
          for (const link of linksToCheck) {
            const linkResult = await checkLink(link);
            if (!linkResult.ok) {
              const linkedPage = await prisma.page.upsert({
                where: {
                  siteId_url: { siteId: site.id, url: link },
                },
                update: {
                  statusCode: linkResult.statusCode || null,
                  lastCrawled: new Date(),
                },
                create: {
                  siteId: site.id,
                  url: link,
                  statusCode: linkResult.statusCode || null,
                  lastCrawled: new Date(),
                },
              });

              await prisma.pageIssue.create({
                data: {
                  pageId: linkedPage.id,
                  crawlId: crawl.id,
                  type: "broken_link",
                  severity: "critical",
                  detail: `Broken link (HTTP ${linkResult.statusCode || "timeout"}) found from ${url}`,
                },
              });
              issuesFound++;
            }
          }
        }

        // Mark crawl as completed
        await prisma.crawl.update({
          where: { id: crawl.id },
          data: {
            status: "completed",
            pagesFound,
            issuesFound,
            completedAt: new Date(),
          },
        });

        results.push({ siteId: site.id, domain: site.domain, pagesFound, issuesFound });
      } catch (err) {
        results.push({
          siteId: site.id,
          domain: site.domain,
          pagesFound: 0,
          issuesFound: 0,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      message: `Crawled ${results.length} sites`,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron crawl-sites error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Crawl failed" },
      { status: 500 }
    );
  }
}
