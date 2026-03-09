import { NextRequest, NextResponse } from "next/server";

// POST /api/auth - Login with admin password, sets session cookie
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const adminKey = process.env.ADMIN_API_KEY;

    // If no admin key configured, auto-login (dev mode)
    if (!adminKey) {
      return NextResponse.json({ success: true, message: "Auth disabled (dev mode)" });
    }

    if (!body.password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (body.password !== adminKey) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("seo-tool-session", adminKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// DELETE /api/auth - Logout, clears session cookie
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("seo-tool-session");
  return response;
}
