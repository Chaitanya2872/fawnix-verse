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
