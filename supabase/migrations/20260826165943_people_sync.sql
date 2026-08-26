-- Keep public.users in sync with auth.users automatically, and stop
-- storing plaintext passwords in the app database (Supabase Auth already
-- owns credentials).

alter table public.users enable row level security;
alter table public.teams enable row level security;

create policy "Authenticated users only" on public.users
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users only" on public.teams
  for all using (auth.role() = 'authenticated');

create function public.handle_new_user()
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
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.users drop column password;
