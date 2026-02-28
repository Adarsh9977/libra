"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SourcesPanelProps {
  sources: string[];
  /** Tool names used for this response (show Sources button when sources or tools present). */
  toolsUsed?: string[];
  onCopyAnswer?: (text: string) => void;
  finalAnswer?: {
    summary: string;
    detailed_answer: string;
    sources: string[];
  } | null;
  onRetry?: () => void;
  /** When user clicks Sources, open the sources drawer (parent controls drawer visibility). */
  onSourcesClick?: () => void;
  className?: string;
}

export function SourcesPanel({
  sources,
  toolsUsed = [],
  onCopyAnswer,
  finalAnswer,
  onRetry,
  onSourcesClick,
  className,
}: SourcesPanelProps) {
  const [copied, setCopied] = React.useState(false);
  const [thumbsUp, setThumbsUp] = React.useState(false);
  const [thumbsDown, setThumbsDown] = React.useState(false);

  const handleCopy = React.useCallback(() => {
    const text = finalAnswer
      ? `${finalAnswer.summary}\n\n${finalAnswer.detailed_answer}`
      : "";
    if (text && onCopyAnswer) {
      onCopyAnswer(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (finalAnswer) {
      void navigator.clipboard.writeText(
        `${finalAnswer.summary}\n\n${finalAnswer.detailed_answer}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [finalAnswer, onCopyAnswer]);

  const hasContent = (finalAnswer && (finalAnswer.detailed_answer || finalAnswer.summary)) || sources.length > 0;

  if (!hasContent) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-md",
        className
      )}
    >
      {/* Answer content */}
      {finalAnswer && (
        <div className="border-b border-border px-4 py-4">
          <p className="font-medium text-foreground">{finalAnswer.summary}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {renderTextWithLinks(finalAnswer.detailed_answer)}
          </p>
        </div>
      )}

      {/* Toolbar: Copy, Thumbs up/down, Share, Refresh, More, Sources */}
      <div className="flex flex-wrap items-center gap-1 px-2 py-2">
        <ToolbarButton
          onClick={handleCopy}
          title={copied ? "Copied" : "Copy"}
          aria-label="Copy"
        >
          {copied ? (
            <CheckIcon className="h-4 w-4" />
          ) : (
            <CopyIcon className="h-4 w-4" />
          )}
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            setThumbsUp((v) => !v);
            setThumbsDown(false);
          }}
          title="Good response"
          aria-label="Thumbs up"
          active={thumbsUp}
        >
          <ThumbsUpIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            setThumbsDown((v) => !v);
            setThumbsUp(false);
          }}
          title="Bad response"
          aria-label="Thumbs down"
          active={thumbsDown}
        >
          <ThumbsDownIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            if (finalAnswer) {
              const text = `${finalAnswer.summary}\n\n${finalAnswer.detailed_answer}`;
              if (navigator.share) {
                void navigator.share({
                  title: "Libra",
                  text,
                });
              } else {
                void navigator.clipboard.writeText(text);
              }
            }
          }}
          title="Share"
          aria-label="Share"
        >
          <ShareIcon className="h-4 w-4" />
        </ToolbarButton>
        {onRetry && (
          <ToolbarButton onClick={onRetry} title="Retry" aria-label="Retry">
            <RefreshIcon className="h-4 w-4" />
          </ToolbarButton>
        )}
        <ToolbarButton title="More options" aria-label="More">
          <MoreIcon className="h-4 w-4" />
        </ToolbarButton>

        {/* Sources & tools on the right - opens drawer when there are sources or tools */}
        {(sources.length > 0 || toolsUsed.length > 0) && onSourcesClick && (
          <button
            type="button"
            onClick={onSourcesClick}
            className="ml-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            aria-label="View sources and tools"
          >
            <SourcesIcon className="h-4 w-4 text-amber-500" />
            Sources{sources.length > 0 ? ` · ${sources.length}` : ""}
          </button>
        )}
      </div>
    </div>
  );
}

function renderTextWithLinks(text: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s)]+[^\s.,)])/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  text.replace(urlRegex, (match, _p1, offset) => {
    if (offset > lastIndex) {
      nodes.push(text.slice(lastIndex, offset));
    }
    nodes.push(
      <a
        key={`${match}-${offset}`}
        href={match}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline break-words"
      >
        {match}
      </a>
    );
    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function ToolbarButton({
  children,
  onClick,
  title,
  "aria-label": ariaLabel,
  active = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title: string;
  "aria-label": string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className={cn(
        "rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-muted text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ThumbsUpIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

function ThumbsDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" x2="12" y1="2" y2="15" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

function SourcesIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      <path d="M12 3v9" />
      <path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    </svg>
  );
}
