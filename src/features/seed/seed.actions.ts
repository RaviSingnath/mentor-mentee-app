"use server";

import { z } from "zod";
import { isCurrentUserAdmin } from "@/lib/auth/is-admin";
import { supabaseAdmin } from "../../../supabase/admin";
import {
  createSeedBatch,
  purgeSeedData,
  seedBatchCount,
} from "@/lib/seed/load-demo-data";

export type PurgeResult =
  | { ok: true; purged: number }
  | { ok: false; error: string };
export type BatchActionResult =
  | { ok: true; created: number; failed: { key: string; error: string }[] }
  | { ok: false; error: string };

/** Step 1 of "load demo data": remove existing demo users so the load is repeatable. */
export async function purgeDemoData(): Promise<PurgeResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "Forbidden" };
  try {
    return { ok: true, purged: await purgeSeedData(supabaseAdmin) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

/** Step 2: create one batch of demo users. The client calls this once per batch index. */
export async function loadDemoBatch(
  input: unknown,
): Promise<BatchActionResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "Forbidden" };

  const parsed = z
    .object({
      batchIndex: z
        .number()
        .int()
        .min(0)
        .max(seedBatchCount() - 1),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid batch index" };

  try {
    const result = await createSeedBatch(supabaseAdmin, parsed.data.batchIndex);
    return { ok: true, ...result };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
