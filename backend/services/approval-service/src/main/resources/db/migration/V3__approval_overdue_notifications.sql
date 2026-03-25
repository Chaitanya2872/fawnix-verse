alter table approval_request_stages
  add column if not exists overdue_notified_at timestamptz;

create index if not exists idx_approval_request_stages_overdue_notified_at
  on approval_request_stages(overdue_notified_at);
