alter table roles add column if not exists display_name varchar(120);
alter table roles add column if not exists description varchar(500);
alter table roles add column if not exists active boolean not null default true;
alter table roles add column if not exists system_defined boolean not null default false;
alter table roles add column if not exists updated_at timestamptz not null default now();

update roles
set display_name = coalesce(display_name, initcap(replace(replace(name, 'ROLE_', ''), '_', ' '))),
    system_defined = true,
    updated_at = now()
where display_name is null or system_defined = false;

create table if not exists permissions (
  key varchar(120) primary key,
  label varchar(160) not null,
  module_key varchar(80) not null,
  description varchar(500),
  active boolean not null default true,
  system_defined boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists role_permissions (
  role_id varchar(36) not null references roles(id) on delete cascade,
  permission_key varchar(120) not null references permissions(key) on update cascade on delete cascade,
  primary key (role_id, permission_key)
);

insert into permissions (key, label, module_key, description, active, system_defined, created_at, updated_at) values
  ('module.access', 'Access', 'access', 'Open the access request workspace.', true, true, now(), now()),
  ('page.access.requests', 'Access Requests', 'access', 'View the access request screen.', true, true, now(), now()),
  ('feature.access.requests.create', 'Create Access Requests', 'access', 'Raise new access requests.', true, true, now(), now()),
  ('feature.access.requests.review', 'Review Access Requests', 'access', 'Approve or reject access requests.', true, true, now(), now()),
  ('feature.access.permissions.manage', 'Manage Access Permissions', 'access', 'Grant direct access exceptions.', true, true, now(), now()),
  ('module.crm', 'CRM', 'crm', 'Open CRM workspaces.', true, true, now(), now()),
  ('module.inventory', 'Inventory', 'inventory', 'Open inventory workspaces.', true, true, now(), now()),
  ('module.sales', 'Sales', 'sales', 'Open sales workspaces.', true, true, now(), now()),
  ('module.purchases', 'Purchases', 'purchases', 'Open procure-to-pay workspaces.', true, true, now(), now()),
  ('module.hrms', 'HRMS', 'hrms', 'Open HRMS workspaces.', true, true, now(), now()),
  ('module.reports', 'Reports', 'reports', 'Open reporting workspaces.', true, true, now(), now()),
  ('module.admin', 'Admin', 'admin', 'Open administration workspaces.', true, true, now(), now()),
  ('module.recruitment', 'Recruitment', 'recruitment', 'Open recruitment workspaces.', true, true, now(), now()),
  ('module.forms', 'Forms', 'forms', 'Open forms workspaces.', true, true, now(), now()),
  ('module.approvals', 'Approvals', 'approvals', 'Open approvals workspaces.', true, true, now(), now()),
  ('module.org', 'Organization', 'org', 'Open organization workspaces.', true, true, now(), now()),
  ('module.integrations', 'Integrations', 'integrations', 'Open integrations workspaces.', true, true, now(), now()),
  ('module.analytics', 'Analytics', 'analytics', 'Open analytics workspaces.', true, true, now(), now()),
  ('module.notifications', 'Notifications', 'notifications', 'Open notification workspaces.', true, true, now(), now()),
  ('module.tasks', 'Tasks', 'tasks', 'Open task workspaces.', true, true, now(), now()),
  ('page.dashboard', 'Dashboard', 'dashboard', 'View the landing dashboard.', true, true, now(), now()),
  ('page.crm.leads', 'Leads', 'crm', 'View CRM leads.', true, true, now(), now()),
  ('page.crm.contacts', 'Contacts', 'crm', 'View CRM contacts.', true, true, now(), now()),
  ('page.crm.accounts', 'Accounts', 'crm', 'View CRM accounts.', true, true, now(), now()),
  ('page.crm.presales', 'Pre Sales', 'crm', 'View CRM pre sales work.', true, true, now(), now()),
  ('page.crm.opportunities', 'Opportunities', 'crm', 'View CRM opportunities.', true, true, now(), now()),
  ('page.inventory', 'Inventory', 'inventory', 'View inventory pages.', true, true, now(), now()),
  ('page.sales', 'Sales', 'sales', 'View sales pages.', true, true, now(), now()),
  ('page.purchases', 'Purchases', 'purchases', 'View purchases pages.', true, true, now(), now()),
  ('page.accounting', 'Accounting', 'reports', 'View accounting pages.', true, true, now(), now()),
  ('page.hrms', 'HRMS', 'hrms', 'View HRMS pages.', true, true, now(), now()),
  ('page.reports', 'Reports', 'reports', 'View reports pages.', true, true, now(), now()),
  ('page.admin.users', 'Users', 'admin', 'View user administration.', true, true, now(), now()),
  ('page.admin.settings', 'Settings', 'admin', 'View administration settings.', true, true, now(), now()),
  ('page.tasks', 'Tasks', 'tasks', 'View task pages.', true, true, now(), now()),
  ('feature.admin.users.manage', 'Manage Users', 'admin', 'Create, edit, activate, and delete users.', true, true, now(), now()),
  ('feature.admin.roles.manage', 'Manage Roles', 'admin', 'Create, edit, clone, and deactivate roles.', true, true, now(), now()),
  ('feature.admin.permissions.manage', 'Manage Permissions', 'admin', 'Create and edit permissions.', true, true, now(), now()),
  ('feature.crm.leads.manage', 'Manage Leads', 'crm', 'Create and update leads.', true, true, now(), now()),
  ('feature.crm.opportunities.manage', 'Manage Opportunities', 'crm', 'Manage opportunities and pipeline.', true, true, now(), now()),
  ('feature.inventory.products.manage', 'Manage Products', 'inventory', 'Manage inventory products.', true, true, now(), now()),
  ('feature.inventory.stock.adjust', 'Adjust Stock', 'inventory', 'Adjust stock balances.', true, true, now(), now()),
  ('feature.sales.orders.manage', 'Manage Sales Orders', 'sales', 'Create and update sales orders.', true, true, now(), now()),
  ('feature.sales.pricing.manage', 'Manage Pricing', 'sales', 'Manage pricing and discounts.', true, true, now(), now()),
  ('feature.purchases.dashboard.view', 'View P2P Dashboard', 'purchases', 'View the P2P dashboard.', true, true, now(), now()),
  ('feature.purchases.pr.manage', 'Manage Requisitions', 'purchases', 'Create and update purchase requisitions.', true, true, now(), now()),
  ('feature.purchases.budget.review', 'Review Budget', 'purchases', 'Run budget checks and approvals.', true, true, now(), now()),
  ('feature.purchases.vendor.manage', 'Manage Vendors', 'purchases', 'Create and maintain vendors.', true, true, now(), now()),
  ('feature.purchases.vendor.evaluate', 'Evaluate Vendors', 'purchases', 'Compare and evaluate vendors.', true, true, now(), now()),
  ('feature.purchases.negotiation.manage', 'Manage Negotiation', 'purchases', 'Run negotiations and sourcing events.', true, true, now(), now()),
  ('feature.purchases.po.manage', 'Manage Purchase Orders', 'purchases', 'Create and update purchase orders.', true, true, now(), now()),
  ('feature.purchases.grn.manage', 'Manage GRN', 'purchases', 'Create and update goods receipts.', true, true, now(), now()),
  ('feature.purchases.invoice.manage', 'Manage Invoices', 'purchases', 'Review and process invoices.', true, true, now(), now()),
  ('feature.purchases.payment.manage', 'Manage Payments', 'purchases', 'Approve and post supplier payments.', true, true, now(), now()),
  ('feature.purchases.reports.view', 'View Purchase Reports', 'purchases', 'Access procurement analytics.', true, true, now(), now()),
  ('feature.hrms.employee.manage', 'Manage Employees', 'hrms', 'Manage employee data.', true, true, now(), now()),
  ('feature.reports.export', 'Export Reports', 'reports', 'Export reports.', true, true, now(), now()),
  ('feature.recruitment.jobs.manage', 'Manage Hiring Requests', 'recruitment', 'Create and update hiring requests.', true, true, now(), now()),
  ('feature.recruitment.pipeline.manage', 'Manage Recruitment Pipeline', 'recruitment', 'Move candidates through stages.', true, true, now(), now()),
  ('feature.forms.manage', 'Manage Forms', 'forms', 'Create and update forms.', true, true, now(), now()),
  ('feature.approvals.review', 'Review Approvals', 'approvals', 'Approve and reject approval items.', true, true, now(), now()),
  ('feature.org.structure.manage', 'Manage Organization', 'org', 'Manage organization structure.', true, true, now(), now()),
  ('feature.integrations.manage', 'Manage Integrations', 'integrations', 'Manage external integrations.', true, true, now(), now()),
  ('feature.analytics.view', 'View Analytics', 'analytics', 'View analytics dashboards.', true, true, now(), now()),
  ('feature.notifications.manage', 'Manage Notifications', 'notifications', 'Manage notification settings.', true, true, now(), now()),
  ('feature.tasks.manage', 'Manage Tasks', 'tasks', 'Create, edit, and complete tasks.', true, true, now(), now())
on conflict (key) do update
set label = excluded.label,
    module_key = excluded.module_key,
    description = excluded.description,
    active = excluded.active,
    system_defined = true,
    updated_at = now();

insert into role_permissions (role_id, permission_key)
select r.id, p.key
from roles r
join permissions p on p.key in (
  'module.access','page.access.requests','feature.access.requests.create','page.dashboard',
  'module.tasks','page.tasks','module.recruitment'
)
where r.name = 'ROLE_EMPLOYEE'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select r.id, p.key
from roles r
join permissions p on p.key in ('module.reports','page.dashboard','page.reports')
where r.name = 'ROLE_VIEWER'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select r.id, p.key
from roles r
join permissions p on p.key in (
  'module.crm','module.sales','page.dashboard','page.crm.leads','page.crm.contacts','page.crm.accounts',
  'page.crm.presales','page.crm.opportunities','page.sales','module.tasks','page.tasks',
  'feature.crm.leads.manage','feature.crm.opportunities.manage','feature.sales.orders.manage','feature.tasks.manage'
)
where r.name = 'ROLE_SALES_REP'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select r.id, p.key
from roles r
join permissions p on p.key in (
  'module.crm','module.sales','module.reports','page.dashboard','page.crm.leads','page.crm.contacts',
  'page.crm.accounts','page.crm.presales','page.crm.opportunities','page.sales','page.reports',
  'module.tasks','page.tasks','feature.crm.leads.manage','feature.crm.opportunities.manage',
  'feature.sales.orders.manage','feature.sales.pricing.manage','feature.reports.export','feature.tasks.manage'
)
where r.name = 'ROLE_SALES_MANAGER'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select r.id, p.key
from roles r
join permissions p on p.key in (
  'module.reports','page.reports','module.tasks','page.tasks','feature.reports.export','feature.tasks.manage'
)
where r.name = 'ROLE_REPORTING_MANAGER'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select r.id, p.key
from roles r
join permissions p on p.key in (
  'module.access','page.access.requests','feature.access.requests.review','feature.access.permissions.manage',
  'module.admin','page.admin.users','page.admin.settings','feature.admin.users.manage',
  'feature.admin.roles.manage','feature.admin.permissions.manage','module.tasks','page.tasks','feature.tasks.manage'
)
where r.name = 'ROLE_ADMIN'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select r.id, p.key
from roles r
join permissions p on p.key in (
  'module.recruitment','module.forms','module.integrations','module.analytics','page.dashboard',
  'feature.recruitment.jobs.manage','feature.recruitment.pipeline.manage','feature.forms.manage',
  'feature.integrations.manage','feature.analytics.view'
)
where r.name = 'ROLE_RECRUITER'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select r.id, p.key
from roles r
join permissions p on p.key in (
  'module.recruitment','module.approvals','page.dashboard','feature.recruitment.jobs.manage','feature.approvals.review'
)
where r.name = 'ROLE_HIRING_MANAGER'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select r.id, p.key
from roles r
join permissions p on p.key in (
  'module.recruitment','page.dashboard','feature.recruitment.pipeline.manage'
)
where r.name = 'ROLE_INTERVIEWER'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select r.id, p.key
from roles r
join permissions p on p.key in (
  'module.recruitment','module.forms','module.approvals','module.org','module.integrations','module.analytics',
  'module.notifications','page.dashboard','module.tasks','page.tasks','feature.recruitment.jobs.manage',
  'feature.recruitment.pipeline.manage','feature.forms.manage','feature.approvals.review',
  'feature.org.structure.manage','feature.integrations.manage','feature.analytics.view',
  'feature.notifications.manage','feature.tasks.manage'
)
where r.name = 'ROLE_HR_MANAGER'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select r.id, p.key
from roles r
join permissions p on true
where r.name = 'ROLE_MASTER'
on conflict do nothing;
