alter table products
  add column if not exists reserved_qty numeric(14, 2) not null default 0;
