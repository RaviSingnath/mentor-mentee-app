-- ============================================================
-- users can read and update their own profile
-- ============================================================

-- Table privileges (RLS still decides which rows)
grant select on public.profiles to authenticated;

grant update (full_name, avatar_url, bio, location)
  on public.profiles to authenticated;

-- SELECT own profile
drop policy if exists "Users can view own profile" on public.profiles;

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

-- UPDATE own profile
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));