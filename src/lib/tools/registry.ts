import type { Tool, ToolContext, ToolRegistry } from "./types";
import { webSearchTool } from "./webSearch";
import { webScrapeTool } from "./webScrape";
import { googleDriveSearchTool } from "./googleDriveSearch";
import { vectorSearchTool } from "./vectorSearch";

const tools: Tool[] = [
  webSearchTool,
  webScrapeTool,
  googleDriveSearchTool,
  vectorSearchTool,
];

const registry: ToolRegistry = new Map(tools.map((t) => [t.name, t]));

/**
 * Get the global tool registry (all registered tools).
 */
export function getToolRegistry(): ToolRegistry {
  return registry;
}

/**
 * Get a tool by name, or undefined if not found.
 */
export function getTool(name: string): Tool | undefined {
  return registry.get(name);
}

/**
 * Execute a tool by name with input and optional context.
 */
export async function executeTool(
  name: string,
  input: unknown,
  context?: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const tool = registry.get(name);
  if (!tool) {
    return { success: false, error: `Unknown tool: ${name}` };
  }
  return tool.execute(input, context);
}

/**
 * Return tool list for LLM system prompt (name + description + params).
 */
export function getToolDescriptions(): string {
  return tools
    .map((t) => {
      const params = JSON.stringify(t.parameters);
      return `- ${t.name}: ${t.description}\n  Parameters (JSON schema): ${params}`;
    })
    .join("\n\n");
}
