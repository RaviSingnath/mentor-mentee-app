import { Permission } from "./permissions";
import UserRole from "./roles";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    Permission.VIEW_USER,
    Permission.VIEW_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,

    // Invite
    Permission.INVITE_ADMIN,
    Permission.INVITE_MENTEE,
    Permission.RESEND_INVITE,
    Permission.REVOKE_INVITE,
    Permission.DELETE_INVITE,
  ],

  [UserRole.ADMIN]: [
    // admin permissions
  ],

  [UserRole.MENTOR]: [
    // mentor permissions
  ],

  [UserRole.MENTEE]: [
    // mentee permissions
  ],
};
