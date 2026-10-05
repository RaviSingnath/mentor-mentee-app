"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { loadDemoBatch, purgeDemoData } from "@/features/seed/seed.actions";

type State =
  | { phase: "idle" }
  | { phase: "running"; created: number; label: string }
  | { phase: "done"; created: number; failures: string[] }
  | { phase: "error"; message: string };

export function SeedDemoData({
  batchCount,
  total,
}: {
  batchCount: number;
  total: number;
}) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const running = state.phase === "running";

  async function run() {
    setState({
      phase: "running",
      created: 0,
      label: "Removing existing demo users",
    });

    const purged = await purgeDemoData();
    if (!purged.ok) return setState({ phase: "error", message: purged.error });

    let created = 0;
    const failures: string[] = [];
    for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
      setState({
        phase: "running",
        created,
        label: `Creating users (batch ${batchIndex + 1} of ${batchCount})`,
      });
      const result = await loadDemoBatch({ batchIndex });
      if (!result.ok)
        return setState({ phase: "error", message: result.error });
      created += result.created;
      failures.push(...result.failed.map((f) => `${f.key}: ${f.error}`));
    }
    setState({ phase: "done", created, failures });
  }

  const pct =
    state.phase === "running"
      ? Math.round((state.created / total) * 100)
      : state.phase === "done"
        ? 100
        : 0;

  return (
    <div className="space-y-4">
      <Button onClick={run} disabled={running}>
        {running ? "Loading…" : "Load demo data"}
      </Button>

      <div className="h-2 w-full overflow-hidden rounded bg-muted" aria-hidden>
        <div
          className="h-2 rounded bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div role="status" aria-live="polite" className="text-sm">
        {state.phase === "running" && (
          <p>
            {state.label}… {state.created} of {total} created
          </p>
        )}
        {state.phase === "done" && (
          <p>
            Created {state.created} of {total} demo profiles.
            {state.failures.length > 0 && " Some failed:"}
          </p>
        )}
        {state.phase === "done" && state.failures.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-destructive">
            {state.failures.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
        {state.phase === "error" && (
          <p className="text-destructive">Failed: {state.message}</p>
        )}
      </div>
    </div>
  );
}
