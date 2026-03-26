import { Navigate, createBrowserRouter, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import AuthPage from "@/modules/auth/page";
import { ProtectedRoute, PublicOnlyRoute, RequirePermission } from "@/modules/auth/guards";
import { PERMISSIONS } from "@/modules/auth/permissions";
import UnauthorizedPage from "@/modules/auth/unauthorized";

// import DashboardPage from "@/modules/dashboard/page";
import InventoryPage from "@/modules/inventory/page";
import LeadsPage from "@/modules/crm/leads/page";
import PreSalesOverviewPage from "@/modules/crm/presales/page";
import AccountsPage from "@/modules/crm/accounts/page";
import OpportunitiesPage from "@/modules/crm/opportunities/page";
import IntegrationsPage from "@/modules/integrations/page";
import ReportsPage from "@/modules/reports/page";
import UsersPage from "@/modules/users/page";
import SalesPage from "@/modules/sales/page";
import HiringRequestsPage from "@/modules/recruitment/HiringRequestsPage";
import HiringRequestDetailPage from "@/modules/recruitment/HiringRequestDetailPage";
import NewHiringRequestPage from "@/modules/recruitment/NewHiringRequestPage";
import OpenPositionsPage from "@/modules/recruitment/OpenPositionsPage";
import JobPostingsPage from "@/modules/recruitment/JobPostingsPage";
import CandidatePipelinePage from "@/modules/recruitment/CandidatePipelinePage";
import IntakePage from "@/modules/recruitment/IntakePage";
import CandidatesPage from "@/modules/recruitment/CandidatesPage";
import CandidateProfilePage from "@/modules/recruitment/CandidateProfilePage";
import InterviewsPage from "@/modules/recruitment/InterviewsPage";
import OffersPage from "@/modules/recruitment/OffersPage";
import TalentPoolPage from "@/modules/recruitment/TalentPoolPage";
import RecruitmentAnalyticsPage from "@/modules/recruitment/AnalyticsPage";
import ApplicationFormsPage from "@/modules/recruitment/ApplicationFormsPage";
import ApplicationFormBuilderPage from "@/modules/recruitment/ApplicationFormBuilderPage";
import FormTemplatesPage from "@/modules/forms/FormTemplatesPage";
import FormCollectionsPage from "@/modules/forms/FormCollectionsPage";
import FormAnalyticsPage from "@/modules/forms/FormAnalyticsPage";
import FormLinksPage from "@/modules/forms/FormLinksPage";
import ApprovalsInboxPage from "@/modules/approvals/ApprovalsInboxPage";
import ApprovalsOutboxPage from "@/modules/approvals/ApprovalsOutboxPage";
import ApprovalsHistoryPage from "@/modules/approvals/ApprovalsHistoryPage";
import ApprovalsWorkflowsPage from "@/modules/approvals/ApprovalsWorkflowsPage";
import ApprovalDetailPage from "@/modules/approvals/ApprovalDetailPage";
import SetupOverviewPage from "@/modules/org/setup/SetupOverviewPage";
import SetupWizardPage from "@/modules/org/setup/SetupWizardPage";
import SetupCompanyPage from "@/modules/org/setup/SetupCompanyPage";
import SetupUsersPage from "@/modules/org/setup/SetupUsersPage";
import SetupRolesPermissionsPage from "@/modules/org/setup/SetupRolesPermissionsPage";
import SetupEmployeesPage from "@/modules/org/setup/SetupEmployeesPage";
import SetupPoliciesPage from "@/modules/org/setup/SetupPoliciesPage";
import SetupWorkflowsPage from "@/modules/org/setup/SetupWorkflowsPage";
import SetupActivatePage from "@/modules/org/setup/SetupActivatePage";
import OrganizationChartPage from "@/modules/org/organization/OrganizationChartPage";
import OrganizationStructurePage from "@/modules/org/organization/OrganizationStructurePage";
import OrganizationRolesPage from "@/modules/org/organization/OrganizationRolesPage";
import OrganizationVacanciesPage from "@/modules/org/organization/OrganizationVacanciesPage";
import OrganizationHierarchyPage from "@/modules/org/organization/OrganizationHierarchyPage";
import ApprovalWorkflowsSettingsPage from "@/modules/integrations/ApprovalWorkflowsPage";
import PortalCredentialsPage from "@/modules/integrations/PortalCredentialsPage";
import CalendarIntegrationsPage from "@/modules/integrations/CalendarIntegrationsPage";
import PublicApplyPage from "@/modules/public/PublicApplyPage";

function RecruitmentFormRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/forms/${id}` : "/forms"} replace />;
}
// import PurchasesPage from "@/modules/purchases/page";
// import LeadsPage from "@/modules/crm/lead-management/page";
// import AccountingPage from "@/modules/accounting/page";
// import ReportsPage from "@/modules/reports/page";

export const router = createBrowserRouter([
  {
    path: "/apply/:slug",
    element: <PublicApplyPage />,
  },
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
            path: "crm/accounts",
            element: (
              <RequirePermission permission={PERMISSIONS.PAGE_CRM_ACCOUNTS}>
                <AccountsPage />
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
          {
            path: "crm/opportunities",
            element: (
              <RequirePermission permission={PERMISSIONS.PAGE_CRM_OPPORTUNITIES}>
                <OpportunitiesPage />
              </RequirePermission>
            ),
          },
          {
            path: "recruitment",
            element: <Navigate to="/recruitment/pipeline" replace />,
          },
          {
            path: "recruitment/hiring-requests",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_RECRUITMENT}>
                <HiringRequestsPage />
              </RequirePermission>
            ),
          },
          {
            path: "recruitment/hiring-requests/new",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_RECRUITMENT}>
                <NewHiringRequestPage />
              </RequirePermission>
            ),
          },
          {
            path: "recruitment/hiring-requests/:id",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_RECRUITMENT}>
                <HiringRequestDetailPage />
              </RequirePermission>
            ),
          },
          {
            path: "recruitment/positions",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_RECRUITMENT}>
                <OpenPositionsPage />
              </RequirePermission>
            ),
          },
          {
            path: "recruitment/postings",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_RECRUITMENT}>
                <JobPostingsPage />
              </RequirePermission>
            ),
          },
          {
            path: "recruitment/pipeline",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_RECRUITMENT}>
                <CandidatePipelinePage />
              </RequirePermission>
            ),
          },
          {
            path: "recruitment/intake",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_RECRUITMENT}>
                <IntakePage />
              </RequirePermission>
            ),
          },
          {
            path: "recruitment/candidates",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_RECRUITMENT}>
                <CandidatesPage />
              </RequirePermission>
            ),
          },
          {
            path: "recruitment/candidates/:id",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_RECRUITMENT}>
                <CandidateProfilePage />
              </RequirePermission>
            ),
          },
          {
            path: "recruitment/interviews",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_RECRUITMENT}>
                <InterviewsPage />
              </RequirePermission>
            ),
          },
          {
            path: "recruitment/offers",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_RECRUITMENT}>
                <OffersPage />
              </RequirePermission>
            ),
          },
          {
            path: "recruitment/talent-pool",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_RECRUITMENT}>
                <TalentPoolPage />
              </RequirePermission>
            ),
          },
          {
            path: "recruitment/analytics",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_RECRUITMENT}>
                <RecruitmentAnalyticsPage />
              </RequirePermission>
            ),
          },
          {
            path: "recruitment/forms",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_FORMS}>
                <RecruitmentFormRedirect />
              </RequirePermission>
            ),
          },
          {
            path: "recruitment/forms/new",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_FORMS}>
                <Navigate to="/forms/new" replace />
              </RequirePermission>
            ),
          },
          {
            path: "recruitment/forms/:id",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_FORMS}>
                <RecruitmentFormRedirect />
              </RequirePermission>
            ),
          },
          {
            path: "forms",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_FORMS}>
                <ApplicationFormsPage />
              </RequirePermission>
            ),
          },
          {
            path: "forms/new",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_FORMS}>
                <ApplicationFormBuilderPage />
              </RequirePermission>
            ),
          },
          {
            path: "forms/templates",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_FORMS}>
                <FormTemplatesPage />
              </RequirePermission>
            ),
          },
          {
            path: "forms/collections",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_FORMS}>
                <FormCollectionsPage />
              </RequirePermission>
            ),
          },
          {
            path: "forms/analytics",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_FORMS}>
                <FormAnalyticsPage />
              </RequirePermission>
            ),
          },
          {
            path: "forms/links",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_FORMS}>
                <FormLinksPage />
              </RequirePermission>
            ),
          },
          {
            path: "forms/:id",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_FORMS}>
                <ApplicationFormBuilderPage />
              </RequirePermission>
            ),
          },
          {
            path: "approvals",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_APPROVALS}>
                <ApprovalsInboxPage />
              </RequirePermission>
            ),
          },
          {
            path: "approvals/outbox",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_APPROVALS}>
                <ApprovalsOutboxPage />
              </RequirePermission>
            ),
          },
          {
            path: "approvals/history",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_APPROVALS}>
                <ApprovalsHistoryPage />
              </RequirePermission>
            ),
          },
          {
            path: "approvals/workflows",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_APPROVALS}>
                <ApprovalsWorkflowsPage />
              </RequirePermission>
            ),
          },
          {
            path: "approvals/requests/:id",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_APPROVALS}>
                <ApprovalDetailPage />
              </RequirePermission>
            ),
          },
          {
            path: "organization",
            element: <Navigate to="/organization/structure" replace />,
          },
          {
            path: "organization/structure",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_ORG}>
                <OrganizationStructurePage />
              </RequirePermission>
            ),
          },
          {
            path: "organization/roles",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_ORG}>
                <OrganizationRolesPage />
              </RequirePermission>
            ),
          },
          {
            path: "organization/vacancies",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_ORG}>
                <OrganizationVacanciesPage />
              </RequirePermission>
            ),
          },
          {
            path: "organization/hierarchy",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_ORG}>
                <OrganizationHierarchyPage />
              </RequirePermission>
            ),
          },
          {
            path: "organization/chart",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_ORG}>
                <OrganizationChartPage />
              </RequirePermission>
            ),
          },
          {
            path: "setup",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_ORG}>
                <SetupOverviewPage />
              </RequirePermission>
            ),
          },
          {
            path: "setup/wizard",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_ORG}>
                <SetupWizardPage />
              </RequirePermission>
            ),
          },
          {
            path: "setup/company",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_ORG}>
                <SetupCompanyPage />
              </RequirePermission>
            ),
          },
          {
            path: "setup/users",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_ORG}>
                <SetupUsersPage />
              </RequirePermission>
            ),
          },
          {
            path: "setup/roles-permissions",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_ORG}>
                <SetupRolesPermissionsPage />
              </RequirePermission>
            ),
          },
          {
            path: "setup/organization",
            element: <Navigate to="/organization/structure" replace />,
          },
          {
            path: "setup/employees",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_ORG}>
                <SetupEmployeesPage />
              </RequirePermission>
            ),
          },
          {
            path: "setup/hierarchy",
            element: <Navigate to="/organization/hierarchy" replace />,
          },
          {
            path: "setup/policies",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_ORG}>
                <SetupPoliciesPage />
              </RequirePermission>
            ),
          },
          {
            path: "setup/workflows",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_ORG}>
                <SetupWorkflowsPage />
              </RequirePermission>
            ),
          },
          {
            path: "setup/activate",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_ORG}>
                <SetupActivatePage />
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
          {
            path: "settings/portal-credentials",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_INTEGRATIONS}>
                <PortalCredentialsPage />
              </RequirePermission>
            ),
          },
          {
            path: "settings/calendar-integrations",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_INTEGRATIONS}>
                <CalendarIntegrationsPage />
              </RequirePermission>
            ),
          },
          {
            path: "settings/approval-workflows",
            element: (
              <RequirePermission permission={PERMISSIONS.MODULE_APPROVALS}>
                <ApprovalWorkflowsSettingsPage />
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
