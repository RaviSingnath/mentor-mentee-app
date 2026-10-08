"use server";

import {
  getCandidatesProfileQuery,
  getMatchPoolRPCQuery,
  getSavedMatchesQuery,
  isActiveMemberQuery,
} from "./matches.queries";
import { mapSupabaseError } from "@/lib/errors/supabase-error";
import { createRequestContext } from "@/lib/auth/request-context";
import { PoolProfile } from "@/lib/matches/types";
import { parseMatchPool } from "./matches.schema";

export async function isActiveMemberService() {
  const { data: isMember, error } = await isActiveMemberQuery();

  if (error) throw mapSupabaseError(error);

  return {
    isMember: isMember,
  };
}

export async function getMatchPoolService(): Promise<PoolProfile[]> {
  // Check for unauthorized usere as well
  await createRequestContext();

  const { data, error } = await getMatchPoolRPCQuery();

  if (error) throw mapSupabaseError(error);

  return parseMatchPool(data);
}

export async function getSavedMatchesService() {
  const ctx = await createRequestContext();

  const userId = ctx.user.id;

  const { data, error } = await getSavedMatchesQuery(userId, userId);

  if (error) {
    throw mapSupabaseError(error);
  }
  const candidatesId = new Set(
    (data ?? []).map((r: { candidate_id: string }) => r.candidate_id),
  );

  const { data: candidates, error: candidatesError } =
    await getCandidatesProfileQuery([...candidatesId]);

  if (candidatesError) {
    throw mapSupabaseError(candidatesError);
  }

  return candidates;
}

type CandidatesListResponse = Awaited<
  ReturnType<typeof getSavedMatchesService>
>;
export type CandidatesListItem = CandidatesListResponse[number];
