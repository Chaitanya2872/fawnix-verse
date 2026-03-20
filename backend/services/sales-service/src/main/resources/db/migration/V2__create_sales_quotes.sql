create table if not exists quotes (
  id varchar(36) primary key,
  quote_number varchar(32) not null unique,
  lead_id varchar(36),
  customer_name varchar(160) not null,
  company varchar(160),
  email varchar(160),
  phone varchar(50),
  billing_address text,
  shipping_address text,
  currency varchar(10) not null,
  status varchar(40) not null,
  discount_type varchar(20),
  discount_value numeric(12, 2),
  tax_rate numeric(5, 2),
  subtotal numeric(14, 2) not null default 0,
  discount_total numeric(14, 2) not null default 0,
  tax_total numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  valid_until timestamptz,
  notes text,
  terms text,
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  updated_by_user_id varchar(36),
  updated_by_name varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quotes_status on quotes(status);
create index if not exists idx_quotes_customer on quotes(customer_name);
create index if not exists idx_quotes_created_at on quotes(created_at desc);

create table if not exists quote_items (
  id varchar(36) primary key,
  quote_id varchar(36) not null references quotes(id) on delete cascade,
  position int not null,
  name varchar(160) not null,
  description text,
  quantity numeric(12, 2) not null default 0,
  unit varchar(40),
  unit_price numeric(14, 2) not null default 0,
  line_total numeric(14, 2) not null default 0
);

create index if not exists idx_quote_items_quote on quote_items(quote_id);
