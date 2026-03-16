create table if not exists leads (
  id varchar(36) primary key,
  name varchar(160) not null,
  company varchar(160) not null,
  email varchar(160),
  phone varchar(50),
  source varchar(40) not null,
  status varchar(40) not null,
  priority varchar(40) not null,
  assigned_to_user_id varchar(36),
  assigned_to_name varchar(120),
  estimated_value numeric(14, 2) not null default 0,
  notes text not null default '',
  last_contacted_at timestamptz,
  converted_at timestamptz,
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  updated_by_user_id varchar(36),
  updated_by_name varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_priority on leads(priority);
create index if not exists idx_leads_source on leads(source);
create index if not exists idx_leads_assigned_user on leads(assigned_to_user_id);
create index if not exists idx_leads_created_at on leads(created_at desc);

create table if not exists lead_tags (
  id varchar(36) primary key,
  lead_id varchar(36) not null references leads(id) on delete cascade,
  tag_value varchar(80) not null,
  created_at timestamptz not null default now(),
  constraint uk_lead_tag unique (lead_id, tag_value)
);

create table if not exists lead_remarks (
  id varchar(36) primary key,
  lead_id varchar(36) not null references leads(id) on delete cascade,
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  updated_by_user_id varchar(36),
  updated_by_name varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lead_remarks_lead on lead_remarks(lead_id);

create table if not exists lead_remark_versions (
  id varchar(36) primary key,
  remark_id varchar(36) not null references lead_remarks(id) on delete cascade,
  content text not null,
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_remark_versions_remark on lead_remark_versions(remark_id);

create table if not exists lead_activities (
  id varchar(36) primary key,
  lead_id varchar(36) not null references leads(id) on delete cascade,
  activity_type varchar(50) not null,
  content text not null,
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_activities_lead on lead_activities(lead_id);
create index if not exists idx_lead_activities_created_at on lead_activities(created_at desc);
