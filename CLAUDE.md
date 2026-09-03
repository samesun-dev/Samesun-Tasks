# Samesun Tasks — Handoff

Written 2026-09-03 so a future session (or you, picking this back up) has
full context without re-deriving it. Committed to the repo (not just this
local clone) specifically so it survives a re-clone or a different
machine — update or trim it as this work lands and goes stale, the same
way Guest Portal's own CLAUDE.md gets kept current.

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

**Pushed (commit `b832214`), but needs manual steps before it's fully
live** — the code is deployed, but three pieces below only take effect
once you do the corresponding manual step in Supabase:

1. **Dead code removed from `App.jsx`** (~700 lines, file went
   1629→~950 lines). `Main()` actually renders the separate
   `components/TasksPage.jsx` / `components/ReportsPage.jsx`, but
   `App.jsx` also still had its own complete, never-rendered copies:
   `TaskView`, a second `TaskRow`, `CompleteModal`, `TaskFormFields`, a
   second `TaskFormModal`, `ReportModal`, plus three helper functions
   (`todayISO`, `isOverdue`, `getPastCycleDates`) that were only used by
   that dead code. All deleted. Confirmed via `npm run build` (clean) and
   `eslint` (no new issues, and the `no-unused-vars` errors the helper
   deletion fixed are gone). **Not visually re-verified in a browser**
   beyond the build succeeding — worth a quick click-through of Tasks/
   History/People/Reports after pushing, though nothing here should have
   changed behavior since none of the deleted code was ever reachable.

2. **Private tasks are now actually private** —
   [`supabase/migrations/20260903190000_private_task_rls.sql`](supabase/migrations/20260903190000_private_task_rls.sql),
   **not yet run against the live database**. Real gap found in review:
   `is_private` was enforced only client-side
   (`TasksPage.jsx`'s `task.is_private && task.created_by !== user.id`
   filter) — and `ReportsPage.jsx` didn't even apply that filter, so the
   Reports tab and its CSV export showed every private task's title/
   description to any signed-in user, no console needed. This migration
   moves the check into RLS on `tasks` and `task_instances` (a private
   task/instance is only select/update/delete-able by its creator). The
   general "any signed-in employee can edit any non-private task" model
   is left alone on purpose — that's this app's whole collaborative
   point, not a bug, just the private carve-out needed to be real.

3. **Per-team "overdue email watchers"** — your request, "add some admins
   as watchers and then they get the regular emails of what's overdue."
   Three pieces, none pushed/run yet:
   - [`supabase/migrations/20260903200000_team_overdue_watchers.sql`](supabase/migrations/20260903200000_team_overdue_watchers.sql) —
     new `team_watchers` table (team_id, user_id), admin-only insert/
     delete via `is_admin()` (added in the `20260903180000` migration —
     make sure that one's already run before this one; it was, per "Live
     and confirmed working" above, but worth double-checking if picking
     this up much later). **Not yet run.**
   - `supabase/functions/send-emails/index.ts` — now also fetches
     `team_watchers` and CC's them on every overdue/due-in-2-days email
     for that team's tasks, same content the assignee already gets. Also
     fixed a related bug while touching this: a task with no assignee
     used to be skipped entirely (`if (!assignee) continue`) — now an
     unassigned-but-overdue task still notifies its team's watchers,
     with a generic "Hi team," greeting instead of crashing on
     `assignee.name`. **This function needs to be redeployed** (dashboard
     editor, same as before — paste the updated `index.ts`) after the
     migration runs, or team watchers will silently get no emails even
     though the DB side works.
   - `App.jsx`'s `PeopleView` — new admin-only "📧 Overdue email
     watchers" section, one row per team, chips for current watchers
     with a remove ×, a "+ Add watcher" dropdown of users not already
     added. **Not visually tested in a browser** — this session had no
     way to log in as a real admin to click through it (no dev-bypass
     login exists in this app, unlike Guest Portal). Build is clean and
     the logic was written carefully, but worth an actual click-through
     after deploying: add a watcher, confirm the chip appears and the ×
     removes it, confirm a non-admin doesn't see the section at all.

### To actually ship everything above
1. Run `20260903190000_private_task_rls.sql` in the Supabase SQL editor.
2. Run `20260903200000_team_overdue_watchers.sql` in the Supabase SQL
   editor (after #1, or in either order — they don't depend on each
   other, only both depend on `is_admin()` from the already-run
   `20260903180000` migration).
