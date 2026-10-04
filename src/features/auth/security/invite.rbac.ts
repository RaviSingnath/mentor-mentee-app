import { AuthUser } from "@/lib/types";
import { InviteTargetRole } from "../auth.schema";
import { Permission } from "@/lib/rbac/permissions";
import UserRole from "@/lib/rbac/roles";
import { hasPermission } from "@/lib/rbac/hasPermission";

export const INVITE_ROLE_PERMISSION_MAP: [Permission, InviteTargetRole][] = [
  [Permission.INVITE_ADMIN, UserRole.ADMIN],
  [Permission.INVITE_MENTEE, UserRole.MENTEE],
];

/**
 * Returns roles that current user is allowed to invite.
 *
 * Uses permissions as the source of truth.
 * Do not duplicate role_permissions here.
 */
export function getInvitableRoles(user: AuthUser): InviteTargetRole[] {
  return INVITE_ROLE_PERMISSION_MAP.filter(([permission]) =>
    hasPermission(user, permission),
  ).map(([, role]) => role);
}

/**
 * Optional server-side check.
 *
 * Use this in invite action.
 */
export function canInviteRole(
  user: AuthUser,
  targetRole: InviteTargetRole,
): boolean {
  if (!user) return false;
  return getInvitableRoles(user).includes(targetRole);
}
