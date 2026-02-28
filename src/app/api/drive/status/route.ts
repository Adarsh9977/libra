import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

/**
 * GET: Check if Drive is connected for the user (tokens exist).
 * Query: userId (default "default")
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? "default";
    const prisma = getPrisma();
    const row = await prisma.driveToken.findUnique({
      where: { userId },
      select: { userId: true },
    });
    const connected = row != null;
    return NextResponse.json({ connected });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const tableMissing =
      typeof message === "string" &&
      (message.includes("does not exist") || message.includes("relation"));
    return NextResponse.json(
      {
        connected: false,
        ...(tableMissing
          ? { hint: "Run the database migration: npx prisma migrate deploy" }
          : { error: "Status check failed", details: message }),
      },
      { status: tableMissing ? 200 : 500 }
    );
  }
}

/**
 * DELETE: Disconnect Drive by removing stored tokens for the user.
 * Query: userId (default "default")
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? "default";
    const prisma = getPrisma();
    await prisma.driveToken.deleteMany({ where: { userId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to disconnect Drive", details: message },
      { status: 500 }
    );
  }
}
