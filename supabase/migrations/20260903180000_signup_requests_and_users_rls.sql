-- 1) Close a real privilege-escalation gap: public.users has had a single
-- "any authenticated user, full CRUD" policy since 20260826165943_people_sync.sql.
-- That means any signed-in member can currently run, from the browser
-- console, something like:
--   supabase.from('users').update({ role: 'admin' }).eq('id', <their own id>)
-- and grant themselves admin — bypassing the server-side admin check that
-- the create-user Edge Function otherwise enforces. Reads stay open to
-- every signed-in user (needed for task assignment, the People directory,
-- etc.); writes to users/teams now require admin.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "Authenticated users only" on public.users;
drop policy if exists "Authenticated users only" on public.teams;

create policy "Authenticated users can view" on public.users
  for select using (auth.role() = 'authenticated');

create policy "Admins can insert users" on public.users
  for insert with check (public.is_admin());

create policy "Admins can update users" on public.users
  for update using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete users" on public.users
  for delete using (public.is_admin());

create policy "Authenticated users can view teams" on public.teams
  for select using (auth.role() = 'authenticated');

create policy "Admins can write teams" on public.teams
  for insert with check (public.is_admin());

create policy "Admins can update teams" on public.teams
  for update using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete teams" on public.teams
  for delete using (public.is_admin());

-- 2) "Request access" — a real account is still only ever created by an
-- admin (via the existing create-user Edge Function, unchanged), but a new
-- person no longer has to track someone down out-of-band to ask for one.
-- The login screen lets them submit name+email into a queue; the People
-- page shows it to admins for one-click approve/dismiss.

create table public.signup_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  email text not null check (length(trim(email)) > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  notified_at timestamptz
);

-- One open request per email at a time — a duplicate submit (double click,
-- retry) fails cleanly instead of piling up rows for the same person.
create unique index signup_requests_pending_email_idx
  on public.signup_requests (lower(email))
  where status = 'pending';

alter table public.signup_requests enable row level security;

-- Anyone (including a not-yet-logged-in visitor on the login screen) can
-- submit a request — that's the whole point. No secret gate is needed here
-- the same way none is needed on the login form itself: this only ever
-- creates a request row, never an auth account or an elevated grant.
create policy "Anyone can submit a signup request" on public.signup_requests
  for insert to anon, authenticated with check (true);

create policy "Admins can view signup requests" on public.signup_requests
  for select using (public.is_admin());

create policy "Admins can review signup requests" on public.signup_requests
  for update using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete signup requests" on public.signup_requests
  for delete using (public.is_admin());
