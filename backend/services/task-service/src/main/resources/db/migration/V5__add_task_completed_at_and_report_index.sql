alter table tasks add column if not exists completed_at timestamptz;

update tasks
set completed_at = coalesce(completed_at, completion_date::timestamp)
where completion_date is not null
  and completed_at is null;

create index if not exists idx_tasks_completed_at on tasks(completed_at);
create index if not exists idx_tasks_completion_date on tasks(completion_date);
