import Link from "next/link";
import { redirect } from "next/navigation";
import { loadOwnProfile } from "@/features/profile/profile.queries";
import { ProfileForm } from "./_components/profile-form";
import { getCurrentUserServer } from "@/lib/auth/getCurrentUserServer";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUserServer();

  if (!user) redirect("/");

  const profile = await loadOwnProfile(user.id);

  if (!profile) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-muted-foreground">
          We could not load your profile.
        </p>
      </main>
    );
  }

  if (profile.role !== "mentor" && profile.role !== "mentee") {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-muted-foreground">
          Admin accounts do not have a matching profile to edit.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Your profile</h1>
        <p className="text-sm text-muted-foreground">
          This is what the matcher uses to find your{" "}
          {profile.role === "mentor" ? "mentees" : "mentors"}. After saving, see
          the results on{" "}
          <Link className="underline underline-offset-4" href="/matches">
            your matches
          </Link>
          .
        </p>
      </header>
      <ProfileForm
        role={profile.role}
        initial={profile.values}
        topicSuggestions={profile.topicSuggestions}
      />
    </main>
  );
}
