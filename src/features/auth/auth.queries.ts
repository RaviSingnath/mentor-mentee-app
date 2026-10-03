"use server";

import { createAdminClient } from "../../../supabase/admin";

export const getProfileByIdQuery = async (profileId: string) => {
  const supabase = createAdminClient();

  return supabase
    .from("profiles")
    .select("id, email, status")
    .eq("id", profileId)
    .eq("status", "inactive")
    .single();
};
