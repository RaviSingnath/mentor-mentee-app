// Gemini Embedding 2 over REST. Output is cut to 1536 dimensions to match document_chunks.embedding vector(1536)
// (HNSW supports at most 2000). The model has no taskType parameter: the task goes in the text itself, and the
// API normalises truncated vectors, so no manual normalisation is needed.

export const EMBEDDING_DIMENSIONS = 1536;
const DEFAULT_MODEL = "gemini-embedding-2";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

export type FetchLike = typeof fetch;

/** Text format Google documents for the document side of retrieval. */
export const documentText = (title: string | null, content: string) => `title: ${title?.trim() || "none"} | text: ${content}`;
/** Text format for the question side. Use this one in chat. */
export const queryText = (question: string) => `task: search result | query: ${question}`;

interface Options {
  apiKey?: string;
  model?: string;
  fetchImpl?: FetchLike;
}

async function embedBatch(texts: string[], { apiKey, model, fetchImpl = fetch }: Options): Promise<number[][]> {
  const key = apiKey ?? process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  const modelName = model ?? process.env.GEMINI_EMBEDDING_MODEL ?? DEFAULT_MODEL;

  const res = await fetchImpl(`${BASE}/models/${modelName}:batchEmbedContents`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: `models/${modelName}`,
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      })),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Embedding request failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
  const json = (await res.json()) as { embeddings?: { values?: number[] }[] };
  const vectors = json.embeddings?.map((e) => e.values ?? []) ?? [];
  if (vectors.length !== texts.length) throw new Error("Embedding response had the wrong number of vectors");
  for (const v of vectors) {
    if (v.length !== EMBEDDING_DIMENSIONS) throw new Error(`Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${v.length}`);
  }
  return vectors;
}

/** Embed document chunks. Retries once on a rate limit or server error. */
export async function embedDocumentChunks(title: string, chunks: string[], options: Options = {}): Promise<number[][]> {
  const texts = chunks.map((c) => documentText(title, c));
  try {
    return await embedBatch(texts, options);
  } catch (e) {
    if (e instanceof Error && /\((429|5\d\d)\)/.test(e.message)) {
      await new Promise((r) => setTimeout(r, 1500));
      return embedBatch(texts, options);
    }
    throw e;
  }
}

/** Embed a user question for search (used by chat). */
export async function embedQuestion(question: string, options: Options = {}): Promise<number[]> {
  const [v] = await embedBatch([queryText(question)], options);
  return v;
}
