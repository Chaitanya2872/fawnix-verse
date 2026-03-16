create table if not exists meta_lead_ingestions (
  id varchar(36) primary key,
  leadgen_id varchar(64) not null unique,
  lead_id varchar(36),
  page_id varchar(64),
  form_id varchar(64),
  ad_id varchar(64),
  payload text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_meta_lead_ingestions_leadgen on meta_lead_ingestions(leadgen_id);
