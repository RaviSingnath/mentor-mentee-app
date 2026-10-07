"use client";

import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { COMMON_LANGUAGES, LANGUAGE_NAMES } from "@/features/profile/profile.constants";
import { MAX_LANGUAGES } from "@/features/profile/profile.schema";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}

export function LanguagePicker({ value, onChange, error }: Props) {
  // keep any saved code that is not in the common list selectable, so it can be removed
  const options = [...COMMON_LANGUAGES, ...value.filter((c) => !COMMON_LANGUAGES.includes(c))];

  function toggle(code: string) {
    if (value.includes(code)) onChange(value.filter((c) => c !== code));
    else if (value.length < MAX_LANGUAGES) onChange([...value, code]);
  }

  return (
    <Field data-invalid={!!error}>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Languages you speak">
        {options.map((code) => {
          const on = value.includes(code);
          return (
            <Button
              key={code}
              type="button"
              size="sm"
              variant={on ? "default" : "outline"}
              className="rounded-full"
              aria-pressed={on}
              disabled={!on && value.length >= MAX_LANGUAGES}
              onClick={() => toggle(code)}
            >
              {LANGUAGE_NAMES[code] ?? code}
            </Button>
          );
        })}
      </div>
      <FieldDescription>Pick up to {MAX_LANGUAGES}.</FieldDescription>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
