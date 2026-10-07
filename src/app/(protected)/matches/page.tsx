import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getMatchView } from "@/lib/matches/match-view";
import { MatchAgainButton } from "./_components/match-again-button";
import { MatchCard } from "./_components/match-card";
import { SubjectPicker } from "./_components/subject-picker";
import { ViewLogger } from "./_components/view-logger";

import { isActiveMemberService } from "@/features/matches/matches.services";
import { getCurrentUserServer } from "@/lib/auth/getCurrentUserServer";
import UserRole from "@/lib/rbac/roles";

// Matches are recomputed on every request (and on "Match again"); never serve a cached result.
export const dynamic = "force-dynamic";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const user = await getCurrentUserServer();
  if (!user) redirect("/"); // adjust to your sign-in route

  const userRole = user?.role as UserRole | undefined;

  const isAdmin = userRole
    ? [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)
    : false;

  const isMember = await isActiveMemberService();
  if (!isMember) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-muted-foreground">
          Your account is not active yet, so matching is unavailable.
        </p>
      </main>
    );
  }

  // The ?subject= parameter is honoured for admins only; getMatchView enforces this again.
  const { subject } = await searchParams;
  const subjectParam = isAdmin
    ? (z.string().uuid().safeParse(subject).data ?? null)
    : null;

  const view = await getMatchView({
    viewerId: user.id,
    isAdmin,
    subjectParam,
  });
  const kind = view.subject?.role === "mentee" ? "mentors" : "mentees";

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">
            {isAdmin ? "Matches" : "Your matches"}
          </h1>
          {view.subject && !view.profileTooEmpty && <MatchAgainButton />}
        </div>
        {isAdmin && (
          <SubjectPicker
            options={view.subjectOptions}
            value={view.subject?.id ?? null}
          />
        )}
      </header>

      {!view.subject && (
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Choose someone above to see their best matches."
            : "Your profile is not in the matching pool yet."}
        </p>
      )}

      {view.subject && view.profileTooEmpty && (
        <section
          className="space-y-3 rounded-lg border bg-card p-4 text-sm"
          role="status"
        >
          {isAdmin && view.subject.id !== user.id ? (
            <p>
              <span className="font-medium">{view.subject.fullName}</span> has
              not filled in their profile yet, so there is nothing to match on.
            </p>
          ) : (
            <>
              <p className="font-medium">Your profile is empty</p>
              <p className="text-muted-foreground">
                Fill in your profile (skills or goals, availability, languages
                and so on) to get your best matches.
              </p>
              <Link
                href="/profile"
                className="inline-block font-medium underline underline-offset-4"
              >
                Complete my profile
              </Link>
            </>
          )}
        </section>
      )}

      {view.subject && !view.profileTooEmpty && (
        <>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? (
              <>
                Top {view.results.length} {kind} for{" "}
                <span className="font-medium text-foreground">
                  {view.subject.fullName}
                </span>
              </>
            ) : (
              <>
                Your top {view.results.length} {kind}
              </>
            )}
            {view.dismissedCount > 0 &&
              ` · ${view.dismissedCount} hidden as not a fit`}
          </p>

          {view.results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No one to match with yet.
            </p>
          ) : (
            <ul className="space-y-4">
              {view.results.map((r, i) => (
                <MatchCard
                  key={r.profile.id}
                  subjectId={view.subject!.id}
                  data={r}
                  rank={i + 1}
                />
              ))}
            </ul>
          )}

          <ViewLogger
            subjectId={view.subject.id}
            items={view.results.map((r) => ({
              candidateId: r.profile.id,
              score: r.score,
            }))}
          />
        </>
      )}
    </main>
  );
}
