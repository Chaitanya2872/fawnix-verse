create table if not exists meta_integration_settings (
  id varchar(40) primary key,
  access_token text,
  form_id varchar(120),
  updated_at timestamptz not null default now()
);
