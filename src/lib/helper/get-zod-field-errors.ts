import * as z from "zod";

export function getZodFieldErrors(error: z.ZodError) {
  return z.flattenError(error).fieldErrors;
}
