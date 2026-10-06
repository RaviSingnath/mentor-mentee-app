import type { Source } from "@/features/chat/chat.schema";

interface Props {
  sources: Source[];
  open: Set<number>;
  onToggle: (n: number, open: boolean) => void;
}

/** The passages an answer used: title, who uploaded it, the page, and the quoted text. */
export function SourceList({ sources, open, onToggle }: Props) {
  if (sources.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1.5 border-t pt-3" aria-label="Sources">
      {sources.map((s) => (
        <li key={s.chunk_id}>
          <details open={open.has(s.n)} onToggle={(e) => onToggle(s.n, (e.currentTarget as HTMLDetailsElement).open)} className="rounded-md border bg-background px-3 py-2 text-sm">
            <summary className="cursor-pointer select-none">
              <span className="mr-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded bg-primary/10 px-1 text-xs font-medium text-primary">{s.n}</span>
              <span className="font-medium">{s.title}</span>
              <span className="text-muted-foreground">
                {s.uploader_name ? ` · uploaded by ${s.uploader_name}` : ""}
                {s.page ? ` · page ${s.page}` : ""}
              </span>
            </summary>
            <blockquote className="mt-2 whitespace-pre-wrap border-l-2 pl-3 text-muted-foreground">{s.passage}</blockquote>
          </details>
        </li>
      ))}
    </ul>
  );
}
