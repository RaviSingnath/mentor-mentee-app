import { NextResponse } from "next/server";
import { isNextControlFlowError, toAppError } from "./handle-error";
import type { AuthContext } from "./supabase-auth-error";

/**
 * For API route handlers (the counterpart of handleError for server actions):
 *   try { …; return NextResponse.json({ success: true, data }) } catch (e) { return errorResponse(e) }
 * Keep it in its own file so client components never import next/server through handle-error.
 */
export function errorResponse(error: unknown, context: AuthContext = "default") {
  if (isNextControlFlowError(error)) throw error;

  const e = toAppError(error, context);
  const fieldErrors = e.fieldErrors;
  return NextResponse.json(
    {
      success: false,
      code: e.code,
      message: e.message,
      ...(fieldErrors ? { errors: fieldErrors } : {}),
    },
    { status: e.statusCode },
  );
}
