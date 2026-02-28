"use client";

import * as React from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

export interface ChatHeaderProps {
    onToggleDrive: () => void;
}

export function ChatHeader({ onToggleDrive }: ChatHeaderProps) {
    return (
        <header className="flex h-14 shrink-0 items-center justify-end border-b border-border bg-card px-4 shadow-sm">

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onToggleDrive}
                    className="rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    Drive
                </button>
                <ThemeToggle />
            </div>
        </header>
    );
}
