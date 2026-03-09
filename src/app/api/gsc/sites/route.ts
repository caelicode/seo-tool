import { NextRequest, NextResponse } from "next/server";
import { listGscSites } from "@/lib/gsc";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";

// GET /api/gsc/sites - List all GSC properties the user has access to
export async function GET(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const accessToken = req.cookies.get("gsc_access_token")?.value;
  const refreshToken = req.cookies.get("gsc_refresh_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Not connected to Google Search Console", connected: false },
      { status: 401 }
    );
  }

  try {
    const sites = await listGscSites(accessToken, refreshToken);
    return NextResponse.json({ connected: true, sites });
  } catch (error) {
    console.error("Failed to list GSC sites:", error);
    return NextResponse.json(
      { error: "Failed to fetch GSC sites. Try reconnecting.", connected: false },
      { status: 500 }
    );
  }
}
