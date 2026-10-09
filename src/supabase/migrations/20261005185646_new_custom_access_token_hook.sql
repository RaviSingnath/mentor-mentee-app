-- ============================================================
-- Custom Access Token Hook
-- Mentor-Mentee App
--
-- JWT custom claims:
--   user_role
--   profile_status
--
-- Source of truth:
--   public.profiles.role
--   public.profiles.status
--
-- Security:
--   - Never trusts auth user metadata for authorization.
--   - Fails token issuance when the profile is missing.
--   - Fails token issuance when role/status is NULL.
--   - Does not include relationship data in the JWT.
-- ============================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_role text;
  v_status text;
  v_claims jsonb;
begin
  -- ----------------------------------------------------------
  -- Get the authenticated user's ID from the hook event.
  -- ----------------------------------------------------------
  v_user_id := (event ->> 'user_id')::uuid;

  if v_user_id is null then
    raise exception 'Unable to determine authenticated user';
  end if;

  -- ----------------------------------------------------------
  -- Read authorization data from the trusted profiles table.
  --
  -- We intentionally do NOT read:
  --   new/raw user metadata
  --   user_metadata
  --   app_metadata
  --
  -- profiles is the source of truth for application RBAC.
  -- ----------------------------------------------------------
  select
    p.role::text,
    p.status::text
  into
    v_role,
    v_status
  from public.profiles p
  where p.id = v_user_id;

  -- ----------------------------------------------------------
  -- A user without a profile must not receive a valid token.
  -- ----------------------------------------------------------
  if not found then
    raise exception
      'Profile not found for authenticated user %',
      v_user_id;
  end if;

  -- ----------------------------------------------------------
  -- Role is required for application authorization.
  -- ----------------------------------------------------------
  if v_role is null then
    raise exception
      'User role is not configured for authenticated user %',
      v_user_id;
  end if;

  -- ----------------------------------------------------------
  -- Status is required because it is part of our authentication
  -- authorization boundary.
  -- ----------------------------------------------------------
  if v_status is null then
    raise exception
      'Profile status is not configured for authenticated user %',
      v_user_id;
  end if;

  -- ----------------------------------------------------------
  -- Preserve Supabase's existing claims and add only our
  -- application-specific claims.
  -- ----------------------------------------------------------
  v_claims := event -> 'claims';

  v_claims := jsonb_set(
    v_claims,
    '{user_role}',
    to_jsonb(v_role),
    true
  );

  v_claims := jsonb_set(
    v_claims,
    '{profile_status}',
    to_jsonb(v_status),
    true
  );

  -- ----------------------------------------------------------
  -- Return the modified hook event.
  -- ----------------------------------------------------------
  return jsonb_set(
    event,
    '{claims}',
    v_claims,
    true
  );
end;
$$;


-- ============================================================
-- Auth Hook permissions
-- ============================================================

-- Allow Supabase Auth to access the public schema.
grant usage
on schema public
to supabase_auth_admin;


-- Allow Supabase Auth to execute the custom access token hook.
grant execute
on function public.custom_access_token_hook(jsonb)
to supabase_auth_admin;


-- Prevent application/API roles from executing the hook.
revoke execute
on function public.custom_access_token_hook(jsonb)
from authenticated, anon, public;


-- ============================================================
-- Profiles permissions
-- ============================================================

-- The hook only needs these three columns.
grant select (id, role, status)
on table public.profiles
to supabase_auth_admin;


-- Allow Supabase Auth to pass RLS on profiles for this read.
create policy "Allow auth admin to read profiles"
on public.profiles
as permissive
for select
to supabase_auth_admin
using (true);