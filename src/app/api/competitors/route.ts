import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";

// GET /api/competitors?siteId=xxx - List competitors for a site
export async function GET(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) {
    return NextResponse.json({ error: "siteId is required" }, { status: 400 });
  }

  const competitors = await prisma.competitor.findMany({
    where: { siteId },
    include: {
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(competitors);
}

// POST /api/competitors - Add a competitor
export async function POST(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const body = await req.json();
  if (!body.siteId || !body.domain) {
    return NextResponse.json(
      { error: "siteId and domain are required" },
      { status: 400 }
    );
  }

  // Clean domain
  let domain = body.domain.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  try {
    const competitor = await prisma.competitor.create({
      data: {
        siteId: body.siteId,
        domain,
        name: body.name || domain,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(competitor, { status: 201 });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "This competitor is already being tracked" },
        { status: 409 }
      );
    }
    throw err;
  }
}

// DELETE /api/competitors?id=xxx - Remove a competitor
export async function DELETE(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.competitor.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
