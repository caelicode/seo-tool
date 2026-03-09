import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";
import {
  fetchSearchAnalytics,
  fetchSearchAnalyticsByDate,
  daysAgo,
} from "@/lib/gsc";

// POST /api/gsc/sync - Sync search analytics data from GSC for a site
export async function POST(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const accessToken = req.cookies.get("gsc_access_token")?.value;
  const refreshToken = req.cookies.get("gsc_refresh_token")?.value || null;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Not connected to Google Search Console" },
      { status: 401 }
    );
  }

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

    if (!site.gscPropertyId) {
      return NextResponse.json(
        { error: "No GSC property configured for this site" },
        { status: 400 }
      );
    }

    // Default: last 28 days
    const days = body.days || 28;
    const startDate = daysAgo(days);
    const endDate = daysAgo(1); // GSC data has a ~2 day delay

    // Fetch query+page level data
    const rows = await fetchSearchAnalytics(
      accessToken,
      refreshToken,
      site.gscPropertyId,
      {
        startDate,
        endDate,
        dimensions: ["query", "page", "date"],
        rowLimit: 5000,
      }
    );

    let synced = 0;

    for (const row of rows) {
      if (!row.keys || row.keys.length < 3) continue;

      const [query, page, dateStr] = row.keys;
      const date = new Date(dateStr);

      await prisma.searchAnalytics.upsert({
        where: {
          siteId_date_query_page: {
            siteId: site.id,
            date,
            query,
            page,
          },
        },
        update: {
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0,
        },
        create: {
          siteId: site.id,
          date,
          query,
          page,
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0,
        },
      });
      synced++;
    }

    return NextResponse.json({
      success: true,
      synced,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("GSC sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync GSC data" },
      { status: 500 }
    );
  }
}

// GET /api/gsc/sync?siteId=xxx - Get synced search analytics summary
export async function GET(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) {
    return NextResponse.json(
      { error: "siteId query param is required" },
      { status: 400 }
    );
  }

  const accessToken = req.cookies.get("gsc_access_token")?.value;
  const refreshToken = req.cookies.get("gsc_refresh_token")?.value || null;

  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  // Get stored data from DB
  const storedData = await prisma.searchAnalytics.groupBy({
    by: ["query"],
    where: { siteId },
    _sum: { clicks: true, impressions: true },
    _avg: { position: true, ctr: true },
    orderBy: { _sum: { clicks: "desc" } },
    take: 50,
  });

  // Get date trend data (from GSC API if connected, otherwise from DB)
  let dateTrend: { date: string; clicks: number; impressions: number; ctr: number; position: number }[] = [];

  if (accessToken && site.gscPropertyId) {
    try {
      const rows = await fetchSearchAnalyticsByDate(
        accessToken,
        refreshToken,
        site.gscPropertyId,
        daysAgo(28),
        daysAgo(1)
      );
      dateTrend = rows.map((row) => ({
        date: row.keys?.[0] || "",
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      }));
    } catch (error) {
      console.error("Failed to fetch date trend from GSC:", error);
    }
  }

  // If no live data, aggregate from stored data
  if (dateTrend.length === 0) {
    const dbTrend = await prisma.searchAnalytics.groupBy({
      by: ["date"],
      where: { siteId },
      _sum: { clicks: true, impressions: true },
      _avg: { position: true, ctr: true },
      orderBy: { date: "asc" },
    });
    dateTrend = dbTrend.map((row) => ({
      date: row.date.toISOString().split("T")[0],
      clicks: row._sum.clicks || 0,
      impressions: row._sum.impressions || 0,
      ctr: row._avg.ctr || 0,
      position: row._avg.position || 0,
    }));
  }

  // Total summary
  const totals = await prisma.searchAnalytics.aggregate({
    where: { siteId },
    _sum: { clicks: true, impressions: true },
    _avg: { position: true, ctr: true },
  });

  return NextResponse.json({
    connected: !!accessToken,
    totals: {
      clicks: totals._sum.clicks || 0,
      impressions: totals._sum.impressions || 0,
      avgPosition: totals._avg.position ? Math.round(totals._avg.position * 10) / 10 : 0,
      avgCtr: totals._avg.ctr ? Math.round(totals._avg.ctr * 1000) / 10 : 0,
    },
    topQueries: storedData.map((row) => ({
      query: row.query,
      clicks: row._sum.clicks || 0,
      impressions: row._sum.impressions || 0,
      avgPosition: row._avg.position ? Math.round(row._avg.position * 10) / 10 : 0,
      avgCtr: row._avg.ctr ? Math.round(row._avg.ctr * 1000) / 10 : 0,
    })),
    dateTrend,
  });
}
