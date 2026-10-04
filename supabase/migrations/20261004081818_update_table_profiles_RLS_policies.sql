-- Hardening migration for public.profiles
--
-- Problems in the original setup this fixes:
--   1. "Users can update own profile" had no column limits, so any user could run
--        update profiles set role = 'super_admin', status = 'active' where id = auth.uid()
--      and become super admin / self-activate / clear deleted_at.
--   2. "Admins can update profiles" let an admin set any user's role (including 'admin' or 'super_admin'),
--      which breaks "an admin cannot create another admin".
--   3. The two INSERT policies let a client create profile rows (even with status = 'active').
--      Profiles are created only by the handle_new_user trigger.
--   4. Admins could modify the super admin's row.
--   5. Missing updated_at trigger; profile email could drift from auth.users.
--
-- Trust model: only direct statements issued by the API roles (authenticated / anon) are restricted.
-- SECURITY DEFINER functions (activate_profile, triggers), the service role and the SQL editor run as
-- other database roles and are trusted.

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helper functions (recreated with an empty search_path)
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'super_admin'
      and status = 'active'
      and deleted_at is null
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'super_admin')
      and status = 'active'
      and deleted_at is null
  );
$$;

-- Any signed-in user whose profile is active and not soft-deleted (admins included).
create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and status = 'active'
      and deleted_at is null
  );
$$;

-- ---------------------------------------------------------------------------
-- Column protection
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Trusted callers (SECURITY DEFINER functions, service role, SQL editor) are not restricted.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'id and created_at cannot be changed';
  end if;

  if new.email is distinct from old.email then
    raise exception 'email is managed by authentication and cannot be edited here';
  end if;

  -- Roles: only a super admin may change them, and never to or from super_admin.
  -- (The super admin account itself is created manually; see the note at the bottom.)
  if new.role is distinct from old.role then
    if not public.is_super_admin() or old.role = 'super_admin' or new.role = 'super_admin' then
      raise exception 'Only a super admin can change roles, and never to or from super_admin';
    end if;
  end if;

  -- Activation state and soft delete: admins only (users activate themselves via activate_profile()).
  if new.status is distinct from old.status or new.deleted_at is distinct from old.deleted_at then
    if not public.is_admin() then
      raise exception 'Only an admin can change status or deleted_at';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_columns on public.profiles;
create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------------
-- Keep profiles.email in sync with auth.users
-- ---------------------------------------------------------------------------
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------
-- No client inserts: profiles are created by handle_new_user only.
drop policy if exists "Users can create own mentor or mentee profile" on public.profiles;
drop policy if exists "Super admins can create admin profiles" on public.profiles;

-- Admins can update other profiles, but only a super admin can touch a super admin's row.
drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles
  for update
  to authenticated
  using (
    (select public.is_admin())
    and (role <> 'super_admin' or (select public.is_super_admin()))
  )
  with check (
    (select public.is_admin())
    and (role <> 'super_admin' or (select public.is_super_admin()))
  );

-- ---------------------------------------------------------------------------
-- Privileges and function execution
-- ---------------------------------------------------------------------------
revoke all on public.profiles from anon;
revoke insert on public.profiles from authenticated;

revoke execute on function public.handle_new_user()   from public, anon, authenticated;
revoke execute on function public.sync_profile_email() from public, anon, authenticated;
revoke execute on function public.activate_profile()  from public, anon;
revoke execute on function public.is_admin()          from public, anon;
revoke execute on function public.is_super_admin()    from public, anon;
revoke execute on function public.is_active_member()  from public, anon;
grant  execute on function public.activate_profile()  to authenticated;
grant  execute on function public.is_admin()          to authenticated;
grant  execute on function public.is_super_admin()    to authenticated;
grant  execute on function public.is_active_member()  to authenticated;

-- ---------------------------------------------------------------------------
-- Creating the super admin (run once, in the SQL editor, which is a trusted role):
--   1. Sign up through the normal form as a mentor or mentee and confirm the email.
--   2. update public.profiles set role = 'super_admin', status = 'active' where email = 'you@example.com';
-- A super admin then promotes people to admin from the app with a plain UPDATE of profiles.role;
-- the trigger above allows exactly that and nothing else.
-- ---------------------------------------------------------------------------
