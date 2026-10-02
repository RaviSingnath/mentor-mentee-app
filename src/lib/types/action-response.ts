import { ErrorCode } from "../errors/error-codes";

export type ActionResponse<T = unknown> =
  | {
      success: true;
      data?: T;
    }
  | {
      success: false;
      code: ErrorCode;
      message: string;
      errors?: Record<string, string[]>;
    };
