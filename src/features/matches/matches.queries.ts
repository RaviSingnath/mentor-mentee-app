"use server";

import { supabaseAdmin } from "../../../supabase/admin";
import createClient from "../../../supabase/server";

export async function isActiveMemberQuery() {
  const supabase = await createClient();

  return supabase.rpc("is_active_member");
}

export async function getMatchInteractionsQuery(
  viewerId: string,
  subjectId: string,
) {
  const supabase = await createClient();

  return supabase
    .from("match_interactions")
    .select("candidate_id, action, created_at")
    .eq("actor_id", viewerId)
    .eq("subject_id", subjectId);
}

export async function getSavedMatchesQuery(
  viewerId: string,
  subjectId: string,
) {
  const supabase = await createClient();

  return supabase
    .from("saved_matches")
    .select("candidate_id")
    .eq("actor_id", viewerId)
    .eq("subject_id", subjectId);
}

export async function getMatchPoolRPCQuery() {
  return supabaseAdmin.rpc("match_pool");
}

export async function getCandidatesProfileQuery(candidatesId: string[]) {
  const supabase = await createClient();

  return supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      role,
      experience_level,
      city,
      state,
      country
      `,
    )
    .in("id", candidatesId);
}
