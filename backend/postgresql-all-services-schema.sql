\set ON_ERROR_STOP on

-- Bootstrap script for all backend PostgreSQL databases in this repo.
-- Run with psql as a superuser or a role allowed to create databases:
--   psql -U postgres -d postgres -f backend/postgresql-all-services-schema.sql

SELECT 'CREATE DATABASE fawnix_analytics'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fawnix_analytics')\gexec
SELECT 'CREATE DATABASE fawnix_approval'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fawnix_approval')\gexec
SELECT 'CREATE DATABASE fawnix_crm'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fawnix_crm')\gexec
SELECT 'CREATE DATABASE fawnix_forms'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fawnix_forms')\gexec
SELECT 'CREATE DATABASE fawnix_hrms'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fawnix_hrms')\gexec
SELECT 'CREATE DATABASE fawnix_identity'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fawnix_identity')\gexec
SELECT 'CREATE DATABASE fawnix_integration'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fawnix_integration')\gexec
SELECT 'CREATE DATABASE fawnix_inventory'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fawnix_inventory')\gexec
SELECT 'CREATE DATABASE fawnix_notifications'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fawnix_notifications')\gexec
SELECT 'CREATE DATABASE fawnix_org'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fawnix_org')\gexec
SELECT 'CREATE DATABASE fawnix_recruitment'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fawnix_recruitment')\gexec
SELECT 'CREATE DATABASE fawnix_sales'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fawnix_sales')\gexec

-- analytics-service
\connect fawnix_analytics
-- Baseline schema for analytics-service (no persistent tables yet)

-- approval-service
\connect fawnix_approval
create table if not exists approval_flows (
  id uuid primary key,
  name varchar(255) not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz
);

create table if not exists approval_flow_stages (
  id uuid primary key,
  flow_id uuid not null,
  order_index integer not null,
  role varchar(255),
  approver_user_id uuid,
  action_label varchar(255),
  created_at timestamptz
);

create index if not exists idx_approval_flow_stages_flow_id on approval_flow_stages(flow_id);

