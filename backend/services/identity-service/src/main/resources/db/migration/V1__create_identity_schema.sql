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
