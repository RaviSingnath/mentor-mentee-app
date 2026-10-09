"use server";

import createClient from "@/supabase/server";

export const getInviteByEmail = async (inviteEmail: string) => {
  const supabase = await createClient();

  return supabase
    .from("invitations")
    .select("id")
    .eq("email", inviteEmail)
    .maybeSingle();
};

export const getInvitesQuery = async () => {
  const supabase = await createClient();

  return supabase
    .from("invitations")
    .select(
      `
    id,
    full_name,
    email,
    role,
    status,
    expires_at,
    accepted_at,
    created_at,
    invited_by:profiles!invited_by (
      id,
      full_name,
      role
    )
  `,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
};
