create table if not exists lead_schedules (
  id varchar(36) primary key,
  lead_id varchar(36) not null references leads(id) on delete cascade,
  type varchar(20) not null,
  status varchar(20) not null,
  scheduled_at timestamptz not null,
  location varchar(200),
  mode varchar(20),
  notes text,
  assigned_to_user_id varchar(36),
  assigned_to_name varchar(120),
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  updated_by_user_id varchar(36),
  updated_by_name varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lead_schedules_lead on lead_schedules(lead_id);
create index if not exists idx_lead_schedules_scheduled_at on lead_schedules(scheduled_at);
