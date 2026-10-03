import { NextResponse } from "next/server";
import createClient from "../../../../supabase/server";
import { updateProfileStatusRPC } from "@/features/auth/auth.mutations";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}?error=auth_callback_failed`);
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}?error=auth_callback_failed`);
  }

  const { error: activationError } = await updateProfileStatusRPC();

  if (activationError) {
    console.error("Profile activation failed:", activationError);

    return NextResponse.redirect(
      `${origin}/login?error=profile_activation_failed`,
    );
  }

  return NextResponse.redirect(`${origin}/profile`);
}
