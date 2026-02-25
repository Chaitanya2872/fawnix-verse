import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";

// import DashboardPage from "@/modules/dashboard/page";
import InventoryPage from "@/modules/inventory/page";
// import SalesPage from "@/modules/sales/page";
// import PurchasesPage from "@/modules/purchases/page";
// import LeadsPage from "@/modules/crm/lead-management/page";
// import AccountingPage from "@/modules/accounting/page";
// import ReportsPage from "@/modules/reports/page";
// import UsersPage from "@/modules/users/page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
    //   { index: true, element: <DashboardPage /> },
      { path: "inventory", element: <InventoryPage /> },
    //   { path: "sales", element: <SalesPage /> },
    //   { path: "purchases", element: <PurchasesPage /> },
    //   { path: "crm/leads", element: <LeadsPage /> },
    //   { path: "accounting", element: <AccountingPage /> },
    //   { path: "reports", element: <ReportsPage /> },
    //   { path: "users", element: <UsersPage /> },
    ],
  },
]);