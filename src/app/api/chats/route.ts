import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";

/**
 * GET: List chats for the authenticated user.
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  try {
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
 * Body: { title?: string, id?: string (client id) }
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  try {
    const body = await request.json().catch(() => ({}));
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
