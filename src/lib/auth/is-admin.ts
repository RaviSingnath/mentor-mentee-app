import createClient from "@/supabase/server";

/**
 * True when the signed-in user is an active admin or super_admin.
 * Uses the user's own session and the is_admin() database function, so the check follows the same rules as RLS.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser(); // getUser() revalidates the token; getSession() does not
  if (!user) return false;

  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
}
