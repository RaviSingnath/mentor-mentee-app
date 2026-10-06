import type { ReactNode } from "react";
import type { Source } from "@/features/chat/chat.schema";

export type Inline = { t: "text"; v: string } | { t: "bold"; v: string } | { t: "cite"; n: number };
export type Block = { t: "p"; inline: Inline[] } | { t: "ul"; items: Inline[][] };

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  for (const part of text.split(/(\*\*[^*\n]+\*\*|\[\d+(?:\s*,\s*\d+)*\])/)) {
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) out.push({ t: "bold", v: part.slice(2, -2) });
    else if (/^\[\d/.test(part)) for (const n of part.slice(1, -1).split(",")) out.push({ t: "cite", n: Number(n.trim()) });
    else out.push({ t: "text", v: part });
  }
  return out;
}

/** Just enough formatting for answers: paragraphs, "- " bullet lists, **bold** and [n] citations. */
export function parseAnswer(text: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: Inline[][] = [];
  const flushPara = () => {
    if (para.length) blocks.push({ t: "p", inline: parseInline(para.join(" ")) });
    para = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ t: "ul", items: list });
    list = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (!line) {
      flushPara();
      flushList();
    } else if (bullet) {
      flushPara();
      list.push(parseInline(bullet[1]));
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

function renderInline(parts: Inline[], sources: Source[], onCite: (n: number) => void): ReactNode[] {
  return parts.map((p, i) => {
    if (p.t === "bold") return <strong key={i}>{p.v}</strong>;
    if (p.t === "cite") {
      const source = sources.find((s) => s.n === p.n);
      if (!source) return <span key={i}>[{p.n}]</span>; // not a known source (or still streaming): leave as text
      return (
        <button
          key={i}
          type="button"
          onClick={() => onCite(p.n)}
          aria-label={`Source ${p.n}: ${source.title}`}
          className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded bg-primary/10 px-1 align-baseline text-xs font-medium text-primary hover:bg-primary/20"
        >
          {p.n}
        </button>
      );
    }
    return <span key={i}>{p.v}</span>;
  });
}

export function AnswerText({ content, sources, onCite }: { content: string; sources: Source[]; onCite: (n: number) => void }) {
  return (
    <div className="space-y-2">
      {parseAnswer(content).map((b, i) =>
        b.t === "p" ? (
          <p key={i}>{renderInline(b.inline, sources, onCite)}</p>
        ) : (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.items.map((item, j) => (
              <li key={j}>{renderInline(item, sources, onCite)}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
