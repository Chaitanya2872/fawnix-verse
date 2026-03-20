alter table if exists whatsapp_integration_settings
  add column if not exists assign_template_name varchar(120);

alter table if exists whatsapp_integration_settings
  add column if not exists assign_template_language varchar(20);
