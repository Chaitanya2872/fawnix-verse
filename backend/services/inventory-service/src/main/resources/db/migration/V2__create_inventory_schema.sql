create table if not exists products (
  id varchar(36) primary key,
  sku varchar(30) not null unique,
  product_name varchar(200) not null,
  category varchar(60) not null,
  sub_category varchar(60),
  brand varchar(60),
  unit varchar(20) not null default 'pcs',
  reorder_level numeric(12, 2) not null default 0,
  description text,
  hsn_code varchar(30),
  notes text,
  price numeric(14, 2) not null default 0,
  stock_qty numeric(14, 2) not null default 0,
  status varchar(20) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category on products(category);
create index if not exists idx_products_status on products(status);
create index if not exists idx_products_name on products(product_name);

create table if not exists stock_transactions (
  id varchar(36) primary key,
  product_id varchar(36) not null references products(id) on delete restrict,
  txn_ref varchar(60) not null,
  txn_date date not null,
  txn_type varchar(20) not null,
  vendor_name varchar(160) not null,
  qty numeric(14, 2) not null default 0,
  unit_price numeric(14, 2),
  line_total numeric(14, 2),
  project_ref varchar(120),
  issued_by varchar(120),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_txn_product on stock_transactions(product_id);
create index if not exists idx_stock_txn_date on stock_transactions(txn_date desc);
