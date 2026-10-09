import {
  AuthError,
  isAuthRetryableFetchError,
  isAuthSessionMissingError,
  isAuthWeakPasswordError,
} from "@supabase/supabase-js";
import AppError from "./app-error";
import { ERROR_CODES } from "./error-codes";
import { Errors } from "./error-factory";

/**
 * Maps any supabase.auth error to an AppError, by the error's stable `code` (never by its message text).
 * `context` only changes the wording of the cases where it matters:
 *   "invite": an admin inviting someone ("email already exists" is useful to tell the admin)
 *   "signup": a person registering (same, but worded for them)
 *   "default": sign-in, password reset, session checks
 */
export type AuthContext = "default" | "invite" | "signup";

export function mapSupabaseAuthError(error: AuthError, context: AuthContext = "default"): AppError {
  // No answer at all (offline, DNS, Supabase down): safe to retry, and not the user's fault
  if (isAuthRetryableFetchError(error)) return Errors.serviceUnavailable();

  // No session where one is needed
  if (isAuthSessionMissingError(error)) return Errors.unauthorized();

  if (isAuthWeakPasswordError(error)) {
    return new AppError(
      error.reasons.length ? `Password too weak: ${error.reasons.join(", ")}.` : "That password is too weak.",
      422,
      ERROR_CODES.WEAK_PASSWORD,
    );
  }

  switch (error.code) {
    case "invalid_credentials":
    case "user_not_found":
      return Errors.invalidCredentials();

    case "email_not_confirmed":
      return new AppError("Please confirm your email first. Check your inbox.", 403, ERROR_CODES.EMAIL_NOT_CONFIRMED);

    case "email_exists":
    case "user_already_exists":
      return context === "invite"
        ? Errors.inviteFailed(error)
        : new AppError("An account with this email already exists. Try signing in.", 409, ERROR_CODES.ALREADY_EXISTS);

    case "weak_password":
      return new AppError("That password is too weak. Use a longer, less common one.", 422, ERROR_CODES.WEAK_PASSWORD);
    case "same_password":
      return new AppError("Your new password must be different from the old one.", 422, ERROR_CODES.WEAK_PASSWORD);

    case "over_email_send_rate_limit":
      return context === "invite"
        ? new AppError("Too many invitation attempts. Please try again later.", 429, ERROR_CODES.RATE_LIMITED)
        : Errors.emailLimit(error);
    case "over_request_rate_limit":
    case "over_sms_send_rate_limit":
      return Errors.rateLimited();

    case "otp_expired":
    case "flow_state_expired":
    case "flow_state_not_found":
      return new AppError("This link has expired. Request a new one.", 410, ERROR_CODES.LINK_EXPIRED);

    case "session_expired":
    case "session_not_found":
    case "refresh_token_not_found":
    case "refresh_token_already_used":
    case "bad_jwt":
      return Errors.sessionExpired();

    case "user_banned":
      return Errors.forbidden("This account is not allowed to sign in.");
    case "signup_disabled":
      return Errors.forbidden("Sign-ups are currently closed.");

    case "email_address_invalid":
    case "validation_failed":
      return new AppError("That email address is not valid.", 400, ERROR_CODES.INVALID_INPUT);

    default:
      // Unknown code: keep the details in the server log, show something generic
      console.error("Unmapped Supabase auth error:", { code: error.code, status: error.status, message: error.message });
      return context === "invite"
        ? new AppError("Unable to send invitation email.", 500, ERROR_CODES.INVITE_FAILED)
        : Errors.internal();
  }
}

/** `const { error } = await supabase.auth.…; throwOnAuthError(error, "invite")` */
export function throwOnAuthError(error: AuthError | null, context: AuthContext = "default"): void {
  if (error) throw mapSupabaseAuthError(error, context);
}
