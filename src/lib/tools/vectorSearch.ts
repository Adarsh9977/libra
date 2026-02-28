import { embedText } from "@/lib/vector/embeddings";
import { similaritySearch, type SimilarityResult } from "@/lib/vector/similarity";
import type { Tool } from "./types";

export type VectorSearchInput = { query: string; topK?: number };

/**
 * Vector similarity search over ingested Drive documents (pgvector).
 * Returns top-k chunks with content and metadata.
 */
export const vectorSearchTool: Tool = {
  name: "vectorSearch",
  description:
    "Search the user's ingested document chunks by semantic similarity (vector search). Use when the user asks about content that has been synced from Google Drive. Returns relevant text chunks with metadata.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Natural language query to find relevant document chunks",
      },
      topK: {
        type: "number",
        description: "Number of top results (default 5)",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  async execute(input: unknown): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const parsed = input as VectorSearchInput;
    const query = typeof parsed?.query === "string" ? parsed.query.trim() : "";
    if (!query) {
      return { success: false, error: "Missing or invalid 'query' string" };
    }
    const topK = Math.min(Math.max(1, Number(parsed?.topK) || 5), 20);
    try {
      const embedding = await embedText(query);
      const results: SimilarityResult[] = await similaritySearch(embedding, topK);

      const chunks = results.map((r) => ({
        id: r.id,
        document_id: r.document_id,
        document_name: r.document_name,
        content: r.content,
        metadata: r.metadata,
        distance: r.distance,
      }));
      // Collect unique document names for the LLM to use as sources
      const source_documents = Array.from(new Set(results.map((r) => r.document_name)));
      return { success: true, data: { chunks, source_documents } };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: `vectorSearch failed: ${message}` };
    }
  },
};
