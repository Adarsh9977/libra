"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SourcesDrawerProps {
  sources: string[];
  /** Names of tools called to generate this response (e.g. webSearch, webScrape). */
  toolsUsed?: string[];
  open: boolean;
  onClose: () => void;
  className?: string;
}

/** Returns a short title from URL (hostname or path). */
function titleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname === "/" ? "" : u.pathname;
    if (path) {
      const seg = path.split("/").filter(Boolean).pop();
      if (seg) return `${decodeURIComponent(seg)} · ${host}`;
    }
    return host;
  } catch {
    return url.slice(0, 60);
  }
}

/** Google favicon service for domain icons. */
function faviconUrl(url: string): string {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch {
    return "";
  }
}

export function SourcesDrawer({
  sources,
  toolsUsed = [],
  open,
  onClose,
  className,
}: SourcesDrawerProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        aria-hidden
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l-2 border-border bg-card shadow-2xl",
          className
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <h2 className="font-semibold">
            Sources · {sources.length}
          </h2>
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
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {toolsUsed.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                Tools used for this response
              </h3>
              <div className="flex flex-wrap gap-2">
                {toolsUsed.map((name) => (
                  <span
                    key={name}
                    className="rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
          <ul className="space-y-3">
            {sources.map((src, i) => (
              <li key={i}>
                {src.startsWith("http") ? (
                  <a
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-3 rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                  >
                    <img
                      src={faviconUrl(src)}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded object-contain"
                      width={32}
                      height={32}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">
                        {titleFromUrl(src)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {src}
                      </p>
                    </div>
                  </a>
                ) : (
                  <div className="flex gap-3 rounded-xl border border-border bg-muted/30 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-blue-500/10">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                        <path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{src}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Google Drive</p>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
}
