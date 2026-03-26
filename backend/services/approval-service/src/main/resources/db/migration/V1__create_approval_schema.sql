create table if not exists approval_flows (
  id uuid primary key,
  name varchar(255) not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz
);

create table if not exists approval_flow_stages (
  id uuid primary key,
  flow_id uuid not null,
  order_index integer not null,
  role varchar(255),
  approver_user_id uuid,
  action_label varchar(255),
  created_at timestamptz
);

create index if not exists idx_approval_flow_stages_flow_id on approval_flow_stages(flow_id);
