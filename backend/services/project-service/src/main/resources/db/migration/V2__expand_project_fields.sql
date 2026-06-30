alter table projects
  add column if not exists project_code varchar(40),
  add column if not exists department varchar(80),
  add column if not exists manager_name varchar(160),
  add column if not exists priority_level varchar(40),
  add column if not exists progress_percent integer,
  add column if not exists team_size integer;
