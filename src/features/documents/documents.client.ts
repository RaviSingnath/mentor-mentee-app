import { ingestDocumentStepAction } from "./documents.actions";

export async function sha256Hex(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Sends the file to Supabase Storage using the one-time signed URL from createUploadAction.
 * This mirrors what supabase-js's uploadToSignedUrl sends (a multipart PUT), without needing a browser client here.
 */
export async function putToSignedUrl(signedUrl: string, file: File, fetchImpl: typeof fetch = fetch): Promise<{ ok: true } | { ok: false; error: string }> {
  const form = new FormData();
  form.append("cacheControl", "3600");
  form.append("", file);
  try {
    const res = await fetchImpl(signedUrl, { method: "PUT", headers: { "x-upsert": "false" }, body: form });
    return res.ok ? { ok: true } : { ok: false, error: `Upload failed (${res.status})` };
  } catch {
    return { ok: false, error: "Upload failed. Check your connection and try again." };
  }
}

export interface IngestProgress {
  embedded: number;
  total: number;
}

const MAX_STEPS = 200; // 800 chunks / 20 per step is 40; this only guards against a loop that never advances

/** Calls the server step again and again until the document is searchable, reporting progress after each call. */
export async function runIngestLoop(
  documentId: string,
  onProgress?: (p: IngestProgress) => void,
  step: (input: unknown) => ReturnType<typeof ingestDocumentStepAction> = ingestDocumentStepAction,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let last = -1;
  for (let i = 0; i < MAX_STEPS; i++) {
    const r = await step({ document_id: documentId });
    if (!r.ok) return { ok: false, error: r.error };
    onProgress?.({ embedded: r.embedded, total: r.total });
    if (r.done) return { ok: true };
    if (r.embedded <= last) return { ok: false, error: "Processing stopped making progress. Please retry." };
    last = r.embedded;
  }
  return { ok: false, error: "Processing took too many steps. Please retry." };
}
