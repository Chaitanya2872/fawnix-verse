insert into permissions (key, label, module_key, description, active, system_defined, created_at, updated_at) values
  ('page.inventory.warehouses', 'Warehouses', 'inventory', 'View and manage inventory warehouses.', true, true, now(), now())
on conflict (key) do update set
  label = excluded.label,
  module_key = excluded.module_key,
  description = excluded.description,
  active = excluded.active,
  system_defined = excluded.system_defined,
  updated_at = now();

insert into role_permissions (role_id, permission_key)
select distinct rp.role_id, p.key
from role_permissions rp
join permissions p on p.key = 'page.inventory.warehouses'
where rp.permission_key in ('module.inventory', 'page.inventory')
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select r.id, p.key
from roles r
join permissions p on p.key = 'page.inventory.warehouses'
where r.name in ('ROLE_MASTER', 'ROLE_ADMIN')
on conflict do nothing;
