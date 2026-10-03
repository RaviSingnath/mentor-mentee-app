"use server";

import createClient from "../../../supabase/server";

export const updateProfileStatusRPC = async () => {
  const supabase = await createClient();

  return supabase.rpc("activate_profile");
};
