"use server";

import { z } from "zod";
import createClient from "@/supabase/server";

export type MatchActionResult = { ok: true } | { ok: false; error: string };

const pairSchema = z.object({
  subjectId: z.string().uuid(),
  candidateId: z.string().uuid(),
  score: z.number().min(0).max(100).nullish(),
});

const viewsSchema = z.object({
  subjectId: z.string().uuid(),
  items: z
    .array(
      z.object({
        candidateId: z.string().uuid(),
        score: z.number().min(0).max(100),
      }),
    )
    .max(10),
});

const fail = (error: string): MatchActionResult => ({ ok: false, error });
const VIEW_DEDUPE_MS = 24 * 60 * 60 * 1000;

/**
 * Every action runs with the signed-in user's own session, never the service role, so RLS and the
 * "one active mentor + one active mentee" trigger enforce the rules even if this code had a bug.
 */
async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, userId: user.id } : null;
}

/**
 * Members may only act on their own matches (subjectId must be their own id). Admins may act for anyone.
 * Returns an error result to send back, or null when allowed. The self case needs no database call.
 */
async function authorize(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  subjectId: string,
): Promise<MatchActionResult | null> {
  if (subjectId === userId) return null;
  const { data } = await supabase.rpc("is_admin");
  return data === true ? null : fail("Forbidden");
}

type Action = "saved" | "unsaved" | "dismissed";

async function log(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  subjectId: string,
  candidateId: string,
  action: Action,
  score: number | null | undefined,
) {
  return supabase.from("match_interactions").insert({
    actor_id: userId,
    subject_id: subjectId,
    candidate_id: candidateId,
    action,
    score: score ?? null,
  });
}

export async function saveMatch(input: unknown): Promise<MatchActionResult> {
  const parsed = pairSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request");
  const ctx = await currentUser();
  if (!ctx) return fail("Not signed in");
  const { supabase, userId } = ctx;
  const { subjectId, candidateId, score } = parsed.data;

  const denied = await authorize(supabase, userId, subjectId);
  if (denied) return denied;

  const saved = await supabase.from("saved_matches").insert({
    actor_id: userId,
    subject_id: subjectId,
    candidate_id: candidateId,
  });
  // 23505 = already saved; treat as success so a double click is harmless
  if (saved.error && saved.error.code !== "23505")
    return fail(saved.error.message);

  const logged = await log(
    supabase,
    userId,
    subjectId,
    candidateId,
    "saved",
    score,
  );
  return logged.error ? fail(logged.error.message) : { ok: true };
}

export async function unsaveMatch(input: unknown): Promise<MatchActionResult> {
  const parsed = pairSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request");
  const ctx = await currentUser();
  if (!ctx) return fail("Not signed in");
  const { supabase, userId } = ctx;
  const { subjectId, candidateId, score } = parsed.data;

  const denied = await authorize(supabase, userId, subjectId);
  if (denied) return denied;

  const removed = await supabase
    .from("saved_matches")
    .delete()
    .eq("actor_id", userId)
    .eq("subject_id", subjectId)
    .eq("candidate_id", candidateId);
  if (removed.error) return fail(removed.error.message);

  const logged = await log(
    supabase,
    userId,
    subjectId,
    candidateId,
    "unsaved",
    score,
  );
  return logged.error ? fail(logged.error.message) : { ok: true };
}

/** Dismissing hides the person from this viewer's results for this subject, and un-saves them if saved. */
export async function dismissMatch(input: unknown): Promise<MatchActionResult> {
  const parsed = pairSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request");
  const ctx = await currentUser();
  if (!ctx) return fail("Not signed in");
  const { supabase, userId } = ctx;
  const { subjectId, candidateId, score } = parsed.data;

  const denied = await authorize(supabase, userId, subjectId);
  if (denied) return denied;

  const removed = await supabase
    .from("saved_matches")
    .delete()
    .eq("actor_id", userId)
    .eq("subject_id", subjectId)
    .eq("candidate_id", candidateId);
  if (removed.error) return fail(removed.error.message);

  const logged = await log(
    supabase,
    userId,
    subjectId,
    candidateId,
    "dismissed",
    score,
  );
  return logged.error ? fail(logged.error.message) : { ok: true };
}

/** Records that these matches were shown. Skips anyone already logged as viewed in the last 24 hours. */
export async function logViews(input: unknown): Promise<MatchActionResult> {
  const parsed = viewsSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request");
  const ctx = await currentUser();
  if (!ctx) return fail("Not signed in");
  const { supabase, userId } = ctx;
  const { subjectId, items } = parsed.data;

  const denied = await authorize(supabase, userId, subjectId);
  if (denied) return denied;

  if (items.length === 0) return { ok: true };

  const since = new Date(Date.now() - VIEW_DEDUPE_MS).toISOString();
  const recent = await supabase
    .from("match_interactions")
    .select("candidate_id")
    .eq("actor_id", userId)
    .eq("subject_id", subjectId)
    .eq("action", "viewed")
    .gte("created_at", since);
  if (recent.error) return fail(recent.error.message);

  const seen = new Set(
    (recent.data ?? []).map((r: { candidate_id: string }) => r.candidate_id),
  );
  const fresh = items.filter((i) => !seen.has(i.candidateId));
  if (fresh.length === 0) return { ok: true };

  const inserted = await supabase.from("match_interactions").insert(
    fresh.map((i) => ({
      actor_id: userId,
      subject_id: subjectId,
      candidate_id: i.candidateId,
      action: "viewed" as const,
      score: i.score,
    })),
  );
  return inserted.error ? fail(inserted.error.message) : { ok: true };
}
