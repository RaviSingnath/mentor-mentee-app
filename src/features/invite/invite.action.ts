"use server";

import { ERROR_CODES } from "@/lib/errors/error-codes";
import { ActionResponse } from "@/lib/types/action-response";
import { TAcceptInvite, zAcceptInvite } from "../auth/auth.schema";
import { getZodFieldErrors } from "@/lib/helper/get-zod-field-errors";
import { handleError } from "@/lib/errors/handle-error";
import { acceptInviteService } from "./invite.service";

export async function acceptInviteAction(
  formData: TAcceptInvite,
  token: string,
): Promise<ActionResponse> {
  const validatedFields = zAcceptInvite.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "Validation failed",
      errors: getZodFieldErrors(validatedFields.error),
    };
  }

  try {
    const acceptedInvite = await acceptInviteService(token);

    return {
      success: true,
      data: acceptedInvite,
    };
  } catch (error) {
    return handleError(error);
  }
}
