import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../supabase/database.types";
import type { ChatMessage, Source } from "./chat.schema";

export interface ConversationRow {
  id: string;
  title: string;
  updated_at: string;
}

/** Both read through the caller's own session, so RLS returns only their own conversations. */
export async function listConversations(supabase: SupabaseClient<Database>): Promise<ConversationRow[]> {
  const { data, error } = await supabase.from("conversations").select("id, title, updated_at").order("updated_at", { ascending: false }).limit(100);
  if (error) throw new Error(`conversations load failed: ${error.message}`);
  return (data ?? []) as ConversationRow[];
}

export async function loadMessages(supabase: SupabaseClient<Database>, conversationId: string): Promise<ChatMessage[] | null> {
  const { data: convo } = await supabase.from("conversations").select("id").eq("id", conversationId).maybeSingle();
  if (!convo) return null; // not theirs, or gone
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, sources, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`messages load failed: ${error.message}`);
  return ((data ?? []) as ChatMessage[]).map((m) => ({ ...m, sources: Array.isArray(m.sources) ? (m.sources as Source[]) : [] }));
}
