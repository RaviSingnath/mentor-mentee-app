"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { appToast } from "@/lib/helper/toast";
import { deleteConversationAction } from "@/features/chat/chat.actions";
import type { ConversationRow } from "@/features/chat/chat.queries";

export function ConversationList({
  conversations,
  selectedId,
}: {
  conversations: ConversationRow[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(id: string) {
    setBusy(true);
    const r = await deleteConversationAction({ conversation_id: id });
    setBusy(false);
    setConfirming(null);
    if (!r.ok) return appToast.error(r.error);
    appToast.success("Conversation deleted");
    if (id === selectedId) router.push("/chat");
    else router.refresh();
  }

  return (
    <nav
      aria-label="Conversations"
      className="flex h-full min-h-0 flex-col gap-2 p-3"
    >
      <Button asChild size="sm">
        <Link href="/chat">New chat</Link>
      </Button>
      {conversations.length === 0 ? (
        <p className="px-1 pt-2 text-sm text-muted-foreground">
          No conversations yet.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {conversations.map((c) => (
            <li
              key={c.id}
              className={`rounded-md ${c.id === selectedId ? "bg-accent" : ""}`}
            >
              {confirming === c.id ? (
                <div className="flex items-center gap-1 p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => remove(c.id)}
                  >
                    {busy ? "Deleting…" : "Confirm delete"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setConfirming(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Link
                    href={`/chat?c=${c.id}`}
                    aria-current={c.id === selectedId ? "page" : undefined}
                    className="min-w-0 flex-1 truncate px-2 py-1.5 text-sm hover:underline"
                  >
                    {c.title}
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete ${c.title}`}
                    onClick={() => setConfirming(c.id)}
                  >
                    ✕
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
