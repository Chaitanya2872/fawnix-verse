insert into user_permissions (user_id, permission)
select distinct ur.user_id, permissions.permission
from user_roles ur
join roles r on r.id = ur.role_id
cross join (
  values
    ('module.access'),
    ('page.access.requests'),
    ('feature.access.requests.create'),
    ('feature.access.requests.review'),
    ('feature.access.permissions.manage'),
    ('feature.admin.users.manage'),
    ('feature.admin.roles.manage'),
    ('feature.admin.permissions.manage'),
    ('feature.crm.leads.manage'),
    ('feature.crm.opportunities.manage'),
    ('feature.inventory.products.manage'),
    ('feature.inventory.stock.adjust'),
    ('feature.sales.orders.manage'),
    ('feature.sales.pricing.manage'),
    ('feature.purchases.dashboard.view'),
    ('feature.purchases.pr.manage'),
    ('feature.purchases.budget.review'),
    ('feature.purchases.vendor.manage'),
    ('feature.purchases.vendor.evaluate'),
    ('feature.purchases.negotiation.manage'),
    ('feature.purchases.po.manage'),
    ('feature.purchases.grn.manage'),
    ('feature.purchases.invoice.manage'),
    ('feature.purchases.payment.manage'),
    ('feature.purchases.reports.view'),
    ('feature.hrms.employee.manage'),
    ('feature.reports.export'),
    ('feature.recruitment.jobs.manage'),
    ('feature.recruitment.pipeline.manage'),
    ('feature.forms.manage'),
    ('feature.approvals.review'),
    ('feature.org.structure.manage'),
    ('feature.integrations.manage'),
    ('feature.analytics.view'),
    ('feature.notifications.manage'),
    ('feature.tasks.manage')
) as permissions(permission)
where r.name = 'ROLE_MASTER'
and not exists (
  select 1
  from user_permissions up
  where up.user_id = ur.user_id
    and up.permission = permissions.permission
);
