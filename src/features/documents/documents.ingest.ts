import { createHash } from "node:crypto";
import { embedDocumentChunks } from "@/lib/ai/embeddings";
import { chunkPages, MAX_CHUNKS_PER_DOCUMENT } from "./documents.chunking";
import { extractPages } from "./documents.extract";
import type { TDocumentMime } from "./documents.schema";
import { createAdminClient } from "../../../supabase/admin";
import { ActionResponse } from "@/lib/types/action-response";
import {
  deleteDocumentChunksMutation,
  updateDocumentProcessingMutation,
  updateDocumentReadyMutation,
  updateFailedDocumentMutation,
  upsertDocumentChunkMutation,
} from "./documents.mutations";
import { ERROR_CODES } from "@/lib/errors/error-codes";
import {
  getChunkByDocumentIdQuery,
  getDocumentsFileFieldsQuery,
} from "./documents.queries";
import { mapSupabaseError } from "@/lib/errors/supabase-error";

/** Chunks embedded per server call. Small enough for a Vercel Hobby time limit even on a big PDF. */
export const INGEST_BATCH = 20;
export const DOCUMENTS_BUCKET = "documents";

export type IngestResult =
  | { success: true; done: boolean; embedded: number; total: number }
  | { success: false; error: string };

export interface IngestDeps {
  extract: typeof extractPages;
  embed: typeof embedDocumentChunks;
}
const defaultDeps: IngestDeps = {
  extract: extractPages,
  embed: embedDocumentChunks,
};

interface DocRow {
  id: string;
  title: string;
  storage_path: string;
  mime_type: TDocumentMime;
  content_hash: string | null;
  status: "uploaded" | "processing" | "ready" | "failed";
}

type ActionFailure = Extract<ActionResponse, { success: false }>;

async function fail(id: string, message: string): Promise<ActionFailure> {
  // Remove partial chunks so a retry starts from a clean slate and search never sees half a document.
  await deleteDocumentChunksMutation(id);

  await updateFailedDocumentMutation(id, message);

  return {
    success: false,
    code: ERROR_CODES.PARTIAL_CHUNK_FAIL,
    message: message,
  };
}

/**
 * Does one slice of the work for a document and reports progress; the browser calls it again until `done`.
 *
 * Why in slices: embedding a long document in one request would exceed a Vercel Hobby function's time limit.
 * Each call downloads the file, re-extracts and re-chunks it (deterministic, so chunk numbers are stable),
 * embeds the next INGEST_BATCH chunks and stores them. The number of chunks already stored says where to continue,
 * so it is safe to retry, to resume after closing the tab, and to run twice at once (inserts are upserts).
 * A document becomes `ready` (searchable) only after its last chunk is stored. Failures mark it `failed`
 * with a reason, and calling again on a failed document starts over.
 */
export async function ingestStep(
  documentId: string,
  deps: IngestDeps = defaultDeps,
): Promise<
  ActionResponse<{
    done: boolean;
    embedded: number;
    total: number;
  }>
> {
  const admin = createAdminClient();

  const { data, error } = await getDocumentsFileFieldsQuery(documentId);

  if (error) throw mapSupabaseError(error);
  if (!data)
    return {
      success: false,
      code: ERROR_CODES.NOT_FOUND,
      message: "Document not found",
    };

  const doc = data as DocRow;

  if (doc.status === "ready") {
    const chunk = await getChunkByDocumentIdQuery(doc.id);

    if (chunk.error) throw mapSupabaseError(chunk.error);

    const { count } = chunk;

    return {
      success: true,
      data: { done: true, embedded: count ?? 0, total: count ?? 0 },
    };
  }

  try {
    if (doc.status !== "processing") {
      await updateDocumentProcessingMutation(doc.id);
    }

    const file = await admin.storage
      .from(DOCUMENTS_BUCKET)
      .download(doc.storage_path);

    if (file.error || !file.data)
      return await fail(
        doc.id,
        "The uploaded file could not be found. Please upload it again.",
      );

    const bytes = new Uint8Array(await file.data.arrayBuffer());

    // The browser told us the hash before uploading; confirm the stored bytes are really that file.
    const hash = createHash("sha256").update(bytes).digest("hex");

    if (doc.content_hash && doc.content_hash !== hash)
      return await fail(
        doc.id,
        "The uploaded file did not match. Please upload it again.",
      );

    const chunks = chunkPages(await deps.extract(bytes, doc.mime_type));
    if (chunks.length === 0) {
      return await fail(
        doc.id,
        "No readable text found. Scanned or image-only files are not supported.",
      );
    }
    if (chunks.length > MAX_CHUNKS_PER_DOCUMENT) {
      return await fail(
        doc.id,
        `This document is too long (limit ${MAX_CHUNKS_PER_DOCUMENT} sections). Please split it.`,
      );
    }

    const stored = await getChunkByDocumentIdQuery(doc.id);

    if (stored.error) throw mapSupabaseError(stored.error);

    const start = stored.count ?? 0;

    const batch = chunks.slice(start, start + INGEST_BATCH);
    if (batch.length > 0) {
      const vectors = await deps.embed(
        doc.title,
        batch.map((c) => c.content),
      );
      const rows = batch.map((c, i) => ({
        document_id: doc.id,
        chunk_index: c.index,
        content: c.content,
        token_count: c.tokenCount,
        page_number: c.page,
        embedding: JSON.stringify(vectors[i]), // pgvector accepts "[0.1,0.2,...]"
      }));

      const { error: insertError } = await upsertDocumentChunkMutation(rows);

      if (insertError) throw mapSupabaseError(insertError);
    }

    const embedded = start + batch.length;
    const done = embedded >= chunks.length;
    if (done) {
      await updateDocumentReadyMutation(doc.id, chunks.length);
    }
    return { success: true, data: { done, embedded, total: chunks.length } };
  } catch (e) {
    return fail(doc.id, e instanceof Error ? e.message : "Processing failed");
  }
}
