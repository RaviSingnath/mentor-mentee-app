// storage-error.ts
import AppError from "./app-error";
import { ERROR_CODES } from "./error-codes";

// Structural type so we don't need a direct @supabase/storage-js import.
// Matches StorageApiError (status + statusCode) and StorageUnknownError (neither).
type StorageErrorLike = {
  name?: string;
  message?: string;
  status?: number | string;
  statusCode?: number | string;
};

// Storage returns RLS violations as HTTP 400 with statusCode "403",
// so statusCode is checked before status.
function resolveStatus(error: StorageErrorLike): number | undefined {
  for (const value of [error.statusCode, error.status]) {
    const n = Number(value);
    if (Number.isInteger(n) && n >= 400 && n < 600) return n;
  }
  return undefined;
}

export function mapStorageError(error: StorageErrorLike) {
  const message = (error.message ?? "").toLowerCase();

  // Message checks first: these are the cases where the status is unreliable.
  if (message.includes("row-level security")) {
    return new AppError(
      "You do not have permission to access this file.",
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }
  if (message.includes("already exists") || message.includes("duplicate")) {
    return new AppError(
      "This file has already been uploaded.",
      409,
      ERROR_CODES.ALREADY_EXISTS,
    );
  }
  if (message.includes("mime type")) {
    return new AppError(
      "This file type is not supported.",
      415,
      ERROR_CODES.UNSUPPORTED_FILE_TYPE,
    );
  }
  if (
    message.includes("maximum allowed size") ||
    message.includes("payload too large")
  ) {
    return new AppError(
      "This file is too large.",
      413,
      ERROR_CODES.FILE_TOO_LARGE,
    );
  }

  switch (resolveStatus(error)) {
    case 400:
      return new AppError(
        "Invalid file or request.",
        400,
        ERROR_CODES.INVALID_INPUT,
      );

    case 401:
      return new AppError(
        "Please sign in again.",
        401,
        ERROR_CODES.UNAUTHORIZED,
      );

    case 403:
      return new AppError(
        "You do not have permission to access this file.",
        403,
        ERROR_CODES.FORBIDDEN,
      );

    case 404:
      return new AppError("File not found.", 404, ERROR_CODES.NOT_FOUND);

    case 409:
      return new AppError(
        "This file has already been uploaded.",
        409,
        ERROR_CODES.ALREADY_EXISTS,
      );

    case 413:
      return new AppError(
        "This file is too large.",
        413,
        ERROR_CODES.FILE_TOO_LARGE,
      );

    case 415:
      return new AppError(
        "This file type is not supported.",
        415,
        ERROR_CODES.UNSUPPORTED_FILE_TYPE,
      );

    case 429:
      return new AppError(
        "Too many requests. Please try again shortly.",
        429,
        ERROR_CODES.RATE_LIMITED,
      );

    default:
      // 5xx and StorageUnknownError (network failures, no status)
      return new AppError(
        "A file storage error occurred.",
        500,
        ERROR_CODES.STORAGE_ERROR,
      );
  }
}

export function throwOnStorageError(
  ...results: Array<{ error: StorageErrorLike | null }>
): void {
  for (const { error } of results) {
    if (error) throw mapStorageError(error);
  }
}
