import type { TDocumentMime, TDocumentStatus } from "./documents.schema";
import createClient from "../../../supabase/server";
import { supabaseAdmin } from "../../../supabase/admin";
import { DOCUMENTS_BUCKET } from "./documents.ingest";

export interface DocumentRow {
  id: string;
  title: string;
  original_filename: string;
  mime_type: TDocumentMime;
  size_bytes: number;
  status: TDocumentStatus;
  error_message: string | null;
  chunk_count: number;
  created_at: string;
  uploaded_by: string;
  /** Filled for admins only (they see everyone's documents); null for members, who only see their own. */
  uploader_name: string | null;
}

/**
 * Lists documents through the caller's own session, so RLS decides what comes back: a member gets only their own
 * documents, an admin gets all of them. Uploader names are looked up with the service-role client, and only when
 * the caller is an admin (checked by the caller of this function).
 */
export async function listDocuments(isAdmin: boolean): Promise<DocumentRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, title, original_filename, mime_type, size_bytes, status, error_message, chunk_count, created_at, uploaded_by",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`documents load failed: ${error.message}`);

  const rows = ((data ?? []) as Omit<DocumentRow, "uploader_name">[]).map(
    (r) => ({ ...r, uploader_name: null as string | null }),
  );

  if (isAdmin && rows.length > 0) {
    const ids = [...new Set(rows.map((r) => r.uploaded_by))];

    const { data: people } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    const names = new Map(
      ((people ?? []) as { id: string; full_name: string | null }[]).map(
        (p) => [p.id, p.full_name],
      ),
    );
    for (const r of rows)
      r.uploader_name = names.get(r.uploaded_by) ?? "Unknown";
  }
  return rows;
}

/** Who is calling: must be signed in and an active member (mentor, mentee, admin or super_admin). */
export async function getCallerQuery() {
  const supabase = await createClient();

  return await Promise.all([
    supabase.rpc("is_active_member"),
    supabase.rpc("is_admin"),
  ]);
}

export async function getDuplicateDocumentsQuery(
  callerId: string,
  contentHash: string,
) {
  return supabaseAdmin
    .from("documents")
    .select("title")
    .eq("uploaded_by", callerId)
    .eq("content_hash", contentHash)
    .maybeSingle();
}

export const getDocumentSignedUrlQuery = async (path: string) => {
  return supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUploadUrl(path);
};

export async function getDocumentsByIdQuery(documentId: string) {
  return supabaseAdmin
    .from("documents")
    .select("id, uploaded_by, title, original_filename, storage_path, status")
    .eq("id", documentId)
    .maybeSingle();
}

export async function getDocumentsFileFieldsQuery(documentId: string) {
  return supabaseAdmin
    .from("documents")
    .select("id, title, storage_path, mime_type, content_hash, status")
    .eq("id", documentId)
    .maybeSingle();
}

export async function getChunkByDocumentIdQuery(documentId: string) {
  return supabaseAdmin
    .from("document_chunks")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId);
}
