package com.fawnix.identity.users.permission;

import com.fawnix.identity.auth.entity.RoleName;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public final class UserPermissionCatalog {

  private UserPermissionCatalog() {
  }

  public record PermissionDefinition(
      String key,
      String label,
      String description,
      String moduleKey,
      String level
  ) {
  }

  private static PermissionDefinition permission(
      String key,
      String label,
      String description,
      String moduleKey,
      String level
  ) {
    return new PermissionDefinition(key, label, description, moduleKey, level);
  }

  public static final String MODULE_ACCESS = "module.access";
  public static final String MODULE_ADMIN = "module.admin";
  public static final String MODULE_ANALYTICS = "module.analytics";
  public static final String MODULE_APPROVALS = "module.approvals";
  public static final String MODULE_CRM = "module.crm";
  public static final String MODULE_FORMS = "module.forms";
  public static final String MODULE_HRMS = "module.hrms";
  public static final String MODULE_INTEGRATIONS = "module.integrations";
  public static final String MODULE_INVENTORY = "module.inventory";
  public static final String MODULE_NOTIFICATIONS = "module.notifications";
  public static final String MODULE_ORG = "module.org";
  public static final String MODULE_PURCHASES = "module.purchases";
  public static final String MODULE_RECRUITMENT = "module.recruitment";
  public static final String MODULE_REPORTS = "module.reports";
  public static final String MODULE_SALES = "module.sales";
  public static final String MODULE_TASKS = "module.tasks";

  public static final List<PermissionDefinition> DEFINITIONS = List.of(
      permission(MODULE_ACCESS, "Access", "Open the request access workspace.", "access", "MODULE"),
      permission("page.access.requests", "Access Requests", "View the access request screen.", "access", "PAGE"),
      permission("feature.access.requests.create", "Create Access Requests", "Raise new access requests.", "access", "FEATURE"),
      permission("feature.access.requests.review", "Review Access Requests", "Approve or reject access requests.", "access", "FEATURE"),
      permission("feature.access.permissions.manage", "Manage Access Permissions", "Change user access directly.", "access", "FEATURE"),

      permission(MODULE_ADMIN, "Admin", "Open the admin module.", "admin", "MODULE"),
      permission("page.admin.users", "Users", "View user administration.", "admin", "PAGE"),
      permission("page.admin.settings", "Settings", "View admin settings.", "admin", "PAGE"),
      permission("feature.admin.users.manage", "Manage Users", "Create, edit, activate, and delete users.", "admin", "FEATURE"),
      permission("feature.admin.roles.manage", "Manage Roles", "Assign roles and default access.", "admin", "FEATURE"),
      permission("feature.admin.permissions.manage", "Manage Permissions", "Change module and feature permissions.", "admin", "FEATURE"),

      permission(MODULE_CRM, "CRM", "Open the CRM module.", "crm", "MODULE"),
      permission("page.dashboard", "Dashboard", "View the primary dashboard.", "crm", "PAGE"),
      permission("page.crm.leads", "Leads", "View CRM leads.", "crm", "PAGE"),
      permission("page.crm.contacts", "Contacts", "View CRM contacts.", "crm", "PAGE"),
      permission("page.crm.accounts", "Accounts", "View CRM accounts.", "crm", "PAGE"),
      permission("page.crm.presales", "Pre Sales", "View CRM pre sales.", "crm", "PAGE"),
      permission("page.crm.opportunities", "Opportunities", "View CRM opportunities.", "crm", "PAGE"),
      permission("feature.crm.leads.manage", "Manage Leads", "Create and update leads.", "crm", "FEATURE"),
      permission("feature.crm.opportunities.manage", "Manage Opportunities", "Manage opportunities and pipeline.", "crm", "FEATURE"),

      permission(MODULE_INVENTORY, "Inventory", "Open inventory controls.", "inventory", "MODULE"),
      permission("page.inventory", "Inventory", "View inventory pages.", "inventory", "PAGE"),
      permission("feature.inventory.products.manage", "Manage Products", "Create and update inventory products.", "inventory", "FEATURE"),
      permission("feature.inventory.stock.adjust", "Adjust Stock", "Perform stock adjustments.", "inventory", "FEATURE"),

      permission(MODULE_SALES, "Sales", "Open the sales workspace.", "sales", "MODULE"),
      permission("page.sales", "Sales", "View sales pages.", "sales", "PAGE"),
      permission("feature.sales.orders.manage", "Manage Sales Orders", "Create and update sales orders.", "sales", "FEATURE"),
      permission("feature.sales.pricing.manage", "Manage Pricing", "Change sales pricing and discounts.", "sales", "FEATURE"),

      permission(MODULE_PURCHASES, "Purchases", "Open procure-to-pay.", "purchases", "MODULE"),
      permission("page.purchases", "Purchases", "View the purchase landing page.", "purchases", "PAGE"),
      permission("feature.purchases.dashboard.view", "View P2P Dashboard", "View the P2P command center.", "purchases", "FEATURE"),
      permission("feature.purchases.pr.manage", "Manage Requisitions", "Create and update purchase requisitions.", "purchases", "FEATURE"),
      permission("feature.purchases.budget.review", "Review Budget", "Run budget checks and finance validation.", "purchases", "FEATURE"),
      permission("feature.purchases.vendor.manage", "Manage Vendors", "Create and maintain vendor master data.", "purchases", "FEATURE"),
      permission("feature.purchases.vendor.evaluate", "Evaluate Vendors", "Benchmark and compare vendors.", "purchases", "FEATURE"),
      permission("feature.purchases.negotiation.manage", "Manage Negotiation", "Run sourcing and negotiation workflows.", "purchases", "FEATURE"),
      permission("feature.purchases.po.manage", "Manage Purchase Orders", "Create and update purchase orders.", "purchases", "FEATURE"),
      permission("feature.purchases.grn.manage", "Manage GRN", "Receive goods and update receipts.", "purchases", "FEATURE"),
      permission("feature.purchases.invoice.manage", "Manage Invoices", "Capture and review vendor invoices.", "purchases", "FEATURE"),
      permission("feature.purchases.payment.manage", "Manage Payments", "Approve and post supplier payments.", "purchases", "FEATURE"),
      permission("feature.purchases.reports.view", "View Purchase Reports", "Access P2P reports and controls.", "purchases", "FEATURE"),

      permission(MODULE_HRMS, "HRMS", "Open the HRMS workspace.", "hrms", "MODULE"),
      permission("page.hrms", "HRMS", "View HRMS pages.", "hrms", "PAGE"),
      permission("feature.hrms.employee.manage", "Manage Employees", "Create and update employee profiles.", "hrms", "FEATURE"),

      permission(MODULE_REPORTS, "Reports", "Open reporting.", "reports", "MODULE"),
      permission("page.reports", "Reports", "View reports.", "reports", "PAGE"),
      permission("feature.reports.export", "Export Reports", "Download and share reports.", "reports", "FEATURE"),

      permission(MODULE_RECRUITMENT, "Recruitment", "Open recruitment.", "recruitment", "MODULE"),
      permission("feature.recruitment.jobs.manage", "Manage Job Requisitions", "Create and update hiring requisitions.", "recruitment", "FEATURE"),
      permission("feature.recruitment.pipeline.manage", "Manage Candidates", "Move candidates through the pipeline.", "recruitment", "FEATURE"),

      permission(MODULE_FORMS, "Forms", "Open form operations.", "forms", "MODULE"),
      permission("feature.forms.manage", "Manage Forms", "Create and edit forms.", "forms", "FEATURE"),

      permission(MODULE_APPROVALS, "Approvals", "Open approval flows.", "approvals", "MODULE"),
      permission("feature.approvals.review", "Review Approvals", "Approve or reject workflow items.", "approvals", "FEATURE"),

      permission(MODULE_ORG, "Organization", "Open organization structures.", "org", "MODULE"),
      permission("feature.org.structure.manage", "Manage Org Structure", "Update reporting and organization data.", "org", "FEATURE"),

      permission(MODULE_INTEGRATIONS, "Integrations", "Open integrations.", "integrations", "MODULE"),
      permission("feature.integrations.manage", "Manage Integrations", "Configure third-party integrations.", "integrations", "FEATURE"),

      permission(MODULE_ANALYTICS, "Analytics", "Open analytics.", "analytics", "MODULE"),
      permission("feature.analytics.view", "View Analytics", "Access business analytics.", "analytics", "FEATURE"),

      permission(MODULE_NOTIFICATIONS, "Notifications", "Open notifications.", "notifications", "MODULE"),
      permission("feature.notifications.manage", "Manage Notifications", "Configure notification rules.", "notifications", "FEATURE"),

      permission(MODULE_TASKS, "Tasks", "Open task management.", "tasks", "MODULE"),
      permission("page.tasks", "Tasks", "View task pages.", "tasks", "PAGE"),
      permission("feature.tasks.manage", "Manage Tasks", "Create, edit, and complete tasks.", "tasks", "FEATURE")
  );

  public static final Set<String> ALL_PERMISSIONS = DEFINITIONS.stream()
      .map(PermissionDefinition::key)
      .collect(Collectors.toCollection(LinkedHashSet::new));

  public static List<PermissionDefinition> definitions() {
    return DEFINITIONS;
  }

  public static Map<String, List<PermissionDefinition>> definitionsByModule() {
    return DEFINITIONS.stream().collect(Collectors.groupingBy(
        PermissionDefinition::moduleKey,
        LinkedHashMap::new,
        Collectors.toList()
    ));
  }

  public static Set<String> defaultsForRole(RoleName roleName) {
    return switch (roleName) {
      case ROLE_MASTER -> new LinkedHashSet<>(ALL_PERMISSIONS);
      case ROLE_ADMIN -> setOf(
          MODULE_ACCESS,
          MODULE_ADMIN,
          MODULE_TASKS,
          "page.access.requests",
          "page.admin.users",
          "page.admin.settings",
          "page.tasks",
          "feature.access.requests.review",
          "feature.access.permissions.manage",
          "feature.admin.users.manage",
          "feature.admin.roles.manage",
          "feature.admin.permissions.manage",
          "feature.tasks.manage"
      );
      case ROLE_REPORTING_MANAGER -> setOf(
          MODULE_REPORTS,
          MODULE_TASKS,
          "page.reports",
          "page.tasks",
          "feature.reports.export",
          "feature.tasks.manage"
      );
      case ROLE_SALES_MANAGER -> setOf(
          MODULE_CRM,
          MODULE_SALES,
          MODULE_REPORTS,
          MODULE_TASKS,
          "page.dashboard",
          "page.crm.leads",
          "page.crm.contacts",
          "page.crm.accounts",
          "page.crm.presales",
          "page.crm.opportunities",
          "page.sales",
          "page.reports",
          "page.tasks",
          "feature.crm.leads.manage",
          "feature.crm.opportunities.manage",
          "feature.sales.orders.manage",
          "feature.sales.pricing.manage",
          "feature.reports.export",
          "feature.tasks.manage"
      );
      case ROLE_SALES_REP -> setOf(
          MODULE_CRM,
          MODULE_SALES,
          MODULE_TASKS,
          "page.dashboard",
          "page.crm.leads",
          "page.crm.contacts",
          "page.crm.accounts",
          "page.crm.presales",
          "page.crm.opportunities",
          "page.sales",
          "page.tasks",
          "feature.crm.leads.manage",
          "feature.crm.opportunities.manage",
          "feature.sales.orders.manage",
          "feature.tasks.manage"
      );
      case ROLE_VIEWER -> setOf(
          MODULE_REPORTS,
          "page.dashboard",
          "page.reports"
      );
      case ROLE_HR_MANAGER -> setOf(
          MODULE_RECRUITMENT,
          MODULE_FORMS,
          MODULE_APPROVALS,
          MODULE_ORG,
          MODULE_INTEGRATIONS,
          MODULE_ANALYTICS,
          MODULE_NOTIFICATIONS,
          MODULE_TASKS,
          "page.dashboard",
          "page.tasks",
          "feature.recruitment.jobs.manage",
          "feature.recruitment.pipeline.manage",
          "feature.forms.manage",
          "feature.approvals.review",
          "feature.org.structure.manage",
          "feature.integrations.manage",
          "feature.analytics.view",
          "feature.notifications.manage",
          "feature.tasks.manage"
      );
      case ROLE_RECRUITER -> setOf(
          MODULE_RECRUITMENT,
          MODULE_FORMS,
          MODULE_INTEGRATIONS,
          MODULE_ANALYTICS,
          "page.dashboard",
          "feature.recruitment.jobs.manage",
          "feature.recruitment.pipeline.manage",
          "feature.forms.manage",
          "feature.integrations.manage",
          "feature.analytics.view"
      );
      case ROLE_HIRING_MANAGER -> setOf(
          MODULE_RECRUITMENT,
          MODULE_APPROVALS,
          "page.dashboard",
          "feature.recruitment.jobs.manage",
          "feature.approvals.review"
      );
      case ROLE_INTERVIEWER -> setOf(
          MODULE_RECRUITMENT,
          "page.dashboard",
          "feature.recruitment.pipeline.manage"
      );
      case ROLE_EMPLOYEE -> setOf(
          MODULE_ACCESS,
          MODULE_TASKS,
          "page.access.requests",
          "page.dashboard",
          "page.tasks",
          "feature.access.requests.create",
          "feature.tasks.manage"
      );
    };
  }

  public static Set<String> defaultsForRoleName(String roleName) {
    return defaultsForRole(RoleName.valueOf(roleName));
  }

  private static Set<String> setOf(String... permissions) {
    LinkedHashSet<String> values = new LinkedHashSet<>();
    for (String permission : permissions) {
      values.add(permission);
    }
    return values;
  }
}
