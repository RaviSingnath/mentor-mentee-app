import { SignalKey } from "./types";

export const EXPERIENCE_LEVELS = [
  "student",
  "junior",
  "mid",
  "senior",
  "lead",
] as const;

export const WEIGHTS = {
  goalsSkills: 35,
  availability: 20,
  language: 15,
  experience: 15,
  interests: 10,
  location: 5,
} as const;

export const SIGNAL_LABELS: Record<SignalKey, string> = {
  goalsSkills: "Skills vs. goals",
  availability: "Availability",
  language: "Language",
  experience: "Experience fit",
  interests: "Shared interests",
  location: "Location",
};

/** Weekly overlap at which the availability signal reaches its maximum. */
export const FULL_OVERLAP_MINUTES = 120;

/** Mentor-minus-mentee experience gap -> fit. Best at 2 levels; peers and huge gaps score lower. */
export const EXPERIENCE_GAP_FIT: Record<number, number> = {
  0: 0.3,
  1: 0.8,
  2: 1,
  3: 0.85,
  4: 0.7,
};

export const DEFAULT_LIMIT = 5;
