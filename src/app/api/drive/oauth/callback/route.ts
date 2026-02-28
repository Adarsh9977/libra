import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/drive/oauth";

/**
 * GET: OAuth callback. Exchange code for tokens and redirect back to app.
 * Query: code, state (optional; state can encode userId or redirect path).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") ?? "default";

  if (!code) {
    return NextResponse.redirect(
      new URL("/?error=missing_code", request.url)
    );
  }

  try {
    const userId = state;
    await exchangeCodeForTokens(code, userId);
    const base = process.env.NEXTAUTH_URL ?? request.url.split("/api")[0] ?? "http://localhost:3000";
    return NextResponse.redirect(new URL("/?drive=connected", base));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const base = process.env.NEXTAUTH_URL ?? request.url.split("/api")[0] ?? "http://localhost:3000";
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(message)}`, base)
    );
  }
}
