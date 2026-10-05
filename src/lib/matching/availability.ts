/**
 * Weekly availability helpers.
 *
 * Slots are stored per profile as (weekday, start, end) in that profile's own IANA timezone,
 * with weekday 0 = Sunday. To compare two people we convert every slot to minutes-of-week in UTC
 * and intersect the intervals.
 */

import { AvailabilitySlot, Interval } from "./types";



const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

/** UTC offset (in minutes) of an IANA timezone at a given instant. Falls back to 0 for unknown zones. */
export function tzOffsetMinutes(timeZone: string, at: Date): number {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
        .formatToParts(at)
        .map((p) => [p.type, p.value]),
    );
    const localAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    return Math.round((localAsUtc - at.getTime()) / 60000);
  } catch {
    return 0;
  }
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

/** Sort and merge overlapping or touching intervals so nothing is double counted. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: Interval[] = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

/**
 * Convert a profile's weekly slots into merged UTC minutes-of-week intervals.
 * The UTC offset is evaluated at `at` (so daylight saving is handled for that point in time).
 * Slots that cross the Saturday/Sunday UTC boundary are split into two intervals.
 * Malformed slots are skipped.
 */
export function toUtcWeekIntervals(
  slots: AvailabilitySlot[],
  timeZone: string,
  at: Date = new Date(),
): Interval[] {
  const offset = tzOffsetMinutes(timeZone, at);
  const out: Interval[] = [];

  for (const slot of slots) {
    const duration = toMinutes(slot.end) - toMinutes(slot.start);
    const localStart = slot.weekday * MINUTES_PER_DAY + toMinutes(slot.start);
    if (!(duration > 0) || !Number.isFinite(localStart)) continue;

    const start = (((localStart - offset) % MINUTES_PER_WEEK) + MINUTES_PER_WEEK) % MINUTES_PER_WEEK;
    const end = start + duration;

    if (end <= MINUTES_PER_WEEK) {
      out.push([start, end]);
    } else {
      out.push([start, MINUTES_PER_WEEK], [0, end - MINUTES_PER_WEEK]);
    }
  }

  return mergeIntervals(out);
}

/** Total minutes of overlap between two merged, sorted interval lists. */
export function overlapMinutes(a: Interval[], b: Interval[]): number {
  let i = 0;
  let j = 0;
  let total = 0;
  while (i < a.length && j < b.length) {
    const start = Math.max(a[i][0], b[j][0]);
    const end = Math.min(a[i][1], b[j][1]);
    if (end > start) total += end - start;
    if (a[i][1] < b[j][1]) i++;
    else j++;
  }
  return total;
}
