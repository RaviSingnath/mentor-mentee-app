import { getCurrentUserServer } from "./getCurrentUserServer";
import type { AuthUser } from "../types";
import { Errors } from "../errors/error-factory";

export type RequestContext = {
  user: AuthUser;
};

export async function createRequestContext(): Promise<RequestContext> {
  const user = await getCurrentUserServer();

  if (!user) {
    throw Errors.unauthorized();
  }

  return {
    user,
  };
}
