-- ============================================================
-- User roles
-- ============================================================

create type public.user_role as enum (
  'super_admin',
  'admin',
  'mentor',
  'mentee'
);

-- ============================================================
-- Profile status
-- ============================================================

create type public.profile_status as enum (
  'active',
  'inactive'
);

-- ============================================================
-- Profiles
-- ============================================================

create table public.profiles (
  id uuid primary key
    references auth.users(id)
    on delete cascade,

  full_name text not null,

  email text not null,

  role public.user_role not null,

  avatar_url text,

  bio text,

  location text,

  status public.profile_status not null default 'active',

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  deleted_at timestamptz
);

-- ============================================================
-- Indexes
-- ============================================================

create index profiles_role_idx
  on public.profiles(role);

create index profiles_status_idx
  on public.profiles(status);

create index profiles_deleted_at_idx
  on public.profiles(deleted_at);

-- ============================================================
-- Enable Row Level Security
-- ============================================================

alter table public.profiles enable row level security;


-- ============================================================
-- Helper functions
-- ============================================================

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
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
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'super_admin')
      and status = 'active'
      and deleted_at is null
  );
$$;


-- ============================================================
-- SELECT
-- ============================================================

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
);


create policy "Admins can view all profiles"
on public.profiles
for select
to authenticated
using (
  (select public.is_admin())
);


-- ============================================================
-- INSERT
-- ============================================================

create policy "Users can create own mentor or mentee profile"
on public.profiles
for insert
to authenticated
with check (
  id = (select auth.uid())
  and role in ('mentor', 'mentee')
);


create policy "Super admins can create admin profiles"
on public.profiles
for insert
to authenticated
with check (
  (select public.is_super_admin())
  and role = 'admin'
);


-- ============================================================
-- UPDATE
-- ============================================================

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
)
with check (
  id = (select auth.uid())
);


create policy "Admins can update profiles"
on public.profiles
for update
to authenticated
using (
  (select public.is_admin())
)
with check (
  (select public.is_admin())
);


-- ============================================================
-- DELETE
-- ============================================================

create policy "Super admins can delete profiles"
on public.profiles
for delete
to authenticated
using (
  (select public.is_super_admin())
);