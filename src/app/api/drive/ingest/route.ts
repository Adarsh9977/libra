import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/drive/incrementalSync";

/**
 * POST: Run one-time (or full) ingestion for the user's Drive.
 * Body: { userId?: string, maxFiles?: number }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId : "default";
    const maxFiles =
      typeof body.maxFiles === "number" && body.maxFiles > 0
        ? Math.min(body.maxFiles, 200)
        : undefined;

        console.log("userId", userId)
        console.log("maxFiles", maxFiles)

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
