import { NextResponse } from "next/server";
import { runIncrementalSync } from "@/lib/drive/incrementalSync";
import { requireAuth } from "@/lib/auth/middleware";

/**
 * POST: Run incremental sync (changes since last page token). Requires auth.
 * Body: { pageToken: string }
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  try {
    const body = await request.json().catch(() => ({}));
    const pageToken = typeof body.pageToken === "string" ? body.pageToken : "";
    if (!pageToken) {
      return NextResponse.json(
        { error: "pageToken is required" },
        { status: 400 }
      );
    }
    const result = await runIncrementalSync(userId, pageToken);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Sync failed", details: message },
      { status: 500 }
    );
  }
}
