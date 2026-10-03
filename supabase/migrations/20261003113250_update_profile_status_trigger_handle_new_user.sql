create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text;
  v_role text;
begin
  -- Extract and normalize metadata
  v_full_name := nullif(
    trim(new.raw_user_meta_data ->> 'full_name'),
    ''
  );

  v_role := nullif(
    trim(new.raw_user_meta_data ->> 'role'),
    ''
  );

  -- Validate full name
  if v_full_name is null then
    raise exception 'Full name is required';
  end if;

  -- Validate role
  if v_role is null then
    raise exception 'User role is required';
  end if;

  -- Only mentor and mentee are allowed through public signup
  if v_role not in ('mentor', 'mentee') then
    raise exception 'Invalid signup role';
  end if;

  -- Create profile
  insert into public.profiles (
    id,
    full_name,
    email,
    role,
    status
  )
  values (
    new.id,
    v_full_name,
    new.email,
    v_role::public.user_role,
    'inactive'::public.profile_status
  );

  return new;
end;
$$;