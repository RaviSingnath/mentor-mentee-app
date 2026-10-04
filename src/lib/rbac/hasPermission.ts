import UserRole from "./roles";
import { Permission } from "@/lib/rbac/permissions";
import { AuthUser } from "../types";
import { can } from "./can";

export function hasPermission(user: AuthUser, permission: Permission): boolean {
  if (!user) return false;

  // Super Admin shortcut (fast path)
  // if (user.role === UserRole.SUPER_ADMIN) return true;

  // If explicit permissions exist (future-proofing)
  return can(user.role as UserRole, permission);
}
