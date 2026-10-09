import { AuthError } from "@supabase/supabase-js";
import AppError from "./app-error";
import { ERROR_CODES } from "./error-codes";

const providerDetails = (error: AuthError) => ({
  provider: "supabase",
  originalCode: error.code,
  originalMessage: error.message,
});

export const Errors = {
  unauthorized() {
    return new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
  },

  sessionExpired() {
    return new AppError("Your session has expired. Please sign in again.", 401, ERROR_CODES.SESSION_EXPIRED);
  },

  /** Same text for a wrong password and an unknown email, so the form never reveals which emails exist. */
  invalidCredentials() {
    return new AppError("Incorrect email or password.", 401, ERROR_CODES.INVALID_CREDENTIALS);
  },

  forbidden(message = "You do not have permission") {
    return new AppError(message, 403, ERROR_CODES.FORBIDDEN);
  },

  notFound(message = "Record not found") {
    return new AppError(message, 404, ERROR_CODES.NOT_FOUND);
  },

  conflict(message = "Conflict occurred") {
    return new AppError(message, 409, ERROR_CODES.CONFLICT);
  },

  alreadyExists(resource = "Record") {
    return new AppError(`${resource} already exists`, 409, ERROR_CODES.ALREADY_EXISTS);
  },

  /** Bad input. Pass Zod's flatten().fieldErrors so the form can show each message next to its field. */
  validation(fieldErrors?: Record<string, string[]>, message = "Please check the highlighted fields.") {
    return new AppError(message, 400, ERROR_CODES.VALIDATION_ERROR, { fieldErrors });
  },

  /** Invite for an email that already has an account. (Name kept for existing callers.) */
  inviteFailed(error: AuthError) {
    return new AppError(
      "A user with this email already exists.",
      409,
      ERROR_CODES.ALREADY_EXISTS,
      providerDetails(error),
    );
  },

  emailLimit(error: AuthError) {
    return new AppError(
      "We've sent too many emails right now. Please wait a few minutes and try again.",
      429,
      ERROR_CODES.RATE_LIMITED, // was ALREADY_EXISTS: a copy-paste slip that made rate limits look like duplicates
      providerDetails(error),
    );
  },

  rateLimited(message = "Too many attempts. Please wait a minute and try again.") {
    return new AppError(message, 429, ERROR_CODES.RATE_LIMITED);
  },

  serviceUnavailable(message = "Could not reach the server. Please try again.") {
    return new AppError(message, 503, ERROR_CODES.SERVICE_UNAVAILABLE);
  },

  database() {
    return new AppError("Database operation failed", 500, ERROR_CODES.DATABASE_ERROR);
  },

  internal() {
    return new AppError("Something went wrong", 500, ERROR_CODES.INTERNAL_ERROR);
  },
};
