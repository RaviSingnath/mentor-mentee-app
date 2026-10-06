"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AvailabilitySlot } from "@/lib/matching/availability";
import { WEEKDAYS } from "@/features/profile/profile.constants";
import { findOverlap, MAX_SLOTS } from "@/features/profile/profile.schema";
import { chipClass } from "./styles";

interface Props {
  value: AvailabilitySlot[];
  onChange: (next: AvailabilitySlot[]) => void;
  timezone: string;
  error?: string;
}

const dayLabel = (weekday: number) => WEEKDAYS.find((d) => d.value === weekday)?.label ?? String(weekday);
const sortSlots = (slots: AvailabilitySlot[]) =>
  [...slots].sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start));

/** Weekly recurring windows, entered in the person's own timezone. */
export function AvailabilityEditor({ value, onChange, timezone, error }: Props) {
  const id = useId();
  const [draft, setDraft] = useState<AvailabilitySlot>({ weekday: 1, start: "18:00", end: "20:00" });
  const [problem, setProblem] = useState<string | null>(null);

  function add() {
    if (!draft.start || !draft.end) return setProblem("Choose a start and end time");
    if (draft.start >= draft.end) return setProblem("The end time must be after the start time");
    if (value.length >= MAX_SLOTS) return setProblem(`At most ${MAX_SLOTS} slots`);
    if (findOverlap([...value, draft])) return setProblem("That overlaps a slot you already added");
    onChange(sortSlots([...value, draft]));
    setProblem(null);
  }

  const message = problem ?? error;

  return (
    <Field data-invalid={!!message}>
      <FieldDescription>Weekly times when you can meet, in your timezone ({timezone.replace(/_/g, " ")}).</FieldDescription>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Your availability">
          {value.map((s) => (
            <li key={`${s.weekday}-${s.start}-${s.end}`} className={chipClass}>
              {dayLabel(s.weekday)} {s.start}–{s.end}
              <button
                type="button"
                className="rounded-full px-1 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${dayLabel(s.weekday)} ${s.start} to ${s.end}`}
                onClick={() => onChange(value.filter((x) => x !== s))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No times added yet.</p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-auto">
          <FieldLabel htmlFor={`${id}-day`}>Day</FieldLabel>
          <Select value={String(draft.weekday)} onValueChange={(v) => setDraft({ ...draft, weekday: Number(v) })}>
            <SelectTrigger id={`${id}-day`} className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAYS.map((d) => (
                <SelectItem key={d.value} value={String(d.value)}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field className="w-auto">
          <FieldLabel htmlFor={`${id}-start`}>From</FieldLabel>
          <Input id={`${id}-start`} type="time" step={900} value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
        </Field>
        <Field className="w-auto">
          <FieldLabel htmlFor={`${id}-end`}>To</FieldLabel>
          <Input id={`${id}-end`} type="time" step={900} value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
        </Field>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          Add time
        </Button>
        {value.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
            Clear all
          </Button>
        )}
      </div>

      {message && <FieldError>{message}</FieldError>}
    </Field>
  );
}
