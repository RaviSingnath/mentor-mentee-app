import { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { useRouter } from "next/navigation";

import { ERROR_CODES } from "@/lib/errors/error-codes";
import { appToast } from "./toast";
import { handleActionError, handleUnexpectedError } from "./error-handler";

import { ActionResponse } from "@/lib/types/action-response";

type Router = ReturnType<typeof useRouter>;

type HandleFormSubmitOptions<TForm extends FieldValues, TData = unknown> = {
  beforeActionCall?: () => void;

  action: () => Promise<ActionResponse<TData>>;

  setError: UseFormSetError<TForm>;

  router?: Router;

  successMessage?: string;

  onSuccess?: (data?: TData) => void | Promise<void>;
};

export default async function handleFormSubmit<
  TForm extends FieldValues,
  TData = unknown,
>({
  beforeActionCall,
  action,
  setError,
  router,
  successMessage,
  onSuccess,
}: HandleFormSubmitOptions<TForm, TData>): Promise<boolean> {
  try {
    if (beforeActionCall) beforeActionCall();

    const result = await action();

    if (!result.success) {
      if (result.code === ERROR_CODES.VALIDATION_ERROR && result.errors) {
        Object.entries(result.errors).forEach(([field, messages]) => {
          setError(field as Path<TForm>, {
            type: "server",
            message: Array.isArray(messages) ? messages[0] : String(messages),
          });
        });

        return false;
      }

      handleActionError(result, router);

      return false;
    }

    if (successMessage) {
      appToast.success(successMessage);
    }

    await onSuccess?.(result.data);

    return true;
  } catch (error) {
    handleUnexpectedError(error);

    return false;
  }
}
