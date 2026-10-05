"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { MatchCardData } from "@/lib/matches/types";
import {
  dismissMatch,
  saveMatch,
  unsaveMatch,
} from "@/features/matches/matches.actions";

const place = (p: MatchCardData["profile"]) =>
  [p.city, p.state, p.country].filter(Boolean).join(", ");
const trim = (n: number) => String(Number(n.toFixed(1)));

export function MatchCard({
  subjectId,
  data,
  rank,
}: {
  subjectId: string;
  data: MatchCardData;
  rank: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { profile, score, reasons, signals, saved } = data;

  function run(action: typeof saveMatch) {
    setError(null);
    startTransition(async () => {
      const result = await action({
        subjectId,
        candidateId: profile.id,
        score,
      });
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  const tags = profile.role === "mentor" ? profile.skills : profile.goals;

  return (
    <li className="rounded-lg border bg-card p-4 text-card-foreground">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-muted-foreground">#{rank}</p>
          <h3 className="truncate text-base font-semibold">
            {profile.fullName}
          </h3>
          <p className="text-sm text-muted-foreground">
            <span className="capitalize">{profile.role}</span>
            {profile.experienceLevel && <> · {profile.experienceLevel}</>}
            {place(profile) && <> · {place(profile)}</>}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-semibold tabular-nums">{trim(score)}</p>
          <p className="text-xs text-muted-foreground">out of 100</p>
        </div>
      </div>

      {profile.bio && <p className="mt-3 text-sm">{profile.bio}</p>}

      {tags.length > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          {profile.role === "mentor" ? "Skills" : "Goals"}: {tags.join(", ")}
        </p>
      )}

      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          How this score is calculated
        </summary>
        <ul className="mt-2 space-y-2">
          {signals.map((s) => (
            <li key={s.key}>
              <div className="flex justify-between gap-2">
                <span>{s.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {trim(s.points)} / {s.weight}
                </span>
              </div>
              <div
                className="mt-1 h-1.5 w-full overflow-hidden rounded bg-muted"
                aria-hidden
              >
                <div
                  className="h-1.5 rounded bg-primary"
                  style={{ width: `${Math.round(s.value * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{s.reason}</p>
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {saved ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(unsaveMatch)}
          >
            Saved ✓ (undo)
          </Button>
        ) : (
          <Button size="sm" disabled={pending} onClick={() => run(saveMatch)}>
            Save
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => run(dismissMatch)}
        >
          Not a fit
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </li>
  );
}
