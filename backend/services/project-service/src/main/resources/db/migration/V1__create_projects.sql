create table if not exists projects (
  id varchar(36) primary key,
  name varchar(200) not null,
  description text,
  status varchar(40) not null,
  start_date date,
  target_end_date date,
  created_by_id varchar(120),
  created_by_name varchar(160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_updated_at on projects (updated_at desc);
