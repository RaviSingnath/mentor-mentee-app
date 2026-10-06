import type { ExperienceLevel } from "@/lib/matching/matching";

export const WEEKDAYS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
] as const;

export const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid-level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead or principal" },
];

/** Static names (not Intl.DisplayNames) so the server and the browser always render identical text. */
export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", hi: "Hindi", bn: "Bengali", ta: "Tamil", te: "Telugu", mr: "Marathi", gu: "Gujarati",
  kn: "Kannada", ml: "Malayalam", pa: "Punjabi", ur: "Urdu", ar: "Arabic", zh: "Chinese", es: "Spanish",
  fr: "French", de: "German", pt: "Portuguese", ru: "Russian", ja: "Japanese", ko: "Korean", it: "Italian",
  tr: "Turkish", sw: "Swahili", yo: "Yoruba", ig: "Igbo", ha: "Hausa", id: "Indonesian", vi: "Vietnamese",
  nl: "Dutch", pl: "Polish",
};
export const COMMON_LANGUAGES = Object.keys(LANGUAGE_NAMES);

/**
 * A curated list instead of Intl.supportedValuesOf("timeZone"): that call differs between server and browser
 * (which would break hydration) and omits "UTC" and aliases such as Asia/Kolkata.
 * Every value is a valid IANA name that Postgres also accepts.
 */
export const TIMEZONES = [
  "Pacific/Honolulu", "America/Anchorage", "America/Los_Angeles", "America/Denver", "America/Chicago",
  "America/New_York", "America/Toronto", "America/Mexico_City", "America/Bogota", "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires", "Atlantic/Reykjavik", "Europe/London", "Europe/Dublin", "Europe/Lisbon",
  "Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Rome", "Europe/Amsterdam", "Europe/Stockholm",
  "Europe/Warsaw", "Europe/Athens", "Europe/Istanbul", "Europe/Moscow", "Africa/Casablanca", "Africa/Lagos",
  "Africa/Cairo", "Africa/Johannesburg", "Africa/Nairobi", "Asia/Dubai", "Asia/Karachi", "Asia/Kolkata",
  "Asia/Dhaka", "Asia/Bangkok", "Asia/Jakarta", "Asia/Singapore", "Asia/Hong_Kong", "Asia/Shanghai",
  "Asia/Manila", "Asia/Tokyo", "Asia/Seoul", "Australia/Perth", "Australia/Sydney", "Pacific/Auckland", "UTC",
] as const;

export const timezoneLabel = (tz: string) => tz.replace(/_/g, " ");
