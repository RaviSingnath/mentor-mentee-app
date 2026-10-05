import { loadMatchPool } from "./pool";
import type {
  BuildArgs,
  InteractionRow,
  MatchView,
  PoolProfile,
  PublicProfile,
  SubjectOption,
} from "./types";
import { rankMatches } from "../matching/matching";
import { DEFAULT_LIMIT } from "../matching/constants";
import { UserRoleLabel } from "../rbac/roles";
import {
  getMatchInteractionsQuery,
  getSavedMatchesQuery,
} from "@/features/matches/matches.queries";

// ---------------------------------------------------------------------------
// View model (what the page renders). Names only for topics, and never an email.
// ---------------------------------------------------------------------------

export const toPublicProfile = (p: PoolProfile): PublicProfile => ({
  id: p.id,
  fullName: p.fullName,
  role: p.role,
  bio: p.bio,
  experienceLevel: p.experienceLevel,
  city: p.city,
  state: p.state,
  country: p.country,
  languages: p.languages,
  skills: p.skills.map((t) => t.name),
  goals: p.goals.map((t) => t.name),
  interests: p.interests.map((t) => t.name),
});

// ---------------------------------------------------------------------------
// Interaction state
// ---------------------------------------------------------------------------

/** A candidate counts as dismissed when their most recent saved/unsaved/dismissed event is 'dismissed'. */
export function dismissedCandidates(rows: InteractionRow[]): Set<string> {
  const latest = new Map<string, InteractionRow>();
  for (const row of rows) {
    if (row.action === "viewed") continue;
    const seen = latest.get(row.candidate_id);
    if (!seen || row.created_at > seen.created_at)
      latest.set(row.candidate_id, row);
  }
  return new Set(
    [...latest.values()]
      .filter((r) => r.action === "dismissed")
      .map((r) => r.candidate_id),
  );
}

// ---------------------------------------------------------------------------
// Pure view builder
// ---------------------------------------------------------------------------

export function buildMatchView({
  pool,
  viewerId,
  isAdmin,
  subjectId,
  saved,
  dismissed,
  limit = DEFAULT_LIMIT,
  now,
}: BuildArgs): MatchView {
  // Non-admins never receive the list of other people, so it cannot leak through the page payload.
  const subjectOptions: SubjectOption[] = isAdmin
    ? [...pool]
        .sort(
          (a, b) =>
            a.role.localeCompare(b.role) ||
            a.fullName.localeCompare(b.fullName),
        )
        .map((p) => ({
          id: p.id,
          role: p.role,
          label: p.city ? `${p.fullName} (${p.city})` : p.fullName,
        }))
    : [];

  const requestedId = isAdmin ? subjectId : null;
  const effectiveId =
    requestedId ?? (pool.some((p) => p.id === viewerId) ? viewerId : null);
  const subject = effectiveId
    ? pool.find((p) => p.id === effectiveId)
    : undefined;
  if (!subject)
    return { subject: null, subjectOptions, results: [], dismissedCount: 0 };

  // Dismissed people are removed BEFORE ranking, so the list refills with the next best match.
  const candidates = pool.filter((p) => !dismissed.has(p.id));
  const ranked = rankMatches(subject, candidates, { limit, now });

  return {
    subject: toPublicProfile(subject),
    subjectOptions,
    dismissedCount: pool.filter(
      (p) =>
        dismissed.has(p.id) && p.role !== subject.role && p.id !== subject.id,
    ).length,
    results: ranked.map((r) => ({
      profile: toPublicProfile(r.profile as PoolProfile),
      score: r.score,
      reasons: r.reasons,
      signals: r.signals,
      saved: saved.has(r.profile.id),
    })),
  };
}

// ---------------------------------------------------------------------------
// Orchestrator: pool via the service role, personal state via the viewer's own session (RLS applies)
// ---------------------------------------------------------------------------
export async function getMatchView(args: {
  viewerId: string;
  isAdmin: boolean;
  subjectParam: string | null;
  now?: Date;
}): Promise<MatchView> {
  const { viewerId, isAdmin, now } = args;

  const subjectParam = isAdmin ? args.subjectParam : null; // members can only ever see their own matches

  const pool = await loadMatchPool();

  const subjectId =
    subjectParam ?? (pool.some((p) => p.id === viewerId) ? viewerId : null);
  if (!subjectId) {
    return buildMatchView({
      pool,
      viewerId,
      isAdmin,
      subjectId: null,
      saved: new Set(),
      dismissed: new Set(),
      now,
    });
  }

  const [interactions, savedRows] = await Promise.all([
    getMatchInteractionsQuery(viewerId, subjectId),
    getSavedMatchesQuery(viewerId, subjectId),
  ]);
  if (interactions.error)
    throw new Error(
      `match_interactions read failed: ${interactions.error.message}`,
    );
  if (savedRows.error)
    throw new Error(`saved_matches read failed: ${savedRows.error.message}`);

  return buildMatchView({
    pool,
    viewerId,
    isAdmin,
    subjectId,
    saved: new Set(
      (savedRows.data ?? []).map(
        (r: { candidate_id: string }) => r.candidate_id,
      ),
    ),
    dismissed: dismissedCandidates(
      (interactions.data ?? []) as InteractionRow[],
    ),
    now,
  });
}
