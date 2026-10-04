import type { PostgrestError } from "@supabase/supabase-js";
import AppError from "./app-error";
import { ERROR_CODES } from "./error-codes";

type SupabaseError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export function mapSupabaseError(error: SupabaseError) {
  switch (error.code) {
    // Unique constraint violation
    // Example: duplicate name
    case "23505":
      return new AppError(
        "A record with this value already exists.",
        409,
        ERROR_CODES.ALREADY_EXISTS,
      );

    // Foreign key violation
    case "23503":
      return new AppError(
        "This record cannot be deleted because it is still in use.",
        409,
        ERROR_CODES.CONFLICT,
      );

    // Permission denied
    case "42501":
      return new AppError(
        "You do not have permission to perform this action.",
        403,
        ERROR_CODES.FORBIDDEN,
      );

    // Invalid input syntax
    case "22P02":
      return new AppError(
        "Invalid data format.",
        400,
        ERROR_CODES.INVALID_INPUT,
      );

    default:
      return new AppError(
        "A database error occurred.",
        500,
        ERROR_CODES.DATABASE_ERROR,
      );
  }
}

export function throwOnSupabaseError(
  ...results: Array<{ error: PostgrestError | null }>
): void {
  for (const { error } of results) {
    if (error) throw mapSupabaseError(error);
  }
}
