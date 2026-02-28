"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { useToast } from "@/components/Toast";

export type ChatListItem = {
  id: string;
  title: string;
  updatedAt: string;
};

const userId = "default";

export function ChatSidebar() {
  const [chats, setChats] = React.useState<ChatListItem[]>([]);
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const menuRef = React.useRef<HTMLDivElement>(null);

  const currentChatId = pathname?.startsWith("/chat/")
    ? pathname.split("/")[2] ?? null
    : null;

  const fetchChats = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/chats?userId=${userId}`);
      if (!res.ok) return;
      const data = (await res.json()) as ChatListItem[];
      setChats(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  React.useEffect(() => {
    const handler = () => void fetchChats();
    window.addEventListener("chats-updated", handler);
    return () => window.removeEventListener("chats-updated", handler);
  }, [fetchChats]);

  // Close menu on outside click
  React.useEffect(() => {
    if (!menuOpenId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpenId]);

  const handleNewChat = React.useCallback(() => {
    router.push("/");
  }, [router]);

  const handleDelete = React.useCallback(async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/chats/${deleteConfirmId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setChats((prev) => prev.filter((c) => c.id !== deleteConfirmId));
      toast("Chat deleted", "success");
      // If we're viewing the deleted chat, go home
      if (currentChatId === deleteConfirmId) {
        router.push("/");
      }
    } catch {
      toast("Failed to delete chat", "error");
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, currentChatId, router, toast]);

  return (
    <>
      <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-muted">
        {/* Brand */}
        <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4">
          <h1 className="text-lg font-semibold tracking-tight">Libra</h1>
        </div>

        {/* New chat button */}
        <div className="shrink-0 px-3 pt-3 pb-2">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2 text-sm font-medium text-foreground transition-colors hover:border-foreground/30 hover:text-foreground bg-sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            New chat
          </button>
        </div>

        {/* Previous chats label — fixed */}
        <div className="shrink-0 px-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Previous chats
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>

        {/* Scrollable chat list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3">
          <ul className="space-y-0.5">
            {chats.map((chat) => (
              <li key={chat.id} className="group relative">
                <button
                  type="button"
                  onClick={() => router.push(`/chat/${chat.id}`)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2.5 pr-8 text-left text-sm transition-colors",
                    currentChatId === chat.id
                      ? "bg-sidebar-foreground font-medium text-primary-foreground"
                      : "text-muted-foreground hover:bg-sidebar hover:text-foreground"
                  )}
                >
                  <span className="block truncate">{chat.title}</span>
                </button>
                {/* Three-dot menu button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpenId === chat.id ? null : chat.id);
                  }}
                  className={cn(
                    "absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 transition-opacity",
                    currentChatId === chat.id
                      ? "text-primary-foreground/70 hover:text-primary-foreground opacity-100"
                      : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
                  )}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {/* Dropdown menu */}
                {menuOpenId === chat.id && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-border bg-card p-1 shadow-lg"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(null);
                        setDeleteConfirmId(chat.id);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Delete confirmation dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-foreground">Delete chat?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This will permanently delete this chat and all its messages. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleting}
                className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
