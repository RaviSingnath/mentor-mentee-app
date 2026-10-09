-- ============================================================
-- save_my_profile: make p_experience_level optional (default null)
--
-- Why:
--   supabase gen types never adds `| null` to RPC args, so a
--   required enum param rejects `null` from the form type.
--   Giving it a default makes the generated arg optional
--   (`p_experience_level?:`), and the client passes
--   `v.experience_level ?? undefined`.
--
--   Postgres requires every param after a defaulted one to have
--   a default, so p_experience_level moves to the end. Changing
--   param order changes the signature, so the old function is
--   dropped first (create or replace would add an overload and
--   PostgREST could fail to choose between them).
--
-- Also fixes the original "permission denied for table profiles":
--   the function is SECURITY INVOKER, so it runs with the caller's
--   column grants, and authenticated could only UPDATE
--   full_name, bio and avatar_url.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Drop the old signature
-- ------------------------------------------------------------
drop function if exists public.save_my_profile(
  text, text, text, text, text, text, text[],
  public.experience_level, text[], text[], text[], jsonb
);


-- ------------------------------------------------------------
-- 2. Recreate with p_experience_level last, default null
--    (body unchanged)
-- ------------------------------------------------------------

-- save_my_profile(...) saves everything on the profile form in ONE transaction: the profile fields, the three
-- tag lists and the weekly availability. Either all of it is saved or none of it is, so a half-saved profile
-- (new tags but old availability, say) cannot happen.
--
-- SECURITY INVOKER on purpose: it runs as the signed-in user, so the existing RLS policies and the
-- protect_profile_columns trigger still apply. It never touches role, status, email, is_seed or deleted_at.
-- All validation lives here, so it holds no matter which client calls it. The app validates the same rules
-- with Zod to give friendlier messages first.

create function public.save_my_profile(
  p_full_name        text,
  p_bio              text,
  p_city             text,
  p_state            text,
  p_country          text,
  p_timezone         text,
  p_languages        text[],
  p_skills           text[] default '{}',
  p_goals            text[] default '{}',
  p_interests        text[] default '{}',
  p_availability     jsonb  default '[]'::jsonb,
  p_experience_level public.experience_level default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_role    public.user_role;
  v_status  public.profile_status;
  v_name    text := nullif(trim(p_full_name), '');
  v_bio     text := nullif(trim(p_bio), '');
  v_city    text := nullif(trim(p_city), '');
  v_state   text := nullif(trim(p_state), '');
  v_country text := nullif(trim(p_country), '');
  v_langs   text[] := coalesce(p_languages, '{}'::text[]);
  v_slot    jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select role, status into v_role, v_status
  from public.profiles
  where id = v_uid and deleted_at is null;

  if not found then
    raise exception 'Profile not found';
  end if;
  if v_status <> 'active' then
    raise exception 'Your account is not active';
  end if;
  if v_role not in ('mentor', 'mentee') then
    raise exception 'Only mentors and mentees have a matching profile';
  end if;

  -- profile fields
  if v_name is null or char_length(v_name) > 120 then
    raise exception 'Name must be between 1 and 120 characters';
  end if;
  if char_length(coalesce(v_bio, '')) > 2000 then
    raise exception 'Bio must be at most 2000 characters';
  end if;
  if char_length(coalesce(v_city, '')) > 80
     or char_length(coalesce(v_state, '')) > 80
     or char_length(coalesce(v_country, '')) > 80 then
    raise exception 'City, state and country must each be at most 80 characters';
  end if;
  if p_timezone is null
     or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'Unknown timezone';
  end if;

  -- languages: 2-3 letter lowercase codes, at most 10, no duplicates
  if cardinality(v_langs) > 10 then
    raise exception 'At most 10 languages';
  end if;
  if exists (select 1 from unnest(v_langs) as l where l is null or l !~ '^[a-z]{2,3}$') then
    raise exception 'Invalid language code';
  end if;
  v_langs := array(select distinct l from unnest(v_langs) as l order by l);

  -- availability: [{weekday 0-6, start "HH:MM", end "HH:MM"}], at most 28, no overlaps within a day
  if p_availability is null or jsonb_typeof(p_availability) is distinct from 'array' then
    raise exception 'Availability must be a list';
  end if;
  if jsonb_array_length(p_availability) > 28 then
    raise exception 'At most 28 availability slots';
  end if;

  for v_slot in select value from jsonb_array_elements(p_availability) loop
    if jsonb_typeof(v_slot) is distinct from 'object'
       or jsonb_typeof(v_slot -> 'weekday') is distinct from 'number'
       or jsonb_typeof(v_slot -> 'start')   is distinct from 'string'
       or jsonb_typeof(v_slot -> 'end')     is distinct from 'string' then
      raise exception 'Invalid availability slot';
    end if;
    if (v_slot ->> 'weekday') !~ '^[0-6]$' then
      raise exception 'Weekday must be a whole number from 0 (Sunday) to 6 (Saturday)';
    end if;
    if (v_slot ->> 'start') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or (v_slot ->> 'end') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      raise exception 'Availability times must look like HH:MM';
    end if;
    if (v_slot ->> 'start') >= (v_slot ->> 'end') then
      raise exception 'Each availability slot must end after it starts';
    end if;
  end loop;

  if exists (
    select 1
    from jsonb_array_elements(p_availability) with ordinality as a (e, i)
    join jsonb_array_elements(p_availability) with ordinality as b (e, j)
      on a.i < b.j
     and (a.e ->> 'weekday') = (b.e ->> 'weekday')
     and (a.e ->> 'start') < (b.e ->> 'end')
     and (b.e ->> 'start') < (a.e ->> 'end')
  ) then
    raise exception 'Availability slots must not overlap';
  end if;

  -- write everything (one transaction: any error above or below undoes all of it)
  update public.profiles
  set full_name        = v_name,
      bio              = v_bio,
      city             = v_city,
      state            = v_state,
      country          = v_country,
      timezone         = p_timezone,
      languages        = v_langs,
      experience_level = p_experience_level
  where id = v_uid;

  perform public.set_profile_topics(p_skills, p_goals, p_interests);

  delete from public.availability_slots where profile_id = v_uid;

  insert into public.availability_slots (profile_id, weekday, start_time, end_time)
  select v_uid,
         (e ->> 'weekday')::smallint,
         (e ->> 'start')::time,
         (e ->> 'end')::time
  from jsonb_array_elements(p_availability) as e;
end;
$$;


-- ------------------------------------------------------------
-- 3. Execute privileges (dropped along with the old function)
-- ------------------------------------------------------------
revoke execute on function public.save_my_profile(
  text, text, text, text, text, text, text[], text[], text[], text[], jsonb, public.experience_level
) from public, anon;

grant execute on function public.save_my_profile(
  text, text, text, text, text, text, text[], text[], text[], text[], jsonb, public.experience_level
) to authenticated;


-- ------------------------------------------------------------
-- 4. Column grants the SECURITY INVOKER body needs
--
--    authenticated already had UPDATE on full_name, bio,
--    avatar_url. The function also writes these six, which is
--    what caused "permission denied for table profiles".
--    role, status, email, is_seed, deleted_at, created_by and
--    updated_at stay ungranted.
-- ------------------------------------------------------------
grant update (city, state, country, timezone, languages, experience_level)
  on public.profiles to authenticated;


-- ------------------------------------------------------------
-- 5. availability_slots privileges for the delete + insert
--    (DELETE ... WHERE profile_id = ... also needs SELECT).
--    Grants are idempotent; RLS still decides which rows.
-- ------------------------------------------------------------
grant select, insert, delete on public.availability_slots to authenticated;