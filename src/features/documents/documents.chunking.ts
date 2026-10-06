export interface PageText {
  /** 1-based page number for PDFs; null for Word files (no fixed pages). */
  page: number | null;
  text: string;
}

export interface Chunk {
  index: number;
  page: number | null;
  content: string;
  tokenCount: number;
}

// About 800 tokens per chunk (roughly 4 characters per token), with a little overlap so a sentence cut at a
// boundary is still whole in one of the two chunks. Gemini Embedding 2 accepts 8192 tokens, so this is far inside the limit.
export const CHUNK_TARGET_CHARS = 3200;
export const CHUNK_OVERLAP_CHARS = 400;
/** Documents that would need more chunks than this are rejected, so one upload cannot cost an unbounded amount to embed. */
export const MAX_CHUNKS_PER_DOCUMENT = 800;

export const estimateTokens = (s: string) => Math.ceil(s.length / 4);

/** Collapse whitespace noise from PDF/Word extraction but keep paragraph breaks. */
export function cleanText(raw: string): string {
  return raw
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Split into sentence-ish units; a single unit longer than `max` is hard-cut. */
function units(text: string, max: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n{2,}/)) {
    const p = para.trim();
    if (!p) continue;
    const sentences = p.match(/[^.!?\n]+(?:[.!?]+["')\]]*\s*|\n|$)/g) ?? [p];
    for (const s of sentences) {
      let rest = s.trim();
      while (rest.length > max) {
        out.push(rest.slice(0, max));
        rest = rest.slice(max);
      }
      if (rest) out.push(rest);
    }
    out.push("\n"); // paragraph marker
  }
  return out;
}

/**
 * Deterministic: the same pages always produce the same chunks in the same order. Ingestion relies on that to
 * resume across several short server calls (it re-chunks each time and continues from the number already stored).
 * Chunks never span pages, so a citation can always name one page.
 */
export function chunkPages(pages: PageText[], target = CHUNK_TARGET_CHARS, overlap = CHUNK_OVERLAP_CHARS): Chunk[] {
  const chunks: Chunk[] = [];

  for (const { page, text } of pages) {
    const cleaned = cleanText(text);
    if (!cleaned) continue;

    let buffer = "";
    const flush = () => {
      const content = buffer.trim();
      if (content) chunks.push({ index: chunks.length, page, content, tokenCount: estimateTokens(content) });
    };

    for (const u of units(cleaned, target)) {
      if (u === "\n") {
        if (buffer && !buffer.endsWith("\n\n")) buffer += "\n\n";
        continue;
      }
      const joined = buffer ? (buffer.endsWith("\n") ? buffer + u : buffer + " " + u) : u;
      if (joined.length > target && buffer.trim()) {
        flush();
        const tail = buffer.trim().slice(-overlap);
        const cut = tail.search(/\s/); // start the overlap on a word boundary
        buffer = (cut > 0 && cut < tail.length ? tail.slice(cut + 1) : tail) + " " + u;
      } else {
        buffer = joined;
      }
    }
    flush();
  }
  return chunks;
}
