import { isAuthError } from "@supabase/supabase-js";
import { z } from "zod";
import type { ActionResponse } from "@/lib/types/action-response";
import AppError from "./app-error";
import { Errors } from "./error-factory";
import { mapStorageError } from "./storage-error";
import { mapSupabaseAuthError, type AuthContext } from "./supabase-auth-error";
import { mapSupabaseError } from "./supabase-error";

/**
 * Next.js implements redirect(), notFound() and "this page is dynamic" by throwing special errors.
 * A catch block must let them through, otherwise a successful redirect is reported as "Something went wrong".
 */
export function isNextControlFlowError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  const digest = (error as { digest?: unknown }).digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") ||
      digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") ||
      digest === "NEXT_NOT_FOUND" ||
      digest === "DYNAMIC_SERVER_USAGE" ||
      digest.startsWith("BAILOUT_TO_CLIENT_SIDE_RENDERING"))
  );
}

const looksLike = (e: unknown, name: string): e is { name: string; message?: string; code?: string; status?: number } =>
  typeof e === "object" && e !== null && (e as { name?: unknown }).name === name;

/**
 * Turns anything that was thrown into an AppError. Known shapes are mapped; anything else is logged
 * (with its stack) and becomes a generic "Something went wrong".
 */
export function toAppError(error: unknown, context: AuthContext = "default"): AppError {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) console.error(`[${error.code}]`, error.message, error.details ?? "", error.cause ?? "");
    return error;
  }
  if (error instanceof z.ZodError) return Errors.validation(z.flattenError(error).fieldErrors as Record<string, string[]>);
  if (isAuthError(error)) return mapSupabaseAuthError(error, context);
  if (looksLike(error, "PostgrestError")) return mapSupabaseError(error);
  if (looksLike(error, "StorageApiError") || looksLike(error, "StorageUnknownError")) return mapStorageError(error);

  console.error("Unexpected error:", error);
  return new AppError(Errors.internal().message, 500, Errors.internal().code, undefined, { cause: error });
}

/**
 * For server actions. Use it as the catch block:
 *   try { …; return { success: true, data } } catch (e) { return handleError(e) }
 * Redirects and notFound() pass through untouched.
 */
export function handleError<T = unknown>(error: unknown, context: AuthContext = "default"): ActionResponse<T> {
  if (isNextControlFlowError(error)) throw error;

  const e = toAppError(error, context);
  const fieldErrors = e.fieldErrors;
  return {
    success: false,
    code: e.code,
    message: e.message,
    ...(fieldErrors ? { errors: fieldErrors } : {}),
  };
}
