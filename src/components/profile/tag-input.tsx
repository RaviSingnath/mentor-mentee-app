"use client";

import { useId, useState } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { dedupeCaseInsensitive, normalizeTag, TAG_MAX_LENGTH, TAG_MIN_LENGTH, TAGS_PER_LIST } from "@/features/profile/profile.schema";
import { chipClass } from "./styles";

interface Props {
  label: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
  error?: string;
}

/** Free-text tags. Press Enter or comma to add; suggestions come from tags other people already use. */
export function TagInput({ label, hint, values, onChange, suggestions, error }: Props) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  function commit() {
    const tag = normalizeTag(draft);
    if (tag === "") return;
    if (tag.length < TAG_MIN_LENGTH || tag.length > TAG_MAX_LENGTH) {
      setProblem(`Tags need ${TAG_MIN_LENGTH} to ${TAG_MAX_LENGTH} characters`);
      return;
    }
    if (values.some((v) => v.toLowerCase() === tag.toLowerCase())) {
      setDraft("");
      setProblem(null);
      return;
    }
    if (values.length >= TAGS_PER_LIST) {
      setProblem(`At most ${TAGS_PER_LIST} tags`);
      return;
    }
    onChange(dedupeCaseInsensitive([...values, tag]));
    setDraft("");
    setProblem(null);
  }

  const available = suggestions.filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 200);
  const message = problem ?? error;

  return (
    <Field data-invalid={!!message}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}

      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={`${label} selected`}>
          {values.map((tag) => (
            <li key={tag} className={chipClass}>
              {tag}
              <button
                type="button"
                className="rounded-full px-1 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${tag}`}
                onClick={() => onChange(values.filter((v) => v !== tag))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <Input
        id={id}
        value={draft}
        list={`${id}-options`}
        placeholder="Type a tag and press Enter"
        aria-describedby={hint ? `${id}-hint` : undefined}
        aria-invalid={!!message}
        onChange={(e) => {
          setDraft(e.target.value);
          setProblem(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={commit}
      />
      <datalist id={`${id}-options`}>
        {available.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {message && <FieldError>{message}</FieldError>}
    </Field>
  );
}