3. Redeploy `send-emails` (dashboard editor, paste updated `index.ts`) —
   easy to forget since it's not a new function, just changed.
4. `git add -A && git commit` and push — Vercel auto-deploys from there.
5. Real end-to-end check worth doing once live: mark a task private as a
   non-admin test account, confirm a *different* account can no longer
   see it in Tasks, Reports, or the CSV export. Add yourself as a team
   watcher, wait for (or manually trigger) the next `send-emails` cron
   run, confirm you get copied on an overdue email you're not assigned
   to.

## Outstanding punch list

Not in priority order. The four deploy steps above (run both migrations,
redeploy `send-emails`, then the end-to-end checks) are the immediate
next actions; everything here is the broader list, added to as of
2026-09-03.

- **Run `20260903190000_private_task_rls.sql` and
  `20260903200000_team_overdue_watchers.sql`**, then **redeploy
  `send-emails`** — see "To actually ship everything above" above for
  detail. Nothing below matters until these are done.
- **Decide whether the GitHub repo goes private.** Recommended (see
  "Other things found this session" below for the reasoning) — your call
  to actually flip it.
- **A broader security review**, beyond what this session's read-through
  covered. This session found and fixed the `users`/`teams` privilege-
  escalation gap and the private-task RLS gap, and flagged (but didn't
  fix) the un-gated `reset-tasks`/`send-emails` endpoints — but it was a
  read-through in the course of other work, not a dedicated pass.
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
- **No secret gate on `reset-tasks`/`send-emails`.** Anyone with the
  public anon key (i.e. anyone) can invoke either directly right now —
  see "Other things found this session" below for the full detail and
  why the risk is currently low but not zero.
- **`task_watchers` (the per-task table) is dead code with no UI** —
  decide whether to build a real per-task watcher picker or drop the
  table/logic. Not blocking anything; the new per-team watcher feature
  covers the concrete ask that prompted this session's work.
- **Visually verify the dead-code removal** — click through Tasks/
  History/People/Reports in a real browser. The build and lint are
  clean and nothing deleted was ever reachable, but this wasn't
  re-confirmed live.

## Other things found this session, not acted on — worth revisiting

- **`reset-tasks` and `send-emails` Edge Functions have no secret gate.**
  Confirmed exactly how they're triggered: two `pg_cron` jobs (visible in
  Supabase's Cron integration — "reset tasks daily," "send emails
  daily"), each a raw `net.http_post` call authenticated with the real
  `service_role` key pulled from Vault. That's how *this* caller
  authenticates, but it doesn't restrict *other* callers — Supabase's
  Edge Function gateway accepts any validly-signed project JWT, and the
  public anon key (shipped in every page's source) qualifies. So anyone
  who finds either URL can invoke them repeatedly right now. Low real
  damage (both are roughly idempotent — reset-tasks checks for an
  existing instance before creating one, send-emails would just cause
  duplicate/early emails), but cheap to close with a shared-secret header
  check, same pattern Guest Portal uses for `CRON_SECRET`. Not done this
  session — wasn't asked for, flagged for a decision later.
- **`task_watchers` (the per-task table, not the new per-team one) is
  vestigial.** It has real RLS from the very first migration and
  `send-emails` still reads it, but nothing in the app UI ever writes to
  it — grepped the whole `src/` tree, zero references outside the RLS
  migration and the email function. In practice it's always empty. Not
  removed or built out this session (the new team-level watcher feature
  covers the actual ask instead) — worth deciding whether to build a
  real per-task watcher UI later or just drop the dead table/logic.
- **GitHub repo is public.** No hardcoded secrets found in the review
  (the anon key is meant to be public, Supabase's own model, matches how
  Guest Portal treats its own anon key) — but no reason for an internal
  ops tool's source to be publicly readable either. Recommended making
  it private; needs your GitHub admin action.

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
  `create-user` Edge Function (admin-only invites) and, as of this
  session's RLS fix, direct writes to `users`/`teams`/`signup_requests`/
  `team_watchers`. Nothing else in the app branches on it.

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
definition, an instance is one due-date occurrence of it), `task_watchers`
(dead, see above), and now `signup_requests` / `team_watchers` (new this
session).
