import { CurrentUserQueryResult } from "@/features/auth/auth.queries";

export const currentUserProfile = async (profile: CurrentUserQueryResult) => {
  const userProfile = {
    id: profile.id,
    email: profile.email ?? "",
    role: profile.role,
    full_name: profile.full_name,
    status: profile.status,
  };

  return {
    ...userProfile,
  };
};
