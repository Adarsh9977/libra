import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

/**
 * GET: List chats for the user (default userId).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? "default";
    const prisma = getPrisma();
    const chats = await prisma.chat.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true },
    });
    return NextResponse.json(chats);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to list chats", details: message },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new chat.
 * Body: { userId?: string, title?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId = (body.userId as string) ?? "default";
    const title = (body.title as string) ?? "New chat";
    const clientId = body.id as string | undefined;
    const prisma = getPrisma();
    const chat = await prisma.chat.create({
      data: { ...(clientId ? { id: clientId } : {}), userId, title },
      select: { id: true, title: true, createdAt: true },
    });
    return NextResponse.json(chat);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to create chat", details: message },
      { status: 500 }
    );
  }
}
