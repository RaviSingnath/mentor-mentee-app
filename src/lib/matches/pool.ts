import { z } from "zod";
import type { PoolProfile } from "./types";
import { zPoolProfileSchema } from "./types";
import { getMatchPoolService } from "@/features/matches/matches.services";

export function parseMatchPool(raw: unknown): PoolProfile[] {
  return z.array(zPoolProfileSchema).parse(raw);
}

/**
 * Load every active mentor and mentee through the service role.
 * Only call this from server code after the caller has been verified.
 */
export async function loadMatchPool(): Promise<PoolProfile[]> {
  const { data } = await getMatchPoolService();

  return parseMatchPool(data);
}
