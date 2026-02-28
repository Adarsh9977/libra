"use client";

import * as React from "react";
import { SourcesPanel } from "@/components/SourcesPanel";

export type ChatMessage = {
    id: string;
    task: string;
    finalAnswer: {
        summary: string;
        detailed_answer: string;
        sources: string[];
    } | null;
    toolsUsed?: string[];
    timestamp: number;
};

export interface ChatMessageListProps {
    messages: ChatMessage[];
    running: boolean;
    onRetry: (task: string) => void;
    onSourcesClick: (sources: string[], toolsUsed: string[]) => void;
    inputSlot?: React.ReactNode;
}

export function ChatMessageList({
    messages,
    running,
    onRetry,
    onSourcesClick,
    inputSlot,
}: ChatMessageListProps) {
    const hasContent = messages.length > 0;

    return (
        <main
            className={`min-h-0 flex-1 overflow-y-auto ${!hasContent && !running ? "flex items-center justify-center" : ""}`}
        >
            <div className="mx-auto max-w-3xl px-4 py-6">
                {/* Empty state — Perplexity-style */}
                {!hasContent && !running && (
                    <div className="flex mb-[15%] flex-col items-center">
                        {/* Brand */}
                        <h2 className="text-5xl font-light tracking-tight text-foreground/80">
                            Libra
                        </h2>
                        <p className="mt-4 text-base text-muted-foreground">
                            Ask anything. I can search the web, read pages, and search your
                            Drive.
                        </p>
                        {/* Centered input */}
                        {inputSlot && (
                            <div className="mt-8 w-full max-w-3xl">
                                {inputSlot}
                            </div>
                        )}
                    </div>
                )}

                {/* Messages */}
                <div className="space-y-6">
                    {messages.map((msg) => (
                        <React.Fragment key={msg.id}>
                            {/* User bubble */}
                            <div className="flex justify-end">
                                <div className="max-w-[85%] rounded-2xl rounded-tr-md border border-primary/20 bg-primary px-4 py-3 text-primary-foreground text-sm shadow-md">
                                    {msg.task}
                                </div>
                            </div>

                            {/* Assistant response or loading */}
                            {msg.finalAnswer ? (
                                <SourcesPanel
                                    sources={msg.finalAnswer.sources}
                                    toolsUsed={msg.toolsUsed}
                                    finalAnswer={msg.finalAnswer}
                                    onCopyAnswer={(text) =>
                                        void navigator.clipboard.writeText(text)
                                    }
                                    onRetry={() => onRetry(msg.task)}
                                    onSourcesClick={() =>
                                        onSourcesClick(
                                            msg.finalAnswer!.sources,
                                            msg.toolsUsed ?? []
                                        )
                                    }
                                />
                            ) : (
                                <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-4 shadow-md">
                                    <div className="flex gap-1">
                                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
                                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
                                    </div>
                                    <span className="text-muted-foreground text-sm">
                                        Thinking...
                                    </span>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </main>
    );
}
