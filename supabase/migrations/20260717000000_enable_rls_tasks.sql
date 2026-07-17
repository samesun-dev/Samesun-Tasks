alter table public.tasks enable row level security;
alter table public.task_instances enable row level security;
alter table public.task_watchers enable row level security;

create policy "Authenticated users only" on public.tasks
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users only" on public.task_instances
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users only" on public.task_watchers
  for all using (auth.role() = 'authenticated');
