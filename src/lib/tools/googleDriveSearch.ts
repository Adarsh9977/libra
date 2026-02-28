import type { Tool, ToolContext } from "./types";
import { getDriveClient } from "@/lib/drive/oauth";

const TOOL_TIMEOUT_MS = 15_000;

export type GoogleDriveSearchInput = { query: string; maxResults?: number };

/**
 * Search Google Drive files via Drive API using OAuth tokens.
 * Returns file metadata (name, id, mimeType, webViewLink).
 */
export const googleDriveSearchTool: Tool = {
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
  async execute(
    input: unknown,
    context?: ToolContext
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const parsed = input as GoogleDriveSearchInput;
    const query = typeof parsed?.query === "string" ? parsed.query.trim() : "";
    if (!query) {
      return { success: false, error: "Missing or invalid 'query' string" };
    }
    const maxResults = Math.min(
      Math.max(1, Number(parsed?.maxResults) || 10),
      50
    );
    const userId = context?.userId ?? "default";
    try {
      const drive = await getDriveClient(userId);
      if (!drive) {
        return {
          success: false,
          error: "Google Drive not connected. User must complete OAuth first.",
        };
      }
      const res = await Promise.race([
        drive.files.list({
          q: `fullText contains '${query.replace(/'/g, "\\'")}' or name contains '${query.replace(/'/g, "\\'")}'`,
          pageSize: maxResults,
          fields: "files(id, name, mimeType, webViewLink, modifiedTime)",
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Drive API timeout")), TOOL_TIMEOUT_MS)
        ),
      ]);
      const files = (res as { data?: { files?: Array<{ id?: string; name?: string; mimeType?: string; webViewLink?: string; modifiedTime?: string }> } }).data?.files ?? [];
      const items = files.map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        webViewLink: f.webViewLink,
        modifiedTime: f.modifiedTime,
      }));
      return { success: true, data: { files: items } };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: `googleDriveSearch failed: ${message}` };
    }
  },
};
