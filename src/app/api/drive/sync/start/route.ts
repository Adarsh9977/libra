import { NextResponse } from "next/server";
import { getStartPageToken } from "@/lib/drive/incrementalSync";

/**
 * GET: Fetch a start page token for Drive incremental sync.
 * Query: userId (default "default")
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? "default";
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

