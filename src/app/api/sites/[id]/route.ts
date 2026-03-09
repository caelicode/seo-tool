import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/sites/:id - Get a single site with full details
export async function GET(req: NextRequest, context: RouteContext) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const { id } = await context.params;

  try {
    const site = await prisma.site.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            pages: true,
            crawls: true,
            keywords: true,
            speedTests: true,
            searchData: true,
          },
        },
        crawls: {
          orderBy: { startedAt: "desc" },
          take: 5,
        },
        speedTests: {
          orderBy: { createdAt: "desc" },
          take: 2,
        },
        pages: {
          orderBy: { updatedAt: "desc" },
          take: 10,
          select: {
            id: true,
            url: true,
            title: true,
            statusCode: true,
            indexStatus: true,
            lastCrawled: true,
          },
        },
      },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    return NextResponse.json(site);
  } catch (error) {
    console.error("Failed to fetch site:", error);
    return NextResponse.json(
      { error: "Failed to fetch site" },
      { status: 500 }
    );
  }
}

// PATCH /api/sites/:id - Update a site
export async function PATCH(req: NextRequest, context: RouteContext) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const { id } = await context.params;

  try {
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.domain !== undefined) {
      updateData.domain = body.domain
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "")
        .toLowerCase();
    }
    if (body.sitemapUrl !== undefined)
      updateData.sitemapUrl = body.sitemapUrl?.trim() || null;
    if (body.gscPropertyId !== undefined)
      updateData.gscPropertyId = body.gscPropertyId?.trim() || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const site = await prisma.site.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(site);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }
    console.error("Failed to update site:", error);
    return NextResponse.json(
      { error: "Failed to update site" },
      { status: 500 }
    );
  }
}

// DELETE /api/sites/:id - Delete a site and all related data (cascade)
export async function DELETE(req: NextRequest, context: RouteContext) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const { id } = await context.params;

  try {
    await prisma.site.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }
    console.error("Failed to delete site:", error);
    return NextResponse.json(
      { error: "Failed to delete site" },
      { status: 500 }
    );
  }
}
