"use client";

import * as React from "react";
import { useUser } from "@/components/UserProvider";
import { useToast } from "@/components/Toast";
import { TaskInput } from "@/components/TaskInput";
import { SourcesDrawer } from "@/components/SourcesDrawer";
import { SettingsModal } from "@/components/SettingsModal";
import { DriveDrawer } from "@/components/DriveDrawer";
import { ChatHeader } from "@/components/ChatHeader";
import {
  ChatMessageList,
  type ChatMessage,
} from "@/components/ChatMessageList";

type AgentStepView = {
  stepIndex: number;
  thought: string;
  type: "tool_call" | "final_answer";
  toolName?: string;
  toolArguments?: Record<string, unknown>;
  toolResult?: unknown;
  finalAnswer?: {
    summary: string;
    detailed_answer: string;
    sources: string[];
  };
};

type AgentRunResult = {
  success: boolean;
  steps: AgentStepView[];
  finalAnswer: {
    summary: string;
    detailed_answer: string;
    sources: string[];
  };
  tokenUsage: number;
};



export interface ChatAppProps {
  initialChatId?: string;
}

export function ChatApp({ initialChatId }: ChatAppProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const userId = user?.id ?? "default";

  const [task, setTask] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [loading, setLoading] = React.useState(!!initialChatId);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [currentChatId, setCurrentChatId] = React.useState<string | null>(
    initialChatId ?? null
  );
  const [showDrive, setShowDrive] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [sourcesDrawerOpen, setSourcesDrawerOpen] = React.useState(false);
  const [sourcesDrawerSources, setSourcesDrawerSources] = React.useState<
    string[]
  >([]);
  const [sourcesDrawerToolsUsed, setSourcesDrawerToolsUsed] = React.useState<
    string[]
  >([]);

  /* ────────────────────── Data fetching ────────────────────── */

  const loadChat = React.useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chats/${id}?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        id: string;
        turns: Array<{
          id: string;
          task: string;
          finalAnswer: unknown;
          toolsUsed: unknown;
          createdAt: string;
        }>;
      };
      const turns = data.turns ?? [];
      const msgs: ChatMessage[] = turns.map((t) => ({
        id: t.id,
        task: t.task,
        finalAnswer: t.finalAnswer as ChatMessage["finalAnswer"],
        toolsUsed: Array.isArray(t.toolsUsed)
          ? (t.toolsUsed as string[])
          : [],
        timestamp: new Date(t.createdAt).getTime(),
      }));
      setMessages(msgs);
      setCurrentChatId(id);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    if (initialChatId) {
      void loadChat(initialChatId);
    } else {
      // New chat (navigated to /): clear messages and current chat so UI matches URL
      setMessages([]);
      setCurrentChatId(null);
      setLoading(false);
      setTask("");
    }
  }, [initialChatId, loadChat]);

  /* ────────────────────── Actions ────────────────────── */

  const runAgent = React.useCallback(
    async (overrideTask?: string) => {
      if (!user) {
        toast("You need to sign in to chat with Libra.", "error");
        return;
      }
      const userTask = (overrideTask ?? task).trim();
      if (!userTask || running) return;
      if (!overrideTask) setTask("");
      setRunning(true);
      let chatId = currentChatId;
      if (!chatId) {
        chatId = crypto.randomUUID();
        setCurrentChatId(chatId);
        window.history.replaceState(null, "", `/chat/${chatId}`);
        fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: chatId,
            userId,
            title: userTask.length > 50 ? userTask.slice(0, 50) + "…" : userTask,
          }),
        })
          .then(() => window.dispatchEvent(new Event("chats-updated")))
          .catch(console.error);
      }
      const newId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: newId, task: userTask, finalAnswer: null, timestamp: Date.now() },
      ]);
      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: userTask,
            maxSteps: 10,
            userId,
            chatId,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.details ?? data.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as AgentRunResult;
        const toolsUsed = Array.from(
          new Set(
            (data.steps ?? [])
              .filter((s) => s.type === "tool_call" && s.toolName)
              .map((s) => s.toolName as string)
          )
        );
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.id === newId) {
            next[next.length - 1] = {
              ...last,
              finalAnswer: data.finalAnswer,
              toolsUsed,
            };
          }
          return next;
        });
        if (chatId) {
          try {
            await fetch(`/api/chats/${chatId}/turns`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                task: userTask,
                steps: data.steps,
                finalAnswer: data.finalAnswer,
                toolsUsed,
                tokenUsage: data.tokenUsage,
              }),
            });
          } catch {
            // persist failed, chat still in memory
          }
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.id === newId) {
            next[next.length - 1] = {
              ...last,
              finalAnswer: {
                summary: "Error",
                detailed_answer: message,
                sources: [],
              },
            };
          }
          return next;
        });
      } finally {
        setRunning(false);
      }
    },
    [user, task, running, currentChatId, userId, toast]
  );

  const openSourcesDrawer = React.useCallback(
    (sources: string[], toolsUsed: string[] = []) => {
      setSourcesDrawerSources(sources);
      setSourcesDrawerToolsUsed(toolsUsed);
      setSourcesDrawerOpen(true);
    },
    []
  );

  const hasMessages = messages.length > 0;
  const isLoggedIn = !!user;

  const taskInputEl = (
    <TaskInput
      value={task}
      onChange={setTask}
      onRun={runAgent}
      disabled={running}
      placeholder="Message Libra..."
    />
  );

  const emptyStateInputSlot =
    !hasMessages && !running && !loading ? taskInputEl : undefined;

  return (
    <>
      <ChatHeader
        onToggleDrive={() => setShowDrive((s) => !s)}
      />

      <ChatMessageList
        messages={messages}
        running={running}
        loading={loading}
        onRetry={(t) => runAgent(t)}
        onSourcesClick={openSourcesDrawer}
        inputSlot={emptyStateInputSlot}
      />

      <DriveDrawer
        open={showDrive}
        onClose={() => setShowDrive(false)}
      />

      <SourcesDrawer
        sources={sourcesDrawerSources}
        toolsUsed={sourcesDrawerToolsUsed}
        open={sourcesDrawerOpen}
        onClose={() => setSourcesDrawerOpen(false)}
      />

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Bottom input — only when logged in and (there are messages or agent is running) */}
      {isLoggedIn && (hasMessages || running) && (
        <div className="shrink-0 px-4 py-4">
          <div className="mx-auto max-w-3xl">
            {taskInputEl}
          </div>
        </div>
      )}
    </>
  );
}
