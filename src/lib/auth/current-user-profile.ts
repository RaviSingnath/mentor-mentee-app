import { CurrentUserQueryResult } from "@/features/auth/auth.queries";

export const currentUserProfile = async (profile: CurrentUserQueryResult) => {
  const userProfile = {
    id: profile.id,
    email: profile.email ?? "",
    role: profile.role,
    full_name: profile.full_name,
    status: profile.status,
    city: profile.city,
    state: profile.state,
    country: profile.country,
    experience_level: profile.experience_level,
    timezone: profile.timezone,
    languages: profile.languages,
    is_seed: profile.is_seed,
  };

  return {
    ...userProfile,
  };
};
