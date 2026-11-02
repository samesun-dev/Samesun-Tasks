-- Read-only audit: find public.users rows whose id doesn't match the
-- auth.users row for the same email. A mismatch means that person's
-- profile predates the people-sync trigger (created via the old "Add
-- person" flow before they had a real Supabase Auth account) and every
-- admin-gated write (is_admin()) silently fails for them, even though
-- their `role` column correctly shows 'admin' in the UI.
--
-- See CLAUDE.md "Third round" for the full diagnosis and the one-off
-- fix pattern used for the site owner's own account (683fa688-... was
-- 1d60a700-...). This script only reads — it does not fix anything.
--
-- Run in: Supabase Dashboard -> SQL Editor, project harbaqvqxwgkifkbejwy.

select
  pu.email,
  pu.name,
  pu.role,
  pu.id as public_users_id,
  au.id as auth_users_id,
  (pu.id = au.id) as ids_match
from public.users pu
join auth.users au on au.email = pu.email
where pu.id != au.id;

-- Empty result = no mismatches found, nothing to fix.
--
-- If this returns rows, the fix pattern (repeat per row) is:
--   1. Insert a corrected public.users row under the real auth_users_id,
--      copying the other columns (name, email, role, team_id, etc.)
--      from the mismatched row.
--   2. Repoint every FK referencing users.id from the old public_users_id
--      to the new auth_users_id: tasks.created_by, tasks.assigned_to,
--      task_instances.completed_by, task_watchers.user_id,
--      team_watchers.user_id, signup_requests.reviewed_by (confirmed via
--      information_schema to be the complete list as of 2026-09-16 —
--      re-check information_schema.key_column_usage before reusing this
--      in case new FKs to users.id have been added since).
--   3. Delete the stale public_users_id row.
--   4. Wrap steps 1-3 in a `do $$ ... $$` block that counts remaining
--      references to the old id before deleting and raises an exception
--      (rolling back everything) if the count isn't zero, so it's
--      all-or-nothing per account.
