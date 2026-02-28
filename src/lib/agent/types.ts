/**
 * One step in the agent loop: either a tool call (with result) or the final answer.
 */
export type AgentStep = {
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
};

/**
 * LLM response must be valid JSON in this shape.
 */
export type LLMAgentResponse = {
  type: "tool_call" | "final_answer";
  thought: string;
  tool_name?: string;
  tool_arguments?: Record<string, unknown>;
  final_answer?: {
    summary: string;
    detailed_answer: string;
    sources: string[];
  };
};

/**
 * Result returned to the client after the agent finishes.
 */
export type AgentRunResult = {
  success: boolean;
  steps: AgentStep[];
  finalAnswer: {
    summary: string;
    detailed_answer: string;
    sources: string[];
  };
  tokenUsage: number;
};

export const DEFAULT_MAX_STEPS = 10;
