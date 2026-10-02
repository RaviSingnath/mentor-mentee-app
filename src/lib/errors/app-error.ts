import { ERROR_CODES, ErrorCode } from "./error-codes";

export default class AppError extends Error {
  statusCode: number;
  code: ErrorCode;
  details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    code: ErrorCode = ERROR_CODES.INTERNAL_ERROR,
    details?: unknown,
  ) {
    super(message);

    Object.setPrototypeOf(this, AppError.prototype);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
