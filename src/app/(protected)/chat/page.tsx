import { redirect } from "next/navigation";
import { ChatThread } from "./_components/chat-thread";
import { ConversationList } from "./_components/conversation-list";
import { listConversations, loadMessages } from "@/features/chat/chat.queries";
import { zConversationId } from "@/features/chat/chat.schema";
import { getCurrentUserServer } from "@/lib/auth/getCurrentUserServer";
import createClient from "../../../../supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const supabase = await createClient();
  const user = await getCurrentUserServer();

  if (!user) redirect("/");

  const { c } = await searchParams;
  const requested = zConversationId.safeParse({ conversation_id: c });

  const [conversations, messages] = await Promise.all([
    listConversations(supabase),
    requested.success
      ? loadMessages(supabase, requested.data.conversation_id)
      : null,
  ]);

  const selectedId =
    requested.success && messages ? requested.data.conversation_id : null; // an unknown or foreign id just opens a new chat

  return (
    <main className="mx-auto grid h-[calc(100dvh-4rem)] max-w-5xl grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border md:grid-cols-[16rem_1fr] md:grid-rows-1">
      <aside className="hidden border-r bg-card md:block">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
        />
      </aside>
      {/* on a phone the list folds away above the thread */}
      <details className="border-b bg-card md:hidden">
        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium">
          Conversations ({conversations.length})
        </summary>
        <div className="max-h-64 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
          />
        </div>
      </details>
      <section className="min-h-0">
        {/* key: switching conversations starts the thread fresh */}
        <ChatThread
          key={selectedId ?? "new"}
          conversationId={selectedId}
          initialMessages={messages ?? []}
        />
      </section>
    </main>
  );
}
