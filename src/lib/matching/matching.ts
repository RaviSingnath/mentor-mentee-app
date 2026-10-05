/**
 * Mentor <-> mentee matching.
 *
 * A pure, deterministic scoring function over plain objects (no database or network access).
 * The data layer is responsible for loading only ACTIVE profiles; inactive users never reach this module.
 *
 * Score = sum of weight * value for six signals, where each value is in [0, 1].
 * Every signal also returns a human-readable reason, so each match can be explained.
 */
import { overlapMinutes, toUtcWeekIntervals } from "./availability";
import {
  DEFAULT_LIMIT,
  EXPERIENCE_GAP_FIT,
  EXPERIENCE_LEVELS,
  FULL_OVERLAP_MINUTES,
  SIGNAL_LABELS,
  WEIGHTS,
} from "./constants";
import {
  MatchProfile,
  MatchResult,
  RankOptions,
  RawSignal,
  SignalKey,
  SignalResult,
  Topic,
} from "./types";

// ---------------------------------------------------------------------------
// Configuration: the only place weights live. Must sum to 100.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const round1 = (n: number) => Math.round(n * 10) / 10;

function listNames(names: string[], max = 4): string {
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} +${names.length - max} more`;
}

function intersectTopics(a: Topic[], b: Topic[]): Topic[] {
  const bSlugs = new Set(b.map((t) => t.slug));
  return a.filter((t) => bSlugs.has(t.slug));
}

function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// ---------------------------------------------------------------------------
// Signals (each takes the pair as mentee, mentor)
// ---------------------------------------------------------------------------

function goalsSkillsSignal(
  mentee: MatchProfile,
  mentor: MatchProfile,
): RawSignal {
  const goals = mentee.goals;
  if (goals.length === 0) {
    return { value: 0, reason: "The mentee has not listed any learning goals" };
  }
  const hits = intersectTopics(goals, mentor.skills);
  if (hits.length === 0) {
    return {
      value: 0,
      reason: `None of the mentee's ${plural(goals.length, "goal")} match the mentor's skills`,
    };
  }
  return {
    value: hits.length / goals.length,
    reason: `Mentor's skills cover ${hits.length} of ${plural(goals.length, "mentee goal")}: ${listNames(hits.map((t) => t.name))}`,
  };
}

function availabilitySignal(
  mentee: MatchProfile,
  mentor: MatchProfile,
  now: Date,
): RawSignal {
  if (mentee.availability.length === 0 || mentor.availability.length === 0) {
    return {
      value: 0,
      reason: "Availability has not been provided for both people",
    };
  }
  const minutes = overlapMinutes(
    toUtcWeekIntervals(mentee.availability, mentee.timezone, now),
    toUtcWeekIntervals(mentor.availability, mentor.timezone, now),
  );
  if (minutes === 0)
    return { value: 0, reason: "No overlapping weekly availability" };
  return {
    value: Math.min(1, minutes / FULL_OVERLAP_MINUTES),
    reason: `About ${formatDuration(minutes)} of overlapping weekly availability`,
  };
}

function languageSignal(mentee: MatchProfile, mentor: MatchProfile): RawSignal {
  if (mentee.languages.length === 0 || mentor.languages.length === 0) {
    return {
      value: 0,
      reason: "Languages have not been provided for both people",
    };
  }
  const mentorLangs = new Set(mentor.languages.map(norm));
  const shared = [...new Set(mentee.languages.map(norm))].filter((l) =>
    mentorLangs.has(l),
  );
  if (shared.length === 0) return { value: 0, reason: "No shared language" };
  return {
    value: 1,
    reason: `Shared ${shared.length === 1 ? "language" : "languages"}: ${shared.map(languageName).join(", ")}`,
  };
}

function experienceSignal(
  mentee: MatchProfile,
  mentor: MatchProfile,
): RawSignal {
  if (!mentee.experienceLevel || !mentor.experienceLevel) {
    return {
      value: 0,
      reason: "Experience level has not been provided for both people",
    };
  }
  const gap =
    EXPERIENCE_LEVELS.indexOf(mentor.experienceLevel) -
    EXPERIENCE_LEVELS.indexOf(mentee.experienceLevel);
  if (gap < 0) {
    return {
      value: 0,
      reason: `Mentor (${mentor.experienceLevel}) is less experienced than the mentee (${mentee.experienceLevel})`,
    };
  }
  const value = EXPERIENCE_GAP_FIT[Math.min(gap, 4)];
  if (gap === 0) {
    return {
      value,
      reason: `Same experience level (${mentor.experienceLevel}), so more of a peer than a mentor`,
    };
  }
  return {
    value,
    reason: `Mentor is ${plural(gap, "level")} above the mentee (${mentor.experienceLevel} vs. ${mentee.experienceLevel})`,
  };
}

