"use server";

import { QueryData } from "@supabase/supabase-js";
import createClient from "../../../supabase/server";
import { supabaseAdmin } from "../../../supabase/admin";

export const getCurrentUserQuery = async (userID: string) => {
  const supabase = await createClient();

  return supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      email,
      role,
      status,
      city,
      state,
      country,
      experience_level,
      timezone,
      languages,
      is_seed
    `,
    )
    .eq("id", userID)
    .single();
};

export type CurrentUserQueryResult = QueryData<
  ReturnType<typeof getCurrentUserQuery>
>;

export const checkAlreadySignupEmailQuery = async (email: string) => {
  return supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .eq("is_seed", true)
    .maybeSingle();
};
