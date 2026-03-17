create table if not exists whatsapp_integration_settings (
  id varchar(40) primary key,
  access_token text,
  phone_number_id varchar(64),
  business_account_id varchar(64),
  verify_token text,
  app_secret text,
  template_name varchar(120),
  template_language varchar(20),
  template_use_lead_name boolean,
  default_country_code varchar(10),
  updated_at timestamptz not null default now()
);
