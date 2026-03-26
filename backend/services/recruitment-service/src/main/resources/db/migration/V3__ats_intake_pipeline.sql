create table if not exists candidate_intake (
  id uuid primary key,
  vacancy_id uuid not null,
  form_submission_id uuid,
  form_id varchar(255),
  candidate_name varchar(255),
  email varchar(255),
  phone varchar(100),
  resume_url varchar(500),
  source varchar(100),
  status varchar(50),
  reviewer_id varchar(255),
  reviewed_at timestamptz,
  created_at timestamptz,
  dedupe_hash varchar(255),
  duplicate_of_intake_id uuid
);

create index if not exists idx_candidate_intake_vacancy on candidate_intake(vacancy_id);
create index if not exists idx_candidate_intake_status on candidate_intake(status);
create index if not exists idx_candidate_intake_dedupe_hash on candidate_intake(dedupe_hash);
create index if not exists idx_candidate_intake_duplicate on candidate_intake(duplicate_of_intake_id);

create table if not exists pipeline_stages (
  id uuid primary key,
  vacancy_id uuid not null,
  name varchar(255) not null,
  order_index integer,
  is_terminal boolean default false,
  is_active boolean default true,
  category varchar(50)
);

create index if not exists idx_pipeline_stages_vacancy on pipeline_stages(vacancy_id);

create table if not exists pipeline_history (
  id uuid primary key,
  application_id uuid not null,
  from_stage_id uuid,
  to_stage_id uuid,
  moved_by varchar(255),
  moved_at timestamptz,
  reason text
);

create index if not exists idx_pipeline_history_application on pipeline_history(application_id);

create table if not exists interview_rounds_config (
  id uuid primary key,
  vacancy_id uuid not null,
  round_number integer,
  name varchar(255),
  type varchar(50),
  duration_minutes integer,
  panel_roles text,
  scorecard_id varchar(255),
  is_required boolean default true
);

create index if not exists idx_interview_rounds_vacancy on interview_rounds_config(vacancy_id);

create table if not exists evaluation_scores (
  id uuid primary key,
  application_id uuid not null,
  interview_id uuid,
  total_score integer,
  recommendation varchar(50),
  summary text,
  submitted_by varchar(255),
  submitted_at timestamptz
);

create index if not exists idx_evaluation_scores_application on evaluation_scores(application_id);

create table if not exists application_decisions (
  id uuid primary key,
  application_id uuid not null,
  decision_status varchar(50),
  decision_reason varchar(255),
  decision_notes text,
  decision_score integer,
  decision_by varchar(255),
  decision_at timestamptz,
  approval_request_id varchar(255)
);

create index if not exists idx_application_decisions_application on application_decisions(application_id);

create table if not exists recruitment_audit_logs (
  id uuid primary key,
  entity_type varchar(100),
  entity_id varchar(255),
  action varchar(100),
  actor_id varchar(255),
  metadata jsonb,
  created_at timestamptz
);

create index if not exists idx_recruitment_audit_entity on recruitment_audit_logs(entity_type, entity_id);

alter table candidate_applications add column if not exists intake_id uuid;
alter table candidate_applications add column if not exists pipeline_stage_id uuid;
alter table candidate_applications add column if not exists decision_status varchar(50);
alter table candidate_applications add column if not exists decision_notes text;
alter table candidate_applications add column if not exists decision_at timestamptz;
alter table candidate_applications add column if not exists dedupe_key varchar(255);

create index if not exists idx_candidate_applications_intake_id on candidate_applications(intake_id);
create index if not exists idx_candidate_applications_pipeline_stage_id on candidate_applications(pipeline_stage_id);
create index if not exists idx_candidate_applications_dedupe_key on candidate_applications(dedupe_key);

alter table job_positions add column if not exists workflow_version integer default 1;
alter table job_positions add column if not exists pipeline_config_status varchar(50);

