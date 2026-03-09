import { NextRequest, NextResponse } from "next/server";

/**
 * Simple env-based auth for internal tool.
 * Checks for an x-admin-key header or seo-tool-session cookie.
 * If ADMIN_API_KEY is not set, all requests are allowed (dev mode).
 */
export function validateRequest(req: NextRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY;

  // If no admin key is configured, allow all requests (dev mode)
  if (!adminKey) {
    return true;
  }

  // Check header-based auth (for API calls)
  const headerKey = req.headers.get("x-admin-key");
  if (headerKey === adminKey) {
    return true;
  }

  // Check cookie-based auth (for browser sessions)
  const sessionCookie = req.cookies.get("seo-tool-session")?.value;
  if (sessionCookie === adminKey) {
    return true;
  }

  return false;
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
