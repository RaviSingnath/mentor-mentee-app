import { createRequestContext } from "@/lib/auth/request-context";
import {
  getCallerQuery,
  getDocumentsByIdQuery,
  getDocumentSignedUrlQuery,
  getDuplicateDocumentsQuery,
} from "./documents.queries";
import { mapSupabaseError } from "@/lib/errors/supabase-error";
import { storagePathFor, TUploadRequest } from "./documents.schema";
import {
  createDocumentsMutation,
  deleteDocumentMutation,
  deleteDocumentsMutation,
  deletestoredDocumentMutation,
  getDocumentDownloadUrlMutation,
  updateDocumentTitleMutation,
} from "./documents.mutations";
import { Errors } from "@/lib/errors/error-factory";
import { throwOnStorageError } from "@/lib/errors/storage-error";
import { ingestStep } from "./documents.ingest";
import { ActionResponse } from "@/lib/types/action-response";
import { ERROR_CODES } from "@/lib/errors/error-codes";

type DocAccess = {
  id: string;
  uploaded_by: string;
  title: string;
  original_filename: string;
  storage_path: string;
  status: string;
};

export async function getCallerService() {
  const ctx = await createRequestContext();

  const userId = ctx.user.id;

  const [active, admin] = await getCallerQuery();

  const { error } = active;

  if (error) throw mapSupabaseError(error);

  return { userId: userId, isAdmin: admin.data === true };
}

/** Loads a document with the service role, then applies the access rule ourselves: owner always, admin only when allowed. */
async function loadAccessible(
  documentId: string,
  caller: { userId: string; isAdmin: boolean },
  adminMayAccess: boolean,
) {
  const { data, error } = await getDocumentsByIdQuery(documentId);

  if (error) {
    throw mapSupabaseError(error);
  }

  const doc = data as DocAccess | null;

  if (!doc) return null;

  if (doc.uploaded_by === caller.userId || (adminMayAccess && caller.isAdmin))
    return { doc };

  return null; // same answer as "missing", so ids of other people's documents cannot be probed
}

type CreateUploadResult = {
  document_id: string;
  signed_url: string;
};

type ingestDocumentStepResult = ActionResponse<{
  done: boolean;
  embedded: number;
  total: number;
  signedUrl?: string;
}>;
export async function createUploadService(
  v: TUploadRequest,
): Promise<CreateUploadResult> {
  const caller = await getCallerService();

  const duplicate = await getDuplicateDocumentsQuery(
    caller.userId,
    v.content_hash,
  );

  if (duplicate.data) {
    throw Errors.alreadyExists("File");
  }

  const documentId = crypto.randomUUID();
  const path = storagePathFor(caller.userId, documentId, v.filename);

  const { error } = await createDocumentsMutation(
    documentId,
    caller.userId,
    path,
    v,
  );

  if (error) {
    throw mapSupabaseError(error);
  }

  const result = await getDocumentSignedUrlQuery(path);

  const { data: docData, error: docError } = result;

  if (docError || !docData.signedUrl) {
    await deleteDocumentsMutation(documentId);

    throw throwOnStorageError(result);
  }

  return {
    document_id: documentId,
    signed_url: docData.signedUrl,
  };
}

export async function ingestDocumentStepService(
  documentId: string,
): Promise<ingestDocumentStepResult> {
  const caller = await getCallerService();

  const found = await loadAccessible(documentId, caller, false);

  if (!found) throw Errors.notFound("Document not found");

  const result = await ingestStep(found.doc.id);

  return result;
}

export async function renameDocumentService(
  documentId: string,
  title: string,
): Promise<ingestDocumentStepResult> {
  const caller = await getCallerService();

  const found = await loadAccessible(documentId, caller, false);

  if (!found) throw Errors.notFound("Document not found");

  const { data, error } = await updateDocumentTitleMutation(
    found.doc.id,
    title,
  );

  if (error || !data)
    return {
      success: false,
      code: ERROR_CODES.DATABASE_ERROR,
      message: "Could not rename the document",
    };

  return { success: true, data: data };
}

export async function deleteDocumentService(
  documentId: string,
): Promise<ingestDocumentStepResult> {
  const caller = await getCallerService();

  const found = await loadAccessible(documentId, caller, true);

  if (!found) throw Errors.notFound("Document not found");

  // Storage first: if this fails the row stays, so the person can retry and no file is left behind unreferenced.
  const removed = await deletestoredDocumentMutation(found.doc.storage_path);

  if (removed.error) throw throwOnStorageError(removed);

  const { data, error } = await deleteDocumentMutation(found.doc.id);
  if (error) throw mapSupabaseError(error);

  if (error || !data)
    return {
      success: false,
      code: ERROR_CODES.DATABASE_ERROR,
      message: "Could not delete the document",
    };

  return { success: true, data: data };
}

export type DocumentDownloadUrlResult = {
  signedUrl: string;
};

export async function getDocumentDownloadUrlService(
  documentId: string,
): Promise<DocumentDownloadUrlResult> {
  const caller = await getCallerService();

  const found = await loadAccessible(documentId, caller, true);

  if (!found) throw Errors.notFound("Document not found");

  const signed = await getDocumentDownloadUrlMutation(
    found.doc.storage_path,
    found.doc.original_filename,
  );

  if (signed.error || !signed.data) {
    throw throwOnStorageError(signed);
  }

  return { signedUrl: signed.data.signedUrl };
}
