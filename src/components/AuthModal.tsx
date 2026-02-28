"use client";

import * as React from "react";
import { useToast } from "@/components/Toast";
import { useUser } from "@/components/UserProvider";
import { cn } from "@/lib/utils";

export interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  className?: string;
}

export function AuthModal({ open, onClose, className }: AuthModalProps) {
  const { refresh: refreshUser } = useUser();
  const { toast } = useToast();
  const [emailMode, setEmailMode] = React.useState<"login" | "register">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const resetForm = React.useCallback(() => {
    setEmail("");
    setPassword("");
    setName("");
    setError(null);
    setEmailMode("login");
  }, []);

  React.useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        const url = emailMode === "register" ? "/api/auth/register" : "/api/auth/login";
        const body =
          emailMode === "register"
            ? { email: email.trim().toLowerCase(), password, name: name.trim() || undefined }
            : { email: email.trim().toLowerCase(), password };
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Something went wrong");
          return;
        }
        toast(emailMode === "register" ? "Account created" : "Signed in", "success");
        refreshUser();
        onClose();
      } catch {
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [emailMode, email, password, name, toast, refreshUser, onClose]
  );

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center p-4",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div
          className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 id="auth-modal-title" className="text-lg font-semibold text-foreground">
              {emailMode === "register" ? "Create account" : "Sign in with email"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {emailMode === "register" && (
              <input
                type="text"
                placeholder="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              required
              autoComplete="email"
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              required
              minLength={emailMode === "register" ? 8 : 1}
              autoComplete={emailMode === "register" ? "new-password" : "current-password"}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Please wait…" : emailMode === "register" ? "Create account" : "Sign in"}
            </button>
          </form>

          <div className="mt-4 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => { setEmailMode(emailMode === "register" ? "login" : "register"); setError(null); }}
              className="text-sm text-muted-foreground hover:text-foreground text-left"
            >
              {emailMode === "register" ? "Already have an account? Sign in" : "Create an account"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
