-- 1. replace_profile_topics(profile_id, ...): the tag-writing logic, callable only by the service role,
--    so the admin "load demo data" action can fill topics for seed users (auth.uid() is null there).
-- 2. set_profile_topics(...) keeps its signature but now just delegates to it.
-- 3. Tag writes are set-based and insert new topics in sorted-slug order, so two people saving overlapping
--    new tags at the same moment cannot deadlock each other.
-- 4. purge_seed_users(): deletes every is_seed user (cascades to profiles, topics links, slots, matches).

-- ---------------------------------------------------------------------------
-- Tag normalisation as a reusable function
-- ---------------------------------------------------------------------------
create or replace function public.normalize_tags(
  p_skills    text[],
  p_goals     text[],
  p_interests text[]
)
returns table (tag_relation public.topic_relation, tag_name text, tag_slug text)
language sql
immutable
set search_path = ''
as $$
  with raw as (
    select 'skill'::public.topic_relation as rel, n from unnest(coalesce(p_skills, '{}'::text[])) as n
    union all
    select 'goal'::public.topic_relation, n from unnest(coalesce(p_goals, '{}'::text[])) as n
    union all
    select 'interest'::public.topic_relation, n from unnest(coalesce(p_interests, '{}'::text[])) as n
  ),
  cleaned as (
    select rel, regexp_replace(trim(n), '\s+', ' ', 'g') as nm from raw
  )
  select rel, nm, public.slugify_topic(nm) from cleaned;
$$;

-- ---------------------------------------------------------------------------
-- Service-role tag writer
-- ---------------------------------------------------------------------------
create or replace function public.replace_profile_topics(
  p_profile_id uuid,
  p_skills     text[] default '{}',
  p_goals      text[] default '{}',
  p_interests  text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bad text;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_profile_id and deleted_at is null and role in ('mentor', 'mentee')
  ) then
    raise exception 'Only mentors and mentees can set topics';
  end if;

  if coalesce(cardinality(p_skills), 0) > 15
     or coalesce(cardinality(p_goals), 0) > 15
     or coalesce(cardinality(p_interests), 0) > 15 then
    raise exception 'At most 15 tags per list';
  end if;

  select coalesce(t.tag_name, '(empty)')
    into v_bad
  from public.normalize_tags(p_skills, p_goals, p_interests) t
  where t.tag_name is null
     or char_length(t.tag_name) < 2
     or char_length(t.tag_name) > 40
     or t.tag_slug = ''
  limit 1;

  if found then
    raise exception 'Invalid tag: %', v_bad;
  end if;

  delete from public.profile_topics where profile_id = p_profile_id;

  -- sorted by slug so concurrent writers take row locks in the same order
  insert into public.topics (slug, name, created_by)
  select distinct on (t.tag_slug) t.tag_slug, t.tag_name, p_profile_id
  from public.normalize_tags(p_skills, p_goals, p_interests) t
  order by t.tag_slug, t.tag_name
  on conflict (slug) do nothing;

  insert into public.profile_topics (profile_id, topic_id, relation)
  select distinct p_profile_id, tp.id, t.tag_relation
  from public.normalize_tags(p_skills, p_goals, p_interests) t
  join public.topics tp on tp.slug = t.tag_slug
  on conflict do nothing;
end;
$$;

revoke execute on function public.replace_profile_topics(uuid, text[], text[], text[]) from public, anon, authenticated;
grant  execute on function public.replace_profile_topics(uuid, text[], text[], text[]) to service_role;

-- ---------------------------------------------------------------------------
-- Client-facing setter: same signature as before, now a thin wrapper
-- ---------------------------------------------------------------------------
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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  perform public.replace_profile_topics(auth.uid(), p_skills, p_goals, p_interests);
end;
$$;

revoke execute on function public.set_profile_topics(text[], text[], text[]) from public, anon;
grant  execute on function public.set_profile_topics(text[], text[], text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Remove all demo users in one call (service role only).
-- Deleting from auth.users cascades through profiles to topics links, slots, matches and documents.
-- Topics themselves stay (they are shared vocabulary).
-- ---------------------------------------------------------------------------
create or replace function public.purge_seed_users()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with deleted as (
    delete from auth.users
    where id in (select id from public.profiles where is_seed)
    returning id
  )
  select count(*) into v_count from deleted;

  return v_count;
end;
$$;

revoke execute on function public.purge_seed_users() from public, anon, authenticated;
grant  execute on function public.purge_seed_users() to service_role;