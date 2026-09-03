-- "Private" tasks aren't actually private. tasks/task_instances RLS has
-- been a single "any authenticated user, full access" policy since
-- 20260717000000_enable_rls_tasks.sql. is_private is enforced only in
-- TasksPage.jsx's client-side filter (`task.is_private && task.created_by
-- !== user.id`) — and ReportsPage.jsx doesn't even apply that filter, so
-- the Reports tab and its CSV export currently show every private task's
-- title/description to any signed-in user. Same bug class as the
-- users-table privilege-escalation gap fixed in
-- 20260903180000_signup_requests_and_users_rls.sql, just on a different
-- table. This closes it at the DB level, matching the intent the "private"
-- checkbox already implies to whoever checks it: only the creator can see
-- or touch a private task.
--
-- The general "any signed-in employee can edit any (non-private) task"
-- model is left alone on purpose — that's this app's whole collaborative
-- point, not a bug. Only the private carve-out is tightened.

drop policy if exists "Authenticated users only" on public.tasks;

create policy "Authenticated users can view tasks" on public.tasks
  for select using (auth.role() = 'authenticated' and (not is_private or created_by = auth.uid()));

create policy "Authenticated users can insert tasks" on public.tasks
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update tasks" on public.tasks
  for update
  using (auth.role() = 'authenticated' and (not is_private or created_by = auth.uid()))
  with check (auth.role() = 'authenticated' and (not is_private or created_by = auth.uid()));

create policy "Authenticated users can delete tasks" on public.tasks
  for delete using (auth.role() = 'authenticated' and (not is_private or created_by = auth.uid()));

drop policy if exists "Authenticated users only" on public.task_instances;

create policy "Authenticated users can view task instances" on public.task_instances
  for select using (
    auth.role() = 'authenticated' and exists (
      select 1 from public.tasks t
      where t.id = task_instances.task_id and (not t.is_private or t.created_by = auth.uid())
    )
  );

create policy "Authenticated users can insert task instances" on public.task_instances
  for insert with check (
    auth.role() = 'authenticated' and exists (
      select 1 from public.tasks t
      where t.id = task_instances.task_id and (not t.is_private or t.created_by = auth.uid())
    )
  );

create policy "Authenticated users can update task instances" on public.task_instances
  for update
  using (
    auth.role() = 'authenticated' and exists (
      select 1 from public.tasks t
      where t.id = task_instances.task_id and (not t.is_private or t.created_by = auth.uid())
    )
  )
  with check (
    auth.role() = 'authenticated' and exists (
      select 1 from public.tasks t
      where t.id = task_instances.task_id and (not t.is_private or t.created_by = auth.uid())
    )
  );

create policy "Authenticated users can delete task instances" on public.task_instances
  for delete using (
    auth.role() = 'authenticated' and exists (
      select 1 from public.tasks t
      where t.id = task_instances.task_id and (not t.is_private or t.created_by = auth.uid())
    )
  );
