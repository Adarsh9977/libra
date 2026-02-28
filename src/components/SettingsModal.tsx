"use client";

import * as React from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  className?: string;
}

export function SettingsModal({ open, onClose, className }: SettingsModalProps) {
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        aria-hidden
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center p-4",
          className
        )}
      >
        <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="font-semibold">Settings</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <span className="text-sm font-medium">Theme</span>
            <ThemeToggle />
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
