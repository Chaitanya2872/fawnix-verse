alter table products
  add column if not exists price_tier_1 numeric(14, 2),
  add column if not exists price_tier_2 numeric(14, 2),
  add column if not exists price_tier_3 numeric(14, 2);
