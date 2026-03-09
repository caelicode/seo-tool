import { NextRequest, NextResponse } from "next/server";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";
import { getIssueGuide } from "@/lib/issue-guides";

// GET /api/issues/guide?type=missing_title
export async function GET(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const issueType = req.nextUrl.searchParams.get("type");
  if (!issueType) {
    return NextResponse.json(
      { error: "type parameter is required" },
      { status: 400 }
    );
  }

  const guide = getIssueGuide(issueType);
  return NextResponse.json(guide);
}
