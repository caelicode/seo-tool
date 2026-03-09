import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";

/**
 * POST /api/backlinks/check - Re-check all backlinks for a site.
 * Verifies each backlink is still live and updates status.
 */
export async function POST(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { siteId } = body;

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const backlinks = await prisma.backlink.findMany({
      where: { siteId },
    });

    const siteDomain = site.domain.toLowerCase();
    let checked = 0;
    let liveCount = 0;
    let lostCount = 0;

    for (const backlink of backlinks) {
      let isLive = false;
      let isDoFollow = true;
      let statusCode: number | null = null;
      let detectedAnchor = backlink.anchorText;

      try {
        const response = await fetch(backlink.sourceUrl, {
          headers: {
            "User-Agent": "SEOTool/1.0 (Backlink Checker)",
            Accept: "text/html",
          },
          signal: AbortSignal.timeout(15000),
          redirect: "follow",
        });

        statusCode = response.status;

        if (response.ok) {
          const html = await response.text();
          const cheerio = await import("cheerio");
          const $ = cheerio.load(html);

          $("a[href]").each((_, el) => {
            const href = $(el).attr("href") || "";
            try {
              const linkUrl = new URL(href, backlink.sourceUrl);
              if (linkUrl.hostname.toLowerCase().includes(siteDomain)) {
                isLive = true;
                detectedAnchor = $(el).text().trim() || detectedAnchor;
                const rel = $(el).attr("rel") || "";
                if (rel.includes("nofollow") || rel.includes("ugc") || rel.includes("sponsored")) {
                  isDoFollow = false;
                }
              }
            } catch {
              // Invalid URL
            }
          });
        }
      } catch {
        isLive = false;
      }

      await prisma.backlink.update({
        where: { id: backlink.id },
        data: {
          isLive,
          isDoFollow,
          statusCode,
          anchorText: detectedAnchor,
          lastChecked: new Date(),
        },
      });

      checked++;
      if (isLive) liveCount++;
      else lostCount++;
    }

    return NextResponse.json({
      checked,
      live: liveCount,
      lost: lostCount,
    });
  } catch (error) {
    console.error("Backlink check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check backlinks" },
      { status: 500 }
    );
  }
}
