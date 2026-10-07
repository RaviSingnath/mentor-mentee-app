import { useRouter } from "next/navigation";
import { appToast } from "./toast";
import { ERROR_CODES } from "../errors/error-codes";

type Router = ReturnType<typeof useRouter>;

export function handleActionError(
  result: {
    success: boolean;
    code?: string;
    message?: string;
  },
  router?: Router | undefined,
) {
  if (result.success) return;

  switch (result.code) {
    case ERROR_CODES.UNAUTHORIZED:
      if (router) router.push("/");
      break;

    case ERROR_CODES.FORBIDDEN:
      appToast.error("You don't have permission");
      break;

    default:
      appToast.error(result.message ?? "Something went wrong");
  }
}

export function handleUnexpectedError(error: unknown) {
  console.error(error);

  appToast.error("Something went wrong. Please try again.");
}
