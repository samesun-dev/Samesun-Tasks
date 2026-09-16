-- The "due in 2 days" reminder was hardcoded in send-emails — every task
-- got exactly one reminder, exactly 2 days out, no matter how much lead
-- time it actually needed. Make it a per-task setting instead, defaulting
-- to 2 so existing tasks and anyone who leaves the field alone keep
-- today's behavior unchanged.

alter table public.tasks
  add column reminder_days_before integer not null default 2
  check (reminder_days_before >= 0 and reminder_days_before <= 60);
