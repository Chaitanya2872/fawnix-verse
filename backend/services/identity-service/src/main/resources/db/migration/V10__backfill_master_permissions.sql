insert into user_permissions (user_id, permission)
select distinct ur.user_id, permissions.permission
from user_roles ur
join roles r on r.id = ur.role_id
cross join (
  values
    ('module.crm'),
    ('module.inventory'),
    ('module.sales'),
    ('module.purchases'),
    ('module.hrms'),
    ('module.reports'),
    ('module.admin'),
    ('module.recruitment'),
    ('module.forms'),
    ('module.approvals'),
    ('module.org'),
    ('module.integrations'),
    ('module.analytics'),
    ('module.notifications'),
    ('module.tasks'),
    ('page.dashboard'),
    ('page.crm.leads'),
    ('page.crm.contacts'),
    ('page.crm.accounts'),
    ('page.crm.presales'),
    ('page.crm.opportunities'),
    ('page.inventory'),
    ('page.sales'),
    ('page.purchases'),
    ('page.accounting'),
    ('page.hrms'),
    ('page.reports'),
    ('page.admin.users'),
    ('page.admin.settings'),
    ('page.tasks')
) as permissions(permission)
where r.name = 'ROLE_MASTER'
and not exists (
  select 1
  from user_permissions up
  where up.user_id = ur.user_id
    and up.permission = permissions.permission
);
