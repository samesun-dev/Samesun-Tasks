-- handle_new_user() used `on conflict (id) do nothing`, but anyone added
-- through the old "Add person" flow already has a public.users row keyed
-- by a made-up id (not a real auth id). When that person later gets a
-- real Supabase Auth account, the trigger's insert collides on the
-- (unrelated) unique email constraint instead of the id conflict target,
-- raising an error that can abort the Auth signup itself.
--
-- Fix: conflict on email instead, and do nothing (preserve the existing
-- profile's name/role/team_id rather than trying to reconcile ids, since
-- tasks/task_watchers reference the old id).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email, role, team_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'member'),
    nullif(new.raw_user_meta_data->>'team_id', '')::uuid
  )
  on conflict (email) do nothing;
  return new;
end;
$$;
