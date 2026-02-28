import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/drive/oauth";

/**
 * GET: Return the Google OAuth URL. Used for sign-in (and connecting Drive). No auth required so users can sign in.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state") ?? undefined;
    const url = getAuthUrl(state);
    return NextResponse.json({ url });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "OAuth config error", details: message },
      { status: 500 }
    );
  }
}
