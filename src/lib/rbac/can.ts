import { ROLE_PERMISSIONS } from "./role_permissions";
import { Permission } from "@/lib/rbac/permissions";
import UserRole from "@/lib/rbac/roles";

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAny(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

export function canAll(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => can(role, p));
}
