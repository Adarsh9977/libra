import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";

/**
 * GET: Check if Drive is connected for the authenticated user.
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  try {
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
 * DELETE: Disconnect Drive by removing stored tokens for the authenticated user.
 */
export async function DELETE() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  try {
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
