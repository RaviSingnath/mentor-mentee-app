-- match_pool() returns every ACTIVE, non-deleted mentor and mentee as one JSON array, with their topics and
-- weekly availability, in the shape the TypeScript matcher expects (camelCase keys).
-- It is the only way the app reads other people's profiles for matching, and it deliberately never includes
-- email. Only the service role can call it; the Next.js server does that after verifying the signed-in user.
-- Inactive and soft-deleted users, admins and super admins are excluded here, so the matcher never sees them.

create or replace function public.match_pool()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.obj order by s.sort_name, s.sort_id), '[]'::jsonb)
  from (
    select
      p.full_name as sort_name,
      p.id        as sort_id,
      jsonb_build_object(
        'id',              p.id,
        'fullName',        p.full_name,
        'role',            p.role,
        'bio',             p.bio,
        'experienceLevel', p.experience_level,
        'city',            p.city,
        'state',           p.state,
        'country',         p.country,
        'timezone',        p.timezone,
        'languages',       to_jsonb(p.languages),
        'isSeed',          p.is_seed,
        'skills', coalesce((
          select jsonb_agg(jsonb_build_object('slug', t.slug, 'name', t.name) order by t.slug)
          from public.profile_topics pt join public.topics t on t.id = pt.topic_id
          where pt.profile_id = p.id and pt.relation = 'skill'
        ), '[]'::jsonb),
        'goals', coalesce((
          select jsonb_agg(jsonb_build_object('slug', t.slug, 'name', t.name) order by t.slug)
          from public.profile_topics pt join public.topics t on t.id = pt.topic_id
          where pt.profile_id = p.id and pt.relation = 'goal'
        ), '[]'::jsonb),
        'interests', coalesce((
          select jsonb_agg(jsonb_build_object('slug', t.slug, 'name', t.name) order by t.slug)
          from public.profile_topics pt join public.topics t on t.id = pt.topic_id
          where pt.profile_id = p.id and pt.relation = 'interest'
        ), '[]'::jsonb),
        'availability', coalesce((
          select jsonb_agg(
                   jsonb_build_object(
                     'weekday', a.weekday,
                     'start',   to_char(a.start_time, 'HH24:MI'),
                     'end',     to_char(a.end_time,   'HH24:MI')
                   )
                   order by a.weekday, a.start_time
                 )
          from public.availability_slots a
          where a.profile_id = p.id
        ), '[]'::jsonb)
      ) as obj
    from public.profiles p
    where p.status = 'active'
      and p.deleted_at is null
      and p.role in ('mentor', 'mentee')
  ) s;
$$;

revoke execute on function public.match_pool() from public, anon, authenticated;
grant  execute on function public.match_pool() to service_role;