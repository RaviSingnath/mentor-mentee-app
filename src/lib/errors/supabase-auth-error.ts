import { AuthError } from "@supabase/supabase-js";
import AppError from "./app-error";
import { ERROR_CODES } from "./error-codes";
import { Errors } from "./error-factory";

export function mapSupabaseAuthError(error: AuthError) {
  switch (error.code) {
    case "email_exists":
      return Errors.inviteFailed(error);

    case "over_email_send_rate_limit":
      return new AppError(
        "Too many invitation attempts. Please try again later.",
        429,
        ERROR_CODES.RATE_LIMITED,
      );

    default:
      console.error("Supabase invite error:", error);

      return new AppError(
        "Unable to send invitation email.",
        500,
        ERROR_CODES.INVITE_FAILED,
      );
  }
}