create table if not exists approval_requests (
  id uuid primary key,
  flow_id uuid,
  module varchar(100) not null,
  entity_type varchar(100) not null,
  entity_id varchar(255) not null,
  title varchar(255) not null,
  summary text,
  requester_id varchar(255) not null,
  requester_name varchar(255),
  requested_at timestamptz,
  status varchar(50) not null,
  priority varchar(50),
  due_at timestamptz,
  current_stage_id uuid,
  payload_snapshot jsonb,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists approval_request_stages (
  id uuid primary key,
  request_id uuid not null,
  stage_order integer not null,
  status varchar(50) not null,
  due_at timestamptz,
  sla_days integer,
  requires_all boolean default true,
  role varchar(255),
  approver_user_id varchar(255),
  action_label varchar(255),
  created_at timestamptz,
  completed_at timestamptz
);

create table if not exists approval_request_assignments (
  id uuid primary key,
  request_stage_id uuid not null,
  assignee_type varchar(20) not null,
  assignee_value varchar(255) not null,
  status varchar(50) not null,
  acted_at timestamptz
);

create table if not exists approval_actions (
  id uuid primary key,
  request_id uuid not null,
  stage_id uuid,
  actor_id varchar(255),
  action_type varchar(50) not null,
  previous_status varchar(50),
  new_status varchar(50),
  comment text,
  created_at timestamptz
);

alter table approval_flows add column if not exists version varchar(20) default 'v1.0';
alter table approval_flows add column if not exists status varchar(20) default 'active';
alter table approval_flows add column if not exists updated_at timestamptz;

alter table approval_flow_stages add column if not exists requires_all boolean default true;
alter table approval_flow_stages add column if not exists sla_days integer;
alter table approval_flow_stages add column if not exists updated_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_approval_flow_stages_flow_id'
  ) then
    alter table approval_flow_stages
      add constraint fk_approval_flow_stages_flow_id
      foreign key (flow_id) references approval_flows(id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_approval_requests_flow_id'
  ) then
    alter table approval_requests
      add constraint fk_approval_requests_flow_id
      foreign key (flow_id) references approval_flows(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_approval_requests_current_stage_id'
  ) then
    alter table approval_requests
      add constraint fk_approval_requests_current_stage_id
      foreign key (current_stage_id) references approval_request_stages(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_approval_request_stages_request_id'
  ) then
    alter table approval_request_stages
      add constraint fk_approval_request_stages_request_id
      foreign key (request_id) references approval_requests(id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_approval_request_assignments_stage_id'
  ) then
    alter table approval_request_assignments
      add constraint fk_approval_request_assignments_stage_id
      foreign key (request_stage_id) references approval_request_stages(id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_approval_actions_request_id'
  ) then
    alter table approval_actions
      add constraint fk_approval_actions_request_id
      foreign key (request_id) references approval_requests(id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_approval_actions_stage_id'
  ) then
    alter table approval_actions
      add constraint fk_approval_actions_stage_id
      foreign key (stage_id) references approval_request_stages(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_approval_requests_status on approval_requests(status);
create index if not exists idx_approval_requests_requester on approval_requests(requester_id);
create index if not exists idx_approval_requests_module_entity on approval_requests(module, entity_type, entity_id);
create index if not exists idx_approval_requests_due_at on approval_requests(due_at);
create index if not exists idx_approval_request_stages_request_id on approval_request_stages(request_id);
create index if not exists idx_approval_request_stages_status on approval_request_stages(status);
create index if not exists idx_approval_request_stages_due_at on approval_request_stages(due_at);
create index if not exists idx_approval_request_assignments_stage_id on approval_request_assignments(request_stage_id);
create index if not exists idx_approval_request_assignments_assignee on approval_request_assignments(assignee_value);
create index if not exists idx_approval_request_assignments_status on approval_request_assignments(status);
create index if not exists idx_approval_actions_request_id on approval_actions(request_id);
create index if not exists idx_approval_actions_actor_id on approval_actions(actor_id);

alter table approval_request_stages
  add column if not exists overdue_notified_at timestamptz;

create index if not exists idx_approval_request_stages_overdue_notified_at
  on approval_request_stages(overdue_notified_at);

-- crm-service
\connect fawnix_crm
create table if not exists leads (
  id varchar(36) primary key,
  name varchar(160) not null,
  company varchar(160) not null,
  email varchar(160),
  phone varchar(50),
  source varchar(40) not null,
  status varchar(40) not null,
  priority varchar(40) not null,
  assigned_to_user_id varchar(36),
  assigned_to_name varchar(120),
  estimated_value numeric(14, 2) not null default 0,
  notes text not null default '',
  last_contacted_at timestamptz,
  converted_at timestamptz,
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  updated_by_user_id varchar(36),
  updated_by_name varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_priority on leads(priority);
create index if not exists idx_leads_source on leads(source);
create index if not exists idx_leads_assigned_user on leads(assigned_to_user_id);
create index if not exists idx_leads_created_at on leads(created_at desc);

create table if not exists lead_tags (
  id varchar(36) primary key,
  lead_id varchar(36) not null references leads(id) on delete cascade,
  tag_value varchar(80) not null,
  created_at timestamptz not null default now(),
  constraint uk_lead_tag unique (lead_id, tag_value)
);

create table if not exists lead_remarks (
  id varchar(36) primary key,
  lead_id varchar(36) not null references leads(id) on delete cascade,
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  updated_by_user_id varchar(36),
  updated_by_name varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lead_remarks_lead on lead_remarks(lead_id);

create table if not exists lead_remark_versions (
  id varchar(36) primary key,
  remark_id varchar(36) not null references lead_remarks(id) on delete cascade,
  content text not null,
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_remark_versions_remark on lead_remark_versions(remark_id);

create table if not exists lead_activities (
  id varchar(36) primary key,
  lead_id varchar(36) not null references leads(id) on delete cascade,
  activity_type varchar(50) not null,
  content text not null,
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_activities_lead on lead_activities(lead_id);
create index if not exists idx_lead_activities_created_at on lead_activities(created_at desc);

create table if not exists lead_contact_recordings (
  id varchar(36) primary key,
  lead_id varchar(36) not null references leads(id) on delete cascade,
  audio_file_name varchar(255) not null,
  audio_content_type varchar(120),
  audio_size bigint not null,
  audio_storage_path varchar(500) not null,
  transcript text not null,
  remarks_summary text not null,
  conversation_summary text,
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  contacted_at timestamptz not null,
  created_at timestamptz not null
);

create index if not exists idx_lead_contact_recordings_lead on lead_contact_recordings(lead_id);

create table if not exists lead_status_history (
  id varchar(36) primary key,
  lead_id varchar(36) not null references leads(id) on delete cascade,
  from_status varchar(40),
  to_status varchar(40) not null,
  changed_by_user_id varchar(36),
  changed_by_name varchar(120),
  changed_at timestamptz not null default now()
);

create index if not exists idx_lead_status_history_lead on lead_status_history(lead_id);
create index if not exists idx_lead_status_history_changed_at on lead_status_history(changed_at desc);

alter table leads
  add column if not exists follow_up_at timestamptz,
  add column if not exists follow_up_reminder_sent_at timestamptz;

create index if not exists idx_leads_follow_up_at on leads(follow_up_at);

create table if not exists meta_lead_ingestions (
  id varchar(36) primary key,
  leadgen_id varchar(64) not null unique,
  lead_id varchar(36),
  page_id varchar(64),
  form_id varchar(64),
  ad_id varchar(64),
  payload text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_meta_lead_ingestions_leadgen on meta_lead_ingestions(leadgen_id);

alter table leads
  add column if not exists whatsapp_questionnaire_sent_at timestamptz;

create index if not exists idx_leads_whatsapp_questionnaire_sent_at
  on leads(whatsapp_questionnaire_sent_at);

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

create table if not exists meta_integration_settings (
  id varchar(40) primary key,
  access_token text,
  form_id varchar(120),
  updated_at timestamptz not null default now()
);

alter table meta_integration_settings
  add column if not exists verify_token text,
  add column if not exists app_secret text;

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

create table if not exists lead_schedules (
  id varchar(36) primary key,
  lead_id varchar(36) not null references leads(id) on delete cascade,
  type varchar(20) not null,
  status varchar(20) not null,
  scheduled_at timestamptz not null,
  location varchar(200),
  mode varchar(20),
  notes text,
  assigned_to_user_id varchar(36),
  assigned_to_name varchar(120),
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  updated_by_user_id varchar(36),
  updated_by_name varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lead_schedules_lead on lead_schedules(lead_id);
create index if not exists idx_lead_schedules_scheduled_at on lead_schedules(scheduled_at);

alter table leads
  add column if not exists external_lead_id varchar(120),
  add column if not exists source_month varchar(40),
  add column if not exists source_date varchar(40),
  add column if not exists alternative_phone varchar(50),
  add column if not exists project_stage varchar(160),
  add column if not exists expected_timeline varchar(160),
  add column if not exists property_type varchar(160),
  add column if not exists sqft varchar(40),
  add column if not exists community varchar(160),
  add column if not exists project_location varchar(160),
  add column if not exists project_state varchar(160),
  add column if not exists presales_response varchar(160),
  add column if not exists demo_visit varchar(160),
  add column if not exists presales_remarks text,
  add column if not exists ad_set_name varchar(160),
  add column if not exists campaign_name varchar(160),
  add column if not exists meta_lead_id varchar(64),
  add column if not exists meta_form_id varchar(64),
  add column if not exists meta_ad_id varchar(64),
  add column if not exists source_created_at timestamp;

alter table if exists whatsapp_integration_settings
  add column if not exists assign_template_name varchar(120);

alter table if exists whatsapp_integration_settings
  add column if not exists assign_template_language varchar(20);

create table if not exists accounts (
  id varchar(36) primary key,
  name varchar(160) not null,
  industry varchar(120),
  website varchar(200),
  address text,
  owner_user_id varchar(36),
  created_at timestamp not null,
  updated_at timestamp not null
);

create table if not exists contacts (
  id varchar(36) primary key,
  account_id varchar(36),
  name varchar(160) not null,
  email varchar(160),
  phone varchar(50),
  title varchar(120),
  source varchar(40),
  created_at timestamp not null,
  updated_at timestamp not null
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_contacts_account'
  ) then
    alter table contacts
      add constraint fk_contacts_account
      foreign key (account_id) references accounts(id) on delete set null;
  end if;
end $$;

create table if not exists deals (
  id varchar(36) primary key,
  name varchar(160) not null,
  account_id varchar(36),
  contact_id varchar(36),
  lead_id varchar(36),
  stage varchar(40) not null,
  value numeric(14,2) not null,
  probability integer,
  expected_close_at timestamp,
  owner_user_id varchar(36),
  created_at timestamp not null,
  updated_at timestamp not null
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_deals_account'
  ) then
    alter table deals
      add constraint fk_deals_account
      foreign key (account_id) references accounts(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_deals_contact'
  ) then
    alter table deals
      add constraint fk_deals_contact
      foreign key (contact_id) references contacts(id) on delete set null;
  end if;
end $$;

create index if not exists idx_contacts_account_id on contacts(account_id);
create index if not exists idx_contacts_source on contacts(source);
create index if not exists idx_deals_stage on deals(stage);
create index if not exists idx_deals_owner on deals(owner_user_id);

alter table lead_status_history
  add column if not exists note text;

-- forms-service
\connect fawnix_forms
create table if not exists application_forms (
  id uuid primary key,
  name varchar(255) not null,
  description text,
  position_id varchar(255),
  module varchar(100) not null,
  owner varchar(255),
  visibility jsonb,
  tags jsonb,
  version varchar(50),
  collection_id varchar(255),
  status varchar(50),
  public_slug varchar(255),
  created_by varchar(255),
  created_at timestamptz,
  updated_at timestamptz
);

create unique index if not exists ux_application_forms_public_slug on application_forms(public_slug);

create table if not exists application_form_fields (
  id uuid primary key,
  form_id uuid not null,
  field_key varchar(255) not null,
  label varchar(255) not null,
  type varchar(50) not null,
  required boolean not null default false,
  options jsonb,
  config jsonb,
  order_index integer,
  created_at timestamptz
);

create index if not exists idx_application_form_fields_form_id on application_form_fields(form_id);

create table if not exists application_form_templates (
  id uuid primary key,
  name varchar(255) not null,
  description text,
  fields jsonb not null,
  created_by varchar(255),
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists application_form_collections (
  id uuid primary key,
  name varchar(255) not null,
  description text,
  module varchar(100) not null,
  owner varchar(255),
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists application_form_favorites (
  id uuid primary key,
  user_id varchar(255) not null,
  template_id varchar(255) not null,
  created_at timestamptz
);

create table if not exists application_form_links (
  id uuid primary key,
  form_id varchar(255) not null,
  candidate_name varchar(255) not null,
  candidate_email varchar(255) not null,
  module varchar(100),
  status varchar(50),
  url varchar(500) not null,
  expires_at timestamptz,
  created_at timestamptz,
  last_sent_at timestamptz
);

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

-- hrms-service
\connect fawnix_hrms
-- Baseline schema for hrms-service (no persistent tables yet)

-- identity-service
\connect fawnix_identity
create table if not exists roles (
  id varchar(36) primary key,
  name varchar(50) not null unique,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id varchar(36) primary key,
  full_name varchar(120) not null,
  email varchar(160) not null unique,
  password_hash varchar(255) not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_roles (
  user_id varchar(36) not null references users(id) on delete cascade,
  role_id varchar(36) not null references roles(id) on delete cascade,
  primary key (user_id, role_id)
);

create table if not exists auth_refresh_tokens (
  id varchar(36) primary key,
  user_id varchar(36) not null references users(id) on delete cascade,
  token varchar(255) not null unique,
  expires_at timestamptz not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table if exists users
  add column if not exists phone_number varchar(40);

alter table users
  add column if not exists language varchar(40);

create table if not exists user_permissions (
  user_id varchar(36) not null references users(id) on delete cascade,
  permission varchar(100) not null,
  primary key (user_id, permission)
);

insert into roles (id, name, created_at) values
  ('00000000-0000-0000-0000-000000000001', 'ROLE_ADMIN', now()),
  ('00000000-0000-0000-0000-000000000002', 'ROLE_SALES_MANAGER', now()),
  ('00000000-0000-0000-0000-000000000003', 'ROLE_SALES_REP', now()),
  ('00000000-0000-0000-0000-000000000004', 'ROLE_VIEWER', now())
on conflict (name) do nothing;

insert into roles (id, name, created_at) values
  ('00000000-0000-0000-0000-000000000005', 'ROLE_HR_MANAGER', now()),
  ('00000000-0000-0000-0000-000000000006', 'ROLE_RECRUITER', now()),
  ('00000000-0000-0000-0000-000000000007', 'ROLE_HIRING_MANAGER', now()),
  ('00000000-0000-0000-0000-000000000008', 'ROLE_INTERVIEWER', now()),
  ('00000000-0000-0000-0000-000000000009', 'ROLE_EMPLOYEE', now())
on conflict (name) do nothing;

insert into roles (id, name, created_at)
values ('00000000-0000-0000-0000-000000000010', 'ROLE_REPORTING_MANAGER', now())
on conflict (name) do nothing;

-- integration-service
\connect fawnix_integration
create table if not exists calendar_connections (
  id uuid primary key,
  user_id varchar(255) not null,
  provider varchar(50) not null,
  account_email varchar(255),
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scopes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists ux_calendar_connections_user_provider
  on calendar_connections (user_id, provider);

create table if not exists calendar_oauth_states (
  state varchar(64) primary key,
  provider varchar(50) not null,
  user_id varchar(255) not null,
  return_url text,
  created_at timestamptz default now()
);

create table if not exists portal_credentials (
  id uuid primary key,
  platform varchar(50) not null unique,
  client_id text,
  client_secret text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  account_name varchar(255),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- inventory-service
\connect fawnix_inventory
create table if not exists service_metadata (
  service_name varchar(100) primary key,
  bootstrapped_at timestamp not null default current_timestamp
);

insert into service_metadata (service_name, bootstrapped_at)
values ('inventory-service', current_timestamp)
on conflict (service_name)
do update set bootstrapped_at = excluded.bootstrapped_at;

create table if not exists products (
  id varchar(36) primary key,
  sku varchar(30) not null unique,
  product_name varchar(200) not null,
  category varchar(60) not null,
  sub_category varchar(60),
  brand varchar(60),
  unit varchar(20) not null default 'pcs',
  reorder_level numeric(12, 2) not null default 0,
  description text,
  hsn_code varchar(30),
  notes text,
  price numeric(14, 2) not null default 0,
  stock_qty numeric(14, 2) not null default 0,
  status varchar(20) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category on products(category);
create index if not exists idx_products_status on products(status);
create index if not exists idx_products_name on products(product_name);

create table if not exists stock_transactions (
  id varchar(36) primary key,
  product_id varchar(36) not null references products(id) on delete restrict,
  txn_ref varchar(60) not null,
  txn_date date not null,
  txn_type varchar(20) not null,
  vendor_name varchar(160) not null,
  qty numeric(14, 2) not null default 0,
  unit_price numeric(14, 2),
  line_total numeric(14, 2),
  project_ref varchar(120),
  issued_by varchar(120),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_txn_product on stock_transactions(product_id);
create index if not exists idx_stock_txn_date on stock_transactions(txn_date desc);

-- notifications-service
\connect fawnix_notifications
create table if not exists notifications (
  id uuid primary key,
  tenant_id varchar(255),
  module varchar(255) not null,
  event_type varchar(255) not null,
  title varchar(255),
  body_text text,
  body_html text,
  template_key varchar(255),
  template_variables text,
  deeplink_url text,
  priority varchar(50) not null,
  locale varchar(50),
  idempotency_key varchar(255),
  created_at timestamptz default now()
);

create unique index if not exists ux_notifications_tenant_idempotency
  on notifications (tenant_id, idempotency_key);

create table if not exists notification_recipients (
  id uuid primary key,
  notification_id uuid not null,
  user_id uuid,
  email varchar(255),
  channels varchar(255) not null,
  status varchar(50) not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists ix_notification_recipients_user
  on notification_recipients (user_id);
create index if not exists ix_notification_recipients_notification
  on notification_recipients (notification_id);

create table if not exists notification_attempts (
  id uuid primary key,
  recipient_id uuid not null,
  channel varchar(50) not null,
  status varchar(50) not null,
  error text,
  retry_count integer,
  next_retry_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists ix_notification_attempts_recipient
  on notification_attempts (recipient_id);

create table if not exists notification_outbox (
  id uuid primary key,
  notification_id uuid not null,
  recipient_id uuid not null,
  channel varchar(50) not null,
  status varchar(50) not null,
  attempts integer,
  next_retry_at timestamptz,
  last_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists ix_notification_outbox_status
  on notification_outbox (status);
create index if not exists ix_notification_outbox_recipient
  on notification_outbox (recipient_id);

create table if not exists notification_dead_letter (
  id uuid primary key,
  outbox_id uuid not null,
  reason text,
  payload text,
  created_at timestamptz default now()
);

create index if not exists ix_notification_dead_letter_outbox
  on notification_dead_letter (outbox_id);

create table if not exists notification_preferences (
  id uuid primary key,
  user_id uuid not null,
  channel varchar(50) not null,
  enabled boolean not null default true,
  quiet_hours_start varchar(10),
  quiet_hours_end varchar(10),
  locale varchar(50),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists ux_notification_preferences_user_channel
  on notification_preferences (user_id, channel);

create table if not exists notification_templates (
  id uuid primary key,
  template_key varchar(255) not null,
  channel varchar(50) not null,
  subject varchar(255),
  html_body text,
  text_body text,
  variables_schema text,
  version integer default 1,
  locale varchar(50),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists ux_notification_templates_key_channel_locale
  on notification_templates (template_key, channel, locale);

create table if not exists notification_subscriptions (
  id uuid primary key,
  user_id uuid not null,
  endpoint text not null,
  p256dh text,
  auth text,
  expiration_time bigint,
  created_at timestamptz default now()
);

create unique index if not exists ux_notification_subscriptions_user_endpoint
  on notification_subscriptions (user_id, endpoint);

-- org-service
\connect fawnix_org
create table if not exists business_units (
  id uuid primary key,
  name varchar(255) not null,
  owner varchar(255),
  created_at timestamptz
);

create table if not exists company_profile (
  id uuid primary key,
  name varchar(255) not null,
  legal_entity varchar(255) not null,
  country varchar(255) not null,
  timezone varchar(255) not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists departments (
  id uuid primary key,
  name varchar(255) not null,
  head_name varchar(255),
  created_at timestamptz
);

create table if not exists designations (
  id uuid primary key,
  name varchar(255) not null,
  created_at timestamptz
);

create table if not exists locations (
  id uuid primary key,
  name varchar(255) not null,
  created_at timestamptz
);

create table if not exists org_nodes (
  id uuid primary key,
  name varchar(255) not null,
  role varchar(255) not null,
  department varchar(255) not null,
  manager_id uuid,
  level integer not null default 0,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists org_units (
  id uuid primary key,
  name varchar(255) not null,
  created_at timestamptz
);

create table if not exists policies (
  id uuid primary key,
  name varchar(255) not null,
  status varchar(50) not null,
  owner varchar(255),
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists role_mappings (
  id uuid primary key,
  role varchar(255) not null,
  department varchar(255) not null,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists setup_config (
  id uuid primary key,
  activate boolean not null default false,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists setup_employees (
  id uuid primary key,
  name varchar(255) not null,
  email varchar(255) not null,
  department varchar(255),
  role varchar(255),
  manager varchar(255),
  created_at timestamptz
);

create table if not exists teams (
  id uuid primary key,
  name varchar(255) not null,
  department varchar(255) not null,
  created_at timestamptz
);

create table if not exists vacancies (
  id uuid primary key,
  role varchar(255) not null,
  department varchar(255) not null,
  headcount integer not null default 0,
  filled integer not null default 0,
  status varchar(50) not null,
  created_at timestamptz,
  updated_at timestamptz
);

-- recruitment-service
\connect fawnix_recruitment
create table if not exists hiring_requests (
  id uuid primary key,
  job_title varchar(255) not null,
  department_id varchar(255),
  approval_flow_id varchar(255),
  hiring_manager_id varchar(255),
  description text,
  skills jsonb,
  qualifications text,
  experience_years integer,
  salary_min numeric,
  salary_max numeric,
  headcount integer default 1,
  priority varchar(50),
  expected_date date,
  status varchar(50),
  requested_by varchar(255),
  notes text,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists approvals (
  id uuid primary key,
  hiring_request_id uuid,
  approver_id varchar(255),
  level integer,
  role varchar(100),
  status varchar(50),
  comments text,
  decided_at timestamptz,
  created_at timestamptz
);

create index if not exists idx_approvals_hiring_request_id on approvals(hiring_request_id);

create table if not exists job_positions (
  id uuid primary key,
  hiring_request_id uuid,
  title varchar(255) not null,
  department_id varchar(255),
  assigned_recruiter_id varchar(255),
  level varchar(100),
  hiring_manager_id varchar(255),
  headcount integer,
  target_start_date date,
  budget numeric,
  approval_flow_id varchar(255),
  application_form_id varchar(255),
  interview_rounds text,
  status varchar(50),
  created_at timestamptz
);

create index if not exists idx_job_positions_hiring_request_id on job_positions(hiring_request_id);

create table if not exists job_postings (
  id uuid primary key,
  position_id uuid,
  title varchar(255) not null,
  description text,
  requirements text,
  location varchar(255),
  job_type varchar(100),
  work_mode varchar(100),
  salary_range varchar(255),
  status varchar(50),
  platforms jsonb,
  deadline date,
  published_at timestamptz,
  created_at timestamptz
);

create index if not exists idx_job_postings_position_id on job_postings(position_id);

create table if not exists posting_platforms (
  id uuid primary key,
  posting_id uuid,
  platform varchar(100) not null,
  status varchar(50),
  external_id varchar(255),
  external_url varchar(500),
  posted_at timestamptz,
  error_message text,
  created_at timestamptz,
  updated_at timestamptz
);

create index if not exists idx_posting_platforms_posting_id on posting_platforms(posting_id);

create table if not exists candidates (
  id uuid primary key,
  full_name varchar(255) not null,
  email varchar(255) not null,
  phone varchar(100),
  location varchar(255),
  linkedin_url varchar(500),
  portfolio_url varchar(500),
  resume_url varchar(500),
  skills jsonb,
  experience_years integer,
  current_company varchar(255),
  current_title varchar(255),
  education jsonb,
  tags jsonb,
  source varchar(100),
  notes text,
  ai_match_score integer,
  is_in_talent_pool boolean default false,
  created_at timestamptz,
  updated_at timestamptz
);

create unique index if not exists ux_candidates_email on candidates(email);

create table if not exists candidate_applications (
  id uuid primary key,
  candidate_id uuid,
  position_id uuid,
  status varchar(50),
  cover_letter text,
  salary_expectation numeric,
  notice_period_days integer,
  consent_given boolean,
  applied_at timestamptz,
  updated_at timestamptz,
  rejection_reason text,
  rejection_notes text,
  notes text
);

create index if not exists idx_candidate_applications_candidate_id on candidate_applications(candidate_id);
create index if not exists idx_candidate_applications_position_id on candidate_applications(position_id);

create table if not exists hr_screenings (
  id uuid primary key,
  application_id uuid,
  screened_by varchar(255),
  salary_expectation numeric,
  notice_period varchar(100),
  availability varchar(255),
  notes text,
  score integer,
  result varchar(100),
  screened_at timestamptz
);

create index if not exists idx_hr_screenings_application_id on hr_screenings(application_id);

create table if not exists interviews (
  id uuid primary key,
  application_id uuid,
  round_number integer,
  interview_type varchar(50),
  mode varchar(50),
  scheduled_at timestamptz,
  duration_minutes integer,
  location varchar(255),
  meeting_link varchar(500),
  calendar_provider varchar(100),
  calendar_event_id varchar(255),
  status varchar(50),
  created_at timestamptz
);

create index if not exists idx_interviews_application_id on interviews(application_id);

create table if not exists interview_panels (
  id uuid primary key,
  interview_id uuid,
  interviewer_id varchar(255),
  role varchar(100)
);

create index if not exists idx_interview_panels_interview_id on interview_panels(interview_id);

create table if not exists interview_feedback (
  id uuid primary key,
  interview_id uuid,
  interviewer_id varchar(255),
  technical_score integer,
  communication_score integer,
  cultural_score integer,
  overall_score integer,
  strengths text,
  weaknesses text,
  notes text,
  recommendation varchar(100),
  submitted_at timestamptz
);

create index if not exists idx_interview_feedback_interview_id on interview_feedback(interview_id);

create table if not exists offers (
  id uuid primary key,
  application_id uuid,
  created_by varchar(255),
  approval_flow_id varchar(255),
  base_salary numeric,
  bonus numeric,
  equity varchar(255),
  benefits text,
  joining_date date,
  offer_expiry date,
  terms text,
  status varchar(50),
  candidate_response varchar(100),
  candidate_notes text,
  responded_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);

create index if not exists idx_offers_application_id on offers(application_id);

create table if not exists offer_approvals (
  id uuid primary key,
  offer_id uuid,
  approver_id varchar(255),
  level integer,
  status varchar(50),
  comments text,
  decided_at timestamptz
);

create index if not exists idx_offer_approvals_offer_id on offer_approvals(offer_id);

create table if not exists application_form_submissions (
  id uuid primary key,
  form_id varchar(255) not null,
  form_name varchar(255),
  candidate_id uuid not null,
  application_id uuid not null,
  answers jsonb not null,
  resume_url varchar(500),
  submitted_at timestamptz,
  source varchar(100)
);

create index if not exists idx_form_submissions_candidate_id on application_form_submissions(candidate_id);
create index if not exists idx_form_submissions_application_id on application_form_submissions(application_id);

alter table hiring_requests add column if not exists approval_request_id varchar(255);
alter table offers add column if not exists approval_request_id varchar(255);

create index if not exists idx_hiring_requests_approval_request_id on hiring_requests(approval_request_id);
create index if not exists idx_offers_approval_request_id on offers(approval_request_id);

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

-- sales-service
\connect fawnix_sales
create table if not exists service_metadata (
  service_name varchar(100) primary key,
  bootstrapped_at timestamp not null default current_timestamp
);

insert into service_metadata (service_name, bootstrapped_at)
values ('sales-service', current_timestamp)
on conflict (service_name)
do update set bootstrapped_at = excluded.bootstrapped_at;

create table if not exists quotes (
  id varchar(36) primary key,
  quote_number varchar(32) not null unique,
  lead_id varchar(36),
  customer_name varchar(160) not null,
  company varchar(160),
  email varchar(160),
  phone varchar(50),
  billing_address text,
  shipping_address text,
  currency varchar(10) not null,
  status varchar(40) not null,
  discount_type varchar(20),
  discount_value numeric(12, 2),
  tax_rate numeric(5, 2),
  subtotal numeric(14, 2) not null default 0,
  discount_total numeric(14, 2) not null default 0,
  tax_total numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  valid_until timestamptz,
  notes text,
  terms text,
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  updated_by_user_id varchar(36),
  updated_by_name varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quotes_status on quotes(status);
create index if not exists idx_quotes_customer on quotes(customer_name);
create index if not exists idx_quotes_created_at on quotes(created_at desc);

create table if not exists quote_items (
  id varchar(36) primary key,
  quote_id varchar(36) not null references quotes(id) on delete cascade,
  position int not null,
  name varchar(160) not null,
  description text,
  quantity numeric(12, 2) not null default 0,
  unit varchar(40),
  unit_price numeric(14, 2) not null default 0,
  line_total numeric(14, 2) not null default 0
);

create index if not exists idx_quote_items_quote on quote_items(quote_id);

alter table quote_items
  add column if not exists inventory_product_id varchar(36),
  add column if not exists make varchar(120),
  add column if not exists utility text;

create index if not exists idx_quote_items_inventory on quote_items(inventory_product_id);
