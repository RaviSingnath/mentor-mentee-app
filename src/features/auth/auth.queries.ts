"use server";

import { QueryData } from "@supabase/supabase-js";
import createClient from "../../../supabase/server";

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
      status
    `,
    )
    .eq("id", userID)
    .single();
};

export type CurrentUserQueryResult = QueryData<
  ReturnType<typeof getCurrentUserQuery>
>;
