import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/drive/oauth";

/**
 * GET: Return the Google OAuth URL for the client to redirect the user.
 * Query: userId (optional, default "default")
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? "default";
    const state = searchParams.get("state") ?? undefined;
    const url = getAuthUrl(state);
    return NextResponse.json({
      url,
      userId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "OAuth config error", details: message },
      { status: 500 }
    );
  }
}
