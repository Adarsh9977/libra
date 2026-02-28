import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

/**
 * GET: Fetch a single chat with its turns (for loading into the UI).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prisma = getPrisma();
    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        turns: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            task: true,
            steps: true,
            finalAnswer: true,
            toolsUsed: true,
            tokenUsage: true,
            createdAt: true,
          },
        },
      },
    });
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    return NextResponse.json(chat);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to fetch chat", details: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete a chat and all its turns.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prisma = getPrisma();
    // Delete turns first, then the chat
    await prisma.chatTurn.deleteMany({ where: { chatId: id } });
    await prisma.chat.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to delete chat", details: message },
      { status: 500 }
    );
  }
}
