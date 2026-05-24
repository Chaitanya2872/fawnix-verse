alter table sales_orders
  add column if not exists inventory_reserved boolean not null default false,
  add column if not exists inventory_reservation_message text,
  add column if not exists inventory_reserved_at timestamptz;
