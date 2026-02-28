import type { Tool } from "./types";

const SERPER_BASE = "https://google.serper.dev/search";
const TOOL_TIMEOUT_MS = 15_000;

export type WebSearchInput = { query: string };

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  ms: number
): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Web search via Serper API. Returns title, url, snippet per result.
 */
export const webSearchTool: Tool = {
  name: "webSearch",
  description:
    "Search the web using Google (Serper API). Returns a list of results with title, url, and snippet. Use for current information, facts, or finding URLs.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query string",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  async execute(input: unknown): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const parsed = input as WebSearchInput;
    const query = typeof parsed?.query === "string" ? parsed.query.trim() : "";
    if (!query) {
      return { success: false, error: "Missing or invalid 'query' string" };
    }
    const key = process.env.SERPER_API_KEY;
    if (!key) {
      return { success: false, error: "SERPER_API_KEY is not configured" };
    }
    try {
      const res = await fetchWithTimeout(
        SERPER_BASE,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": key,
          },
          body: JSON.stringify({ q: query }),
        },
        TOOL_TIMEOUT_MS
      );
      if (!res.ok) {
        const text = await res.text();
        return {
          success: false,
          error: `Serper API error: ${res.status} ${text.slice(0, 200)}`,
        };
      }
      const data = (await res.json()) as {
        organic?: Array<{ title?: string; link?: string; snippet?: string }>;
      };
      const results = (data.organic ?? []).map((o) => ({
        title: o.title ?? "",
        url: o.link ?? "",
        snippet: o.snippet ?? "",
      }));
      return { success: true, data: { results } };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: `webSearch failed: ${message}` };
    }
  },
};
