# Samesun Tasks — Handoff

Written 2026-09-03, updated twice on 2026-09-16 (migrations run + a
delete-task bug fix, then a second round: per-task watchers, configurable
reminders, and a security review), so a future session (or you, picking
this back up) has full context without re-deriving it. Committed to the
repo (not just this local clone) specifically so it survives a re-clone
or a different machine — update or trim it as this work lands and goes
stale, the same way Guest Portal's own CLAUDE.md gets kept current.

Local clone: `BD/Samesun Tasks/` (sibling to the unrelated `BD/Guest
Portal/` project — different repo, different Supabase project, don't
confuse the two). GitHub: `github.com/samesun-dev/Samesun-Tasks`,
**currently public** — recommended making it private (GitHub → repo →
Settings → Danger Zone → Change visibility; needs your admin access, not
something doable from here). Supabase project: "Samesun Hostel Tasks",
ref `harbaqvqxwgkifkbejwy`. Deployed on Vercel at
`samesun-tasks.vercel.app`, auto-deploys on push to `main` — confirmed
working this session.

## Read this first — current status

**Live and confirmed working** (commit `e0c039e`, pushed and deployed):
- Self-service "Request access" link on the login screen → inserts into
  `signup_requests` → shows as a pending-requests queue on the admin
  People page → Approve (real invite, same flow as "+ Add person") /
  Dismiss.
- A real privilege-escalation fix: `users`/`teams` RLS used to let any
  signed-in member update anyone's `role` (including their own, to
  `admin`) directly from the browser console. Now admin-only at the DB
  level, not just hidden in the UI.
