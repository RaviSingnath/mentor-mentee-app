create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first_name text;
  v_role text;
begin
  -- Extract and normalize metadata
  v_first_name := nullif(
    trim(new.raw_user_meta_data ->> 'first_name'),
    ''
  );

  v_role := nullif(
    trim(new.raw_user_meta_data ->> 'role'),
    ''
  );

  -- Validate required first name
  if v_first_name is null then
    raise exception 'First name is required';
  end if;

  -- Validate role
  if v_role not in ('mentor', 'mentee') then
    raise exception 'Invalid user role';
  end if;

  -- Create application profile
  insert into public.profiles (
    id,
    first_name,
    email,
    role,
    status
  )
  values (
    new.id,
    v_first_name,
    new.email,
    v_role::public.user_role,
    'inactive'::public.profile_status
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public;