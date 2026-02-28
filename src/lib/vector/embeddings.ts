import OpenAI from "openai";

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey: key });
}

/** OpenAI embedding dimension for text-embedding-3-small */
export const EMBEDDING_DIMENSION = 1536;

/**
 * Generate embedding for a single text using OpenAI text-embedding-3-small.
 * @param text - Input text (max ~8k tokens; we chunk before calling)
 * @returns Normalized embedding vector of length EMBEDDING_DIMENSION
 */
export async function embedText(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.trim() || " ",
  });
  const vector = res.data[0]?.embedding;
  if (!vector || vector.length !== EMBEDDING_DIMENSION) {
    throw new Error("Invalid embedding response");
  }
  return vector;
}

/**
 * Generate embeddings for multiple texts in batch (up to 2048 inputs per request).
 * OpenAI recommends batching for throughput.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const openai = getOpenAI();
  const trimmed = texts.map((t) => t.trim() || " ");
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: trimmed,
  });
  const sorted = [...res.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const vectors = sorted.map((d) => d.embedding);
  if (vectors.some((v) => v.length !== EMBEDDING_DIMENSION)) {
    throw new Error("Invalid embedding dimensions in batch response");
  }
  return vectors;
}
