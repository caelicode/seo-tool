import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";

// GET /api/sites - List all sites with summary stats
export async function GET(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  try {
    const sites = await prisma.site.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            pages: true,
            crawls: true,
            keywords: true,
            speedTests: true,
          },
        },
        crawls: {
          orderBy: { startedAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            pagesFound: true,
            issuesFound: true,
            startedAt: true,
            completedAt: true,
          },
        },
        speedTests: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            performanceScore: true,
            strategy: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json(sites);
  } catch (error) {
    console.error("Failed to fetch sites:", error);
    return NextResponse.json(
      { error: "Failed to fetch sites" },
      { status: 500 }
    );
  }
}

// POST /api/sites - Create a new site
export async function POST(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  try {
    const body = await req.json();

    if (!body.domain || !body.name) {
      return NextResponse.json(
        { error: "domain and name are required" },
        { status: 400 }
      );
    }

    // Normalize domain (strip protocol and trailing slash)
    const domain = body.domain
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "")
      .toLowerCase();

    const site = await prisma.site.create({
      data: {
        domain,
        name: body.name.trim(),
        sitemapUrl: body.sitemapUrl?.trim() || null,
        gscPropertyId: body.gscPropertyId?.trim() || null,
      },
    });

    return NextResponse.json(site, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A site with this domain already exists" },
        { status: 409 }
      );
    }
    console.error("Failed to create site:", error);
    return NextResponse.json(
      { error: "Failed to create site" },
      { status: 500 }
    );
  }
}
