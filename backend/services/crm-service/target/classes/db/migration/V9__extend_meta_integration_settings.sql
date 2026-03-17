alter table meta_integration_settings
  add column if not exists verify_token text,
  add column if not exists app_secret text;
