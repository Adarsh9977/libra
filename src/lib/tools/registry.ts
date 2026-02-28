import type { JSONSchema7 } from "json-schema";
import type { ToolContext, ToolResult, Tool, ToolRegistry } from "./types";

/* ─────────────────────────────────────────────────────────
 * Tool metadata — lightweight, no heavy imports.
 * Statically available for LLM system prompts.
 * ───────────────────────────────────────────────────────── */

interface ToolMeta {
  name: string;
  description: string;
  parameters: JSONSchema7;
}

const toolMetas: ToolMeta[] = [
  {
    name: "webSearch",
    description:
      "Search the web using Google (Serper API). Returns a list of results with title, url, and snippet. Use for current information, facts, or finding URLs.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query string" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "webScrape",
    description:
      "Fetch a URL and extract readable text from the page (strips HTML). Use after webSearch to get full page content. Provide a single URL.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Full URL to fetch (http or https only)",
        },
      },
      required: ["url"],
      additionalProperties: false,
    },
  },
  {
    name: "googleDriveSearch",
    description:
      "Search the user's Google Drive for files by name or content. Use when the user asks about their documents, spreadsheets, or PDFs in Drive. Returns file names, IDs, and links.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (file name or content search)",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results to return (default 10)",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "vectorSearch",
    description:
      "Search the user's ingested document chunks by semantic similarity (vector search). Use when the user asks about content that has been synced from Google Drive. Returns relevant text chunks with metadata.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Natural language query to find relevant document chunks",
        },
        topK: {
          type: "number",
          description: "Number of top results (default 5)",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
];

/* ─────────────────────────────────────────────────────────
 * Lazy tool cache — modules are imported on first execute().
 * Uses static string literals so Webpack can analyze them.
 * ───────────────────────────────────────────────────────── */

const toolCache = new Map<string, Tool>();

async function loadTool(name: string): Promise<Tool> {
  const cached = toolCache.get(name);
  if (cached) return cached;

  let tool: Tool;
  switch (name) {
    case "webSearch": {
      const m = await import("./webSearch");
      tool = m.webSearchTool;
      break;
    }
    case "webScrape": {
      const m = await import("./webScrape");
      tool = m.webScrapeTool;
      break;
    }
    case "googleDriveSearch": {
      const m = await import("./googleDriveSearch");
      tool = m.googleDriveSearchTool;
      break;
    }
    case "vectorSearch": {
      const m = await import("./vectorSearch");
      tool = m.vectorSearchTool;
      break;
    }
    default:
      throw new Error(`Unknown tool module: ${name}`);
  }

  toolCache.set(name, tool);
  return tool;
}

/* ─────────────────────────────────────────────────────────
 * Public API
 * ───────────────────────────────────────────────────────── */

const metaByName = new Map(toolMetas.map((m) => [m.name, m]));

/**
 * Return tool list for LLM system prompt (name + description + params).
 * No heavy imports — reads only static metadata.
 */
export function getToolDescriptions(): string {
  return toolMetas
    .map((t) => {
      const params = JSON.stringify(t.parameters);
      return `- ${t.name}: ${t.description}\n  Parameters (JSON schema): ${params}`;
    })
    .join("\n\n");
}

/**
 * Get the global tool registry.
 * Wraps each tool in a lazy proxy so imports happen only on execute().
 */
export function getToolRegistry(): ToolRegistry {
  const registry: ToolRegistry = new Map();
  for (const meta of toolMetas) {
    const lazyTool: Tool = {
      name: meta.name,
      description: meta.description,
      parameters: meta.parameters,
      async execute(input: unknown, context?: ToolContext): Promise<ToolResult> {
        const real = await loadTool(meta.name);
        return real.execute(input, context);
      },
    };
    registry.set(meta.name, lazyTool);
  }
  return registry;
}

/**
 * Get a tool by name, or undefined if not found.
 * Returns a lazy wrapper — no heavy imports until execute() is called.
 */
export function getTool(name: string): Tool | undefined {
  const meta = metaByName.get(name);
  if (!meta) return undefined;
  return {
    name: meta.name,
    description: meta.description,
    parameters: meta.parameters,
    async execute(input: unknown, context?: ToolContext): Promise<ToolResult> {
      const real = await loadTool(meta.name);
      return real.execute(input, context);
    },
  };
}

/**
 * Execute a tool by name with input and optional context.
 * Lazy-loads the tool module on first call.
 */
export async function executeTool(
  name: string,
  input: unknown,
  context?: ToolContext
): Promise<ToolResult> {
  const meta = metaByName.get(name);
  if (!meta) {
    return { success: false, error: `Unknown tool: ${name}` };
  }
  const tool = await loadTool(meta.name);
  return tool.execute(input, context);
}
