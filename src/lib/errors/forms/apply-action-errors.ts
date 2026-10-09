import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

type FailedAction = { message: string; errors?: Record<string, string[]> };

/** Puts a failed action's errors on the form: field errors on their inputs, everything else in root.server. */
export function applyActionErrors<T extends FieldValues>(
  response: FailedAction,
  setError: UseFormSetError<T>,
) {
  const entries = Object.entries(response.errors ?? {});

  for (const [field, messages] of entries) {
    setError(field as Path<T>, { type: "server", message: messages[0] });
  }

  // no field errors means the message is about the whole form (wrong password, rate limit, network...)
  if (entries.length === 0) {
    setError("root.server", { type: "server", message: response.message });
  }
}
