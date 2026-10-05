import { EXPERIENCE_LEVELS, WEIGHTS } from "./constants";

export interface AvailabilitySlot {
  weekday: number; // 0 = Sunday ... 6 = Saturday
  start: string; // "HH:MM" or "HH:MM:SS", local to the profile's timezone
  end: string;
}

export type Interval = [start: number, end: number];

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export type SignalKey = keyof typeof WEIGHTS;

export interface Topic {
  slug: string;
  name: string;
}

export interface MatchProfile {
  id: string;
  fullName: string;
  role: "mentor" | "mentee";
  experienceLevel: ExperienceLevel | null;
  city: string | null;
  state: string | null;
  country: string | null;
  timezone: string; // IANA, e.g. "Asia/Kolkata"
  languages: string[]; // e.g. ["en", "hi"]
  skills: Topic[]; // what the person can teach (mentors)
  goals: Topic[]; // what the person wants to learn (mentees)
  interests: Topic[];
  availability: AvailabilitySlot[];
}

export interface SignalResult {
  key: SignalKey;
  label: string;
  weight: number;
  value: number; // 0..1
  points: number; // weight * value
  reason: string;
}

export interface MatchResult {
  profile: MatchProfile; // the counterpart being recommended
  score: number; // 0..100, one decimal
  signals: SignalResult[];
  reasons: string[]; // 2-3 human-readable reasons, strongest first
}

export interface RawSignal {
  value: number;
  reason: string;
}

export interface RankOptions {
  limit?: number; // default 5
  now?: Date; // reference instant for timezone offsets (useful in tests)
}
