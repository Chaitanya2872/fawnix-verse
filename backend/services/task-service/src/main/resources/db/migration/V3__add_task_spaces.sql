create table if not exists task_spaces (
  id varchar(64) primary key,
  space_key varchar(80) not null unique,
  name varchar(160) not null,
  description text,
  icon_name varchar(80),
  color_hex varchar(20),
  visibility varchar(30) not null,
  owner_user_id varchar(64) not null,
  owner_user_name varchar(160) not null,
  archived boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists task_space_members (
  id varchar(64) primary key,
  space_id varchar(64) not null references task_spaces(id) on delete cascade,
  user_id varchar(64) not null,
  user_name varchar(160) not null,
  user_email varchar(200),
  role varchar(40) not null,
  active boolean not null default true,
  invited_by_id varchar(64),
  invited_by_name varchar(160),
  joined_at timestamptz not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists task_space_invitations (
  id varchar(64) primary key,
  space_id varchar(64) not null references task_spaces(id) on delete cascade,
  invitee_user_id varchar(64) not null,
  invitee_name varchar(160) not null,
  invitee_email varchar(200),
  invited_by_id varchar(64) not null,
  invited_by_name varchar(160) not null,
  role varchar(40) not null,
  status varchar(30) not null,
  message text,
  responded_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

alter table tasks add column if not exists space_id varchar(64);

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'fk_tasks_space'
      and table_name = 'tasks'
  ) then
    alter table tasks add constraint fk_tasks_space
      foreign key (space_id) references task_spaces(id) on delete set null;
  end if;
end $$;

create index if not exists idx_task_spaces_owner on task_spaces(owner_user_id);
create index if not exists idx_task_spaces_updated_at on task_spaces(updated_at);
create index if not exists idx_task_space_members_space_active on task_space_members(space_id, active);
create unique index if not exists ux_task_space_members_space_user_active on task_space_members(space_id, user_id, active);
create index if not exists idx_task_space_members_user_active on task_space_members(user_id, active);
create index if not exists idx_task_space_invitations_user_status on task_space_invitations(invitee_user_id, status);
create index if not exists idx_task_space_invitations_space_status on task_space_invitations(space_id, status);
create index if not exists idx_tasks_space_id on tasks(space_id);
