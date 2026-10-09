create or replace function public.activate_profile()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set status = 'active'::public.profile_status
  where id = auth.uid()
    and status = 'inactive'::public.profile_status;
end;
$$;