create table tasks (
  id varchar(64) primary key,
  task_code varchar(32) not null unique,
  title varchar(200) not null,
  description text,
  priority varchar(30) not null,
  status varchar(30) not null,
  approval_status varchar(30) not null,
  visibility varchar(30) not null,
  approval_required boolean not null default false,
  workflow_name varchar(120),
  project_ref varchar(120),
  module_ref varchar(120),
  assigned_by_id varchar(64),
  assigned_by_name varchar(160),
  assigned_to_id varchar(64),
  assigned_to_name varchar(160),
  assigned_to_email varchar(200),
  assigned_team_name varchar(160),
  approver_id varchar(64),
  approver_name varchar(160),
  created_by_id varchar(64) not null,
  created_by_name varchar(160) not null,
  estimated_hours numeric(10,2),
  actual_hours numeric(10,2),
  reminder_minutes_before integer,
  start_date date,
  due_date date,
  completion_date date,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table task_assignments (
  id varchar(64) primary key,
  task_id varchar(64) not null references tasks(id) on delete cascade,
  assigned_by_id varchar(64) not null,
  assigned_by_name varchar(160) not null,
  assigned_to_id varchar(64) not null,
  assigned_to_name varchar(160) not null,
  assigned_to_email varchar(200),
  assigned_team_name varchar(160),
  active boolean not null default true,
  assigned_at timestamptz not null,
  ended_at timestamptz
);

create table task_comments (
  id varchar(64) primary key,
  task_id varchar(64) not null references tasks(id) on delete cascade,
  author_id varchar(64) not null,
  author_name varchar(160) not null,
  message text not null,
  created_at timestamptz not null
);

create table task_attachments (
  id varchar(64) primary key,
  task_id varchar(64) not null references tasks(id) on delete cascade,
  file_name varchar(255) not null,
  file_url varchar(500) not null,
  content_type varchar(120),
  file_size bigint,
  uploaded_by_id varchar(64),
  uploaded_by_name varchar(160),
  created_at timestamptz not null
);

create table task_checklists (
  id varchar(64) primary key,
  task_id varchar(64) not null references tasks(id) on delete cascade,
  label varchar(220) not null,
  completed boolean not null default false,
  completed_by_id varchar(64),
  completed_by_name varchar(160),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table task_activity_logs (
  id varchar(64) primary key,
  task_id varchar(64) not null references tasks(id) on delete cascade,
  activity_type varchar(40) not null,
  actor_id varchar(64),
  actor_name varchar(160),
  message text not null,
  created_at timestamptz not null
);

create table task_time_logs (
  id varchar(64) primary key,
  task_id varchar(64) not null references tasks(id) on delete cascade,
  user_id varchar(64) not null,
  user_name varchar(160) not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_hours numeric(10,2),
  note text,
  created_at timestamptz not null
);

create table task_dependencies (
  id varchar(64) primary key,
  task_id varchar(64) not null references tasks(id) on delete cascade,
  depends_on_task_id varchar(64) not null,
  depends_on_task_code varchar(32),
  depends_on_title varchar(200),
  created_at timestamptz not null
);

create table task_tags (
  id varchar(64) primary key,
  task_id varchar(64) not null references tasks(id) on delete cascade,
  name varchar(80) not null,
  created_at timestamptz not null
);

create index idx_tasks_status on tasks(status);
create index idx_tasks_priority on tasks(priority);
create index idx_tasks_due_date on tasks(due_date);
create index idx_tasks_assigned_to_id on tasks(assigned_to_id);
create index idx_tasks_created_by_id on tasks(created_by_id);
create index idx_tasks_project_ref on tasks(project_ref);
create index idx_tasks_module_ref on tasks(module_ref);
create index idx_task_assignments_task_active on task_assignments(task_id, active);
create index idx_task_comments_task_created_at on task_comments(task_id, created_at);
create index idx_task_activity_logs_task_created_at on task_activity_logs(task_id, created_at);
create index idx_task_time_logs_task_user on task_time_logs(task_id, user_id);
create index idx_task_checklists_task on task_checklists(task_id);
create index idx_task_tags_task on task_tags(task_id);
create index idx_task_dependencies_task on task_dependencies(task_id);
