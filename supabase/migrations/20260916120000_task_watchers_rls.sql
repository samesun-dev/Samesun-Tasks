-- task_watchers has had one unrestricted "any authenticated user, full
-- access" policy since 20260717000000_enable_rls_tasks.sql — the same
-- policy shape that let anyone read/write task_watchers regardless of
-- whether they could see the underlying task at all. Now that private
-- tasks are enforced via RLS (20260903190000_private_task_rls.sql), this
-- closes the same gap on the watcher list: you shouldn't be able to see
-- or manage who's watching a task you can't otherwise see.
--
-- This table is being wired up to a real per-task "watchers" UI in the
-- task edit modal (previously it was written by nothing in the app).

drop policy if exists "Authenticated users only" on public.task_watchers;

create policy "Authenticated users can view task watchers" on public.task_watchers
  for select using (
    auth.role() = 'authenticated' and exists (
      select 1 from public.tasks t
      where t.id = task_watchers.task_id and (not t.is_private or t.created_by = auth.uid())
    )
  );

create policy "Authenticated users can add task watchers" on public.task_watchers
  for insert with check (
    auth.role() = 'authenticated' and exists (
      select 1 from public.tasks t
      where t.id = task_watchers.task_id and (not t.is_private or t.created_by = auth.uid())
    )
  );

create policy "Authenticated users can remove task watchers" on public.task_watchers
  for delete using (
    auth.role() = 'authenticated' and exists (
      select 1 from public.tasks t
      where t.id = task_watchers.task_id and (not t.is_private or t.created_by = auth.uid())
    )
  );
