import { TSignUp, TLogin, TInviteAdmin } from "@/features/auth/auth.schema";
import createClient from "@/supabase/server";
import { supabaseAdmin } from "@/supabase/admin";
import { RequestContext } from "@/lib/auth/request-context";
import { assertCanInvite } from "./security/invite.create.security";
import { getInviteByEmail } from "../invite/invite.queries";
import { Errors } from "@/lib/errors/error-factory";
import {
  cancelOlderInviteByEmail,
  createInvite,
} from "../invite/invite.mutations";
import { mapSupabaseError } from "@/lib/errors/supabase-error";
import { generateToken } from "@/lib/helper/generate-token";
import {
  mapSupabaseAuthError,
  throwOnAuthError,
} from "@/lib/errors/supabase-auth-error";
import { InvitationInsert } from "../invite/invite.types";
import { getExpiresAtDate } from "@/lib/helper/date";
import { getAuthCallbackUrl, getSiteUrl } from "@/lib/site-url";

type signupServiceInput = {
  signupData: TSignUp;
};

export async function signUpService({ signupData }: signupServiceInput) {
  const supabase = await createClient();
  const redirectUrl = await getAuthCallbackUrl();

  const { data, error } = await supabase.auth.signUp({
    email: signupData.email,
    password: signupData.password,
    options: {
      data: { full_name: signupData.full_name, role: signupData.role },
      emailRedirectTo: redirectUrl,
    },
  });
  throwOnAuthError(error, "signup"); // real failures: weak password, invalid email, rate limit, network

  // Email already has a confirmed account: Supabase returns a made-up user with no identities.
  // Nothing was created and no email was sent. The caller treats it exactly like a new sign-up,
  // so the user cannot tell the two cases apart. We only log it for ourselves.
  const alreadyRegistered =
    !data.user || (data.user.identities?.length ?? 0) === 0;
  if (alreadyRegistered)
    console.info("signup: email already registered, no email sent");

  return { alreadyRegistered };
}

type loginServiceInput = {
  singInData: TLogin;
};

export async function loginService({ singInData }: loginServiceInput) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: singInData.email,
    password: singInData.password,
  });

  throwOnAuthError(error);
  return { userId: data.user!.id };
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
