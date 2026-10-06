import { z } from "zod";
import type { AvailabilitySlot } from "@/lib/matching/types"; 
import { EXPERIENCE_LEVELS } from "@/lib/matching/constants";

// These limits mirror public.save_my_profile(), which enforces them again in the database.
export const TAG_MIN_LENGTH = 2;
export const TAG_MAX_LENGTH = 40;
export const TAGS_PER_LIST = 15;
export const MAX_LANGUAGES = 10;
export const MAX_SLOTS = 28;

/** Collapse inner whitespace and trim, the same normalisation the database applies to tags. */
export const normalizeTag = (s: string) => s.trim().replace(/\s+/g, " ");

export function dedupeCaseInsensitive(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Returns the first pair of slots that overlap on the same weekday (touching ends do not overlap), or null. */
export function findOverlap(slots: AvailabilitySlot[]): [AvailabilitySlot, AvailabilitySlot] | null {
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      if (a.weekday === b.weekday && a.start < b.end && b.start < a.end) return [a, b];
    }
  }
  return null;
}

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use the format HH:MM");

export const zSlot = z
  .object({ weekday: z.number().int().min(0).max(6), start: time, end: time })
  .refine((s) => s.start < s.end, { message: "Each slot must end after it starts", path: ["end"] });

const zTagList = z
  .array(
    z
      .string()
      .transform(normalizeTag)
      .pipe(
        z
          .string()
          .min(TAG_MIN_LENGTH, `Tags need at least ${TAG_MIN_LENGTH} characters`)
          .max(TAG_MAX_LENGTH, `Tags can be at most ${TAG_MAX_LENGTH} characters`),
      ),
  )
  .max(TAGS_PER_LIST, `At most ${TAGS_PER_LIST} tags`)
  .transform(dedupeCaseInsensitive);

export const zProfile = z
  .object({
    full_name: z.string().trim().min(1, "Enter your name").max(120, "Name can be at most 120 characters"),
    bio: z.string().trim().max(2000, "Bio can be at most 2000 characters"),
    city: z.string().trim().max(80, "At most 80 characters"),
    state: z.string().trim().max(80, "At most 80 characters"),
    country: z.string().trim().max(80, "At most 80 characters"),
    timezone: z.string().refine(isValidTimeZone, "Choose a valid timezone"),
    languages: z
      .array(z.string().regex(/^[a-z]{2,3}$/, "Invalid language code"))
      .max(MAX_LANGUAGES, `Pick at most ${MAX_LANGUAGES} languages`),
    experience_level: z.enum(EXPERIENCE_LEVELS).nullable(),
    skills: zTagList,
    goals: zTagList,
    interests: zTagList,
    availability: z.array(zSlot).max(MAX_SLOTS, `At most ${MAX_SLOTS} availability slots`),
  })
  .superRefine((value, ctx) => {
    if (findOverlap(value.availability)) {
      ctx.addIssue({ code: "custom", path: ["availability"], message: "Availability slots must not overlap" });
    }
  });

/** What the form holds while editing (before trimming and de-duplication). */
export type TProfileInput = z.input<typeof zProfile>;
/** What the server action receives after validation. */
export type TProfile = z.output<typeof zProfile>;

export type TProfileFieldErrors = Partial<Record<keyof TProfileInput, string>>;

/** First error message per top-level field. Field names match the form, so these can go straight into setError. */
export function fieldErrorsFromZod(error: z.ZodError): TProfileFieldErrors {
  const out: TProfileFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof TProfileInput | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Profile strength: activation needs only a confirmed email, so this nudges people toward
// the data that makes their matches good.
// ---------------------------------------------------------------------------
export interface Completeness {
  done: number;
  total: number;
  missing: string[];
}

export function profileCompleteness(v: TProfileInput, role: "mentor" | "mentee"): Completeness {
  const checks: [boolean, string][] = [
    [(v.bio ?? "").trim().length >= 20, "Write a short bio (at least 20 characters)"],
    [v.experience_level !== null && v.experience_level !== undefined, "Choose your experience level"],
    [(v.city ?? "").trim() !== "" && (v.country ?? "").trim() !== "", "Add your city and country"],
    [v.timezone !== "UTC", "Set your timezone"],
    [(v.languages ?? []).length > 0, "Pick at least one language"],
    role === "mentor"
      ? [(v.skills ?? []).length > 0, "Add at least one skill you can teach"]
      : [(v.goals ?? []).length > 0, "Add at least one thing you want to learn"],
    [(v.interests ?? []).length > 0, "Add an interest or two"],
    [(v.availability ?? []).length > 0, "Add the times you are available"],
  ];
  return {
    done: checks.filter(([ok]) => ok).length,
    total: checks.length,
    missing: checks.filter(([ok]) => !ok).map(([, label]) => label),
  };
}
