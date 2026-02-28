import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent/agentLoop";
import { getPrisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";

export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  try {
    const body = await request.json();
    const task = typeof body.task === "string" ? body.task.trim() : "";
    const maxSteps =
      typeof body.maxSteps === "number" && body.maxSteps > 0
        ? Math.min(body.maxSteps, 20)
        : 10;
    const chatId = typeof body.chatId === "string" ? body.chatId : undefined;

    if (!task) {
      return NextResponse.json(
        { error: "Missing or invalid 'task' string" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    let augmentedTask = task;

    if (chatId) {
      try {
        const prisma = getPrisma();
        const turns = await prisma.chatTurn.findMany({
          where: { chatId },
          orderBy: { createdAt: "asc" },
          select: {
            task: true,
            finalAnswer: true,
          },
          take: 10,
        });

        if (turns.length > 0) {
          const historyBlocks = turns.map((t) => {
            const fa = t.finalAnswer as unknown as {
              summary?: string;
              detailed_answer?: string;
            } | null;
            const answerText =
              (fa?.detailed_answer && String(fa.detailed_answer)) ||
              (fa?.summary && String(fa.summary)) ||
              "";
            return `User: ${t.task}\nAssistant: ${answerText}`;
          });

          const history = historyBlocks.join("\n\n");
          augmentedTask = `Conversation so far:\n${history}\n\nNew user question: ${task}`;
        }
      } catch {
        // If history fetch fails, fall back to single-turn behavior.
      }
    }

    const result = await runAgent({
      task: augmentedTask,
      maxSteps,
      userId,
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Agent run failed", details: message },
      { status: 500 }
    );
  }
}
