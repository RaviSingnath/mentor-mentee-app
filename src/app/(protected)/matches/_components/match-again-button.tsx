"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

/**
 * Re-runs the matching with the latest data (profile edits, new members, changed availability).
 * router.refresh() re-renders the server component, which recomputes the ranking from scratch.
 */
export function MatchAgainButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Matching…" : "Match again"}
    </Button>
  );
}
