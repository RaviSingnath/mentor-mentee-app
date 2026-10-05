"use server";

import { getMatchPoolQuery, isActiveMemberQuery } from "./matches.queries";
import createClient from "../../../supabase/server";
import { mapSupabaseError } from "@/lib/errors/supabase-error";

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
