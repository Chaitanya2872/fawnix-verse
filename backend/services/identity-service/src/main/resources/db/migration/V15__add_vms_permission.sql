insert into permissions (key, label, module_key, description, active, system_defined, created_at, updated_at) values
  ('module.vms', 'Visitor Management', 'vms', 'Open visitor management workspaces.', true, true, now(), now())
on conflict (key) do update set
  label = excluded.label,
  module_key = excluded.module_key,
  description = excluded.description,
  active = excluded.active,
  system_defined = excluded.system_defined,
  updated_at = now();

insert into role_permissions (role_id, permission_key)
select r.id, p.key
from roles r
join permissions p on p.key = 'module.vms'
where r.name in ('ROLE_MASTER', 'ROLE_ADMIN', 'ROLE_HR_MANAGER')
on conflict do nothing;
