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
  v_role      := lower(nullif(trim(new.raw_user_meta_data ->> 'role'), ''));

  if v_full_name is null then
    raise exception 'Full name is required';
  end if;
  if v_role is null then
    raise exception 'User role is required';
  end if;
  if v_role not in ('mentor', 'mentee', 'admin') then
    raise exception 'Invalid signup role';
  end if;

  -- admin only when created via admin invite, never via public signup
  if v_role = 'admin' and new.invited_at is null then
    raise exception 'Admin role can only be assigned through an invite';
  end if;

  v_status := (case when new.email_confirmed_at is not null then 'active' else 'inactive' end)::public.profile_status;

  insert into public.profiles (id, full_name, email, role, status)
  values (new.id, v_full_name, new.email, v_role::public.user_role, v_status);

  return new;
end;
$$;