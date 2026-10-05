import { z } from "zod";
import { EXPERIENCE_LEVELS } from "../matching/constants";
import { type MatchProfile, type SignalResult } from "../matching/types";

const topicSchema = z.object({ slug: z.string(), name: z.string() });
const slotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start: z.string(),
  end: z.string(),
});

/** One row of public.match_pool(). Note there is deliberately no email field. */
export const zPoolProfileSchema = z.object({
  id: z.string().uuid(),
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
  skills: z.array(topicSchema),
  goals: z.array(topicSchema),
  interests: z.array(topicSchema),
  availability: z.array(slotSchema),
});

/** A matcher input plus the display-only fields the match page needs. */
export type PoolProfile = z.infer<typeof zPoolProfileSchema> & MatchProfile;

export interface InteractionRow {
  candidate_id: string;
  action: "viewed" | "saved" | "unsaved" | "dismissed";
  created_at: string;
}

export interface BuildArgs {
  pool: PoolProfile[];
  viewerId: string;
  /** Only admins and super admins may look at someone else's matches or see the list of people. */
  isAdmin: boolean;
  /** Whom to find matches for. null = the viewer's own profile, if they have one. Ignored unless isAdmin. */
  subjectId: string | null;
  saved: Set<string>;
  dismissed: Set<string>;
  limit?: number;
  now?: Date;
}

export interface PublicProfile {
  id: string;
  fullName: string;
  role: "mentor" | "mentee";
  bio: string | null;
  experienceLevel: PoolProfile["experienceLevel"];
  city: string | null;
  state: string | null;
  country: string | null;
  languages: string[];
  skills: string[];
  goals: string[];
  interests: string[];
}

export interface MatchCardData {
  profile: PublicProfile;
  score: number;
  reasons: string[];
  signals: SignalResult[];
  saved: boolean;
}

export interface SubjectOption {
  id: string;
  label: string;
  role: "mentor" | "mentee";
}

export interface MatchView {
  subject: PublicProfile | null;
  subjectOptions: SubjectOption[];
  results: MatchCardData[];
  dismissedCount: number;
}
