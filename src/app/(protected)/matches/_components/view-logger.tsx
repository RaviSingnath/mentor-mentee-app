"use client";

import { useEffect } from "react";
import { logViews } from "@/features/matches/matches.actions"; 

/** Renders nothing. Records once per displayed result set that these matches were viewed. */
export function ViewLogger({
  subjectId,
  items,
}: {
  subjectId: string;
  items: { candidateId: string; score: number }[];
}) {
  const key = `${subjectId}:${items.map((i) => i.candidateId).join(",")}`;

  useEffect(() => {
    if (items.length > 0) void logViews({ subjectId, items });
    // key already captures subjectId and the ids; scores can change without being a new view
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
