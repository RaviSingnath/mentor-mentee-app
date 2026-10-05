"use server";

import {
  getCandidatesProfileQuery,
  getMatchPoolQuery,
  getSavedMatchesQuery,
  isActiveMemberQuery,
} from "./matches.queries";
import createClient from "../../../supabase/server";
import { mapSupabaseError } from "@/lib/errors/supabase-error";
import { createRequestContext } from "@/lib/auth/request-context";

export async function isActiveMemberService() {
  const { data: isMember, error } = await isActiveMemberQuery();

  if (error) throw mapSupabaseError(error);

  return {
    isMember: isMember,
  };
}

export async function getMatchPoolService() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("Your not authenticated.");
  }

  const { data, error } = await getMatchPoolQuery();

  if (error) throw mapSupabaseError(error);

  return { data: data };
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
