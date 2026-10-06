"use server";

import createClient from "../../../supabase/server";
import { EXPERIENCE_LEVELS } from "@/lib/matching/constants";
import { type ExperienceLevel } from "@/lib/matching/types";
import type { TProfileInput } from "./profile.schema";

export interface OwnProfile {
  role: string;
  status: string;
  values: TProfileInput;
  /** Existing topic names, for autocomplete. Capped; free-text tags can grow without bound. */
  topicSuggestions: string[];
}

const SUGGESTION_LIMIT = 500;

type TopicRow = {
  relation: "skill" | "goal" | "interest";
  topics: { name: string } | { name: string }[] | null;
};

/** Reads the signed-in user's own profile through their own session, so RLS applies. */
export async function loadOwnProfile(
  userId: string,
): Promise<OwnProfile | null> {
  const supabase = await createClient();
  const [profile, links, slots, topics] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "role, status, full_name, bio, city, state, country, timezone, languages, experience_level",
      )
      .eq("id", userId)
      .is("deleted_at", null)
      .single(),
    supabase
      .from("profile_topics")
      .select("relation, topics(name)")
      .eq("profile_id", userId),
    supabase
      .from("availability_slots")
      .select("weekday, start_time, end_time")
      .eq("profile_id", userId)
      .order("weekday")
      .order("start_time"),
    supabase
      .from("topics")
      .select("name")
      .order("name")
      .limit(SUGGESTION_LIMIT),
  ]);

  if (profile.error || !profile.data) return null;
  for (const r of [links, slots, topics])
    if (r.error) throw new Error(`profile load failed: ${r.error.message}`);

  const p = profile.data as Record<string, unknown>;
  const names = (relation: TopicRow["relation"]) =>
    ((links.data ?? []) as TopicRow[])
      .filter((row) => row.relation === relation)
      .map((row) =>
        Array.isArray(row.topics) ? row.topics[0]?.name : row.topics?.name,
      )
      .filter((n): n is string => typeof n === "string")
      .sort((a, b) => a.localeCompare(b));

  const level = p.experience_level as ExperienceLevel | null;

  return {
    role: String(p.role),
    status: String(p.status),
    values: {
      full_name: String(p.full_name ?? ""),
      bio: String(p.bio ?? ""),
      city: String(p.city ?? ""),
      state: String(p.state ?? ""),
      country: String(p.country ?? ""),
      timezone: String(p.timezone ?? "UTC"),
      languages: (p.languages as string[] | null) ?? [],
      experience_level:
        level && EXPERIENCE_LEVELS.includes(level) ? level : null,
      skills: names("skill"),
      goals: names("goal"),
      interests: names("interest"),
      availability: (
        (slots.data ?? []) as {
          weekday: number;
          start_time: string;
          end_time: string;
        }[]
      ).map((s) => ({
        weekday: s.weekday,
        start: s.start_time.slice(0, 5),
        end: s.end_time.slice(0, 5),
      })),
    },
    topicSuggestions: ((topics.data ?? []) as { name: string }[]).map(
      (t) => t.name,
    ),
  };
}
