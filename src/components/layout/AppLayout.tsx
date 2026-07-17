import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

type TopbarContext = {
  title: string;
  breadcrumb: string;
};

type TopbarRoute = TopbarContext & {
  path: string;
  exact?: boolean;
};

const TOPBAR_ROUTES: readonly TopbarRoute[] = [
  { path: "/", exact: true, title: "Dashboard", breadcrumb: "ERP / Dashboard" },
  { path: "/inventory", exact: true, title: "Inventory", breadcrumb: "ERP / Inventory" },
  { path: "/inventory/bills", title: "Bills & Invoices", breadcrumb: "ERP / Inventory / Bills & Invoices" },
  { path: "/inventory/warehouses", title: "Warehouses", breadcrumb: "ERP / Inventory / Warehouses" },
  { path: "/inventory/transactions", title: "Transactions", breadcrumb: "ERP / Inventory / Transactions" },
  { path: "/inventory/invoices", title: "Bills & Invoices", breadcrumb: "ERP / Inventory / Bills & Invoices" },
  { path: "/sales", exact: true, title: "Quotations", breadcrumb: "ERP / Sales / Quotations" },
  { path: "/sales/orders", title: "Orders", breadcrumb: "ERP / Sales / Orders" },
  { path: "/sales/shipments", title: "Shipments", breadcrumb: "ERP / Sales / Shipments" },
  { path: "/sales/payments", title: "Payments", breadcrumb: "ERP / Sales / Payments" },
  { path: "/tasks", exact: true, title: "Task Management", breadcrumb: "ERP / Task Management" },
  { path: "/tasks/workspace", title: "Task Workspace", breadcrumb: "ERP / Task Management / Workspace" },
  { path: "/projects", exact: true, title: "Projects", breadcrumb: "ERP / Project Management / Projects" },
  { path: "/projects/dashboard", title: "Dashboard", breadcrumb: "ERP / Project Management / Dashboard" },
  { path: "/projects/tasks", title: "Tasks", breadcrumb: "ERP / Project Management / Tasks" },
  { path: "/projects/kanban", title: "Kanban Board", breadcrumb: "ERP / Project Management / Kanban Board" },
  { path: "/projects/milestones", title: "Milestones", breadcrumb: "ERP / Project Management / Milestones" },
  { path: "/projects/documents", title: "Documents", breadcrumb: "ERP / Project Management / Documents" },
  { path: "/projects/meetings", title: "Meetings", breadcrumb: "ERP / Project Management / Meetings" },
  { path: "/projects/teams", title: "Team", breadcrumb: "ERP / Project Management / Team" },
  { path: "/projects/configuration", title: "Configuration", breadcrumb: "ERP / Project Management / Configuration" },
  { path: "/p2p", exact: true, title: "P2P Dashboard", breadcrumb: "ERP / P2P / Dashboard" },
  { path: "/p2p/pr", title: "PR Management", breadcrumb: "ERP / P2P / PR Management" },
  { path: "/p2p/budget", title: "Budget Validation", breadcrumb: "ERP / P2P / Budget Validation" },
  { path: "/p2p/vendors", title: "Vendor Management", breadcrumb: "ERP / P2P / Vendor Management" },
  { path: "/p2p/negotiation", title: "Negotiation", breadcrumb: "ERP / P2P / Negotiation" },
  { path: "/p2p/po", title: "Purchase Order", breadcrumb: "ERP / P2P / Purchase Order" },
  { path: "/p2p/receipt", title: "Material Receipt", breadcrumb: "ERP / P2P / Material Receipt" },
  { path: "/p2p/invoice", title: "Invoice", breadcrumb: "ERP / P2P / Invoice" },
  { path: "/p2p/payment", title: "Payment", breadcrumb: "ERP / P2P / Payment" },
  { path: "/p2p/alerts", title: "Alerts", breadcrumb: "ERP / P2P / Alerts" },
  { path: "/p2p/reports", title: "Reports", breadcrumb: "ERP / P2P / Reports" },
  { path: "/access/request", title: "Request Access", breadcrumb: "ERP / Access / Request Access" },
  { path: "/crm/leads", title: "Leads", breadcrumb: "ERP / CRM / Leads" },
  { path: "/crm/accounts", title: "Accounts", breadcrumb: "ERP / CRM / Accounts" },
  { path: "/crm/presales", title: "Pre-Sales", breadcrumb: "ERP / CRM / Pre-Sales" },
  { path: "/crm/opportunities", title: "Opportunities", breadcrumb: "ERP / CRM / Opportunities" },
  { path: "/recruitment", exact: true, title: "Pipeline", breadcrumb: "ERP / Talent / Pipeline" },
  { path: "/recruitment/hiring-requests/new", title: "New Hiring Request", breadcrumb: "ERP / Talent / Hiring Requests / New" },
  { path: "/recruitment/hiring-requests", title: "Hiring Requests", breadcrumb: "ERP / Talent / Hiring Requests" },
  { path: "/recruitment/positions", title: "Positions", breadcrumb: "ERP / Talent / Positions" },
  { path: "/recruitment/postings", title: "Job Postings", breadcrumb: "ERP / Talent / Job Postings" },
  { path: "/recruitment/pipeline", title: "Pipeline", breadcrumb: "ERP / Talent / Pipeline" },
  { path: "/recruitment/intake", title: "Intake", breadcrumb: "ERP / Talent / Intake" },
  { path: "/recruitment/candidates", title: "Candidates", breadcrumb: "ERP / Talent / Candidates" },
  { path: "/recruitment/interviews", title: "Interviews", breadcrumb: "ERP / Talent / Interviews" },
  { path: "/recruitment/offers", title: "Offers", breadcrumb: "ERP / Talent / Offers" },
  { path: "/recruitment/talent-pool", title: "Talent Pool", breadcrumb: "ERP / Talent / Talent Pool" },
  { path: "/recruitment/analytics", title: "Recruitment Analytics", breadcrumb: "ERP / Talent / Analytics" },
  { path: "/recruitment/forms", title: "Forms", breadcrumb: "ERP / Talent / Forms" },
  { path: "/forms", exact: true, title: "Forms", breadcrumb: "ERP / Organization / Forms" },
  { path: "/forms", title: "Form Builder", breadcrumb: "ERP / Organization / Forms" },
  { path: "/forms/new", title: "New Form", breadcrumb: "ERP / Organization / Forms / New" },
  { path: "/forms/templates", title: "Form Templates", breadcrumb: "ERP / Organization / Forms / Templates" },
  { path: "/forms/collections", title: "Form Collections", breadcrumb: "ERP / Organization / Forms / Collections" },
  { path: "/forms/analytics", title: "Form Analytics", breadcrumb: "ERP / Organization / Forms / Analytics" },
  { path: "/forms/links", title: "Form Links", breadcrumb: "ERP / Organization / Forms / Links" },
  { path: "/approvals", exact: true, title: "Approvals", breadcrumb: "ERP / Organization / Approvals" },
  { path: "/approvals/outbox", title: "Outbox", breadcrumb: "ERP / Organization / Approvals / Outbox" },
  { path: "/approvals/history", title: "History", breadcrumb: "ERP / Organization / Approvals / History" },
  { path: "/approvals/workflows", title: "Workflows", breadcrumb: "ERP / Organization / Approvals / Workflows" },
  { path: "/approvals/requests", title: "Approval Detail", breadcrumb: "ERP / Organization / Approvals / Requests" },
  { path: "/organization", exact: true, title: "Organization", breadcrumb: "ERP / Organization" },
  { path: "/organization/structure", title: "Structure", breadcrumb: "ERP / Organization / Structure" },
  { path: "/organization/roles", title: "Roles", breadcrumb: "ERP / Organization / Roles" },
  { path: "/organization/vacancies", title: "Vacancies", breadcrumb: "ERP / Organization / Vacancies" },
  { path: "/organization/hierarchy", title: "Hierarchy", breadcrumb: "ERP / Organization / Hierarchy" },
  { path: "/organization/chart", title: "Organization Chart", breadcrumb: "ERP / Organization / Chart" },
  { path: "/setup", exact: true, title: "Setup", breadcrumb: "ERP / Organization / Setup" },
  { path: "/setup/wizard", title: "Setup Wizard", breadcrumb: "ERP / Organization / Setup / Wizard" },
  { path: "/setup/company", title: "Company", breadcrumb: "ERP / Organization / Setup / Company" },
  { path: "/setup/users", title: "Users", breadcrumb: "ERP / Organization / Setup / Users" },
  { path: "/setup/roles-permissions", title: "Roles & Permissions", breadcrumb: "ERP / Organization / Setup / Roles & Permissions" },
  { path: "/setup/employees", title: "Employees", breadcrumb: "ERP / Organization / Setup / Employees" },
  { path: "/setup/policies", title: "Policies", breadcrumb: "ERP / Organization / Setup / Policies" },
  { path: "/setup/workflows", title: "Workflows", breadcrumb: "ERP / Organization / Setup / Workflows" },
  { path: "/setup/activate", title: "Activate", breadcrumb: "ERP / Organization / Setup / Activate" },
  { path: "/settings", exact: true, title: "CRM Integrations", breadcrumb: "ERP / Integrations / CRM Integrations" },
  { path: "/settings/templates", title: "Manage Templates", breadcrumb: "ERP / Administration / Manage Templates" },
  { path: "/settings/portal-credentials", title: "Portal Credentials", breadcrumb: "ERP / Integrations / Portal Credentials" },
  { path: "/settings/calendar-integrations", title: "Calendar Integrations", breadcrumb: "ERP / Integrations / Calendar Integrations" },
  { path: "/settings/approval-workflows", title: "Approval Workflows", breadcrumb: "ERP / Integrations / Approval Workflows" },
  { path: "/accounting", title: "Accounting", breadcrumb: "ERP / Finance / Accounting" },
  { path: "/reports", title: "Reports", breadcrumb: "ERP / Reports" },
  { path: "/users", title: "Users", breadcrumb: "ERP / Administration / Users" },
  { path: "/vms", exact: true, title: "VMS Dashboard", breadcrumb: "ERP / Operations / VMS Dashboard" },
  { path: "/vms/dashboard", title: "VMS Dashboard", breadcrumb: "ERP / Operations / VMS Dashboard" },
  { path: "/vms/visitors/new", title: "New Visitor", breadcrumb: "ERP / Operations / VMS / New Visitor" },
  { path: "/vms/visitors", title: "Visitors", breadcrumb: "ERP / Operations / VMS / Visitors" },
  { path: "/vms/approvals", title: "Approvals", breadcrumb: "ERP / Operations / VMS / Approvals" },
  { path: "/vms/desk", title: "Desk Check-In", breadcrumb: "ERP / Operations / VMS / Desk Check-In" },
  { path: "/vms/history", title: "Visitor History", breadcrumb: "ERP / Operations / VMS / Visitor History" },
  { path: "/vms/reports", title: "VMS Reports", breadcrumb: "ERP / Operations / VMS / Reports" },
  { path: "/vms/settings", title: "VMS Settings", breadcrumb: "ERP / Operations / VMS / Settings" },
];

function getTopbarContext(pathname: string): TopbarContext {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const route = [...TOPBAR_ROUTES]
    .sort((left, right) => right.path.length - left.path.length)
    .find((entry) => {
      if (entry.exact) {
        return normalizedPath === entry.path;
      }
      return normalizedPath === entry.path || normalizedPath.startsWith(`${entry.path}/`);
    });

  return route ?? TOPBAR_ROUTES[0];
}

export function AppLayout() {
  const location = useLocation();
  const topbarContext = getTopbarContext(location.pathname);

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900">
      <div className="flex h-full overflow-hidden">

        {/* Sidebar */}
        <Sidebar />

        {/* Main Area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

          {/* Topbar */}
          <Topbar title={topbarContext.title} breadcrumb={topbarContext.breadcrumb} />

          {/* Page Content — no max-width wrapper, modules own their own layout */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>

        </div>
      </div>
    </div>
  );
}
