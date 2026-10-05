"use server";

import { createAdminClient } from "../../../supabase/admin";
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

export async function getMatchPoolQuery() {
  const supabase = createAdminClient();

  return supabase.rpc("match_pool");
}
