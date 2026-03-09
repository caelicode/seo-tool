import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/gsc";
import { cookies } from "next/headers";

// GET /api/gsc/callback - Google OAuth callback
// Exchanges the auth code for tokens and stores them in a secure cookie.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?gsc_error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/?gsc_error=no_code", req.url)
    );
  }

  try {
    const tokens = await exchangeCode(code);

    // Store tokens in httpOnly cookies (secure for internal tool)
    const cookieStore = await cookies();

    if (tokens.access_token) {
      cookieStore.set("gsc_access_token", tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: tokens.expiry_date
          ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
          : 3600,
        path: "/",
      });
    }

    if (tokens.refresh_token) {
      cookieStore.set("gsc_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: "/",
      });
    }

    return NextResponse.redirect(new URL("/?gsc_connected=true", req.url));
  } catch (err) {
    console.error("GSC OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/?gsc_error=token_exchange_failed", req.url)
    );
  }
}
