import { notFound } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/auth/is-admin";
import { DEMO_PROFILES } from "@/lib/seed/demo-data";
import {
  seedBatchCount,
  seedPassword,
  seedEmail,
} from "@/lib/seed/load-demo-data";
import { SeedDemoData } from "./_components/seed-demo-data";

export default async function SeedPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const mentors = DEMO_PROFILES.filter((p) => p.role === "mentor").length;
  const mentees = DEMO_PROFILES.length - mentors;

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Demo data</h1>
        <p className="text-sm text-muted-foreground">
          Creates {DEMO_PROFILES.length} demo accounts ({mentors} mentors,{" "}
          {mentees} mentees) across tech and business. Running it again first
          removes the existing demo accounts, so it is safe to repeat.
        </p>
      </header>

      <SeedDemoData
        batchCount={seedBatchCount()}
        total={DEMO_PROFILES.length}
      />

      <section className="space-y-1 rounded-md border p-4 text-sm">
        <h2 className="font-medium">Signing in as a demo user</h2>
        <p className="text-muted-foreground">
          Email <code>{seedEmail("tech-mentor-01")}</code> (or any{" "}
          <code>demo-&lt;key&gt;</code>), password <code>{seedPassword()}</code>
          . Anyone who knows this can sign in as these accounts, so purge them
          before sharing the app publicly.
        </p>
      </section>
    </main>
  );
}
