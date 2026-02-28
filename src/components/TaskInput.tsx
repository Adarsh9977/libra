"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TaskInputProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function TaskInput({
  value,
  onChange,
  onRun,
  disabled = false,
  placeholder = "Message Libra...",
  className,
}: TaskInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "24px";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) onRun();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onRun();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex w-full items-end gap-2 rounded-2xl border-2 border-border bg-background px-4 py-3 shadow-md",
        "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:ring-offset-2 focus-within:ring-offset-background",
        className
      )}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className={cn(
          "h-full w-full resize-none overflow-y-auto bg-transparent py-1 text-sm outline-none",
          "placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />
      <Button
        type="submit"
        disabled={disabled || !value.trim()}
        size="icon"
        className="h-9 w-9 shrink-0 rounded-xl"
        aria-label="Send"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      </Button>
    </form>
  );
}
