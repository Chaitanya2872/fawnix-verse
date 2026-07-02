alter table projects
  add column if not exists team_lead_name varchar(160),
  add column if not exists team_members_payload text,
  add column if not exists team_payload text;
