import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../supabase/database.types";
import { DEMO_PROFILES, type SeedProfile } from "./demo-data";

type Admin = SupabaseClient<Database>;

/** Users are created in small batches so each server action call stays well inside Vercel's time limit. */
export const SEED_BATCH_SIZE = 5;

export const seedBatchCount = () => Math.ceil(DEMO_PROFILES.length / SEED_BATCH_SIZE);

/** Demo accounts all share one password so you can log in as any of them while testing. */
export const seedPassword = () => process.env.SEED_PASSWORD ?? "123456";

/** example.com is a reserved domain, so no real mailbox can receive these. Override with SEED_EMAIL_DOMAIN if Auth rejects it. */
export const seedEmail = (key: string) => `demo-${key}@${process.env.SEED_EMAIL_DOMAIN ?? "yopmail.com"}`;

export interface BatchResult {
  created: number;
  failed: { key: string; error: string }[];
}

/** Delete every demo user (cascades to profiles, tags, slots, saved matches). Returns how many were removed. */
export async function purgeSeedData(admin: Admin): Promise<number> {
  const { data, error } = await admin.rpc("purge_seed_users");
  if (error) throw new Error(`purge_seed_users failed: ${error.message}`);
  return Number(data ?? 0);
}

/**
 * Create one demo user and fill in everything the matcher needs.
 * Steps: Auth user (email pre-confirmed, so the signup trigger makes the profile 'active') ->
 * profile fields + is_seed -> tags -> availability. Safe to retry: an existing user is reused.
 */
export async function createSeedProfile(admin: Admin, p: SeedProfile): Promise<void> {
  const email = seedEmail(p.key);

  const created = await admin.auth.admin.createUser({
    email,
    password: seedPassword() || randomBytes(24).toString("base64url"),
    email_confirm: true,
    user_metadata: { full_name: p.fullName, role: p.role },
  });

  let userId: string;
  if (created.error) {
    if ((created.error as { code?: string }).code !== "email_exists") {
      throw new Error(`createUser failed: ${created.error.message}`);
    }
    const existing = await admin.from("profiles").select("id").eq("email", email).single();
    if (existing.error || !existing.data) throw new Error(`user exists but has no profile: ${email}`);
    userId = existing.data.id;
  } else {
    userId = created.data.user.id;
  }

  const profile = await admin
    .from("profiles")
    .update({
      bio: p.bio,
      experience_level: p.experienceLevel,
      city: p.city,
      state: p.state,
      country: p.country,
      timezone: p.timezone,
      languages: p.languages,
      is_seed: true,
      status: "active",
    })
    .eq("id", userId);
  if (profile.error) throw new Error(`profile update failed: ${profile.error.message}`);

  const topics = await admin.rpc("replace_profile_topics", {
    p_profile_id: userId,
    p_skills: p.skills,
    p_goals: p.goals,
    p_interests: p.interests,
  });
  if (topics.error) throw new Error(`topics failed: ${topics.error.message}`);

  const cleared = await admin.from("availability_slots").delete().eq("profile_id", userId);
  if (cleared.error) throw new Error(`clearing slots failed: ${cleared.error.message}`);

  const slots = await admin.from("availability_slots").insert(
    p.availability.map((s) => ({ profile_id: userId, weekday: s.weekday, start_time: s.start, end_time: s.end })),
  );
  if (slots.error) throw new Error(`slots failed: ${slots.error.message}`);
}

/**
 * Create one batch of demo users. Profiles inside a batch are processed one after another
 * (not in parallel), which keeps load on Auth low and avoids any chance of lock contention on shared tags.
 * A failure on one profile is reported and does not stop the rest of the batch.
 */
export async function createSeedBatch(admin: Admin, batchIndex: number): Promise<BatchResult> {
  const start = batchIndex * SEED_BATCH_SIZE;
  const batch = DEMO_PROFILES.slice(start, start + SEED_BATCH_SIZE);
  const failed: BatchResult["failed"] = [];

  for (const p of batch) {
    try {
      await createSeedProfile(admin, p);
    } catch (e) {
      failed.push({ key: p.key, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { created: batch.length - failed.length, failed };
}
