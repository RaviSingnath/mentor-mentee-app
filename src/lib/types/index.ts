import UserRole from "@/lib/rbac/roles";
import { UserAppMetadata, User } from "@supabase/supabase-js";

export type UserContext = User & {
  id: string;
  email?: string | null;

  role: UserRole;
  collegeId?: string | null;
  departmentId?: string | null;

  isActive?: boolean;

  // raw supabase user (optional but useful)
  raw?: UserAppMetadata;
};

import { Database } from "../../../supabase/database.types";
import { currentUserProfile } from "../auth/current-user-profile";

export type AuthUser = Awaited<ReturnType<typeof currentUserProfile>>;

export type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;

  refreshUser: () => Promise<void>;

  isAuthenticated: boolean;

  hasRole: (...roles: string[]) => boolean;
};

export type ProfilesDB = Database["public"]["Tables"]["profiles"]["Row"];
