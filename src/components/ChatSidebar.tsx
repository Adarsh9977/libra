"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";
import { MoreHorizontal, Trash2, LogOut } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useUser } from "@/components/UserProvider";
import { AuthModal } from "@/components/AuthModal";

export type ChatListItem = {
  id: string;
  title: string;
  updatedAt: string;
};

export function ChatSidebar() {
  const { user, loading: userLoading } = useUser();
  const [chats, setChats] = React.useState<ChatListItem[]>([]);
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [showEmailAuthModal, setShowEmailAuthModal] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const menuRef = React.useRef<HTMLDivElement>(null);

  const userId = user?.id;

  const currentChatId = pathname?.startsWith("/chat/")
    ? pathname.split("/")[2] ?? null
    : null;

  const fetchChats = React.useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/chats?userId=${userId}`);
      if (!res.ok) return;
      const data = (await res.json()) as ChatListItem[];
      setChats(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  }, [userId]);

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
    if (!deleteConfirmId || !userId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/chats/${deleteConfirmId}?userId=${encodeURIComponent(userId)}`, {
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
  }, [deleteConfirmId, currentChatId, userId, router, toast]);

  const handleSignInWithGoogle = React.useCallback(async () => {
    try {
      const res = await fetch("/api/drive/oauth");
      const data = (await res.json()) as { url?: string };
      if (data?.url) window.location.href = data.url;
      else toast("Failed to start sign in", "error");
    } catch {
      toast("Failed to start sign in", "error");
    }
  }, [toast]);

  const handleSignOut = React.useCallback(() => {
    // GET so it works in production (some hosts return 405 for POST to this path)
    window.location.href = "/api/auth/logout";
  }, []);

  const isAuthenticated = !!user;

  return (
    <>
      <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-muted">
        {/* Brand */}
        <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4">
          <h1 className="text-lg font-semibold tracking-tight">Libra</h1>
        </div>

        {isAuthenticated ? (
          <>
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

            {/* Previous chats label */}
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

            {/* User profile at bottom */}
            <div className="shrink-0 border-t border-sidebar-border p-3">
              <div className="flex items-center gap-3">
                {user.image && (
                  <img
                    src={user.image}
                    alt=""
                    className="h-8 w-8 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user.name ?? "User"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Not authenticated — sign in options */
          <div className="flex flex-1 flex-col gap-3 p-4">
            {userLoading ? (
              <div className="flex w-full justify-center py-4">
                <svg className="h-5 w-5 animate-spin text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSignInWithGoogle}
                  className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  Sign in with Google
                </button>
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmailAuthModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
                >
                  Sign in with email
                </button>
              </>
            )}
          </div>
        )}
      </aside>

      <AuthModal
        open={showEmailAuthModal}
        onClose={() => setShowEmailAuthModal(false)}
      />

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
