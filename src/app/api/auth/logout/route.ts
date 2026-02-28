import { NextResponse } from "next/server";

function createLogoutResponse(request: Request): NextResponse {
  const base =
    process.env.NEXTAUTH_URL ??
    request.url.split("/api")[0] ??
    "http://localhost:3000";
  const response = NextResponse.redirect(new URL("/", base));
  response.cookies.set("libra_user_id", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

/**
 * POST /api/auth/logout — clear the libra_user_id cookie and redirect home.
 */
export async function POST(request: Request) {
  return createLogoutResponse(request);
}

/**
 * GET /api/auth/logout — same as POST. Use when POST is blocked (e.g. some proxies return 405).
 */
export async function GET(request: Request) {
  return createLogoutResponse(request);
}
