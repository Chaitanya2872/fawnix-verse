create table if not exists warehouses (
  id varchar(36) primary key,
  warehouse_code varchar(30) not null,
  warehouse_name varchar(160) not null,
  warehouse_type varchar(60),
  address_line_1 varchar(220),
  address_line_2 varchar(220),
  city varchar(80) not null,
  state varchar(80),
  postal_code varchar(20),
  country varchar(80) not null default 'India',
  manager_name varchar(120),
  contact_phone varchar(40),
  contact_email varchar(160),
  capacity numeric(14, 2) not null default 0,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_warehouses_code_lower on warehouses(lower(warehouse_code));
create index if not exists idx_warehouses_name on warehouses(warehouse_name);
create index if not exists idx_warehouses_city on warehouses(city);
create index if not exists idx_warehouses_active on warehouses(active);
