export enum Permission {
  // =========================
  // INVITE user
  // =========================
  INVITE_ADMIN = "invite_admin",
  INVITE_MENTEE = "invite_mentee",

  RESEND_INVITE = "resend_invite",
  RESEND_OWN_INVITE = "resend_own_invite",

  REVOKE_INVITE = "revoke_invite",
  DELETE_INVITE = "delete_invite",

  REVOKE_OWN_INVITE = "revoke_own_invite",
  DELETE_OWN_INVITE = "delete_own_invite",

  // =========================
  // USER MANAGEMENT
  // =========================
  VIEW_USER = "view_user",
  SUSPEND_USER = "suspend_user",
  VIEW_OWN_PROFILE = "view_own_profile",
  UPDATE_OWN_PROFILE = "update_own_profile",
}
