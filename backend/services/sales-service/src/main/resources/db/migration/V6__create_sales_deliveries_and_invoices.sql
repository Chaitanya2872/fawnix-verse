create table if not exists sales_deliveries (
  id varchar(36) primary key,
  delivery_number varchar(32) not null unique,
  sales_order_id varchar(36) not null references sales_orders(id) on delete cascade,
  sales_order_number varchar(32) not null,
  customer_name varchar(160) not null,
  company varchar(160),
  shipping_address text,
  status varchar(40) not null,
  scheduled_date date,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  carrier varchar(120),
  tracking_number varchar(120),
  notes text,
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  updated_by_user_id varchar(36),
  updated_by_name varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sales_deliveries_order on sales_deliveries(sales_order_id);
create index if not exists idx_sales_deliveries_status on sales_deliveries(status);
create index if not exists idx_sales_deliveries_created_at on sales_deliveries(created_at desc);

create table if not exists sales_invoices (
  id varchar(36) primary key,
  invoice_number varchar(32) not null unique,
  sales_order_id varchar(36) not null references sales_orders(id) on delete cascade,
  sales_order_number varchar(32) not null,
  customer_name varchar(160) not null,
  company varchar(160),
  billing_address text,
  currency varchar(10) not null,
  status varchar(40) not null,
  due_date date,
  issued_at timestamptz,
  paid_at timestamptz,
  subtotal numeric(14, 2) not null default 0,
  tax_total numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  balance_due numeric(14, 2) not null default 0,
  notes text,
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  updated_by_user_id varchar(36),
  updated_by_name varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sales_invoices_order on sales_invoices(sales_order_id);
create index if not exists idx_sales_invoices_status on sales_invoices(status);
create index if not exists idx_sales_invoices_created_at on sales_invoices(created_at desc);
