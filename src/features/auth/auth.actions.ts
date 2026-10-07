"use server";

import { revalidatePath } from "next/cache";

import {
  TSignUp,
  zSignUp,
  TLogin,
  zLogin,
  zInviteAdmin,
  TInviteAdmin,
} from "@/features/auth/auth.schema";
import { ERROR_CODES } from "@/lib/errors/error-codes";
import { handleError } from "@/lib/errors/handle-error";
import { getZodFieldErrors } from "@/lib/helper/get-zod-field-errors";
import { ActionResponse } from "@/lib/types/action-response";
import {
  inviteAdminService,
  loginService,
  logoutService,
  signUpService,
} from "./auth.services";
import { createRequestContext } from "@/lib/auth/request-context";

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
    const user = await signUpService({ data: validatedFields.data });

    if (!user)
      return {
        success: false,
        code: ERROR_CODES.DATABASE_ERROR,
        message: "asda",
      };

    return {
      success: true,
      data: { url: user },
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function loginAction(formData: TLogin): Promise<ActionResponse> {
  const validatedFields = zLogin.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "Validation failed",
      errors: getZodFieldErrors(validatedFields.error),
    };
  }

  try {
    const profile = await loginService({
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

export async function logoutAction() {
  try {
    await logoutService();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Signout failed. Please try again.",
    };
  }
}

export const inviteAdminAction = async (
  data: TInviteAdmin,
): Promise<ActionResponse> => {
  try {
    const ctx = await createRequestContext();

    const validatedFields = zInviteAdmin.safeParse(data);

    if (!validatedFields.success) {
      return {
        success: false,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: "Validation failed",
        errors: getZodFieldErrors(validatedFields.error),
      };
    }

    const admin = await inviteAdminService({
      ctx,
      data: validatedFields.data,
    });

    revalidatePath("/dashboard", "page");

    return {
      success: true,
      data: admin,
    };
  } catch (error) {
    return handleError(error);
  }
};
