import createClient from "../../../supabase/server";
import { toSaveMyProfileArgs } from "./profile.rpc";
import type { TProfile } from "./profile.schema";

export const updateProfileMutation = async (v: TProfile) => {
  const supabase = await createClient();

  return supabase.rpc("save_my_profile", toSaveMyProfileArgs(v));
};
