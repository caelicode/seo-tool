import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";
import { crawlPage, discoverPages, checkLink } from "@/lib/crawler";

// POST /api/crawl - Trigger a new crawl for a site
export async function POST(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

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
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // Create crawl record
    const crawl = await prisma.crawl.create({
      data: {
        siteId: site.id,
        status: "running",
      },
    });

    // Run crawl in background (non-blocking)
    runCrawl(crawl.id, site.id, site.domain, site.sitemapUrl).catch(
      (error) => {
        console.error(`Crawl ${crawl.id} failed:`, error);
      }
    );

    return NextResponse.json(crawl, { status: 201 });
  } catch (error) {
    console.error("Failed to start crawl:", error);
    return NextResponse.json(
      { error: "Failed to start crawl" },
      { status: 500 }
    );
  }
}

async function runCrawl(
  crawlId: string,
  siteId: string,
  domain: string,
  sitemapUrl: string | null
) {
  let pagesFound = 0;
  let issuesFound = 0;

  try {
    // Discover pages
    const pageUrls = await discoverPages(domain, sitemapUrl);

    // Crawl each page
    for (const url of pageUrls) {
      const result = await crawlPage(url);
      pagesFound++;

      // Upsert page record
      const page = await prisma.page.upsert({
        where: {
          siteId_url: { siteId, url },
        },
        update: {
          title: result.title,
          description: result.description,
          h1: result.h1,
          statusCode: result.statusCode,
          lastCrawled: new Date(),
        },
        create: {
          siteId,
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
            crawlId,
            type: issue.type,
            severity: issue.severity,
            detail: issue.detail,
          },
        });
        issuesFound++;
      }

      // Check internal links for broken links (sample up to 10 per page)
      const linksToCheck = result.links.slice(0, 10);
      for (const link of linksToCheck) {
        const linkResult = await checkLink(link);
        if (!linkResult.ok) {
          // Find or create the page record for the broken link
          const linkedPage = await prisma.page.upsert({
            where: {
              siteId_url: { siteId, url: link },
            },
            update: {
              statusCode: linkResult.statusCode || null,
              lastCrawled: new Date(),
            },
            create: {
              siteId,
              url: link,
              statusCode: linkResult.statusCode || null,
              lastCrawled: new Date(),
            },
          });

          await prisma.pageIssue.create({
            data: {
              pageId: linkedPage.id,
              crawlId,
              type: "broken_link",
              severity: "critical",
              detail: `Broken link (HTTP ${linkResult.statusCode || "timeout"}) found from ${url}`,
            },
          });
          issuesFound++;
        }
      }

      // Update crawl progress
      await prisma.crawl.update({
        where: { id: crawlId },
        data: { pagesFound, issuesFound },
      });
    }

    // Mark crawl as completed
    await prisma.crawl.update({
      where: { id: crawlId },
      data: {
        status: "completed",
        pagesFound,
        issuesFound,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`Crawl ${crawlId} error:`, error);
    await prisma.crawl.update({
      where: { id: crawlId },
      data: {
        status: "failed",
        pagesFound,
        issuesFound,
        completedAt: new Date(),
      },
    });
  }
}
