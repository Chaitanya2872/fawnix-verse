create table if not exists application_form_versions (
  id uuid primary key,
  form_id uuid not null,
  version varchar(50) not null,
  schema_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_application_form_versions_form_id on application_form_versions(form_id);
create unique index if not exists ux_application_form_versions_form_version on application_form_versions(form_id, version);

create table if not exists application_form_submissions (
  id uuid primary key,
  form_id uuid not null,
  form_version_id uuid not null,
  form_name varchar(255),
  candidate_id uuid,
  candidate_name varchar(255),
  candidate_email varchar(255),
  application_id uuid,
  answers jsonb not null,
  schema_snapshot jsonb not null,
  resume_url varchar(500),
  source varchar(100),
  idempotency_key varchar(100) not null,
  submitted_at timestamptz not null,
  created_at timestamptz not null default now()
);

create unique index if not exists ux_application_form_submissions_idempotency on application_form_submissions(idempotency_key);
create index if not exists idx_application_form_submissions_form_id on application_form_submissions(form_id);
create index if not exists idx_application_form_submissions_submitted_at on application_form_submissions(submitted_at);

create table if not exists application_form_submission_responses (
  id uuid primary key,
  submission_id uuid not null,
  field_key varchar(255) not null,
  field_type varchar(50),
  value_text text,
  value_number numeric,
  value_date date
);

create index if not exists idx_form_submission_responses_submission_id on application_form_submission_responses(submission_id);
create index if not exists idx_form_submission_responses_field_key on application_form_submission_responses(field_key);

alter table application_form_links add column if not exists slug varchar(255);
alter table application_form_links add column if not exists is_active boolean not null default true;
alter table application_form_links add column if not exists max_submissions integer;
alter table application_form_links add column if not exists current_submissions integer not null default 0;
alter table application_form_links add column if not exists access_type varchar(50);

create unique index if not exists ux_application_form_links_slug on application_form_links(slug);
