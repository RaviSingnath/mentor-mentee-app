import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "../../../supabase/database.types";
import {
  GeminiBlockedError,
  GeminiRateLimitError,
  GeminiUnavailableError,
} from "@/lib/ai/errors";
import type { GeminiEvent } from "@/lib/ai/gemini";
import type { Database } from "../../../supabase/database.types";
import {
  buildTurns,
  retrievalQuery,
  SYSTEM_PROMPT,
  sourcesForAnswer,
} from "./chat.prompt";
import {
  GENERIC_FAILURE,
  HISTORY_MESSAGES,
  MAX_MESSAGES_PER_CONVERSATION,
  MIN_SIMILARITY,
  NOT_FOUND_ANSWER,
  titleFromQuestion,
  TOP_K,
  type ChatEvent,
  type ChatMessage,
  type Source,
} from "./chat.schema";

export interface RetrievedChunk {
  chunk_id: string;
  document_id: string;
  document_title: string;
  uploader_name: string | null;
  page_number: number | null;
  content: string;
  similarity: number;
}

export interface ChatDeps {
  userId: string;
  /** Service-role client: saves conversations and messages. Never given to the browser. */
  admin: SupabaseClient<Database>;
  /** Searches every member's ready documents (the database function checks the caller is an active member). */
  search: (
    embedding: number[],
    matchCount: number,
    minSimilarity: number,
  ) => Promise<RetrievedChunk[]>;
  embedQuestion: (text: string) => Promise<number[]>;
  stream: (o: {
    system: string;
    turns: { role: "user" | "model"; text: string }[];
  }) => AsyncGenerator<GeminiEvent>;
}

const toSource = (c: RetrievedChunk, i: number): Source => ({
  n: i + 1,
  chunk_id: c.chunk_id,
  document_id: c.document_id,
  title: c.document_title,
  uploader_name: c.uploader_name,
  page: c.page_number,
  passage: c.content,
  similarity: Math.round(c.similarity * 1000) / 1000,
});

const errorEvent = (e: unknown): ChatEvent => {
  if (e instanceof GeminiRateLimitError)
    return { type: "error", code: "rate_limit", message: e.message };
  if (e instanceof GeminiBlockedError)
    return { type: "error", code: "blocked", message: e.message };
  console.error("chat failed:", e);
  if (e instanceof GeminiUnavailableError)
    return { type: "error", code: "failed", message: e.userMessage };
  return { type: "error", code: "failed", message: GENERIC_FAILURE };
};

/**
 * One question, start to finish, as a stream of events for the browser:
 *   save the question -> search all documents -> ask Gemini Flash with the passages -> stream the answer -> save it with its sources.
 * An answer is saved only when it completes, so a dropped or rate-limited stream never leaves half an answer in the history.
 * The question itself is saved first, so it is not lost when the answer fails.
 */
export async function* runChat(
  deps: ChatDeps,
  input: { conversation_id?: string; message: string },
): AsyncGenerator<ChatEvent> {
  const { admin, userId } = deps;
  const question = input.message;

  // 1. conversation (new, or an existing one that must belong to the caller)
  let conversationId = input.conversation_id;
  let title: string;
  let created = false;
  if (conversationId) {
    const { data } = await admin
      .from("conversations")
      .select("id, title")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!data)
      return yield {
        type: "error",
        code: "failed",
        message: "Conversation not found",
      };
    title = (data as { title: string }).title;
  } else {
    title = titleFromQuestion(question);
    const { data, error } = await admin
      .from("conversations")
      .insert({ user_id: userId, title })
      .select("id")
      .single();
    const row = data as { id: string } | null;
    if (error || !row)
      return yield { type: "error", code: "failed", message: GENERIC_FAILURE };
    conversationId = row.id;
    created = true;
  }
  yield { type: "conversation", id: conversationId, title, created };

  // 2. earlier messages, and the cap on a conversation's length
  const { data: previous } = await admin
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  const earlier = (previous ?? []) as Pick<ChatMessage, "role" | "content">[];
  if (earlier.length >= MAX_MESSAGES_PER_CONVERSATION) {
    return yield {
      type: "error",
      code: "limit",
      message: "This conversation is getting long. Please start a new chat.",
    };
  }

  // 3. save the question
  const saved = await admin.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: question,
    sources: [],
  });
  if (saved.error)
    return yield { type: "error", code: "failed", message: GENERIC_FAILURE };

  try {
    // 4. search everyone's documents
    yield { type: "status", text: "Searching the documents…" };
    const lastUserMessage = [...earlier]
      .reverse()
      .find((m) => m.role === "user")?.content;
    const embedding = await deps.embedQuestion(
      retrievalQuery(question, lastUserMessage),
    );
    const chunks = await deps.search(embedding, TOP_K, MIN_SIMILARITY);
    const sources = chunks.map(toSource);

    // 5. nothing relevant: answer directly, without spending a model call
    if (sources.length === 0) {
      const answer = `${NOT_FOUND_ANSWER} No uploaded document seems related to this question.`;
      yield { type: "delta", text: answer };
      yield* finish(deps, conversationId, answer, []);
      return;
    }

    // 6. ask Gemini Flash and stream the answer
    yield { type: "status", text: "Writing the answer…" };
    const turns = buildTurns(
      earlier.slice(-HISTORY_MESSAGES),
      question,
      sources,
    );
    let answer = "";
    for await (const ev of deps.stream({ system: SYSTEM_PROMPT, turns })) {
      if (ev.type === "text") {
        answer += ev.text;
        yield { type: "delta", text: ev.text };
      }
    }
    answer = answer.trim();
    if (!answer)
      return yield {
        type: "error",
        code: "blocked",
        message:
          "The AI returned an empty answer. Try rephrasing the question.",
      };

    // 7. save it with the passages it used
    yield* finish(
      deps,
      conversationId,
      answer,
      sourcesForAnswer(answer, sources),
    );
  } catch (e) {
    yield errorEvent(e);
  }
}

async function* finish(
  deps: ChatDeps,
  conversationId: string,
  answer: string,
  sources: Source[],
): AsyncGenerator<ChatEvent> {
  const { data, error } = await deps.admin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: "assistant",
      content: answer,
      sources: sources as unknown as Json,
    })
    .select("id")
    .single();
  const row = data as { id: string } | null;
  if (error || !row)
    return yield { type: "error", code: "failed", message: GENERIC_FAILURE };
  await deps.admin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  yield { type: "done", message_id: row.id, content: answer, sources };
}
