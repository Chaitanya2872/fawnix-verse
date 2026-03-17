alter table leads
  add column if not exists whatsapp_questionnaire_sent_at timestamptz;

create index if not exists idx_leads_whatsapp_questionnaire_sent_at
  on leads(whatsapp_questionnaire_sent_at);
