create table if not exists project_meetings (
  id varchar(36) primary key,
  project_id varchar(36),
  project_name varchar(200),
  project_code varchar(40),
  title varchar(200) not null,
  description text,
  meeting_type varchar(60),
  platform varchar(80),
  status varchar(40) not null,
  organizer_name varchar(160),
  organizer_role varchar(120),
  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone varchar(80),
  meeting_link text,
  meeting_external_id varchar(120),
  reminder varchar(80),
  repeat_rule varchar(80),
  participants_payload text,
  agenda_payload text,
  actions_payload text,
  attachments_payload text,
  notes_payload text,
  created_by_id varchar(120),
  created_by_name varchar(160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_project_meetings_project
    foreign key (project_id) references projects(id) on delete set null
);

create index if not exists idx_project_meetings_project on project_meetings (project_id);
create index if not exists idx_project_meetings_start_at on project_meetings (start_at asc);
create index if not exists idx_project_meetings_status on project_meetings (status);
