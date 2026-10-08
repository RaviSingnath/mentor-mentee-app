import { z } from "zod";
import type { MatchProfile } from "@/lib/matching/types";
import { EXPERIENCE_LEVELS } from "@/lib/matching/constants";

const zTopic = z.object({ slug: z.string(), name: z.string() });
const zSlot = z.object({
  weekday: z.number().int().min(0).max(6),
  start: z.string(),
  end: z.string(),
});

/** One row of public.match_pool(). Note there is deliberately no email field. */
export const zPoolProfileSchema = z.object({
  id: z.uuid(),
  fullName: z.string(),
  role: z.enum(["mentor", "mentee"]),
  bio: z.string().nullable(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  timezone: z.string(),
  languages: z.array(z.string()),
  isSeed: z.boolean(),
  skills: z.array(zTopic),
  goals: z.array(zTopic),
  interests: z.array(zTopic),
  availability: z.array(zSlot),
});

/** A matcher input plus the display-only fields the match page needs. */
export type TPoolProfile = z.infer<typeof zPoolProfileSchema> & MatchProfile;

export function parseMatchPool(raw: unknown): TPoolProfile[] {
  return z.array(zPoolProfileSchema).parse(raw);
}
