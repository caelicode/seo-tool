import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";

// GET /api/keywords?siteId=xxx - List keywords with latest ranking
export async function GET(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) {
    return NextResponse.json({ error: "siteId is required" }, { status: 400 });
  }

  try {
    const keywords = await prisma.keyword.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      include: {
        rankings: {
          orderBy: { date: "desc" },
          take: 14, // Last 14 data points for sparkline
        },
      },
    });

    // Format with current + previous position for change indicator
    const formatted = keywords.map((kw) => {
      const current = kw.rankings[0] ?? null;
      const previous = kw.rankings[1] ?? null;
      const positionChange =
        current && previous ? previous.position - current.position : 0;

      return {
        id: kw.id,
        keyword: kw.keyword,
        pageUrl: kw.pageUrl,
        currentPosition: current?.position ?? null,
        currentClicks: current?.clicks ?? 0,
        currentImpressions: current?.impressions ?? 0,
        currentCtr: current?.ctr ?? 0,
        positionChange: Math.round(positionChange * 10) / 10,
        lastUpdated: current?.date ?? null,
        history: kw.rankings.map((r) => ({
          date: r.date,
          position: r.position,
          clicks: r.clicks,
          impressions: r.impressions,
        })),
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch keywords:", error);
    return NextResponse.json(
      { error: "Failed to fetch keywords" },
      { status: 500 }
    );
  }
}

// POST /api/keywords - Add a keyword to track
export async function POST(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  try {
    const body = await req.json();

    if (!body.siteId || !body.keyword) {
      return NextResponse.json(
        { error: "siteId and keyword are required" },
        { status: 400 }
      );
    }

    const keyword = await prisma.keyword.create({
      data: {
        siteId: body.siteId,
        keyword: body.keyword.trim().toLowerCase(),
        pageUrl: body.pageUrl?.trim() || null,
      },
    });

    return NextResponse.json(keyword, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This keyword is already being tracked" },
        { status: 409 }
      );
    }
    console.error("Failed to add keyword:", error);
    return NextResponse.json(
      { error: "Failed to add keyword" },
      { status: 500 }
    );
  }
}

// DELETE /api/keywords?id=xxx - Remove a tracked keyword
export async function DELETE(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    await prisma.keyword.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete keyword" },
      { status: 500 }
    );
  }
}
