-- Domain migration (runs after 20261003120000_harden_profiles.sql)
--
-- 1. profiles: city/state/country (replaces location), experience_level, timezone, languages, is_seed
-- 2. Activation: a profile becomes active automatically when the user confirms their email
--    (activate_profile() is dropped)
-- 3. Free-text topics (skills / goals / interests) with normalisation, written through an RPC
-- 4. availability_slots
-- 5. saved_matches + match_interactions (append-only log)
--
-- Access model: members cannot read each other's rows directly (profiles are own-row / admin only).
-- Matching and match display run server-side with the service role and must never return email.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.experience_level as enum ('student', 'junior', 'mid', 'senior', 'lead');
create type public.topic_relation   as enum ('skill', 'goal', 'interest');
create type public.match_action     as enum ('viewed', 'saved', 'unsaved', 'dismissed');

-- ---------------------------------------------------------------------------
-- profiles: new columns
-- ---------------------------------------------------------------------------
alter table public.profiles
  drop column if exists location,
  add column city             text,
  add column state            text,
  add column country          text,
  add column experience_level public.experience_level,
  add column timezone         text    not null default 'UTC',   -- IANA name, validated in the app (Zod)
  add column languages        text[]  not null default '{}',    -- ISO codes, e.g. {en,hi}
  add column is_seed          boolean not null default false;

alter table public.profiles
  add constraint profiles_languages_max_chk check (cardinality(languages) <= 10),
  add constraint profiles_seed_role_chk      check (not is_seed or role in ('mentor', 'mentee'));

create index profiles_languages_idx    on public.profiles using gin (languages);
create index profiles_active_role_idx  on public.profiles (role) where status = 'active' and deleted_at is null;

-- is_seed joins the set of columns clients can never change
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'id and created_at cannot be changed';
  end if;

  if new.is_seed is distinct from old.is_seed then
    raise exception 'is_seed cannot be changed';
  end if;

  if new.email is distinct from old.email then
    raise exception 'email is managed by authentication and cannot be edited here';
  end if;

  if new.role is distinct from old.role then
    if not public.is_super_admin() or old.role = 'super_admin' or new.role = 'super_admin' then
      raise exception 'Only a super admin can change roles, and never to or from super_admin';
    end if;
  end if;

  if new.status is distinct from old.status or new.deleted_at is distinct from old.deleted_at then
    if not public.is_admin() then
      raise exception 'Only an admin can change status or deleted_at';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Activation on email confirmation
--   * Signup with an unconfirmed email   -> profile created 'inactive', activated when the email is confirmed
--   * Already-confirmed at insert (auto-confirm projects, OAuth, admin-created seed users) -> 'active' at once
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text;
  v_role      text;
  v_status    public.profile_status;
begin
  v_full_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  v_role      := nullif(trim(new.raw_user_meta_data ->> 'role'), '');

  if v_full_name is null then
    raise exception 'Full name is required';
  end if;
  if v_role is null then
    raise exception 'User role is required';
  end if;
  if v_role not in ('mentor', 'mentee') then
    raise exception 'Invalid signup role';
  end if;

  v_status := (case when new.email_confirmed_at is not null then 'active' else 'inactive' end)::public.profile_status;

  insert into public.profiles (id, full_name, email, role, status)
  values (new.id, v_full_name, new.email, v_role::public.user_role, v_status);

  return new;
end;
$$;

create or replace function public.activate_profile_on_email_confirm()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set status = 'active'
  where id = new.id
    and status = 'inactive'
    and deleted_at is null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.activate_profile_on_email_confirm();

-- activate_profile() is no longer needed, and it was a hole: an admin-deactivated user could call it to
-- reactivate themselves. Activation now happens only through the email-confirmation trigger above.
-- Remove any app code that calls supabase.rpc('activate_profile').
drop function if exists public.activate_profile();

revoke execute on function public.activate_profile_on_email_confirm() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Topics: free-text tags, normalised to a unique slug
-- ---------------------------------------------------------------------------
-- "React", " react " and "REACT" share one slug; "C++" -> c-plus-plus and "C#" -> c-sharp so they do not collide with "C".
create or replace function public.slugify_topic(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    lower(replace(replace(trim(input), '+', ' plus '), '#', ' sharp ')),
    '[^[:alnum:]]+', '-', 'g'
  ));
$$;

create table public.topics (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug <> '' and char_length(slug) <= 60),
  name       text not null check (char_length(name) between 2 and 40),   -- display text as first typed
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.profile_topics (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  topic_id   uuid not null references public.topics (id) on delete cascade,
  relation   public.topic_relation not null,
  primary key (profile_id, topic_id, relation)
);

create index profile_topics_topic_idx on public.profile_topics (topic_id, relation);

-- Replace the caller's tags in one call. Clients cannot write topics or profile_topics directly.
create or replace function public.set_profile_topics(
  p_skills    text[] default '{}',
  p_goals     text[] default '{}',
  p_interests text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_rel   public.topic_relation;
  v_names text[];
  v_name  text;
  v_slug  text;
  v_topic uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_uid and deleted_at is null and role in ('mentor', 'mentee')
  ) then
    raise exception 'Only mentors and mentees can set topics';
  end if;

  if coalesce(cardinality(p_skills), 0) > 15
     or coalesce(cardinality(p_goals), 0) > 15
     or coalesce(cardinality(p_interests), 0) > 15 then
    raise exception 'At most 15 tags per list';
  end if;

  delete from public.profile_topics where profile_id = v_uid;

  for v_rel, v_names in
    select * from (values
      ('skill'::public.topic_relation,    p_skills),
      ('goal'::public.topic_relation,     p_goals),
      ('interest'::public.topic_relation, p_interests)
    ) as t (rel, names)
  loop
    foreach v_name in array coalesce(v_names, '{}'::text[]) loop
      v_name := regexp_replace(trim(v_name), '\s+', ' ', 'g');
      v_slug := public.slugify_topic(v_name);

      if char_length(v_name) < 2 or char_length(v_name) > 40 or v_slug = '' then
        raise exception 'Invalid tag: %', v_name;
      end if;

      insert into public.topics (slug, name, created_by)
      values (v_slug, v_name, v_uid)
      on conflict (slug) do nothing;

      select id into v_topic from public.topics where slug = v_slug;

      insert into public.profile_topics (profile_id, topic_id, relation)
      values (v_uid, v_topic, v_rel)
      on conflict do nothing;
    end loop;
  end loop;
