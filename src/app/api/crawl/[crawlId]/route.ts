import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ crawlId: string }>;
};

// GET /api/crawl/:crawlId - Get crawl status and results
export async function GET(req: NextRequest, context: RouteContext) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const { crawlId } = await context.params;

  try {
    const crawl = await prisma.crawl.findUnique({
      where: { id: crawlId },
      include: {
        site: {
          select: { id: true, domain: true, name: true },
        },
        issues: {
          include: {
            page: {
              select: { id: true, url: true, title: true },
            },
          },
          orderBy: [
            { severity: "asc" }, // critical first
            { createdAt: "desc" },
          ],
        },
      },
    });

    if (!crawl) {
      return NextResponse.json({ error: "Crawl not found" }, { status: 404 });
    }

    return NextResponse.json(crawl);
  } catch (error) {
    console.error("Failed to fetch crawl:", error);
    return NextResponse.json(
      { error: "Failed to fetch crawl" },
      { status: 500 }
    );
  }
}
