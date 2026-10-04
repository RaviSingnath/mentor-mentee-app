"use server";

import createClient from "../../../supabase/server";

export const getInviteByEmail = async (inviteEmail: string) => {
  const supabase = await createClient();

  return supabase
    .from("invitations")
    .select("id")
    .eq("email", inviteEmail)
    .maybeSingle();
};
