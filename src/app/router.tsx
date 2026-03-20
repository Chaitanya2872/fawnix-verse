import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import AuthPage from "@/modules/auth/page";
import { ProtectedRoute, PublicOnlyRoute, RequirePermission } from "@/modules/auth/guards";
import { PERMISSIONS } from "@/modules/auth/permissions";
import UnauthorizedPage from "@/modules/auth/unauthorized";

// import DashboardPage from "@/modules/dashboard/page";
import InventoryPage from "@/modules/inventory/page";
import LeadsPage from "@/modules/crm/leads/page";
import PreSalesOverviewPage from "@/modules/crm/presales/page";
import IntegrationsPage from "@/modules/integrations/page";
import ReportsPage from "@/modules/reports/page";
import UsersPage from "@/modules/users/page";
import SalesPage from "@/modules/sales/page";
// import PurchasesPage from "@/modules/purchases/page";
// import LeadsPage from "@/modules/crm/lead-management/page";
// import AccountingPage from "@/modules/accounting/page";
// import ReportsPage from "@/modules/reports/page";

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: "/login", element: <AuthPage /> },
      { path: "/auth", element: <Navigate to="/login" replace /> },
      { path: "/auth/login", element: <AuthPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/crm/leads" replace /> },
          //   { index: true, element: <DashboardPage /> },
          {
            path: "inventory",
            element: (
              <RequirePermission permission={PERMISSIONS.PAGE_INVENTORY}>
                <InventoryPage />
              </RequirePermission>
            ),
          },
          {
            path: "sales",
            element: (
              <RequirePermission permission={PERMISSIONS.PAGE_SALES}>
                <SalesPage />
              </RequirePermission>
            ),
          },
          //   { path: "purchases", element: <PurchasesPage /> },
          {
            path: "crm/leads",
            element: (
              <RequirePermission permission={PERMISSIONS.PAGE_CRM_LEADS}>
                <LeadsPage />
              </RequirePermission>
            ),
          },
          {
            path: "crm/leads/:id",
            element: (
              <RequirePermission permission={PERMISSIONS.PAGE_CRM_LEADS}>
                <LeadsPage />
              </RequirePermission>
            ),
          },
          {
            path: "crm/presales",
            element: (
              <RequirePermission permission={PERMISSIONS.PAGE_CRM_PRESALES}>
                <PreSalesOverviewPage />
              </RequirePermission>
            ),
          },
          //   { path: "accounting", element: <AccountingPage /> },
          {
            path: "reports",
            element: (
              <RequirePermission permission={PERMISSIONS.PAGE_REPORTS}>
                <ReportsPage />
              </RequirePermission>
            ),
          },
          {
            path: "users",
            element: (
              <RequirePermission permission={PERMISSIONS.PAGE_ADMIN_USERS}>
                <UsersPage />
              </RequirePermission>
            ),
          },
          {
            path: "settings",
            element: (
              <RequirePermission permission={PERMISSIONS.PAGE_ADMIN_SETTINGS}>
                <IntegrationsPage />
              </RequirePermission>
            ),
          },
        ],
      },
    ],
  },
  {
    path: "/unauthorized",
    element: <UnauthorizedPage />,
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
