import { ERROR_CODES, ErrorCode } from "./error-codes";

/**
 * The one error type the app throws on purpose. `message` is written for the user, so it is safe to show.
 * `details` is for the server (logs) and for field errors; it is never sent to the browser, except
 * `fieldErrors`, which handleError passes on for forms.
 */
export default class AppError extends Error {
  statusCode: number;
  code: ErrorCode;
  details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    code: ErrorCode = ERROR_CODES.INTERNAL_ERROR,
    details?: unknown,
    options?: { cause?: unknown },
  ) {
    super(message, options);

    Object.setPrototypeOf(this, AppError.prototype);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  /** Field errors for a form, when this is a validation error: { email: ["Enter a valid email"] }. */
  get fieldErrors(): Record<string, string[]> | undefined {
    if (this.code !== ERROR_CODES.VALIDATION_ERROR) return undefined;
    const d = this.details as { fieldErrors?: Record<string, string[]> } | undefined;
    return d?.fieldErrors;
  }
}
