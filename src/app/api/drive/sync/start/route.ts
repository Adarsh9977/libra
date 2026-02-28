import { NextResponse } from "next/server";
import { getStartPageToken } from "@/lib/drive/incrementalSync";
import { requireAuth } from "@/lib/auth/middleware";

/**
 * GET: Fetch a start page token for Drive incremental sync. Requires auth.
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  try {
    const pageToken = await getStartPageToken(userId);
    if (!pageToken) {
      return NextResponse.json(
        { error: "Unable to get start page token" },
        { status: 500 }
      );
    }
    return NextResponse.json({ pageToken });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to get start page token", details: message },
      { status: 500 }
    );
  }
}

