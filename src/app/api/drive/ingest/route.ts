import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/drive/incrementalSync";
import { requireAuth } from "@/lib/auth/middleware";

/**
 * POST: Run one-time (or full) ingestion for the authenticated user's Drive.
 * Body: { maxFiles?: number }
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  try {
    const body = await request.json().catch(() => ({}));
    const maxFiles =
      typeof body.maxFiles === "number" && body.maxFiles > 0
        ? Math.min(body.maxFiles, 200)
        : undefined;

    const result = await runIngestion(userId, undefined, maxFiles);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Ingestion failed", details: message },
      { status: 500 }
    );
  }
}
