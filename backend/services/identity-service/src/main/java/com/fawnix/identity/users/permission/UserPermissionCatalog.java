package com.fawnix.identity.users.permission;

import com.fawnix.identity.auth.entity.RoleName;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public final class UserPermissionCatalog {

  private UserPermissionCatalog() {
  }

  public static final String MODULE_CRM = "module.crm";
  public static final String MODULE_INVENTORY = "module.inventory";
  public static final String MODULE_SALES = "module.sales";
  public static final String MODULE_HRMS = "module.hrms";
  public static final String MODULE_REPORTS = "module.reports";
  public static final String MODULE_ADMIN = "module.admin";

  public static final String PAGE_DASHBOARD = "page.dashboard";
  public static final String PAGE_CRM_LEADS = "page.crm.leads";
  public static final String PAGE_CRM_PRESALES = "page.crm.presales";
  public static final String PAGE_CRM_OPPORTUNITIES = "page.crm.opportunities";
  public static final String PAGE_INVENTORY = "page.inventory";
  public static final String PAGE_SALES = "page.sales";
  public static final String PAGE_PURCHASES = "page.purchases";
  public static final String PAGE_ACCOUNTING = "page.accounting";
  public static final String PAGE_HRMS = "page.hrms";
  public static final String PAGE_REPORTS = "page.reports";
  public static final String PAGE_ADMIN_USERS = "page.admin.users";
  public static final String PAGE_ADMIN_SETTINGS = "page.admin.settings";

  public static final Set<String> ALL_PERMISSIONS = Set.of(
      MODULE_CRM,
      MODULE_INVENTORY,
      MODULE_SALES,
      MODULE_HRMS,
      MODULE_REPORTS,
      MODULE_ADMIN,
      PAGE_DASHBOARD,
      PAGE_CRM_LEADS,
      PAGE_CRM_PRESALES,
      PAGE_CRM_OPPORTUNITIES,
      PAGE_INVENTORY,
      PAGE_SALES,
      PAGE_PURCHASES,
      PAGE_ACCOUNTING,
      PAGE_HRMS,
      PAGE_REPORTS,
      PAGE_ADMIN_USERS,
      PAGE_ADMIN_SETTINGS
  );

  public static Set<String> defaultsForRole(RoleName roleName) {
    return switch (roleName) {
      case ROLE_ADMIN -> new LinkedHashSet<>(ALL_PERMISSIONS);
      case ROLE_SALES_MANAGER -> new LinkedHashSet<>(List.of(
          MODULE_CRM,
          MODULE_SALES,
          MODULE_REPORTS,
          PAGE_DASHBOARD,
          PAGE_CRM_LEADS,
          PAGE_CRM_PRESALES,
          PAGE_SALES,
          PAGE_REPORTS
      ));
      case ROLE_SALES_REP -> new LinkedHashSet<>(List.of(
          MODULE_CRM,
          MODULE_SALES,
          PAGE_DASHBOARD,
          PAGE_CRM_LEADS,
          PAGE_CRM_PRESALES,
          PAGE_SALES
      ));
      case ROLE_VIEWER -> new LinkedHashSet<>(List.of(
          MODULE_REPORTS,
          PAGE_DASHBOARD,
          PAGE_REPORTS
      ));
    };
  }
}
