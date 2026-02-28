import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

/**
 * GET: List ingested Drive documents (most recent first).
 * Query: limit?: number (default 50, max 200)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    let limit = 50;
    if (limitParam) {
      const n = Number(limitParam);
      if (!Number.isNaN(n) && n > 0) {
        limit = Math.min(Math.floor(n), 200);
      }
    }
    const prisma = getPrisma();
    const docs = await prisma.driveDocument.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        mimeType: true,
        updatedAt: true,
      },
      take: limit,
    });
    return NextResponse.json(docs);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to list Drive documents", details: message },
      { status: 500 }
    );
  }
}

