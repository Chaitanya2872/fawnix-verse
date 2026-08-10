create table if not exists visitor_requests (
  id varchar(36) primary key,
  visitor_id varchar(40) not null unique,
  visitor_full_name varchar(160) not null,
  email varchar(180) not null,
  whatsapp_mobile varchar(32) not null,
  company varchar(180),
  requested_by_employee_name varchar(160) not null,
  purpose_of_visit varchar(80) not null,
  other_purpose varchar(500),
  from_date_time timestamp not null,
  to_date_time timestamp not null,
  status varchar(32) not null default 'PENDING',
  arrived boolean not null default false,
  arrived_at timestamptz,
  departed_at timestamptz,
  qr_code_data text not null,
  qr_code_url text,
  face_registered boolean not null default false,
  face_poses integer not null default 0,
  face_pose_ids varchar(300),
  face_image_data text,
  gov_id_image_data text,
  registration_token varchar(80),
  rejection_reason varchar(1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_visitor_requests_status on visitor_requests(status);
create index if not exists idx_visitor_requests_visit_window on visitor_requests(from_date_time, to_date_time);
create index if not exists idx_visitor_requests_qr_code_data on visitor_requests(qr_code_data);
