import { TSignUp, TLogin, TInviteAdmin } from "@/features/auth/auth.schema";
import createClient from "../../../supabase/server";
import { RequestContext } from "@/lib/auth/request-context";
import { supabaseAdmin } from "../../../supabase/admin";
import { assertCanInvite } from "./security/invite.create.security";
import { getInviteByEmail } from "../invite/invite.queries";
import { Errors } from "@/lib/errors/error-factory";
import {
  cancelOlderInviteByEmail,
  createInvite,
} from "../invite/invite.mutations";
import { mapSupabaseError } from "@/lib/errors/supabase-error";
import { generateToken } from "@/lib/helper/generate-token";
import { mapSupabaseAuthError } from "@/lib/errors/supabase-auth-error";
import { InvitationInsert } from "../invite/invite.types";
import { getExpiresAtDate } from "@/lib/helper/date";
import { getAuthCallbackUrl, getSiteUrl } from "@/lib/site-url";

type signupServiceInput = {
  data: TSignUp;
};

export async function signUpService({ data }: signupServiceInput) {
  const supabase = await createClient();

  const redirectUrl = await getAuthCallbackUrl();

  const { data: signupData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.full_name,
        role: data.role,
      },
      emailRedirectTo: redirectUrl,
    },
  });

  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      throw Errors.alreadyExists("An account with this email");
    }

    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      // throw Errors.emailLimit(error);
      throw Errors.debugVar(
        `SITE_URL:  ${process.env.SITE_URL}, NEXT_PUBLIC_SITE_URL: ${process.env.NEXT_PUBLIC_SITE_URL}}`,
      );
    }

    throw Errors.internal();
  }

  if (signupData.user?.identities?.length === 0) {
    throw Errors.alreadyExists("An account with this email");
  }

  if (!signupData.user) throw Errors.internal();

  return redirectUrl;
}

type loginServiceInput = {
  data: TLogin;
};

export async function loginService({ data }: loginServiceInput) {
  const supabase = await createClient();

  const { data: singInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

  if (signInError) {
    throw new Error("Error occured while singing in.");
  }

  return singInData;
}

export async function logoutService(): Promise<null> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message ?? "Signout failed. Please try again.");
  }

  return null;
}

type InviteUserServiceInput = {
  ctx: RequestContext;
  data: TInviteAdmin;
};

export async function inviteAdminService({
  ctx,
  data,
}: InviteUserServiceInput) {
  // 1. Permission + scope check
  await assertCanInvite(ctx, data);

  // 2. Duplicate check
  const { data: existingInvite } = await getInviteByEmail(data.invite_email);

  if (existingInvite) {
    throw Errors.alreadyExists("Invitation");
  }

  // 3. Cancel any older active invite for this email (allows re-invite)
  const { error: cancelError } = await cancelOlderInviteByEmail(
    data.invite_email,
  );

  if (cancelError) {
    throw mapSupabaseError(cancelError);
  }

  // 4. Generate invite token + URL
  const token = generateToken();
  const inviteUrl = `${getSiteUrl()}/accept-invite?token=${token}`;

  // 5. Send via Supabase auth (uncomment when email is ready)
  const { data: invitedUserData, error: authInviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(data.invite_email, {
      redirectTo: inviteUrl,
      data: {
        full_name: data.full_name,
        role: data.target_role,
      },
    });

  if (authInviteError) {
    if (
      authInviteError.code === "user_already_exists" ||
      authInviteError.code === "email_exists"
    ) {
      throw Errors.alreadyExists("An account with this email");
    }

    if (
      authInviteError.code === "over_email_send_rate_limit" ||
      authInviteError.status === 429
    ) {
      throw Errors.emailLimit(authInviteError);
    }

    throw mapSupabaseAuthError(authInviteError);
  }

  const { error: roleError } = await supabaseAdmin
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", invitedUserData.user.id);

  if (roleError) {
    await supabaseAdmin.auth.admin.deleteUser(invitedUserData.user.id); // don't leave a half-created user
    throw roleError;
  }

  // 6. Insert invitation row
  const inviteData: InvitationInsert = {
    email: data.invite_email,
    full_name: data.full_name,
    role: data.target_role,
    token,
    invited_by: ctx.user.id,
    expires_at: getExpiresAtDate(),
  };

  const { data: invitation, error } = await createInvite(inviteData);

  if (error) {
    throw mapSupabaseError(error);
  }

  return invitation;
}
