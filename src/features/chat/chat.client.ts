import { GENERIC_FAILURE, type ChatEvent, type TAsk } from "./chat.schema";

/**
 * Sends one question to /api/chat and reports each streamed event as it arrives (one JSON object per line).
 * Never throws: network problems and bad responses come back as an `error` event, so the screen has one place to show them.
 */
export async function streamChat(input: TAsk, onEvent: (e: ChatEvent) => void, fetchImpl: typeof fetch = fetch): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  } catch {
    return onEvent({ type: "error", code: "failed", message: "Could not reach the server. Check your connection and try again." });
  }

  if (!res.ok || !res.body) {
    const message = await res.json().then((j: { error?: string }) => j.error).catch(() => undefined);
    return onEvent({ type: "error", code: "failed", message: message ?? GENERIC_FAILURE });
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sawTerminal = false;

  const emit = (line: string) => {
    if (!line.trim()) return;
    try {
      const ev = JSON.parse(line) as ChatEvent;
      if (ev.type === "done" || ev.type === "error") sawTerminal = true;
      onEvent(ev);
    } catch {
      /* ignore a malformed line */
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      lines.forEach(emit);
    }
    buffer += decoder.decode();
    emit(buffer);
  } catch {
    /* connection dropped mid-stream: handled below */
  }
  if (!sawTerminal) onEvent({ type: "error", code: "failed", message: "The connection was interrupted before the answer finished. Please try again." });
}
