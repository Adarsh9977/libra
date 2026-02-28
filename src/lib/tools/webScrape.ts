import { JSDOM } from "jsdom";
import type { Tool } from "./types";

const TOOL_TIMEOUT_MS = 15_000;
const MAX_TEXT_LENGTH = 50_000;

export type WebScrapeInput = { url: string };

/**
 * Strip HTML and extract readable text. Remove scripts, styles, and normalize whitespace.
 */
function extractText(html: string): string {
  const dom = new JSDOM(html, { url: "https://example.com" });
  const doc = dom.window.document;
  const body = doc.body;
  if (!body) return "";

  // Remove script, style, nav, footer
  const remove = body.querySelectorAll("script, style, nav, footer, [role='navigation']");
  remove.forEach((el) => el.remove());

  let text = body.textContent ?? "";
  // Normalize whitespace and trim
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

/**
 * Sanitize URL to prevent SSRF: allow only http/https.
 */
function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Web scrape: fetch URL, extract readable text, strip HTML, truncate safely.
 */
export const webScrapeTool: Tool = {
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
  async execute(input: unknown): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const parsed = input as WebScrapeInput;
    const url = typeof parsed?.url === "string" ? parsed.url.trim() : "";
    if (!url) {
      return { success: false, error: "Missing or invalid 'url' string" };
    }
    if (!isAllowedUrl(url)) {
      return { success: false, error: "URL must be http or https" };
    }
    try {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), TOOL_TIMEOUT_MS);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; LibraAgent/1.0; +https://github.com/libra)",
        },
      });
      clearTimeout(id);
      if (!res.ok) {
        return {
          success: false,
          error: `HTTP ${res.status} for ${url}`,
        };
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
        return {
          success: false,
          error: "URL did not return HTML or plain text",
        };
      }
      const html = await res.text();
      let text = extractText(html);
      if (text.length > MAX_TEXT_LENGTH) {
        text = text.slice(0, MAX_TEXT_LENGTH) + "\n[... truncated]";
      }
      return {
        success: true,
        data: { url, text, truncated: text.length >= MAX_TEXT_LENGTH },
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: `webScrape failed: ${message}` };
    }
  },
};
