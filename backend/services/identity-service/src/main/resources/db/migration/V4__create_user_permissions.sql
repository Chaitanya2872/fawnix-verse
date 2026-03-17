create table if not exists user_permissions (
  user_id varchar(36) not null references users(id) on delete cascade,
  permission varchar(100) not null,
  primary key (user_id, permission)
);
