import { Errors } from "@/lib/errors/error-factory";
import { RequestContext } from "@/lib/auth/request-context";
import { canInviteRole } from "./invite.rbac";
import type { TInviteAdmin } from "../auth.schema";

// ─────────────────────────────────────────────────────────────────────────────
// Invite creation security
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Asserts the current user is allowed to send the given invite.
 * Throws Errors.forbidden() on any violation.
 */
export async function assertCanInvite(ctx: RequestContext, data: TInviteAdmin) {
  const { user } = ctx;

  // 1. Permission check — can this role send invites to the target role?
  const canInvite = canInviteRole(user, data.target_role);

  if (!canInvite) {
    throw Errors.forbidden("You cannot invite this role");
  }
}
