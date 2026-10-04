enum UserRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  MENTOR = "mentor",
  MENTEE = "mentee",
}
export default UserRole;

export const UserRoleLabel: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: "Super Admin",
  [UserRole.ADMIN]: "Admin",
  [UserRole.MENTOR]: "Mentor",
  [UserRole.MENTEE]: "Mentee",
};
