import AppError from "./app-error";
import { ActionResponse } from "@/lib/types/action-response";
import { ERROR_CODES } from "./error-codes";

export function handleError(error: unknown): ActionResponse {
  if (error instanceof AppError) {
    return {
      success: false,
      code: error.code,
      message: error.message,
    };
  }

  console.error(error);

  return {
    success: false,
    code: ERROR_CODES.INTERNAL_ERROR,
    message: "Something went wrong",
  };
}
