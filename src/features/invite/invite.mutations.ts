"use server";

import createClient from "@/supabase/server";
import { InvitationInsert } from "./invite.types";

export const cancelOlderInviteByEmail = async (email: string) => {
  const supabase = await createClient();

  return supabase
    .from("invitations")
    .update({
      status: "cancelled",
    })
    .eq("email", email)
    .in("status", ["pending"]);
};

export const createInvite = async (data: InvitationInsert) => {
  const supabase = await createClient();

  return supabase.from("invitations").insert(data);
};
