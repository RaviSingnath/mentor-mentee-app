import { TSignUp, zSignUp } from "@/features/auth/auth.schema";
import { ERROR_CODES } from "@/lib/errors/error-codes";
import { handleError } from "@/lib/errors/handle-error";
import { getZodFieldErrors } from "@/lib/helper/get-zod-field-errors";
import { ActionResponse } from "@/lib/types/action-response";
import { signUpService } from "./auth.services";

export async function signUpAction(formData: TSignUp): Promise<ActionResponse> {
  const validatedFields = zSignUp.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "Validation failed",
      errors: getZodFieldErrors(validatedFields.error),
    };
  }

  try {
    const profile = await signUpService({
      data: validatedFields.data,
    });

    return {
      success: true,
      data: profile,
    };
  } catch (error) {
    return handleError(error);
  }
}
