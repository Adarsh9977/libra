import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

type TurnBody = {
  task: string;
  steps: unknown[];
  finalAnswer: { summary: string; detailed_answer: string; sources: string[] };
  toolsUsed?: string[];
  tokenUsage?: number;
};

/**
 * POST: Add a turn to a chat (user message + full agent response).
 * Body: { task, steps, finalAnswer, toolsUsed?, tokenUsage? }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatId } = await params;
    const body = (await request.json()) as TurnBody;
    const { task, steps, finalAnswer, toolsUsed = [], tokenUsage } = body;
    if (!task || !finalAnswer || !Array.isArray(steps)) {
      return NextResponse.json(
        { error: "task, steps, and finalAnswer are required" },
        { status: 400 }
      );
    }
    const prisma = getPrisma();
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
    const chat = await prisma.chat.findUnique({ where: { id: chatId }, select: { title: true } });
    const newTitle = task.slice(0, 50) + (task.length > 50 ? "…" : "");
    if (chat?.title === "New chat") {
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
