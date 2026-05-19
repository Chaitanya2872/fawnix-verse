alter table tasks add column if not exists parent_task_id varchar(64);
alter table tasks add column if not exists hierarchy_level integer not null default 0;
alter table tasks add column if not exists task_path varchar(500) not null default '';
alter table tasks add column if not exists order_index bigint not null default 0;

update tasks
set task_path = case when task_path = '' then id else task_path end,
    hierarchy_level = coalesce(hierarchy_level, 0),
    order_index = coalesce(order_index, 0);

alter table task_dependencies add column if not exists relationship_type varchar(30) not null default 'DEPENDS_ON';

create index if not exists idx_tasks_parent_task_id on tasks(parent_task_id);
create index if not exists idx_tasks_task_path on tasks(task_path);
create index if not exists idx_tasks_parent_order on tasks(parent_task_id, order_index);
