import type { TProfile } from "./profile.schema";

/**
 * Argument names of public.save_my_profile(), in the order the SQL declares them
 * (supabase/migrations/20261003180000_save_my_profile.sql). profile.migration.test.ts compares this list with the
 * migration file, so a renamed or added SQL parameter fails a test instead of failing at runtime.
 */
export const SAVE_MY_PROFILE_PARAMS = [
  "p_full_name",
  "p_bio",
  "p_city",
  "p_state",
  "p_country",
  "p_timezone",
  "p_languages",
  "p_experience_level",
  "p_skills",
  "p_goals",
  "p_interests",
  "p_availability",
] as const;

/** Maps validated form values (snake_case) to the RPC's p_* arguments. Only these keys ever reach the database. */
export function toSaveMyProfileArgs(v: TProfile) {
  return {
    p_full_name: v.full_name,
    p_bio: v.bio,
    p_city: v.city,
    p_state: v.state,
    p_country: v.country,
    p_timezone: v.timezone,
    p_languages: v.languages,
    p_experience_level: v.experience_level ?? undefined,
    p_skills: v.skills,
    p_goals: v.goals,
    p_interests: v.interests,
    p_availability: v.availability,
  } satisfies Record<(typeof SAVE_MY_PROFILE_PARAMS)[number], unknown>;
}