end;
$$;

revoke execute on function public.set_profile_topics(text[], text[], text[]) from public, anon;
grant  execute on function public.set_profile_topics(text[], text[], text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- availability_slots: weekly windows in the profile's own timezone
-- ---------------------------------------------------------------------------
create table public.availability_slots (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),   -- 0 = Sunday
  start_time time not null,
  end_time   time not null,
  constraint availability_slots_order_chk check (start_time < end_time),
  unique (profile_id, weekday, start_time, end_time)
);

create index availability_slots_profile_idx on public.availability_slots (profile_id);

-- ---------------------------------------------------------------------------
-- Saved matches and interaction log
--   actor_id     = who clicked (auth.uid())
--   subject_id   = the profile the matching was run for (yourself, or anyone you picked)
--   candidate_id = the recommended profile
-- ---------------------------------------------------------------------------
create table public.saved_matches (
  actor_id     uuid not null references public.profiles (id) on delete cascade,
  subject_id   uuid not null references public.profiles (id) on delete cascade,
  candidate_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (actor_id, subject_id, candidate_id),
  constraint saved_matches_distinct_chk check (subject_id <> candidate_id)
);

create table public.match_interactions (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid not null references public.profiles (id) on delete cascade,
  subject_id   uuid not null references public.profiles (id) on delete cascade,
  candidate_id uuid not null references public.profiles (id) on delete cascade,
  action       public.match_action not null,
  score        numeric(4, 1) check (score between 0 and 100),   -- score shown at the time
  created_at   timestamptz not null default now(),
  constraint match_interactions_distinct_chk check (subject_id <> candidate_id)
);

create index match_interactions_actor_idx on public.match_interactions (actor_id, created_at desc);
create index match_interactions_pair_idx  on public.match_interactions (subject_id, candidate_id);

-- Subject and candidate must be one active mentor and one active mentee.
-- SECURITY DEFINER because members cannot read each other's profile rows.
create or replace function public.assert_match_pair()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ok boolean;
begin
  select count(*) = 2 and count(distinct role) = 2
    into v_ok
  from public.profiles
  where id in (new.subject_id, new.candidate_id)
    and role in ('mentor', 'mentee')
    and status = 'active'
    and deleted_at is null;

  if not v_ok then
    raise exception 'A match needs one active mentor and one active mentee';
  end if;
  return new;
end;
$$;

revoke execute on function public.assert_match_pair() from public, anon, authenticated;

create trigger saved_matches_assert_pair
  before insert on public.saved_matches
  for each row execute function public.assert_match_pair();

create trigger match_interactions_assert_pair
  before insert on public.match_interactions
  for each row execute function public.assert_match_pair();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.topics             enable row level security;
alter table public.profile_topics     enable row level security;
alter table public.availability_slots enable row level security;
alter table public.saved_matches      enable row level security;
alter table public.match_interactions enable row level security;

-- topics: members can read (autocomplete); admins can clean up; creation only through set_profile_topics()
create policy topics_select_members on public.topics
  for select to authenticated
  using ((select public.is_active_member()));

create policy topics_admin_update on public.topics
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy topics_admin_delete on public.topics
  for delete to authenticated
  using ((select public.is_admin()));

-- profile_topics: own rows or admin; writes only through set_profile_topics()
create policy profile_topics_select on public.profile_topics
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()));

-- availability_slots: own rows or admin read; own rows write
create policy availability_select on public.availability_slots
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()));

create policy availability_insert_own on public.availability_slots
  for insert to authenticated
  with check (profile_id = (select auth.uid()));

create policy availability_update_own on public.availability_slots
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy availability_delete_own on public.availability_slots
  for delete to authenticated
  using (profile_id = (select auth.uid()));

-- saved_matches: own rows
create policy saved_matches_select_own on public.saved_matches
  for select to authenticated
  using (actor_id = (select auth.uid()));

create policy saved_matches_insert_own on public.saved_matches
  for insert to authenticated
  with check (actor_id = (select auth.uid()) and (select public.is_active_member()));

create policy saved_matches_delete_own on public.saved_matches
  for delete to authenticated
  using (actor_id = (select auth.uid()));

-- match_interactions: append-only log; own rows (admins can read all)
create policy match_interactions_select on public.match_interactions
  for select to authenticated
  using (actor_id = (select auth.uid()) or (select public.is_admin()));

create policy match_interactions_insert_own on public.match_interactions
  for insert to authenticated
  with check (actor_id = (select auth.uid()) and (select public.is_active_member()));

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke all on public.topics, public.profile_topics, public.availability_slots,
              public.saved_matches, public.match_interactions from anon, authenticated;

grant select, update, delete         on public.topics             to authenticated;
grant select                         on public.profile_topics     to authenticated;
grant select, insert, update, delete on public.availability_slots to authenticated;
grant select, insert, delete         on public.saved_matches      to authenticated;
grant select, insert                 on public.match_interactions to authenticated;
