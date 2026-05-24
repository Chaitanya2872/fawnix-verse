create table if not exists sales_orders (
  id varchar(36) primary key,
  order_number varchar(32) not null unique,
  quote_id varchar(36),
  lead_id varchar(36),
  customer_name varchar(160) not null,
  company varchar(160),
  email varchar(160),
  phone varchar(50),
  billing_address text,
  shipping_address text,
  currency varchar(10) not null,
  status varchar(40) not null,
  subtotal numeric(14, 2) not null default 0,
  tax_rate numeric(5, 2),
  tax_total numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  notes text,
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  updated_by_user_id varchar(36),
  updated_by_name varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sales_orders_status on sales_orders(status);
create index if not exists idx_sales_orders_customer on sales_orders(customer_name);
create index if not exists idx_sales_orders_quote on sales_orders(quote_id);
create index if not exists idx_sales_orders_created_at on sales_orders(created_at desc);

create table if not exists sales_order_items (
  id varchar(36) primary key,
  sales_order_id varchar(36) not null references sales_orders(id) on delete cascade,
  position int not null,
  inventory_product_id varchar(36),
  name varchar(160) not null,
  make varchar(120),
  description text,
  utility text,
  quantity numeric(12, 2) not null default 0,
  unit varchar(40),
  unit_price numeric(14, 2) not null default 0,
  line_total numeric(14, 2) not null default 0
);

create index if not exists idx_sales_order_items_order on sales_order_items(sales_order_id);