function interestsSignal(
  mentee: MatchProfile,
  mentor: MatchProfile,
): RawSignal {
  if (mentee.interests.length === 0 || mentor.interests.length === 0) {
    return {
      value: 0,
      reason: "Interests have not been provided for both people",
    };
  }
  const shared = intersectTopics(mentee.interests, mentor.interests);
  if (shared.length === 0) return { value: 0, reason: "No shared interests" };
  // overlap coefficient: a small interest list is not penalised against a large one
  return {
    value:
      shared.length /
      Math.min(mentee.interests.length, mentor.interests.length),
    reason: `Shared ${shared.length === 1 ? "interest" : "interests"}: ${listNames(shared.map((t) => t.name))}`,
  };
}

function locationSignal(mentee: MatchProfile, mentor: MatchProfile): RawSignal {
  const hasLocation = (p: MatchProfile) =>
    norm(p.city) !== "" || norm(p.state) !== "" || norm(p.country) !== "";
  if (!hasLocation(mentee) || !hasLocation(mentor)) {
    return {
      value: 0,
      reason: "Location has not been provided for both people",
    };
  }

  const same = (a: string | null, b: string | null) =>
    norm(a) !== "" && norm(a) === norm(b);
  // A level only has to agree when both people filled it in (so "Springfield, IL" never matches "Springfield, MO").
  const compatible = (a: string | null, b: string | null) =>
    norm(a) === "" || norm(b) === "" || norm(a) === norm(b);

  const sameCountry = same(mentee.country, mentor.country);
  const sameState =
    same(mentee.state, mentor.state) &&
    compatible(mentee.country, mentor.country);
  const sameCity =
    same(mentee.city, mentor.city) &&
    compatible(mentee.state, mentor.state) &&
    compatible(mentee.country, mentor.country);

  if (sameCity) return { value: 1, reason: `Both are in ${mentee.city}` };
  if (sameState) return { value: 0.75, reason: `Both are in ${mentee.state}` };
  if (sameCountry)
    return { value: 0.5, reason: `Both are in ${mentee.country}` };
  return { value: 0, reason: "Located in different places" };
}

// ---------------------------------------------------------------------------
// Scoring and ranking
// ---------------------------------------------------------------------------

/** Pick 2-3 reasons: strongest contributions first, topped up with the most important gaps. */
export function pickReasons(signals: SignalResult[], count = 3): string[] {
  const positive = signals
    .filter((s) => s.points > 0)
    .sort((a, b) => b.points - a.points);
  const gaps = signals
    .filter((s) => s.points <= 0)
    .sort((a, b) => b.weight - a.weight);
  return [...positive, ...gaps]
    .slice(0, Math.max(2, count))
    .map((s) => s.reason);
}

/** Score one (mentee, mentor) pair. The pair is symmetric, so it serves both viewing directions. */
export function scorePair(
  mentee: MatchProfile,
  mentor: MatchProfile,
  now: Date = new Date(),
): Omit<MatchResult, "profile"> {
  const raw: Record<SignalKey, RawSignal> = {
    goalsSkills: goalsSkillsSignal(mentee, mentor),
    availability: availabilitySignal(mentee, mentor, now),
    language: languageSignal(mentee, mentor),
    experience: experienceSignal(mentee, mentor),
    interests: interestsSignal(mentee, mentor),
    location: locationSignal(mentee, mentor),
  };

  const signals = (Object.keys(WEIGHTS) as SignalKey[]).map(
    (key): SignalResult => ({
      key,
      label: SIGNAL_LABELS[key],
      weight: WEIGHTS[key],
      value: raw[key].value,
      points: round1(WEIGHTS[key] * raw[key].value),
      reason: raw[key].reason,
    }),
  );

  const total = (Object.keys(WEIGHTS) as SignalKey[]).reduce(
    (sum, key) => sum + WEIGHTS[key] * raw[key].value,
    0,
  );

  return { score: round1(total), signals, reasons: pickReasons(signals) };
}

/**
 * Rank the people on the opposite side of the subject.
 * A mentee subject gets ranked mentors; a mentor subject gets ranked mentees.
 * Always returns up to `limit` results, however low the scores are.
 * Ties break on name, then id, so output is deterministic.
 */
export function rankMatches(
  subject: MatchProfile,
  pool: MatchProfile[],
  options: RankOptions = {},
): MatchResult[] {
  const { limit = DEFAULT_LIMIT, now = new Date() } = options;
  const wanted = subject.role === "mentee" ? "mentor" : "mentee";

  return pool
    .filter((p) => p.role === wanted && p.id !== subject.id)
    .map((p): MatchResult => {
      const pair =
        subject.role === "mentee"
          ? scorePair(subject, p, now)
          : scorePair(p, subject, now);
      return { profile: p, ...pair };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.profile.fullName.localeCompare(b.profile.fullName) ||
        a.profile.id.localeCompare(b.profile.id),
    )
    .slice(0, Math.max(0, limit));
}
