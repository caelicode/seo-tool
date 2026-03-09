import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/gsc";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";

// GET /api/gsc/auth - Get the Google OAuth consent URL
export async function GET(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  try {
    const url = getAuthUrl();
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Failed to generate auth URL:", error);
    return NextResponse.json(
      { error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." },
      { status: 500 }
    );
  }
}
