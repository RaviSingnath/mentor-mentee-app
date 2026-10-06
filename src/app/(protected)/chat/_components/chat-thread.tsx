"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { streamChat } from "@/features/chat/chat.client";
import {
  MAX_QUESTION_LENGTH,
  zAskForm,
  type ChatErrorCode,
  type ChatEvent,
  type ChatMessage,
  type Source,
  type TAskForm,
} from "@/features/chat/chat.schema";
import { AnswerText } from "@/components/chat/format-answer";
import { SourceList } from "@/components/chat/source-list";

interface Props {
  conversationId: string | null;
  initialMessages: ChatMessage[];
}

type Failure = { code: ChatErrorCode; message: string; question: string };

function AssistantMessage({ m }: { m: ChatMessage }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (n: number, isOpen: boolean) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(n);
      else next.delete(n);
      return next;
    });
  return (
    <div>
      <AnswerText
        content={m.content}
        sources={m.sources}
        onCite={(n) => toggle(n, !open.has(n))}
      />
      <SourceList sources={m.sources} open={open} onToggle={toggle} />
    </div>
  );
}

export function ChatThread({
  conversationId: initialId,
  initialMessages,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | null>(
    initialId,
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TAskForm>({
    resolver: zodResolver(zAskForm),
    defaultValues: { message: "" },
  });

  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: "end" });
  }, [messages, status, failure]);

  async function send(question: string) {
    setFailure(null);
    setBusy(true);
    setStatus("Thinking…");
    const now = new Date().toISOString();
    setMessages((m) => [
      ...m,
      {
        id: `local-user-${m.length}`,
        role: "user",
        content: question,
        sources: [],
        created_at: now,
      },
      {
        id: "streaming",
        role: "assistant",
        content: "",
        sources: [],
        created_at: now,
      },
    ]);

    let activeId = conversationId;
    const onEvent = (e: ChatEvent) => {
      if (e.type === "conversation") {
        activeId = e.id;
        setConversationId(e.id);
        if (e.created) window.history.replaceState(null, "", `/chat?c=${e.id}`);
      } else if (e.type === "status") {
        setStatus(e.text);
      } else if (e.type === "delta") {
        setStatus(null);
        setMessages((m) =>
          m.map((x) =>
            x.id === "streaming" ? { ...x, content: x.content + e.text } : x,
          ),
        );
      } else if (e.type === "done") {
        setMessages((m) =>
          m.map((x) =>
            x.id === "streaming"
              ? {
                  ...x,
                  id: e.message_id,
                  content: e.content,
                  sources: e.sources as Source[],
                }
              : x,
          ),
        );
      } else if (e.type === "error") {
        setMessages((m) =>
          m.filter((x) => x.id !== "streaming" || x.content !== ""),
        );
        setFailure({ code: e.code, message: e.message, question });
      }
    };

    await streamChat(
      { conversation_id: activeId ?? undefined, message: question },
      onEvent,
    );
    setBusy(false);
    setStatus(null);
    router.refresh(); // updates the conversation list
  }

  async function onSubmit(values: TAskForm) {
    reset({ message: "" });
    await send(values.message);
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
        aria-live="polite"
      >
        {empty && (
          <div className="mx-auto max-w-md space-y-2 pt-12 text-center text-sm text-muted-foreground">
            <h2 className="text-base font-semibold text-foreground">
              Ask about the documents
            </h2>
            <p>
              Answers come only from documents members have uploaded, and every
              answer shows where it came from.
            </p>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div
              key={m.id}
              className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
            >
              {m.content}
            </div>
          ) : m.content === "" ? null : (
            <div
              key={m.id}
              className="max-w-[90%] rounded-lg border bg-card px-3 py-2 text-sm text-card-foreground"
            >
              <AssistantMessage m={m} />
            </div>
          ),
        )}

        {status && (
          <p role="status" className="text-sm text-muted-foreground">
            {status}
          </p>
        )}

        {failure && (
          <div
            role="alert"
            className="max-w-[90%] space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm"
          >
            <p className="font-medium text-destructive">
              {failure.code === "rate_limit"
                ? "Free usage limit reached"
                : "Could not answer"}
            </p>
            <p>{failure.message}</p>
            {failure.code !== "limit" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => send(failure.question)}
              >
                Try again
              </Button>
            )}
          </div>
        )}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="border-t bg-background p-3"
      >
        <Field data-invalid={!!errors.message}>
          <Textarea
            aria-label="Your question"
            rows={2}
            maxLength={MAX_QUESTION_LENGTH}
            placeholder="Ask a question about the uploaded documents…"
            aria-invalid={!!errors.message}
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            {...register("message")}
          />
          {errors.message && <FieldError>{errors.message.message}</FieldError>}
          <div className="flex items-center justify-between gap-2">
            <FieldDescription>
              Enter to send, Shift+Enter for a new line.
            </FieldDescription>
            <Button type="submit" disabled={busy}>
              {busy ? "Answering…" : "Ask"}
            </Button>
          </div>
        </Field>
      </form>
    </div>
  );
}
