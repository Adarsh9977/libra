import type { JSONSchema7 } from "json-schema";

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/** Optional context passed when executing a tool (e.g. userId for Drive). */
export interface ToolContext {
  userId?: string;
}

export interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema7;
  execute(input: unknown, context?: ToolContext): Promise<ToolResult>;
}

export type ToolRegistry = Map<string, Tool>;
