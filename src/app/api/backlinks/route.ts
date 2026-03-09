import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";

/**
 * GET /api/backlinks?siteId=xxx - List backlinks for a site.
 * POST /api/backlinks - Add a backlink manually or check a URL.
 * DELETE /api/backlinks?id=xxx - Remove a backlink.
 */
export async function GET(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) {
    return NextResponse.json({ error: "siteId is required" }, { status: 400 });
  }

  try {
    const backlinks = await prisma.backlink.findMany({
      where: { siteId },
      orderBy: { firstSeen: "desc" },
    });

    // Calculate summary stats
    const total = backlinks.length;
    const live = backlinks.filter((b) => b.isLive).length;
    const lost = total - live;
    const doFollow = backlinks.filter((b) => b.isDoFollow).length;
    const noFollow = total - doFollow;
    const uniqueDomains = new Set(
      backlinks.map((b) => {
        try {
          return new URL(b.sourceUrl).hostname;
        } catch {
          return b.sourceUrl;
        }
      })
    ).size;

    return NextResponse.json({
      backlinks,
      stats: { total, live, lost, doFollow, noFollow, uniqueDomains },
    });
  } catch (error) {
    console.error("Backlinks fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch backlinks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { siteId, sourceUrl, targetUrl, anchorText } = body;

    if (!siteId || !sourceUrl) {
      return NextResponse.json(
        { error: "siteId and sourceUrl are required" },
        { status: 400 }
      );
    }

    // Determine target URL from the site if not provided
    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const resolvedTargetUrl = targetUrl || `https://${site.domain}`;

    // Check if the backlink is live
    let isLive = false;
    let isDoFollow = true;
    let statusCode: number | null = null;
    let detectedAnchor = anchorText || null;

    try {
      const response = await fetch(sourceUrl, {
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

        // Check if any link points to our domain
        const siteDomain = site.domain.toLowerCase();
        $("a[href]").each((_, el) => {
          const href = $(el).attr("href") || "";
          try {
            const linkUrl = new URL(href, sourceUrl);
            if (linkUrl.hostname.toLowerCase().includes(siteDomain)) {
              isLive = true;
              detectedAnchor = detectedAnchor || $(el).text().trim() || null;
              // Check rel attribute for nofollow
              const rel = $(el).attr("rel") || "";
              if (rel.includes("nofollow") || rel.includes("ugc") || rel.includes("sponsored")) {
                isDoFollow = false;
              }
            }
          } catch {
            // Invalid URL, skip
          }
        });
      }
    } catch {
      // Fetch failed, mark as not live
      isLive = false;
    }

    const backlink = await prisma.backlink.upsert({
      where: {
        siteId_sourceUrl_targetUrl: {
          siteId,
          sourceUrl,
          targetUrl: resolvedTargetUrl,
        },
      },
      update: {
        anchorText: detectedAnchor,
        isDoFollow,
        isLive,
        statusCode,
        lastChecked: new Date(),
      },
      create: {
        siteId,
        sourceUrl,
        targetUrl: resolvedTargetUrl,
        anchorText: detectedAnchor,
        isDoFollow,
        isLive,
        statusCode,
      },
    });

    return NextResponse.json({ backlink, verified: isLive });
  } catch (error) {
    console.error("Backlink add error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add backlink" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    await prisma.backlink.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete backlink" },
      { status: 500 }
    );
  }
}
