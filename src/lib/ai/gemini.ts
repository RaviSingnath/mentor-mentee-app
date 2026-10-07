import {
  errorFromResponse,
  GeminiBlockedError,
  GeminiHttpError,
  GeminiRateLimitError,
  GeminiUnavailableError,
} from "./errors";

// Text generation with Gemini Flash over REST, streamed as server-sent events.
// The model name is configurable (GEMINI_CHAT_MODEL) because Google retires and renames models regularly.
export const DEFAULT_CHAT_MODEL = "gemini-3.8-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export type GeminiEvent =
  | { type: "text"; text: string }
  | { type: "done"; finishReason: string | null };

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
  /** Longest wait for the first reply, and for each following piece of the stream. Default 20s (env GEMINI_STALL_MS). */
  stallMs?: number;
  /** Total time allowed for the whole call including retries. Default 50s, under the route's 60s limit (env GEMINI_TOTAL_MS). */
  totalMs?: number;
}

const envMs = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Resolves with the value, or rejects with GeminiUnavailableError when nothing happens for `ms`. */
async function withStall<T>(
  work: Promise<T>,
  ms: number,
  onTimeout: () => void,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stalled = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      // reject first: aborting makes the pending work settle too, and the timeout must be what the caller sees
      reject(
        new GeminiUnavailableError(
          504,
          `no response from the model for ${Math.round(ms / 1000)}s`,
          "Chat request",
        ),
      );
      onTimeout();
    }, ms);
  });
  try {
    return await Promise.race([work, stalled]);
  } finally {
    clearTimeout(timer);
    work.catch(() => {}); // the aborted request rejects later; nobody is waiting for it
  }
}

const RETRY_DELAYS_MS = [800, 2000]; // up to 3 tries per model when Google says "overloaded"

interface Chunk {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; status?: string; message?: string };
}

/** Streams the answer as it is written. Throws GeminiRateLimitError when the free quota is used up. */
export async function* streamGemini(o: Options): AsyncGenerator<GeminiEvent> {
  const key = o.apiKey ?? process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  const model = o.model ?? process.env.GEMINI_CHAT_MODEL ?? DEFAULT_CHAT_MODEL;
  const fetchImpl = o.fetchImpl ?? fetch;

  const sleep =
    o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const fallback = process.env.GEMINI_CHAT_FALLBACK_MODEL;
  const models = fallback && fallback !== model ? [model, fallback] : [model];

  const stallMs = o.stallMs ?? envMs("GEMINI_STALL_MS", 20_000);
  const deadline = Date.now() + (o.totalMs ?? envMs("GEMINI_TOTAL_MS", 50_000));
  // Optional: set GEMINI_THINKING_LEVEL (e.g. "low") to make a "thinking" model answer faster.
  const thinkingLevel = process.env.GEMINI_THINKING_LEVEL;

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: o.system }] },
    contents: o.turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    generationConfig: {
      temperature: o.temperature ?? 0.2,
      maxOutputTokens: o.maxOutputTokens ?? 2048,
      ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
    },
  });

  // Overload (503 and friends) is usually brief: retry quietly before the stream starts, then try the fallback model if one is set.
  let res: Response | undefined;
  let lastError: unknown;
  let controller = new AbortController();
  let mainError: unknown; // why the main model failed, kept for when the fallback fails for a different reason
  for (const m of models) {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      controller = new AbortController();
      const started = Date.now();
      try {
        res = await withStall(
          fetchImpl(`${BASE}/models/${m}:streamGenerateContent?alt=sse`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-goog-api-key": key,
            },
            body,
            signal: controller.signal,
          }),
          Math.min(stallMs, remaining),
          () => controller.abort(),
        );
      } catch (e) {
        if (!(e instanceof GeminiUnavailableError)) throw e;
        lastError = e; // the model did not answer in time: same as "busy", so retry or use the fallback model
        console.warn(
          `gemini ${m}: no reply after ${Date.now() - started}ms (attempt ${attempt + 1})`,
        );
        break; // a silent model will not be quicker a second time: go straight to the fallback
      }
      if (res.ok) break;
      lastError = await errorFromResponse(res, "Chat request");
      // Each model has its own free quota, so a used-up quota also moves on to the fallback model (no waiting).
      if (lastError instanceof GeminiRateLimitError) break;
      if (!(lastError instanceof GeminiUnavailableError)) {
        // 400, 404...: retrying will not help. A broken fallback (say a retired model name) must not hide why the main model failed.
        if (m !== models[0] && mainError) throw mainError;
        throw lastError;
      }
      if (
        attempt < RETRY_DELAYS_MS.length &&
        deadline - Date.now() > RETRY_DELAYS_MS[attempt]
      )
        await sleep(RETRY_DELAYS_MS[attempt]);
      else break;
    }
    if (res?.ok) break;
    mainError ??= lastError;
  }
  if (!res || !res.ok)
    throw (
      lastError ??
      new GeminiUnavailableError(
        504,
        "ran out of time before the model answered",
        "Chat request",
      )
    );
  if (!res.body)
    throw new GeminiHttpError(502, "empty response", "Chat request");

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
      if (
        chunk.error.code === 429 ||
        chunk.error.status === "RESOURCE_EXHAUSTED"
      )
        throw new GeminiRateLimitError();
      throw new GeminiHttpError(
        chunk.error.code ?? 500,
        chunk.error.message ?? "",
        "Chat request",
      );
    }
    if (chunk.promptFeedback?.blockReason) throw new GeminiBlockedError();
    const cand = chunk.candidates?.[0];
    const text = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    if (text) yield { type: "text", text };
    if (cand?.finishReason) finishReason = cand.finishReason;
  };

  while (true) {
    // each piece must arrive in time, otherwise a hung connection would leave the question "writing" until the platform kills it
    const { done, value } = await withStall(
      reader.read(),
      Math.min(stallMs, Math.max(1000, deadline - Date.now())),
      () => {
        controller.abort();
        reader.cancel().catch(() => {});
      },
    );
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() ?? "";
    for (const part of parts) yield* handle(part);
  }
  buffer += decoder.decode();
  if (buffer.trim()) yield* handle(buffer);

  if (
    finishReason === "SAFETY" ||
    finishReason === "BLOCKLIST" ||
    finishReason === "PROHIBITED_CONTENT"
  )
    throw new GeminiBlockedError();
  yield { type: "done", finishReason };
}
