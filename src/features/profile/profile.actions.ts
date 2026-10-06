"use server";

import { revalidatePath } from "next/cache";
import { zProfile } from "./profile.schema";
import { createRequestContext } from "@/lib/auth/request-context";
import { ActionResponse } from "@/lib/types/action-response";
import { ERROR_CODES } from "@/lib/errors/error-codes";
import { getZodFieldErrors } from "@/lib/helper/get-zod-field-errors";
import { updateProfileMutation } from "./profile.mutation";
import { mapSupabaseError } from "@/lib/errors/supabase-error";

/**
 * Saves the whole profile form in one database call (public.save_my_profile), which validates again and writes
 * the profile, tags and availability in a single transaction. Runs as the signed-in user, never the service role.
 * fieldErrors use the form's own field names, so the caller can pass them straight to react-hook-form's setError.
 */
export async function saveProfileAction(
  input: unknown,
): Promise<ActionResponse> {
  await createRequestContext();

  const validatedFields = zProfile.safeParse(input);

  if (!validatedFields.success) {
    return {
      success: false,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "Validation failed",
      errors: getZodFieldErrors(validatedFields.error),
    };
  }

  const v = validatedFields.data;

  const { error } = await updateProfileMutation(v);

  if (error) throw mapSupabaseError(error);

  revalidatePath("/profile");
  revalidatePath("/matches");

  return { success: true };
}
