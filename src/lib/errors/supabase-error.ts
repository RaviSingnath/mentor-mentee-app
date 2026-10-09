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
    // Unique constraint violation (example: duplicate name)
    case "23505":
      return new AppError("A record with this value already exists.", 409, ERROR_CODES.ALREADY_EXISTS);

    // Foreign key violation. Postgres words the two directions differently in `details`.
    case "23503":
      return (error.details ?? "").includes("is still referenced")
        ? new AppError("This record cannot be deleted because it is still in use.", 409, ERROR_CODES.CONFLICT)
        : new AppError("A related record does not exist.", 400, ERROR_CODES.INVALID_INPUT);

    // NOT NULL / CHECK violation
    case "23502":
    case "23514":
      return new AppError("Some required information is missing or not valid.", 400, ERROR_CODES.INVALID_INPUT);

    // Permission denied (also what RLS raises on writes)
    case "42501":
      return new AppError("You do not have permission to perform this action.", 403, ERROR_CODES.FORBIDDEN);

    // Invalid input syntax (bad uuid, bad enum value...)
    case "22P02":
      return new AppError("Invalid data format.", 400, ERROR_CODES.INVALID_INPUT);

    // A trigger or function raised an exception on purpose (example: assert_match_pair).
    // The text is written for developers, so it is logged and not shown.
    case "P0001":
      console.error("Database rule rejected the request:", error.message);
      return new AppError("This action is not allowed.", 422, ERROR_CODES.INVALID_INPUT);

    // .single() / .maybeSingle() found no row, or more than one
    case "PGRST116":
      return new AppError("Record not found.", 404, ERROR_CODES.NOT_FOUND);

    // JWT expired or invalid at the API
    case "PGRST301":
    case "PGRST303":
      return new AppError("Your session has expired. Please sign in again.", 401, ERROR_CODES.SESSION_EXPIRED);

    // Deadlock / serialization failure / statement timeout: temporary
    case "40001":
    case "40P01":
    case "57014":
      return new AppError("The server is busy. Please try again.", 503, ERROR_CODES.SERVICE_UNAVAILABLE);

    default:
      // Unmapped: this used to be silent, which hid real bugs (a missing column, a bad RPC name)
      console.error("Unmapped Supabase database error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return new AppError("A database error occurred.", 500, ERROR_CODES.DATABASE_ERROR);
  }
}

export function throwOnSupabaseError(...results: Array<{ error: PostgrestError | null }>): void {
  for (const { error } of results) {
    if (error) throw mapSupabaseError(error);
  }
}
