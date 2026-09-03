-- Lets an admin add specific people (typically other admins) as
-- "overdue email watchers" for a team/department — they get CC'd on the
-- exact same overdue/due-soon emails send-emails already sends to a
-- task's assignee, scoped to every task in that team, without needing to
-- be added as a watcher on each task individually (task_watchers exists
-- for that, but nothing in the app ever writes to it — see the People
-- page UI change in this same commit for the actual management screen).
--
-- Depends on public.is_admin(), added in
-- 20260903180000_signup_requests_and_users_rls.sql — run that one first.

create table public.team_watchers (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

alter table public.team_watchers enable row level security;

create policy "Authenticated users can view team watchers" on public.team_watchers
  for select using (auth.role() = 'authenticated');

create policy "Admins can add team watchers" on public.team_watchers
  for insert with check (public.is_admin());

create policy "Admins can remove team watchers" on public.team_watchers
  for delete using (public.is_admin());
