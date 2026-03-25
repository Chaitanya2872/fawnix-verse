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
