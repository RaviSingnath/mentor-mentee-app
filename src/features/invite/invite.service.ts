"use server";

import UserRole from "@/lib/rbac/roles";
import { createAdminClient } from "../../../supabase/admin";
import createClient from "../../../supabase/server";

export async function acceptInviteService(token: string) {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("Your not authenticated.");
  }

  const { data: invitation, error: invitationError } = await supabaseAdmin
    .from("invitations")
    .select("*")
    .eq("email", user.email)
    .eq("token", token)
    .in("status", ["pending"])
    .order("created_at", { ascending: false })
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (!invitation || invitationError) {
    throw new Error("Invite not found.");
  }

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      role: UserRole.ADMIN,
      created_by: invitation.invited_by,
      status: "active",
      full_name: invitation.full_name,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from("invitations")
    .update({
      status: "accepted",
      role: UserRole.ADMIN,
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq("id", invitation.id)
    .eq("token", token)
    .select()
    .single();

  if (inviteError) {
    throw new Error(inviteError.message);
  }

  return invite;
}
