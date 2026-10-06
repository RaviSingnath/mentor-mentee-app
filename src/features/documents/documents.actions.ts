"use server";

import { revalidatePath } from "next/cache";
import { zDocumentId, zRename, zUploadRequest } from "./documents.schema";
import { ActionResponse } from "@/lib/types/action-response";
import { getZodFieldErrors } from "@/lib/helper/get-zod-field-errors";
import {
  createUploadService,
  deleteDocumentService,
  getDocumentDownloadUrlService,
  ingestDocumentStepService,
  renameDocumentService,
} from "./documents.services";
import { ERROR_CODES } from "@/lib/errors/error-codes";
import { handleError } from "@/lib/errors/handle-error";

/**
 * Step 1 of an upload. Registers the document and returns a one-time signed URL; the browser then sends the file
 * straight to Storage (so it never passes through a Vercel function and its body-size limit).
 */
export async function createUploadAction(input: unknown): Promise<
  ActionResponse<{
    document_id: string;
    signed_url: string;
  }>
> {
  const validatedFields = zUploadRequest.safeParse(input);

  if (!validatedFields.success) {
    return {
      success: false,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "Validation failed",
      errors: getZodFieldErrors(validatedFields.error),
    };
  }

  const v = validatedFields.data;

  const { document_id, signed_url } = await createUploadService(v);

  revalidatePath("/documents");

  return {
    success: true,
    data: { document_id: document_id, signed_url: signed_url },
  };
}

/**
 * Step 2, called repeatedly by the browser until `done`. Only the uploader can process a document.
 * Also the "Retry" and "Resume" action: a failed or half-processed document simply continues or restarts.
 */
export async function ingestDocumentStepAction(input: unknown): Promise<
  ActionResponse<{
    done: boolean;
    embedded: number;
    total: number;
  }>
> {
  const validatedFields = zDocumentId.safeParse(input);

  if (!validatedFields.success) {
    return {
      success: false,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "Validation failed",
      errors: getZodFieldErrors(validatedFields.error),
    };
  }

  const doc = validatedFields.data;

  const result = await ingestDocumentStepService(doc.document_id);

  if (!result.success || result.data?.done) revalidatePath("/documents");

  return result;
}

/** Rename only: the file and its embeddings are unchanged. Owner only. */
export async function renameDocumentAction(
  input: unknown,
): Promise<ActionResponse> {
  const validatedFields = zRename.safeParse(input);

  if (!validatedFields.success) {
    return {
      success: false,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "Validation failed",
      errors: getZodFieldErrors(validatedFields.error),
    };
  }

  const doc = validatedFields.data;

  const result = await renameDocumentService(doc.document_id, doc.title);

  if (!result.success) revalidatePath("/documents");

  return { success: true };
}

/** Deletes the stored file, then the row (its chunks go with it). The uploader or any admin can do this. */
export async function deleteDocumentAction(
  input: unknown,
): Promise<ActionResponse<{ signedUrl: string }>> {
  try {
    const validatedFields = zDocumentId.safeParse(input);

    if (!validatedFields.success) {
      return {
        success: false,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: "Validation failed",
        errors: getZodFieldErrors(validatedFields.error),
      };
    }

    const doc = validatedFields.data;

    await deleteDocumentService(doc.document_id);

    revalidatePath("/documents");

    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

/** A link that works for one minute. The uploader or any admin can download. */
export async function getDocumentDownloadUrlAction(
  input: unknown,
): Promise<ActionResponse<{ signedUrl: string }>> {
  try {
    const validatedFields = zDocumentId.safeParse(input);

    if (!validatedFields.success) {
      return {
        success: false,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: "Validation failed",
        errors: getZodFieldErrors(validatedFields.error),
      };
    }

    const doc = validatedFields.data;

    const result = await getDocumentDownloadUrlService(doc.document_id);

    return {
      success: true,
      data: {
        signedUrl: result.signedUrl,
      },
    };
  } catch (error) {
    return handleError(error);
  }
}
