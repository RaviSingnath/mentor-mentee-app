alter table public.invitations
  drop constraint if exists invitations_created_user_consistency;