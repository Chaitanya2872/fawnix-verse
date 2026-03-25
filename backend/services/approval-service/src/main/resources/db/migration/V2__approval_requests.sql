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

alter table approval_flow_stages
  add constraint fk_approval_flow_stages_flow_id
  foreign key (flow_id) references approval_flows(id)
  on delete cascade;

alter table approval_requests
  add constraint fk_approval_requests_flow_id
  foreign key (flow_id) references approval_flows(id)
  on delete set null;

alter table approval_requests
  add constraint fk_approval_requests_current_stage_id
  foreign key (current_stage_id) references approval_request_stages(id)
  on delete set null;

alter table approval_request_stages
  add constraint fk_approval_request_stages_request_id
  foreign key (request_id) references approval_requests(id)
  on delete cascade;

alter table approval_request_assignments
  add constraint fk_approval_request_assignments_stage_id
  foreign key (request_stage_id) references approval_request_stages(id)
  on delete cascade;

alter table approval_actions
  add constraint fk_approval_actions_request_id
  foreign key (request_id) references approval_requests(id)
  on delete cascade;

alter table approval_actions
  add constraint fk_approval_actions_stage_id
  foreign key (stage_id) references approval_request_stages(id)
  on delete set null;

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
