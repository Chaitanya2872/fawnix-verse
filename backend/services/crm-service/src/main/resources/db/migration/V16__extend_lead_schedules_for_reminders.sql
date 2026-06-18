alter table lead_schedules
  add column if not exists title varchar(160),
  add column if not exists call_type varchar(30),
  add column if not exists duration_minutes integer,
  add column if not exists meeting_link varchar(500),
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz;

create index if not exists idx_lead_schedules_status on lead_schedules(status);
