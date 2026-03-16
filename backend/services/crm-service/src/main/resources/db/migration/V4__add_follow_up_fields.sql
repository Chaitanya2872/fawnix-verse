alter table leads
  add column if not exists follow_up_at timestamptz,
  add column if not exists follow_up_reminder_sent_at timestamptz;

create index if not exists idx_leads_follow_up_at on leads(follow_up_at);
