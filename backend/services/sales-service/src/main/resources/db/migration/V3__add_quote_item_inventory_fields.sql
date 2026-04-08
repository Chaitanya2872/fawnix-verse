alter table quote_items
  add column if not exists inventory_product_id varchar(36),
  add column if not exists make varchar(120),
  add column if not exists utility text;

create index if not exists idx_quote_items_inventory on quote_items(inventory_product_id);
