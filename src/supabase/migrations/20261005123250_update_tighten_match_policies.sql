-- The app now lets members see and act on their OWN matches only; only admins can act for someone else.
-- The server actions already enforce this. This migration enforces it in the database as well, so a member
-- calling the API directly cannot write saved matches or log interactions for another person's subject.
-- (Before this, the policies only required actor_id = the caller. That never exposed data, but it let a
-- member write rows about other people's matching.)

drop policy if exists saved_matches_insert_own on public.saved_matches;
create policy saved_matches_insert_own on public.saved_matches
  for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and (select public.is_active_member())
    and (subject_id = (select auth.uid()) or (select public.is_admin()))
  );

drop policy if exists match_interactions_insert_own on public.match_interactions;
create policy match_interactions_insert_own on public.match_interactions
  for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and (select public.is_active_member())
    and (subject_id = (select auth.uid()) or (select public.is_admin()))
  );