- New Edge Function that emails every `role='admin'` user when a request
  comes in. **Important gotcha**: it's deployed under the name
  **`smart-endpoint`**, not `notify-signup-request`. The Supabase
  dashboard's "rename" only changes a display label, not the actual
  routing slug — confirmed by testing both names directly, the old slug
  kept responding and the new one 404'd. Rather than fight the dashboard,
  the client code (`App.jsx`'s `RequestAccessScreen`) just calls
  `supabase.functions.invoke("smart-endpoint", ...)` to match reality. If
  this function is ever redeployed under a real name, update that one
  call site.

**Pushed (commit `b832214`) and fully shipped as of 2026-09-16** — both
migrations below have been run against the live database and
`send-emails` has been redeployed with the version that reads
`team_watchers`:

1. **Dead code removed from `App.jsx`** (~700 lines, file went
   1629→~950 lines). `Main()` actually renders the separate
   `components/TasksPage.jsx` / `components/ReportsPage.jsx`, but
   `App.jsx` also still had its own complete, never-rendered copies:
   `TaskView`, a second `TaskRow`, `CompleteModal`, `TaskFormFields`, a
   second `TaskFormModal`, `ReportModal`, plus three helper functions
   (`todayISO`, `isOverdue`, `getPastCycleDates`) that were only used by
   that dead code. All deleted. Confirmed via `npm run build` (clean) and
   `eslint` (no new issues, and the `no-unused-vars` errors the helper
   deletion fixed are gone). **Still not visually re-verified in a
   browser** beyond the build succeeding — nothing here should have
   changed behavior since none of the deleted code was ever reachable,
   but a click-through of Tasks/History/People/Reports remains open.

2. **Private tasks are now actually private** —
   [`supabase/migrations/20260903190000_private_task_rls.sql`](supabase/migrations/20260903190000_private_task_rls.sql),
   **run against the live database 2026-09-16**. Real gap found in
   review: `is_private` was enforced only client-side
   (`TasksPage.jsx`'s `task.is_private && task.created_by !== user.id`
   filter) — and `ReportsPage.jsx` didn't even apply that filter, so the
   Reports tab and its CSV export showed every private task's title/
   description to any signed-in user, no console needed. This migration
   moves the check into RLS on `tasks` and `task_instances` (a private
   task/instance is only select/update/delete-able by its creator). The
   general "any signed-in employee can edit any non-private task" model
   is left alone on purpose — that's this app's whole collaborative
   point, not a bug, just the private carve-out needed to be real. **Not
   yet end-to-end verified** — see punch list below.

3. **Per-team "overdue email watchers"** — your request, "add some admins
   as watchers and then they get the regular emails of what's overdue."
   Three pieces, all shipped 2026-09-16:
   - [`supabase/migrations/20260903200000_team_overdue_watchers.sql`](supabase/migrations/20260903200000_team_overdue_watchers.sql) —
     new `team_watchers` table (team_id, user_id), admin-only insert/
     delete via `is_admin()` (added in the `20260903180000` migration).
     **Run against the live database 2026-09-16.**
   - `supabase/functions/send-emails/index.ts` — now also fetches
     `team_watchers` and CC's them on every overdue/due-in-2-days email
     for that team's tasks, same content the assignee already gets. Also
     fixed a related bug while touching this: a task with no assignee
     used to be skipped entirely (`if (!assignee) continue`) — now an
     unassigned-but-overdue task still notifies its team's watchers,
     with a generic "Hi team," greeting instead of crashing on
     `assignee.name`. **Redeployed 2026-09-16** via the dashboard editor.
   - `App.jsx`'s `PeopleView` — new admin-only "📧 Overdue email
     watchers" section, one row per team, chips for current watchers
     with a remove ×, a "+ Add watcher" dropdown of users not already
     added. **Still not visually tested in a browser** — no dev-bypass
     login exists in this app, unlike Guest Portal. Build is clean and
     the logic was written carefully, but worth an actual click-through:
     add a watcher, confirm the chip appears and the × removes it,
     confirm a non-admin doesn't see the section at all.

**Fixed and deployed 2026-09-16 (commit `ce873ca`)** — a real bug, not
from the 2026-09-03 session: "delete task" only ever soft-deleted
(`tasks.is_active = false`), but neither `TasksPage.jsx` nor
`ReportsPage.jsx` filtered on `is_active` when loading tasks, so
"deleted" tasks (including old test records) kept showing up in the
task list, Reports, and the CSV export indefinitely. The two Edge
Functions (`reset-tasks`, `send-emails`) already filtered correctly —
only the client queries were missing `.eq('is_active', true)`. Fixed in
both files; user confirmed working live after deploy.

### Remaining end-to-end checks (not yet done)
- Mark a task private as a non-admin test account, confirm a *different*
  account can no longer see it in Tasks, Reports, or the CSV export.
- Add yourself as a team watcher, wait for (or manually trigger) the
  next `send-emails` cron run, confirm you get copied on an overdue
  email you're not assigned to.
- Click through the People page's new "📧 Overdue email watchers"
  section as a real admin: add/remove a watcher, confirm a non-admin
  doesn't see the section.
- Click through Tasks/History/People/Reports to visually confirm the
  `App.jsx` dead-code removal didn't change anything.
- Test the new per-task "Watchers" section in the task edit modal, and
  the new "Remind me this many days before" field (see below).
- Test "Remove" on the People page end-to-end: remove a test account,
  confirm they can no longer sign in at all (not just that their profile
  row is gone).

## Second round, 2026-09-16 — pushed as commits `1747423` then a follow-up

Triggered by: you reported a "delete task" bug (fixed earlier, see above),
then asked about the `start_date`/`end_date` fields (start_date turned
out to be pure dead UI — removed), then asked for a broader security
review plus building out the `task_watchers` piece.

**Shipped in the code, needs the manual steps below before it's live:**

1. **Per-task watchers** — real UI in the task edit modal (`TaskFormModal.jsx`):
   chips of current watchers + "+ Add watcher" dropdown, same pattern as
   the per-team watchers on the People page. `task_watchers` RLS tightened
   to respect the private-task carve-out
   ([`20260916120000_task_watchers_rls.sql`](supabase/migrations/20260916120000_task_watchers_rls.sql),
   **not yet run**) — it previously had the same "any authenticated user,
   full access" blanket policy that `tasks`/`task_instances` had before
   the private-task fix.
2. **`start_date` removed.** It was saved to the DB but never read
   anywhere — not the Tasks grouping, not Reports, not the recurring
   scheduler (that's driven purely by `frequency`), not the reminder
   emails. Pure UI confusion with zero effect. Removed the field from
   `TaskFormModal.jsx` and the two save paths in `TasksPage.jsx`. The
   `start_date` column itself is untouched in the DB (harmless, just
   unused) — no migration needed for this part.
3. **Configurable reminder lead time** — new `reminder_days_before`
   column, default 2
   ([`20260916130000_task_reminder_days.sql`](supabase/migrations/20260916130000_task_reminder_days.sql),
   **not yet run**). `send-emails` now computes the "due soon" trigger
   per-task (`addDaysISO(task.reminder_days_before ?? 2)`) instead of a
   single hardcoded `+2` for every task. The form field only shows once a
   due date is set, to avoid adding clutter to tasks without one.
4. **Security review fixes** (see the review write-up further down for
   full detail):
   - Same `is_active` filtering bug fixed earlier today also existed in
     `App.jsx`'s History tab and Completed drawer — fixed the same way.
   - `send-emails` now escapes task title/description before putting
     them in HTML emails (it didn't before — any employee could inject
     markup/links into mail sent from `tasks@tasks.samesun.com`).
   - CSV export now escapes quotes and guards against formula injection
     (a title starting with `=`/`+`/`-`/`@`).
   - **New `delete-user` Edge Function** — the People page's "Remove" used
     to only delete the `public.users` row via a plain client call,
     never the person's actual Supabase Auth account. That meant a
     "removed" person's password kept working and they retained
     effectively full access forever (most read policies only check
     `auth.role() = 'authenticated'`, not "has a profile row"). This was
     the most serious finding of the review. The new function is
     admin-gated (same pattern as `create-user`), deletes the real Auth
     account first, then the profile row. **Not yet deployed** — needs
     the same manual Edge Function creation as `create-user`/`send-emails`
     (dashboard → Edge Functions → New function → name it exactly
     `delete-user` → paste
     [`supabase/functions/delete-user/index.ts`](supabase/functions/delete-user/index.ts)).
     `App.jsx`'s `handleRemoveUser` already calls it via
     `supabase.functions.invoke("delete-user", ...)` — until the function
     exists, clicking Remove on the People page will fail with an error
     shown in the modal (safe failure, not a silent no-op).
   - **Secret gate added to `reset-tasks`/`send-emails`** — both now
     check an `x-cron-secret` header against a `CRON_SECRET` env var, but
     *only if `CRON_SECRET` is set* — this is deliberate so redeploying
     the functions today doesn't break the daily cron runs before you've
     had a chance to configure the secret. To actually activate the gate:
     1. Supabase dashboard → Edge Functions → Manage secrets → add
        `CRON_SECRET` = some random value (e.g. generate one with
        `openssl rand -hex 32` or similar).
     2. Redeploy both `reset-tasks` and `send-emails` (the secret needs
        to be visible to `Deno.env.get` — functions pick up secrets at
        invoke time, but redeploy after adding it if in doubt).
     3. Database → Cron Jobs (or wherever the "reset tasks daily" / "send
        emails daily" jobs live in the Supabase Cron integration) → edit
        each job's `net.http_post` call → add `'x-cron-secret',
        '<the same value>'` to the `headers` argument, alongside the
        existing `Authorization` header.
     Until all three steps are done, the gate stays inactive (open, same
     as today) — nothing breaks either way, but it's also not actually
     closing the gap until you do this.

### To ship the second round
1. Run `20260916120000_task_watchers_rls.sql` then
   `20260916130000_task_reminder_days.sql` in the Supabase SQL editor
   (either order).
2. Redeploy `send-emails` again (dashboard editor — it changed again for
   the HTML-escaping fix, the per-task reminder days, and the secret
   gate).
3. Redeploy `reset-tasks` (dashboard editor — changed for the secret
   gate).
4. Create the new `delete-user` Edge Function (see above) — this one
   doesn't exist yet at all, unlike the others which are redeploys.
5. Optional but recommended: activate the `CRON_SECRET` gate per the
   3 steps above.
6. `git add -A && git commit` and push if you made any of these changes
   locally — but the code side is already pushed as of this session, so
   steps 1-5 are the only remaining work.

## Outstanding punch list

Not in priority order.

- **Do the "To ship the second round" steps above** — nothing in that
  round is live until you do. Highest priority is #4 (deploy
  `delete-user`) since "Remove" on the People page currently either does
  nothing useful (pre-deploy: errors safely) or, before this session,
  silently failed to revoke access.
- **Decide whether the GitHub repo goes private.** Recommended (see
  below for the reasoning) — your call to actually flip it.
- **Weekly report — what's done and what's outstanding.** Not yet
  scoped. Open questions worth answering before building it: who
  receives it (all admins? a fixed list independent of `role`?), does it
  reuse the `send-emails` function's existing Resend setup or need its
  own, is it project-wide or per-team, and does "outstanding" mean
  overdue tasks, all open tasks, or something broader like the items in
  this punch list itself.
- **Get a credit card on file with Resend.** Presumably to avoid email
  sending (invites, signup notifications, overdue/due-soon reminders —
  everything in `lib`/`supabase/functions` that sends mail) getting cut
  off if usage grows past whatever free-tier limit applies. Purely an
  account/billing action on Resend's own site, nothing in this repo to
  change.

## Other things found, not acted on — worth revisiting

- **GitHub repo is public.** No hardcoded secrets found in either
  session's review (the anon key is meant to be public, Supabase's own
  model, matches how Guest Portal treats its own anon key) — but no
  reason for an internal ops tool's source to be publicly readable
  either. Recommended making it private; needs your GitHub admin action.

## Schema/gotchas discovered this session

- **A Supabase Edge Function's dashboard "rename" doesn't change its
  routing slug** — see the `smart-endpoint` note above. If a function
  ever needs a real rename, delete and redeploy under the correct name
  rather than trusting the rename control.
- **Postgres RLS applies SELECT policies to `INSERT ... RETURNING`.**
  `signup_requests` has no anon SELECT policy (only admins can read it),
  so `RequestAccessScreen`'s insert can't do `.insert(...).select().single()`
  the way you might expect — it silently returns no row. Fixed by
  generating the request's `id` client-side (`crypto.randomUUID()`) and
  passing it explicitly, so nothing needs to be read back. Worth
  remembering for any future anon-insert-then-need-the-id flow in this
  project.
- **`is_admin()`** (added in `20260903180000_signup_requests_and_users_rls.sql`)
  is now the shared building block for every admin-only RLS policy in
  this project (`users`, `teams`, `signup_requests`, `team_watchers`) —
  checks `public.users.role = 'admin'` for the calling `auth.uid()`. Use
  it rather than re-deriving the check if adding more admin-gated tables
  later.
- **`role` has exactly one real effect in this app**: gating the
  `create-user`/`delete-user` Edge Functions (admin-only invite/remove)
  and direct writes to `users`/`teams`/`signup_requests`/`team_watchers`/
  `task_watchers`. Nothing else in the app branches on it.
- **Deleting a Supabase Auth user only via `public.users` doesn't revoke
  anything** — see the `delete-user` write-up above. If you ever add
  another "remove access" path in this app, route it through that
  function (or replicate its `auth.admin.deleteUser` call) rather than a
  plain `.from("users").delete()`.

## What this project is

React + Vite + Tailwind SPA (`src/`), Supabase backend (Postgres + Auth +
Edge Functions), deployed as a static build on Vercel. No self-hosted
server — `vercel.json` is just an SPA rewrite rule. Real accounts are
always admin-created (via `create-user`, an Edge Function gated by a
server-side `role === 'admin'` check) or, as of this session, admin-
*approved* via the new request-access queue — there's still no path to a
real account that skips admin approval.

Core tables: `teams` (fixed set — hr/sales/marketing/growth/finance/ops,
seeded once, no UI to add more), `users` (mirrors `auth.users`, kept in
sync by a trigger), `tasks` / `task_instances` (a task is the recurring
definition, an instance is one due-date occurrence of it, `end_date` is
the only date field that does anything), `task_watchers` (per-task
watchers, now with a real UI as of the second 2026-09-16 round),
`team_watchers` (per-team watchers, admin-managed on the People page),
and `signup_requests` (the access-request queue).
