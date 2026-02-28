import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";

type TurnBody = {
  task: string;
  steps: unknown[];
  finalAnswer: { summary: string; detailed_answer: string; sources: string[] };
  toolsUsed?: string[];
  tokenUsage?: number;
};

/**
 * POST: Add a turn to a chat (user message + full agent response). Requires auth; chat must belong to the user.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  try {
    const { id: chatId } = await params;
    const prisma = getPrisma();
    const chat = await prisma.chat.findUnique({ where: { id: chatId }, select: { userId: true, title: true } });
    if (!chat || chat.userId !== userId) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    const body = (await request.json()) as TurnBody;
    const { task, steps, finalAnswer, toolsUsed = [], tokenUsage } = body;
    if (!task || !finalAnswer || !Array.isArray(steps)) {
      return NextResponse.json(
        { error: "task, steps, and finalAnswer are required" },
        { status: 400 }
      );
    }
    const turn = await prisma.chatTurn.create({
      data: {
        chatId,
        task,
        steps: steps as unknown as object,
        finalAnswer: finalAnswer as unknown as object,
        toolsUsed: (Array.isArray(toolsUsed) ? toolsUsed : []) as unknown as object,
        tokenUsage: typeof tokenUsage === "number" ? tokenUsage : null,
      },
    });
    const newTitle = task.slice(0, 50) + (task.length > 50 ? "…" : "");
    if (chat.title === "New chat") {
      await prisma.chat.update({
        where: { id: chatId },
        data: { title: newTitle },
      });
    }
    return NextResponse.json(turn);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to add turn", details: message },
      { status: 500 }
    );
  }
}
