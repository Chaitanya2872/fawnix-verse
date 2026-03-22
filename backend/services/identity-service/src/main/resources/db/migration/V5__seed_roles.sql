insert into roles (id, name, created_at) values
  ('00000000-0000-0000-0000-000000000001', 'ROLE_ADMIN', now()),
  ('00000000-0000-0000-0000-000000000002', 'ROLE_SALES_MANAGER', now()),
  ('00000000-0000-0000-0000-000000000003', 'ROLE_SALES_REP', now()),
  ('00000000-0000-0000-0000-000000000004', 'ROLE_VIEWER', now())
on conflict (name) do nothing;
