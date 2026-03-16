create table if not exists lead_status_history (
  id varchar(36) primary key,
  lead_id varchar(36) not null references leads(id) on delete cascade,
  from_status varchar(40),
  to_status varchar(40) not null,
  changed_by_user_id varchar(36),
  changed_by_name varchar(120),
  changed_at timestamptz not null default now()
);

create index if not exists idx_lead_status_history_lead on lead_status_history(lead_id);
create index if not exists idx_lead_status_history_changed_at on lead_status_history(changed_at desc);
