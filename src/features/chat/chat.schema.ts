import { z } from "zod";

export const MAX_QUESTION_LENGTH = 2000;
/** Passages sent to the model per question. */
export const TOP_K = 6;
/** Passages less similar than this are dropped before the model is called (saves quota on unrelated questions). Tune with real data. */
export const MIN_SIMILARITY = 0.3;
/** Earlier messages included so follow-up questions make sense. */
export const HISTORY_MESSAGES = 6;
export const MAX_MESSAGES_PER_CONVERSATION = 100;
export const MAX_TITLE_LENGTH = 60;

/** The one sentence the assistant must use when the documents do not answer the question. Tests and the UI rely on it. */
export const NOT_FOUND_ANSWER = "I can't find this in the uploaded documents.";
export const GENERIC_FAILURE = "Something went wrong while answering. Please try again.";

export const zAsk = z.object({
  conversation_id: z.uuid("Invalid conversation").optional(),
  message: z.string().trim().min(1, "Type a question").max(MAX_QUESTION_LENGTH, `Questions can be at most ${MAX_QUESTION_LENGTH} characters`),
});
export type TAsk = z.infer<typeof zAsk>;

/** What the question box holds. */
export const zAskForm = z.object({ message: zAsk.shape.message });
export type TAskForm = z.infer<typeof zAskForm>;

export const zConversationId = z.object({ conversation_id: z.uuid("Invalid conversation") });

/** A passage the answer drew on, saved with the message so the citation survives renames and deletions. */
export interface Source {
  n: number;
  chunk_id: string;
  document_id: string;
  title: string;
  uploader_name: string | null;
  page: number | null;
  passage: string;
  similarity: number;
}

export type ChatErrorCode = "rate_limit" | "blocked" | "limit" | "failed";

/** One line of the streamed response (newline-delimited JSON). */
export type ChatEvent =
  | { type: "conversation"; id: string; title: string; created: boolean }
  | { type: "status"; text: string }
  | { type: "delta"; text: string }
  | { type: "done"; message_id: string; content: string; sources: Source[] }
  | { type: "error"; code: ChatErrorCode; message: string };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[];
  created_at: string;
}

export const titleFromQuestion = (q: string) => {
  const one = q.replace(/\s+/g, " ").trim();
  return one.length <= MAX_TITLE_LENGTH ? one : `${one.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`;
};
