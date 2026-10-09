"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/supabase/admin";
import createClient from "@/supabase/server";
import { zConversationId } from "./chat.schema";

export type TDeleteConversationResult =
  | { ok: true }
  | { ok: false; error: string };

/** Deletes one of the caller's own conversations and its messages. */
export async function deleteConversationAction(
  input: unknown,
): Promise<TDeleteConversationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const parsed = zConversationId.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Conversation not found" };

  const admin = supabaseAdmin;
  const found = await admin
    .from("conversations")
    .select("id")
    .eq("id", parsed.data.conversation_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!found.data) return { ok: false, error: "Conversation not found" }; // someone else's looks the same as a missing one

  const { error } = await admin
    .from("conversations")
    .delete()
    .eq("id", parsed.data.conversation_id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Could not delete the conversation" };
  revalidatePath("/chat");
  return { ok: true };
}
