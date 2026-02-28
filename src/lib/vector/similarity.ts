import { getPrisma } from "@/lib/db";
import { EMBEDDING_DIMENSION } from "./embeddings";

export type SimilarityResult = {
  id: string;
  document_id: string;
  document_name: string;
  content: string;
  metadata: Record<string, unknown>;
  distance: number;
};

/**
 * Cosine similarity search: find top-k chunks nearest to the query embedding.
 * Uses pgvector's <=> operator (cosine distance). Lower distance = more similar.
 * @param embedding - Query vector of length EMBEDDING_DIMENSION
 * @param topK - Max number of chunks to return (default 5)
 * @returns Chunks ordered by cosine distance ascending
 */
export async function similaritySearch(
  embedding: number[],
  topK: number = 5
): Promise<SimilarityResult[]> {
  if (embedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Embedding must have dimension ${EMBEDDING_DIMENSION}`);
  }
  const prisma = getPrisma();
  const vectorStr = `[${embedding.join(",")}]`;
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    document_id: string;
    document_name: string;
    content: string;
    metadata: unknown;
    distance: number;
  }>>`
    SELECT c.id, c.document_id, d.name AS document_name, c.content, c.metadata,
           (c.embedding <=> ${vectorStr}::vector) AS distance
    FROM drive_chunks c
    JOIN drive_documents d ON d.id = c.document_id
    ORDER BY c.embedding <=> ${vectorStr}::vector
    LIMIT ${topK}
  `;

  return rows.map((r) => ({
    id: r.id,
    document_id: r.document_id,
    document_name: r.document_name,
    content: r.content,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    distance: Number(r.distance),
  }));
}
