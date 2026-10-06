import { errorFromResponse, GeminiBlockedError, GeminiHttpError, GeminiRateLimitError, GeminiUnavailableError } from "./errors";

// Text generation with Gemini Flash over REST, streamed as server-sent events.
// The model name is configurable (GEMINI_CHAT_MODEL) because Google retires and renames models regularly.
export const DEFAULT_CHAT_MODEL = "gemini-3.8-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export type GeminiEvent = { type: "text"; text: string } | { type: "done"; finishReason: string | null };

interface Options {
  system: string;
  turns: ChatTurn[];
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  fetchImpl?: typeof fetch;
  /** Waits between retries; replaced in tests. */
  sleep?: (ms: number) => Promise<void>;
}

const RETRY_DELAYS_MS = [800, 2000]; // up to 3 tries per model when Google says "overloaded"

interface Chunk {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; status?: string; message?: string };
}

/** Streams the answer as it is written. Throws GeminiRateLimitError when the free quota is used up. */
export async function* streamGemini(o: Options): AsyncGenerator<GeminiEvent> {
  const key = o.apiKey ?? process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  const model = o.model ?? process.env.GEMINI_CHAT_MODEL ?? DEFAULT_CHAT_MODEL;
  const fetchImpl = o.fetchImpl ?? fetch;

  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const fallback = process.env.GEMINI_CHAT_FALLBACK_MODEL;
  const models = fallback && fallback !== model ? [model, fallback] : [model];

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: o.system }] },
    contents: o.turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    generationConfig: { temperature: o.temperature ?? 0.2, maxOutputTokens: o.maxOutputTokens ?? 1024 },
  });

  // Overload (503 and friends) is usually brief: retry quietly before the stream starts, then try the fallback model if one is set.
  let res: Response | undefined;
  let lastError: unknown;
  for (const m of models) {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      res = await fetchImpl(`${BASE}/models/${m}:streamGenerateContent?alt=sse`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body,
      });
      if (res.ok) break;
      lastError = await errorFromResponse(res, "Chat request");
      // Each model has its own free quota, so a used-up quota also moves on to the fallback model (no waiting).
      if (lastError instanceof GeminiRateLimitError) break;
      if (!(lastError instanceof GeminiUnavailableError)) throw lastError; // 400, 404...: retrying will not help
      if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
    }
    if (res?.ok) break;
  }
  if (!res || !res.ok) throw lastError;
  if (!res.body) throw new GeminiHttpError(502, "empty response", "Chat request");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finishReason: string | null = null;

  const handle = function* (raw: string): Generator<GeminiEvent> {
    const data = raw
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim())
      .join("");
    if (!data || data === "[DONE]") return;
    let chunk: Chunk;
    try {
      chunk = JSON.parse(data) as Chunk;
    } catch {
      return; // a partial or non-JSON keep-alive line
    }
    // errors can also arrive inside the stream after it started
    if (chunk.error) {
      if (chunk.error.code === 429 || chunk.error.status === "RESOURCE_EXHAUSTED") throw new GeminiRateLimitError();
      throw new GeminiHttpError(chunk.error.code ?? 500, chunk.error.message ?? "", "Chat request");
    }
    if (chunk.promptFeedback?.blockReason) throw new GeminiBlockedError();
    const cand = chunk.candidates?.[0];
    const text = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    if (text) yield { type: "text", text };
    if (cand?.finishReason) finishReason = cand.finishReason;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() ?? "";
    for (const part of parts) yield* handle(part);
  }
  buffer += decoder.decode();
  if (buffer.trim()) yield* handle(buffer);

  if (finishReason === "SAFETY" || finishReason === "BLOCKLIST" || finishReason === "PROHIBITED_CONTENT") throw new GeminiBlockedError();
  yield { type: "done", finishReason };
}
