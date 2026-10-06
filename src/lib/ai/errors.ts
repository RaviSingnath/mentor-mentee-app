/** Anything the Gemini API answers with a non-success status. */
export class GeminiHttpError extends Error {
  constructor(
    public readonly status: number,
    detail: string,
    what = "Gemini request",
  ) {
    super(`${what} failed (${status})${detail ? `: ${detail.slice(0, 200)}` : ""}`);
    this.name = "GeminiHttpError";
  }
}

/**
 * The free-tier quota (requests per minute or per day) is used up. Shown to people as-is, so the text is
 * written for them: say what happened, that it is temporary, and roughly when to try again when Google tells us.
 */
export class GeminiRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds?: number) {
    super(rateLimitMessage(retryAfterSeconds));
    this.name = "GeminiRateLimitError";
  }
}

/** Google says the model is overloaded (500/502/503/504). Temporary; shown to people as-is. */
export class GeminiUnavailableError extends GeminiHttpError {
  public readonly userMessage = "The AI service is very busy right now. Please try again in a minute.";
  constructor(status: number, detail: string, what = "Gemini request") {
    super(status, detail, what);
    this.name = "GeminiUnavailableError";
  }
}

export const isTransientStatus = (s: number) => s === 500 || s === 502 || s === 503 || s === 504;

export class GeminiBlockedError extends Error {
  constructor() {
    super("The AI could not answer this question. Try rephrasing it.");
    this.name = "GeminiBlockedError";
  }
}

export function rateLimitMessage(retryAfterSeconds?: number): string {
  const base = "The AI service's free usage limit has been reached.";
  if (retryAfterSeconds === undefined || !Number.isFinite(retryAfterSeconds) || retryAfterSeconds <= 0) {
    return `${base} Please try again in a little while.`;
  }
  if (retryAfterSeconds <= 90) return `${base} Please try again in about ${Math.max(1, Math.ceil(retryAfterSeconds))} seconds.`;
  if (retryAfterSeconds <= 3600) return `${base} Please try again in about ${Math.ceil(retryAfterSeconds / 60)} minutes.`;
  return `${base} Please try again later today or tomorrow.`;
}

/** Seconds to wait, from Google's error body (details[].retryDelay such as "34s") or a Retry-After header. */
export function parseRetryAfter(body: string, header?: string | null): number | undefined {
  try {
    const details = (JSON.parse(body) as { error?: { details?: { retryDelay?: string }[] } }).error?.details ?? [];
    for (const d of details) {
      const m = typeof d.retryDelay === "string" ? d.retryDelay.match(/^(\d+(?:\.\d+)?)s$/) : null;
      if (m) return Number(m[1]);
    }
  } catch {
    /* not JSON */
  }
  const h = header ? Number(header) : NaN;
  return Number.isFinite(h) ? h : undefined;
}

export const isRateLimit = (e: unknown): e is GeminiRateLimitError => e instanceof GeminiRateLimitError;

/** Turn any non-OK Gemini response into the right error. */
export async function errorFromResponse(res: Response, what: string): Promise<GeminiHttpError | GeminiRateLimitError> {
  const body = await res.text().catch(() => "");
  if (res.status === 429) return new GeminiRateLimitError(parseRetryAfter(body, res.headers.get("retry-after")));
  if (isTransientStatus(res.status)) return new GeminiUnavailableError(res.status, body, what);
  return new GeminiHttpError(res.status, body, what);
}
