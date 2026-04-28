create table if not exists access_requests (
  id varchar(36) primary key,
  requester_user_id varchar(36) not null references users (id) on delete cascade,
  status varchar(32) not null,
  request_note varchar(1000),
  review_note varchar(1000),
  reviewed_by_user_id varchar(36) references users (id) on delete set null,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone not null,
  updated_at timestamp with time zone not null
);

create table if not exists access_request_permissions (
  access_request_id varchar(36) not null references access_requests (id) on delete cascade,
  permission varchar(120) not null,
  primary key (access_request_id, permission)
);
