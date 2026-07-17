create table if not exists storage_locations (
  id varchar(36) primary key,
  warehouse_id varchar(36) not null references warehouses(id) on delete cascade,
  location_code varchar(40) not null,
  location_name varchar(160) not null,
  zone_name varchar(80),
  rack_name varchar(80),
  bin_name varchar(80),
  capacity numeric(14, 2) not null default 0,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_storage_locations_warehouse_code_lower
  on storage_locations(warehouse_id, lower(location_code));
create index if not exists idx_storage_locations_warehouse on storage_locations(warehouse_id);
create index if not exists idx_storage_locations_active on storage_locations(active);

create table if not exists product_storage_mappings (
  id varchar(36) primary key,
  product_id varchar(36) not null references products(id) on delete cascade,
  warehouse_id varchar(36) not null references warehouses(id) on delete restrict,
  storage_location_id varchar(36) not null references storage_locations(id) on delete restrict,
  quantity_on_hand numeric(14, 2) not null default 0,
  min_stock_level numeric(14, 2),
  max_stock_level numeric(14, 2),
  primary_mapping boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_product_storage_mapping_product_location
  on product_storage_mappings(product_id, storage_location_id);
create index if not exists idx_product_storage_mapping_product on product_storage_mappings(product_id);
create index if not exists idx_product_storage_mapping_warehouse on product_storage_mappings(warehouse_id);
