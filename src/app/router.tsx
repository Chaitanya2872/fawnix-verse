import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import AuthPage from "@/modules/auth/page";
import { ProtectedRoute, PublicOnlyRoute } from "@/modules/auth/guards";

// import DashboardPage from "@/modules/dashboard/page";
import InventoryPage from "@/modules/inventory/page";
import LeadsPage from "@/modules/crm/leads/page";
import PreSalesOverviewPage from "@/modules/crm/presales/page";
import IntegrationsPage from "@/modules/integrations/page";
import ReportsPage from "@/modules/reports/page";
import UsersPage from "@/modules/users/page";
// import SalesPage from "@/modules/sales/page";
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
          { path: "inventory", element: <InventoryPage /> },
          //   { path: "sales", element: <SalesPage /> },
          //   { path: "purchases", element: <PurchasesPage /> },
          { path: "crm/leads", element: <LeadsPage /> },
          { path: "crm/leads/:id", element: <LeadsPage /> },
          { path: "crm/presales", element: <PreSalesOverviewPage /> },
          //   { path: "accounting", element: <AccountingPage /> },
          { path: "reports", element: <ReportsPage /> },
          { path: "users", element: <UsersPage /> },
          { path: "settings", element: <IntegrationsPage /> },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
