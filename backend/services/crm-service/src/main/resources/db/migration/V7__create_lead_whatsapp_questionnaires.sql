create table if not exists lead_whatsapp_questionnaires (
  id varchar(36) primary key,
  lead_id varchar(36) not null references leads(id) on delete cascade,
  phone varchar(40) not null,
  wa_id varchar(32),
  language varchar(20),
  interest_areas text,
  demo_preference varchar(40),
  callback_preference varchar(40),
  callback_time_text varchar(120),
  ownership_role varchar(40),
  step varchar(40) not null,
  last_message_id varchar(64),
  last_payload text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists uk_lead_whatsapp_questionnaires_lead
  on lead_whatsapp_questionnaires(lead_id);
create index if not exists idx_lead_whatsapp_questionnaires_phone
  on lead_whatsapp_questionnaires(phone);
