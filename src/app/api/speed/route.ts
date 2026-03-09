import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";
import { runPageSpeedTest } from "@/lib/pagespeed";

// POST /api/speed - Run PageSpeed test for a site
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

    const url = body.url || `https://${site.domain}`;
    const strategy = body.strategy || "mobile";

    const result = await runPageSpeedTest(url, strategy);

    const speedTest = await prisma.speedTest.create({
      data: {
        siteId: site.id,
        url: result.url,
        strategy: result.strategy,
        performanceScore: result.performanceScore,
        lcp: result.lcp,
        fid: result.fid,
        cls: result.cls,
        inp: result.inp,
        ttfb: result.ttfb,
      },
    });

    return NextResponse.json(speedTest, { status: 201 });
  } catch (error) {
    console.error("PageSpeed test error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to run PageSpeed test",
      },
      { status: 500 }
    );
  }
}

// GET /api/speed?siteId=xxx - Get PageSpeed test history
export async function GET(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) {
    return NextResponse.json({ error: "siteId is required" }, { status: 400 });
  }

  try {
    const tests = await prisma.speedTest.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Separate by strategy
    const mobile = tests.filter((t) => t.strategy === "mobile");
    const desktop = tests.filter((t) => t.strategy === "desktop");

    // Latest scores
    const latestMobile = mobile[0] ?? null;
    const latestDesktop = desktop[0] ?? null;

    return NextResponse.json({
      latestMobile,
      latestDesktop,
      history: tests,
      mobile,
      desktop,
    });
  } catch (error) {
    console.error("Failed to fetch speed tests:", error);
    return NextResponse.json(
      { error: "Failed to fetch speed tests" },
      { status: 500 }
    );
  }
}
