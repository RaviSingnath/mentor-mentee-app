-- ============================================================
-- Invitations
-- ============================================================

-- ------------------------------------------------------------
-- 1. Invitation status
-- ------------------------------------------------------------

create type public.invitation_status as enum (
  'pending',
  'accepted',
  'expired',
  'revoked',
);


-- ------------------------------------------------------------
-- 2. Invitations table
-- ------------------------------------------------------------

create table public.invitations (
  id uuid primary key default gen_random_uuid(),

  email text not null,

  full_name text not null,

  role public.user_role not null,

  token text not null,

  invited_by uuid not null
    references public.profiles(id)
    on delete restrict,

  expires_at timestamptz not null,

  status public.invitation_status not null
    default 'pending'::public.invitation_status,

  accepted_at timestamptz null,

  accepted_by uuid null
    references public.profiles(id)
    on delete restrict,

  created_user_id uuid null
    references public.profiles(id)
    on delete restrict,

  revoked_at timestamptz null,

  revoked_by uuid null
    references public.profiles(id)
    on delete restrict,

  revoked_reason text null,

  deleted_at timestamptz null,

  deleted_by uuid null
    references public.profiles(id)
    on delete restrict,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  -- ----------------------------------------------------------
  -- Basic data consistency
  -- ----------------------------------------------------------

  constraint invitations_email_normalized
    check (email = lower(trim(email))),

  constraint invitations_full_name_not_empty
    check (length(trim(full_name)) > 0),

  constraint invitations_token_not_empty
    check (length(trim(token)) > 0),

  constraint invitations_expiry_after_creation
    check (expires_at > created_at),

  -- ----------------------------------------------------------
  -- Accepted state
  -- ----------------------------------------------------------

  constraint invitations_accepted_consistency
    check (
      (status = 'accepted' and accepted_at is not null)
      or
      (status <> 'accepted' and accepted_at is null)
    ),

  constraint invitations_accepted_by_consistency
    check (
      (status = 'accepted' and accepted_by is not null)
      or
      (status <> 'accepted' and accepted_by is null)
    ),

  -- ----------------------------------------------------------
  -- Revoked state
  -- ----------------------------------------------------------

  constraint invitations_revoked_consistency
    check (
      (status = 'revoked' and revoked_at is not null)
      or
      (status <> 'revoked' and revoked_at is null)
    ),

  constraint invitations_revoked_by_consistency
    check (
      (status = 'revoked' and revoked_by is not null)
      or
      (status <> 'revoked' and revoked_by is null)
    ),

  -- ----------------------------------------------------------
  -- Deleted state
  -- ----------------------------------------------------------

  constraint invitations_deleted_consistency
    check (
      (deleted_at is null and deleted_by is null)
      or
      (deleted_at is not null and deleted_by is not null)
    ),

  -- ----------------------------------------------------------
  -- Created user consistency
  -- ----------------------------------------------------------

  constraint invitations_created_user_consistency
    check (
      (status = 'accepted' and created_user_id is not null)
      or
      (status <> 'accepted')
    )
);


-- ------------------------------------------------------------
-- 3. Unique invitation token
-- ------------------------------------------------------------

create unique index invitations_token_unique_idx
  on public.invitations(token);


-- ------------------------------------------------------------
-- 4. One active invitation per email
--
-- Only pending, non-deleted invitations count.
-- Resending creates a new invitation after the old one
-- has been revoked.
-- ------------------------------------------------------------

create unique index invitations_one_pending_email_idx
  on public.invitations(email)
  where status = 'pending'
    and deleted_at is null;


-- ------------------------------------------------------------
-- 5. Useful indexes
-- ------------------------------------------------------------

create index invitations_invited_by_idx
  on public.invitations(invited_by);

create index invitations_status_idx
  on public.invitations(status);

create index invitations_expires_at_idx
  on public.invitations(expires_at);

create index invitations_created_at_idx
  on public.invitations(created_at desc);

create index invitations_email_idx
  on public.invitations(email);

create index invitations_not_deleted_idx
  on public.invitations(id)
  where deleted_at is null;


-- ------------------------------------------------------------
-- 6. Automatically update updated_at
-- ------------------------------------------------------------

create or replace function public.set_invitations_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


create trigger invitations_set_updated_at
before update on public.invitations
for each row
execute function public.set_invitations_updated_at();


-- ------------------------------------------------------------
-- 7. Enable RLS
-- ------------------------------------------------------------

alter table public.invitations enable row level security;


-- ============================================================
-- RLS POLICIES
-- ============================================================


-- ------------------------------------------------------------
-- 8. SELECT
--
-- super_admin:
--   can view all invitations
--
-- admin:
--   can view invitations they created
--
-- mentor:
--   no invitation permissions currently
-- ------------------------------------------------------------

create policy "Super admins can view all invitations"
on public.invitations
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'::public.user_role
  )
);


create policy "Admins can view their invitations"
on public.invitations
for select
to authenticated
using (
  invited_by = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'::public.user_role
  )
);


-- ------------------------------------------------------------
-- 9. INSERT
--
-- super_admin:
--   admin / mentor / mentee
--
-- admin:
--   mentor / mentee
--
-- mentor:
--   nothing
-- ------------------------------------------------------------

create policy "Authorized users can create invitations"
on public.invitations
for insert
to authenticated
with check (
  invited_by = auth.uid()
  and (
    (
      role in (
        'admin'::public.user_role,
        'mentor'::public.user_role,
        'mentee'::public.user_role
      )
      and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'super_admin'::public.user_role
      )
    )
    or
    (
      role in (
        'mentor'::public.user_role,
        'mentee'::public.user_role
      )
      and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'::public.user_role
      )
    )
  )
);


-- ------------------------------------------------------------
-- 10. UPDATE
--
-- Normal application use:
--   - revoke an invitation
--   - mark invitation expired
--
-- Acceptance should NOT be performed by directly updating
-- this table from the client. That should be handled by a
-- dedicated security-definer RPC later.
--
-- Super admin:
--   can update any invitation
--
-- Admin:
--   can update invitations they created
-- ------------------------------------------------------------

create policy "Authorized users can update invitations"
on public.invitations
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'::public.user_role
        or (
          p.role = 'admin'::public.user_role
          and invitations.invited_by = auth.uid()
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'::public.user_role
        or (
          p.role = 'admin'::public.user_role
          and invitations.invited_by = auth.uid()
        )
      )
  )
);


-- ------------------------------------------------------------
-- 11. DELETE
--
-- Physical deletes are intentionally not allowed through
-- the client. Use soft deletion instead.
-- ------------------------------------------------------------

-- No DELETE policy.


-- ------------------------------------------------------------
-- 12. Grants
-- ------------------------------------------------------------

grant select, insert, update
on table public.invitations
to authenticated;