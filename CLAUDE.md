# Samesun Tasks — Handoff

Written 2026-09-03, substantially updated 2026-09-16 across three rounds
of work in one long session (migrations + a delete-task fix; then
per-task watchers/configurable reminders/a security review; then an
id-mismatch bug on the site owner's own account plus an unassigned-task
bug in `send-emails`), then updated again 2026-11-02 for a `send-emails`
rework (overdue throttle + grouped reminder emails — see "Fourth round"
below), so a future session (or you, picking this back up) has full
context without re-deriving it. Committed to the repo (not just this
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
working repeatedly.

## Read this first — current status

**Everything below is live and deployed as of 2026-11-02**, including
the `send-emails` overdue-throttle + grouped-email rework (see "Fourth
round" below — confirmed deployed by diffing pasted dashboard code
against the committed source, not just trusting the Deploy click).
Nothing code-side is outstanding on that work. The older punch list
further down is a separate, still-open list — manual/account actions
(GitHub visibility, Resend billing) and not-yet-scoped feature work
(weekly report), plus a few lower-priority end-to-end checks — none of
that was touched in this round.

- **(2026-11-02) Overdue reminders throttled to every 2 days, all
  reminder emails grouped into one per recipient.** `send-emails` used
  to resend an "Overdue" email daily for every incomplete overdue task,
  and sent one email per task per recipient — an assignee or department
  watcher with 5 overdue tasks got 5 separate emails. Now: overdue
  emails only go out every other day per task (day 1, 3, 5... of being
  overdue), and every recipient (assignee, task watcher, or team/
  department watcher) gets at most **one** email per run, with Overdue
  and Due-soon sections grouped by department. Driven by Resend's
  per-email billing. Deployed via the Supabase dashboard code editor
  (no CLI token available in-session) — see "Fourth round" for the
  git-push wrinkle this round hit.
- Self-service "Request access" on the login screen → `signup_requests`
  → pending-requests queue on the admin People page → Approve (real
  invite) / Dismiss. Notification email goes out via an Edge Function
  deployed under the name **`smart-endpoint`**, not
  `notify-signup-request` — the Supabase dashboard's "rename" only
  changes a display label, not the actual routing slug (confirmed by
  testing both directly: the old slug kept responding, the new one
  404'd). `App.jsx`'s `RequestAccessScreen` calls
  `supabase.functions.invoke("smart-endpoint", ...)` to match reality.
  If this function is ever redeployed under a real name, update that
  one call site.
- Privilege-escalation fix: `users`/`teams` RLS used to let any
  signed-in member grant themselves `admin` directly from the browser
  console. Now admin-only at the DB level.
- Private tasks are actually private at the RLS level now (`tasks`/
  `task_instances`), not just hidden client-side — closes a real gap
  where Reports + CSV export showed every private task to anyone
  signed in.
- Per-team "📧 Overdue email watchers" (People page, admin-managed) —
  CC's chosen people on every overdue/due-soon email for a whole
  department's tasks, without adding them task-by-task.
- Per-task watchers — a real UI in the task edit modal (chips + "+ Add
  watcher"), wired to the `task_watchers` table that used to be
  dead/unused.
- Configurable reminder lead time — `reminder_days_before` per task
  (default 2), replacing a hardcoded "2 days before" for every task.
- `start_date` removed from the task form entirely — it was saved but
  never read anywhere (not grouping, not Reports, not the recurring
  scheduler, not reminders). Pure UI confusion with zero effect.
- Deleted (`is_active = false`) tasks are now actually filtered out
  everywhere: Tasks, Reports (+ CSV export), History, and the Completed
  drawer. Previously only the two Edge Functions filtered correctly —
  every client-side view leaked deleted tasks indefinitely.
- Security fixes: HTML-escaping added to `send-emails` (task title/
  description used to go into emails unescaped — any employee could
  inject markup/links into mail sent from `tasks@tasks.samesun.com`),
  CSV export now guards against formula injection and quote-breaking,
  a new admin-gated `delete-user` Edge Function actually revokes a
  removed person's Supabase Auth account (the old "Remove" button only
  deleted their `public.users` row and left their login fully working),
  and `reset-tasks`/`send-emails` now require an `x-cron-secret` header
  matching a `CRON_SECRET` you configured — **activated and confirmed
  working** (tested directly with curl: rejected without the header,
  accepted with it).
- **A real id-mismatch bug on your own (the site owner's) account was
  found and fixed** — see "Third round" below for full detail and why
  this class of bug can recur for anyone whose account predates the
  people-sync trigger.

### Remaining end-to-end checks (not yet done, lower priority)
- Mark a task private as a non-admin test account, confirm a *different*
  account can no longer see it in Tasks, Reports, or the CSV export.
- Test "Remove" on the People page end-to-end: remove a throwaway test
  account, confirm they can no longer sign in at all.
- Click through Tasks/History/People/Reports once more just to eyeball
  everything after this much change.

## Third round, 2026-09-16 — commit `801cfb5` and the id-mismatch fix

Triggered by: testing the second round's work, you got `new row violates
row-level security policy for table "team_watchers"` trying to add
yourself as a Marketing watcher — even though you're an admin.

**Root cause, and a bug class worth remembering:** every admin-gated RLS
policy in this project goes through `is_admin()`, which checks
`public.users.role = 'admin'` **for the row where `id = auth.uid()`**.
Your `public.users` row predated the people-sync trigger (it was created
by the old "Add person" flow with a made-up id, before a real Supabase
Auth account existed for you) — see the `20260826204521_fix_people_sync_conflict.sql`
migration's own comment for why the trigger's `on conflict (email) do
nothing` preserves an old profile's id rather than reconciling it. So
your `public.users.id` never matched your real `auth.uid()`, which
silently broke **every** admin-gated write for your account specifically
(team watchers, and would have equally broken inviting/editing
people/teams/reviewing signup requests — reads were unaffected since
those only check `auth.role() = 'authenticated'`).

**Fixed by hand via the SQL editor** (not a migration — this was
account-specific data surgery, not a schema change): inserted a
corrected `public.users` row under your real Auth id
(`683fa688-0359-41b4-a3a2-e1a0bafdc3ad`, was
`1d60a700-a31a-4854-ab44-015e9fd23ce5`), repointed every table with a
foreign key to `users.id` (`tasks.created_by`, `tasks.assigned_to`,
`task_instances.completed_by`, `task_watchers.user_id`,
`team_watchers.user_id`, `signup_requests.reviewed_by` — confirmed via
an `information_schema` query to be the complete list, not just what the
app code implied), then deleted the stale row. Wrapped in a `do $$ ...
$$` block that counts remaining references before deleting and raises
an exception (rolling back everything) if the count isn't zero, so it
was all-or-nothing. Ran clean, confirmed working (Marketing watcher add
succeeded afterward).

**If this happens again for someone else**: same diagnosis — compare
`public.users.id` for their email against `auth.users.id` for the same
email; a mismatch means their profile predates their real Auth account.
The fix pattern above is reusable (swap in their two ids).

**Also fixed in the same round**: `send-emails`'s task query had
`.not("assigned_to", "is", null)`, which excluded unassigned tasks
before the loop ever ran — silently making the "unassigned tasks still
notify their team's watchers" logic (added in the second round) dead
code. Removed that filter; the loop already handles a missing assignee
correctly. **Redeployed and confirmed** — this was the last outstanding
deploy step from today's work, now done.

## Fourth round, 2026-11-02 — commit `e0bfbdc`, `send-emails` rework

Two asks in one session: throttle overdue reminders from daily to every
2 days, then (same session) group all reminder emails per recipient
instead of one email per task — both driven by Resend's per-email cost.

**Overdue throttle**: `send-emails` computes `daysOverdue` (today minus
the task's `end_date`) and only fires the overdue branch when
`daysOverdue % 2 === 1` — so day 1 overdue sends, day 2 skips, day 3
sends, etc. Deliberately left the "due soon" branch (`reminder_days_before`)
untouched — it already only fires once, on the exact day, and throttling
the *invocation* itself (vs. the logic inside it) would risk the cron
skipping that exact day entirely depending on parity.

**Grouped emails**: previously the function sent one email per
(overdue-or-due-soon task) × (recipient) pair — an assignee or team
watcher with several overdue tasks got that many separate emails.
Reworked to bucket by recipient user id first (`recipientTasks`), across
all their tasks for this run, then send **one** email per recipient with
two sections (Overdue / Due soon), each grouped by department. Applies
identically to assignees and to watchers ("managers") — both are just
entries in the same recipient-id set per task.

**Deploy mechanics worth knowing for next time**:
- No Supabase CLI token available in this session/machine
  (`supabase login` needs an interactive TTY or `SUPABASE_ACCESS_TOKEN`,
  neither present) — deployed by hand via the dashboard code editor
  (paste into `index.ts`, click Deploy) instead of `supabase functions
  deploy`.
- Verified the deploy actually took by having the user paste back two
  *distinguishing* snippets from the live editor (the `renderSection`
  function — doesn't exist in the old per-task version) rather than
  trusting the Deploy click or checking only boilerplate lines that are
  identical in both old and new versions.
- **This git clone had no local identity configured** (`git commit`
  failed with "Author identity unknown"). Set locally (not --global)
  after confirming with the user, matching every prior commit's author:
  `tech-ops-samesun <tech-ops@samesun.com>`.
- **That push was then rejected by GitHub** (`GH007: push would publish
  a private email address`) — the authenticated GitHub account/credential
  doing the push has "block command-line pushes that expose my email"
  enabled, and `tech-ops@samesun.com` isn't marked public on it (even
  though that same address is already all over this repo's existing
  public history from prior sessions — so the block didn't add any real
  new exposure, it just caught this one push). Resolved by amending the
  not-yet-pushed commit's author/committer to
  `tech-ops-samesun@users.noreply.github.com` instead of touching the
  GitHub account's privacy setting — local `user.email` is now set to
  that noreply address for this clone. If a future commit here fails to
  push with the same GH007 error, this is why, and the same fix applies.

## Outstanding punch list

Not in priority order. Nothing code-side is pending — everything below
is either a manual/account action or unscoped feature work.

- **Remaining end-to-end checks** — see the short list above (private
  task visibility across accounts, Remove-a-test-account, a final
  visual click-through).
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
- **Consider auditing other early-created accounts for the same
  id-mismatch bug** — anyone added via the old "Add person" flow before
  the people-sync trigger existed could have the same
  `public.users.id != auth.users.id` problem your account had. It only
  surfaces as a confusing RLS error when that person tries an
  admin-gated write, so it could be sitting latent on other accounts
  right now. The diagnostic query is in the "Third round" section above,
  and now also as a ready-to-run script at
  `supabase/scripts/audit_id_mismatches.sql` (2026-11-02) — paste it
  into the Supabase SQL Editor, needs your login so wasn't run from
  here. It's read-only; the per-row fix (if it finds anything) still
  needs the manual id-swap pattern from the "Third round" section.

## Other things found, not acted on — worth revisiting

- **GitHub repo is public.** No hardcoded secrets found in review (the
  anon key is meant to be public, Supabase's own model, matches how
  Guest Portal treats its own anon key) — but no reason for an internal
  ops tool's source to be publicly readable either. Recommended making
  it private; needs your GitHub admin action.

## Schema/gotchas discovered

- **A Supabase Edge Function's dashboard "rename" doesn't change its
  routing slug** — see the `smart-endpoint` note above. If a function
  ever needs a real rename, delete and redeploy under the correct name
  rather than trusting the rename control.
- **Postgres RLS applies SELECT policies to `INSERT ... RETURNING`.**
  `signup_requests` has no anon SELECT policy (only admins can read it),
  so `RequestAccessScreen`'s insert can't do `.insert(...).select().single()`
  the way you might expect — it silently returns no row. Fixed by
  generating the request's `id` client-side (`crypto.randomUUID()`) and
  passing it explicitly, so nothing needs to be read back.
- **`is_admin()`** (added in `20260903180000_signup_requests_and_users_rls.sql`)
  is the shared building block for every admin-only RLS policy in this
  project (`users`, `teams`, `signup_requests`, `team_watchers`,
  `task_watchers`) — checks `public.users.role = 'admin'` for the
  calling `auth.uid()`. Use it rather than re-deriving the check if
  adding more admin-gated tables later. **Its correctness depends on
  `public.users.id === auth.uid()` for every account** — see the
  id-mismatch bug above; an account created before the people-sync
  trigger existed can silently fail every admin check this function
  gates, even while `role` correctly shows `'admin'` in the UI.
- **`role` has exactly one real effect in this app**: gating the
  `create-user`/`delete-user` Edge Functions (admin-only invite/remove)
  and direct writes to `users`/`teams`/`signup_requests`/`team_watchers`/
  `task_watchers` via `is_admin()`. Nothing else in the app branches on
  it.
- **Deleting a Supabase Auth user only via `public.users` doesn't revoke
  anything.** If you ever add another "remove access" path in this app,
  route it through the `delete-user` function (or replicate its
  `auth.admin.deleteUser` call) rather than a plain
  `.from("users").delete()`.
- **`end_date` is the only date field on `tasks` that anything reads.**
  `start_date` was removed from the UI for exactly this reason; if
  adding a new date-ish field in future, wire up what reads it before
  shipping the input, not after.

## What this project is

React + Vite + Tailwind SPA (`src/`), Supabase backend (Postgres + Auth +
Edge Functions), deployed as a static build on Vercel. No self-hosted
server — `vercel.json` is just an SPA rewrite rule. Real accounts are
always admin-created (via `create-user`, an Edge Function gated by a
server-side `role === 'admin'` check) or admin-*approved* via the
request-access queue — there's no path to a real account that skips
admin approval.

Core tables: `teams` (fixed set — hr/sales/marketing/growth/finance/ops,
seeded once, no UI to add more), `users` (mirrors `auth.users`, kept in
sync by a trigger — but see the id-mismatch gotcha above for accounts
that predate the trigger), `tasks` / `task_instances` (a task is the
recurring definition, an instance is one due-date occurrence of it,
`end_date` is the only date field that does anything), `task_watchers`
(per-task watchers, has a real UI now), `team_watchers` (per-team
watchers, admin-managed on the People page), and `signup_requests` (the
access-request queue).
