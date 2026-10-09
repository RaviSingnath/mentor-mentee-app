import { embedQuestion } from "@/lib/ai/embeddings";
import { streamGemini } from "@/lib/ai/gemini";
import { runChat, type RetrievedChunk } from "@/features/chat/chat.pipeline";
import { zAsk } from "@/features/chat/chat.schema";
import { supabaseAdmin } from "@/supabase/admin";
import createClient from "@/supabase/server";

// Answering involves a search, a model call and a streamed reply; give it room on Vercel.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Not signed in" }, 401);

  const active = await supabase.rpc("is_active_member");
  if (active.data !== true)
    return json({ error: "Your account is not active" }, 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  const parsed = zAsk.safeParse(body);
  if (!parsed.success)
    return json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      400,
    );

  const events = runChat(
    {
      userId: user.id,
      admin: supabaseAdmin,
      embedQuestion: (text) => embedQuestion(text),
      // Searched with the user's own session: match_document_chunks is SECURITY DEFINER but checks auth.uid() is an active member.
      search: async (embedding, matchCount, minSimilarity) => {
        const { data, error } = await supabase.rpc("match_document_chunks", {
          query_embedding: JSON.stringify(embedding),
          match_count: matchCount,
          min_similarity: minSimilarity,
        });
        if (error) throw new Error(`search failed: ${error.message}`);
        return ((data ?? []) as Record<string, unknown>[]).map(
          (r): RetrievedChunk => ({
            chunk_id: String(r.chunk_id),
            document_id: String(r.document_id),
            document_title: String(r.document_title),
            uploader_name: (r.uploader_name as string | null) ?? null,
            page_number: (r.page_number as number | null) ?? null,
            content: String(r.content),
            similarity: Number(r.similarity),
          }),
        );
      },
      stream: (o) => streamGemini(o),
    },
    parsed.data,
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of events)
          controller.enqueue(encoder.encode(`${JSON.stringify(ev)}\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
