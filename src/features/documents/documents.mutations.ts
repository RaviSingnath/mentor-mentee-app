import { createAdminClient } from "../../../supabase/admin";
import { titleFromFilename, TUploadRequest } from "./documents.schema";
import { Database } from "../../../supabase/database.types";
import { DOCUMENTS_BUCKET } from "./documents.ingest";

type ChunkInsert = Database["public"]["Tables"]["document_chunks"]["Insert"];

export async function createDocumentsMutation(
  documentId: string,
  callerId: string,
  path: string,
  v: TUploadRequest,
) {
  const supabaseAdmin = createAdminClient();

  return supabaseAdmin.from("documents").insert({
    id: documentId,
    uploaded_by: callerId,
    title: v.title?.trim() || titleFromFilename(v.filename),
    original_filename: v.filename,
    storage_path: path,
    mime_type: v.mime_type,
    size_bytes: v.size_bytes,
    content_hash: v.content_hash,
  });
}

export async function deleteDocumentsMutation(documentId: string) {
  const supabaseAdmin = createAdminClient();

  return supabaseAdmin.from("documents").delete().eq("id", documentId);
}

export async function deleteDocumentChunksMutation(documentId: string) {
  const supabaseAdmin = createAdminClient();

  return supabaseAdmin
    .from("document_chunks")
    .delete()
    .eq("document_id", documentId);
}

export async function updateFailedDocumentMutation(
  documentId: string,
  message: string,
) {
  const supabaseAdmin = createAdminClient();

  return supabaseAdmin
    .from("documents")
    .update({
      status: "failed",
      error_message: message.slice(0, 500),
      chunk_count: 0,
    })
    .eq("id", documentId);
}

export async function updateDocumentProcessingMutation(documentId: string) {
  const supabaseAdmin = createAdminClient();

  return supabaseAdmin
    .from("documents")
    .update({ status: "processing", error_message: null })
    .eq("id", documentId);
}

export async function updateDocumentReadyMutation(
  documentId: string,
  chunkCount: number,
) {
  const supabaseAdmin = createAdminClient();

  return supabaseAdmin
    .from("documents")
    .update({
      status: "ready",
      chunk_count: chunkCount,
      error_message: null,
    })
    .eq("id", documentId);
}

export async function upsertDocumentChunkMutation(rows: ChunkInsert[]) {
  const supabaseAdmin = createAdminClient();

  return supabaseAdmin
    .from("document_chunks")
    .upsert(rows, { onConflict: "document_id,chunk_index" });
}

export async function updateDocumentTitleMutation(
  documentId: string,
  title: string,
) {
  const supabaseAdmin = createAdminClient();

  return supabaseAdmin
    .from("documents")
    .update({ title: title })
    .eq("id", documentId);
}

export async function deletestoredDocumentMutation(storagePath: string) {
  const supabaseAdmin = createAdminClient();

  return supabaseAdmin.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
}

export async function deleteDocumentMutation(documentId: string) {
  const supabaseAdmin = createAdminClient();

  return supabaseAdmin.from("documents").delete().eq("id", documentId);
}

export async function getDocumentDownloadUrlMutation(
  storagePath: string,
  originalFilename: string,
) {
  const supabaseAdmin = createAdminClient();

  return supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 60, {
      download: originalFilename,
    });
}
