import { z } from "zod";
import { getMatchView } from "@/lib/matches/match-view";
import { MatchCard } from "./_components/match-card";
import { SubjectPicker } from "./_components/subject-picker";
import { ViewLogger } from "./_components/view-logger";
import { isActiveMemberService } from "@/features/matches/matches.services";
import { getCurrentUserServer } from "@/lib/auth/getCurrentUserServer";
import { redirect } from "next/navigation";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const user = await getCurrentUserServer();

  if (!user) {
    redirect("/");
  }

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

  const { subject } = await searchParams;
  const subjectParam = z.string().uuid().safeParse(subject).data ?? null;

  const view = await getMatchView({
    viewerId: user.id,
    subjectParam,
  });
  const subjectId = view.subject?.id ?? null;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="space-y-4">
        <h1 className="text-2xl font-semibold">Matches</h1>
        <SubjectPicker options={view.subjectOptions} value={subjectId} />
      </header>

      {!view.subject && (
        <p className="text-sm text-muted-foreground">
          Choose someone above to see their best matches.
        </p>
      )}

      {view.subject && (
        <>
          <p className="text-sm text-muted-foreground">
            Top {view.results.length}{" "}
            {view.subject.role === "mentee" ? "mentors" : "mentees"} for{" "}
            <span className="font-medium text-foreground">
              {view.subject.fullName}
            </span>
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
