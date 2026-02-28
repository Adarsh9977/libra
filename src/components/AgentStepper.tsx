"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export interface AgentStepView {
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
}

export interface AgentStepperProps {
  steps: AgentStepView[];
  isLoading?: boolean;
  className?: string;
}

export function AgentStepper({
  steps,
  isLoading = false,
  className,
}: AgentStepperProps) {
  if (isLoading && steps.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 shadow-sm",
          className
        )}
      >
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
        </div>
        <span className="text-muted-foreground text-sm">Thinking...</span>
      </div>
    );
  }

  if (steps.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="mb-3 border-b border-border pb-2 text-sm font-medium text-muted-foreground">
        Agent steps ({steps.length})
      </p>
      <Accordion type="single">
            {steps.map((step, i) => (
              <AccordionItem key={i} className="rounded-lg border border-border border-b-0 bg-muted/30 px-3 shadow-sm last:border-b">
                <AccordionTrigger index={i} className="hover:no-underline">
                  <span className="flex items-center gap-2 text-left">
                    <span className="text-muted-foreground font-mono text-xs">
                      Step {step.stepIndex + 1}
                    </span>
                    {step.type === "tool_call" && step.toolName && (
                      <Badge variant="tool">{step.toolName}</Badge>
                    )}
                    {step.type === "final_answer" && (
                      <Badge variant="success">Final answer</Badge>
                    )}
                    {step.finalAnswer && (
                      <span className="truncate text-sm">
                        {step.finalAnswer.summary}
                      </span>
                    )}
                  </span>
                </AccordionTrigger>
                <AccordionContent index={i}>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Thought:
                      </span>
                      <p className="mt-1 whitespace-pre-wrap">{step.thought}</p>
                    </div>
                    {step.type === "tool_call" && (
                      <>
                        {step.toolArguments &&
                          Object.keys(step.toolArguments).length > 0 && (
                            <div>
                              <span className="font-medium text-muted-foreground">
                                Arguments:
                              </span>
                              <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 font-mono text-xs">
                                {JSON.stringify(
                                  step.toolArguments,
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          )}
                        {step.toolResult !== undefined && (
                          <div>
                            <span className="font-medium text-muted-foreground">
                              Result:
                            </span>
                            <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 font-mono text-xs">
                              {typeof step.toolResult === "string"
                                ? step.toolResult
                                : JSON.stringify(step.toolResult, null, 2)}
                            </pre>
                          </div>
                        )}
                      </>
                    )}
                    {step.finalAnswer && (
                      <div>
                        <span className="font-medium text-muted-foreground">
                          Answer:
                        </span>
                        <p className="mt-1 whitespace-pre-wrap">
                          {step.finalAnswer.detailed_answer}
                        </p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
      {isLoading && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-2 text-muted-foreground text-sm shadow-sm">
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
          </div>
          <span>Running next step…</span>
        </div>
      )}
    </div>
  );
}

