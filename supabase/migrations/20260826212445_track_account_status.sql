-- Track whether a person has a real Auth account yet, so the People page
-- can show a status and offer the right action (invite vs. reset).

alter table public.users add column has_account boolean not null default false;

-- Backfill: anyone who already has a matching real Auth account (e.g.
-- Owen, Jack) should show as active immediately, not "no account yet".
update public.users u
set has_account = true
from auth.users a
where lower(a.email) = lower(u.email);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email, role, team_id, has_account)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'member'),
    nullif(new.raw_user_meta_data->>'team_id', '')::uuid,
    true
  )
  on conflict (email) do update set has_account = true;
  return new;
end;
$$;
