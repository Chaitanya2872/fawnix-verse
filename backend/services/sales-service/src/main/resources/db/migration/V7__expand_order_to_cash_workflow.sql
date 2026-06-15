alter table sales_orders
  add column if not exists delivery_date date,
  add column if not exists payment_terms varchar(120),
  add column if not exists customer_po_number varchar(120),
  add column if not exists quotation_reference varchar(120),
  add column if not exists payment_due_days integer,
  add column if not exists discount_percent numeric(5, 2) not null default 0,
  add column if not exists discount_amount numeric(14, 2) not null default 0,
  add column if not exists customer_credit_limit numeric(14, 2) not null default 0,
  add column if not exists customer_outstanding_amount numeric(14, 2) not null default 0,
  add column if not exists credit_limit_exceeded boolean not null default false,
  add column if not exists stock_available boolean not null default false,
  add column if not exists duplicate_order_flag boolean not null default false,
  add column if not exists risky_payment_terms boolean not null default false,
  add column if not exists special_discount_flag boolean not null default false,
  add column if not exists validation_summary text,
  add column if not exists approval_snapshot text,
  add column if not exists submitted_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by_name varchar(120),
  add column if not exists last_validated_at timestamptz,
  add column if not exists confirmation_attachment_url text;

create table if not exists sales_order_approval_rules (
  id varchar(36) primary key,
  role_key varchar(80) not null,
  role_label varchar(120) not null,
  sequence_no integer not null,
  min_order_value numeric(14, 2),
  max_order_value numeric(14, 2),
  require_credit_limit_breach boolean not null default false,
  require_inventory_shortage boolean not null default false,
  require_risky_terms boolean not null default false,
  require_special_discount boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sales_order_approval_rules_active
  on sales_order_approval_rules(active, sequence_no);

create table if not exists sales_order_approvals (
  id varchar(36) primary key,
  sales_order_id varchar(36) not null references sales_orders(id) on delete cascade,
  role_key varchar(80) not null,
  role_label varchar(120) not null,
  sequence_no integer not null,
  status varchar(40) not null,
  remarks text,
  approver_user_id varchar(36),
  approver_name varchar(120),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists idx_sales_order_approvals_order
  on sales_order_approvals(sales_order_id, sequence_no);

create table if not exists sales_payments (
  id varchar(36) primary key,
  payment_number varchar(32) not null unique,
  sales_invoice_id varchar(36) not null references sales_invoices(id) on delete cascade,
  sales_order_id varchar(36) not null references sales_orders(id) on delete cascade,
  customer_name varchar(160) not null,
  currency varchar(10) not null,
  payment_mode varchar(40) not null,
  payment_date date not null,
  amount numeric(14, 2) not null,
  reference_number varchar(120),
  remarks text,
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_payments_invoice
  on sales_payments(sales_invoice_id, payment_date desc);

create table if not exists sales_returns (
  id varchar(36) primary key,
  return_number varchar(32) not null unique,
  sales_order_id varchar(36) not null references sales_orders(id) on delete cascade,
  sales_invoice_id varchar(36) references sales_invoices(id) on delete set null,
  customer_name varchar(160) not null,
  status varchar(40) not null,
  return_reason text,
  requested_amount numeric(14, 2) not null default 0,
  approved_amount numeric(14, 2) not null default 0,
  remarks text,
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  approved_by_name varchar(120),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create index if not exists idx_sales_returns_order
  on sales_returns(sales_order_id, created_at desc);

create table if not exists sales_credit_notes (
  id varchar(36) primary key,
  credit_note_number varchar(32) not null unique,
  sales_return_id varchar(36) not null references sales_returns(id) on delete cascade,
  sales_invoice_id varchar(36) references sales_invoices(id) on delete set null,
  customer_name varchar(160) not null,
  currency varchar(10) not null,
  amount numeric(14, 2) not null,
  remarks text,
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_credit_notes_return
  on sales_credit_notes(sales_return_id);

create table if not exists sales_order_audit_logs (
  id varchar(36) primary key,
  sales_order_id varchar(36) not null references sales_orders(id) on delete cascade,
  action_type varchar(60) not null,
  actor_user_id varchar(36),
  actor_name varchar(120),
  details text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_order_audit_logs_order
  on sales_order_audit_logs(sales_order_id, created_at desc);
