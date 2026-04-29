import { useState, type FocusEvent } from "react";
import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  Briefcase,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  Building2,
  Calculator,
  FileCheck2,
  FileText,
  LayoutDashboard,
  Network,
  Settings,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Target,
  UserRoundSearch,
  UserPlus,
  Users,
  CreditCard,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { hasStoredSession } from "@/services/api-client";
import { useCurrentUser } from "@/modules/auth/hooks";
import { PERMISSIONS, type Permission, hasPermission } from "@/modules/auth/permissions";

type SidebarNavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  permission?: Permission;
};

type SidebarNavSection = {
  heading: string;
  items: readonly SidebarNavItem[];
};

const ERP_NAV_SECTIONS: readonly SidebarNavSection[] = [
  {
    heading: "Main",
    items: [
      { label: "Dashboard", to: "/", icon: LayoutDashboard, end: true, permission: PERMISSIONS.PAGE_DASHBOARD },
    ],
  },
  {
    heading: "Operations",
    items: [
          { label: "Order to Cash", to: "/orders", icon: FileText },
      { label: "Inventory", to: "/inventory", icon: Boxes, permission: PERMISSIONS.PAGE_INVENTORY },
      { label: "Sales", to: "/sales", icon: ShoppingCart, permission: PERMISSIONS.PAGE_SALES },
      { label: "Project Management", to: "/project-management/projects", icon: Briefcase },
        { label: "Purchases", to: "/purchases", icon: ShoppingBag, permission: PERMISSIONS.PAGE_PURCHASES },
   
     ],
  },
  {
    heading: "P2P",
    items: [
      { label: "PR Management", to: "/p2p/pr", icon: ClipboardList, permission: PERMISSIONS.PAGE_PURCHASES },
      { label: "Vendor Management", to: "/p2p/vendors", icon: Building2, permission: PERMISSIONS.PAGE_PURCHASES },
      { label: "Purchase Order", to: "/p2p/po", icon: ShoppingCart, permission: PERMISSIONS.PAGE_PURCHASES },
      { label: "Material Receipt", to: "/p2p/receipt", icon: Truck, permission: PERMISSIONS.PAGE_PURCHASES },
      { label: "Invoice", to: "/p2p/invoice", icon: FileText, permission: PERMISSIONS.PAGE_PURCHASES },
      { label: "Payment", to: "/p2p/payment", icon: CreditCard, permission: PERMISSIONS.PAGE_PURCHASES },

    ],
  },
  {
    heading: "CRM",
    items: [
      { label: "Leads", to: "/crm/leads", icon: UserPlus, permission: PERMISSIONS.PAGE_CRM_LEADS },
      { label: "Quotations", to: "/sales", icon: FileText, permission: PERMISSIONS.PAGE_SALES },
      { label: "Analytics", to: "/reports", icon: BarChart3, permission: PERMISSIONS.PAGE_REPORTS },
      {label: "Integrations", to: "/settings", icon: Settings, permission: PERMISSIONS.PAGE_ADMIN_SETTINGS },
    ],
  },
  {
    heading: "Talent",
    items: [
      { label: "Hiring Requests", to: "/recruitment/hiring-requests", icon: ClipboardList, permission: PERMISSIONS.MODULE_RECRUITMENT },
      { label: "Positions", to: "/recruitment/positions", icon: Briefcase, permission: PERMISSIONS.MODULE_RECRUITMENT },
      { label: "Intake", to: "/recruitment/intake", icon: UserRoundSearch, permission: PERMISSIONS.MODULE_RECRUITMENT },
      { label: "Pipeline", to: "/recruitment/pipeline", icon: Target, permission: PERMISSIONS.MODULE_RECRUITMENT },
      { label: "Candidates", to: "/recruitment/candidates", icon: UserRoundSearch, permission: PERMISSIONS.MODULE_RECRUITMENT },
      { label: "Interviews", to: "/recruitment/interviews", icon: CalendarClock, permission: PERMISSIONS.MODULE_RECRUITMENT },
      { label: "Offers", to: "/recruitment/offers", icon: FileCheck2, permission: PERMISSIONS.MODULE_RECRUITMENT },
      { label: "Recruitment Analytics", to: "/recruitment/analytics", icon: BarChart3, permission: PERMISSIONS.MODULE_RECRUITMENT },
    ],
  },
  {
    heading: "Organization",
    items: [
      { label: "Setup", to: "/setup", icon: Settings2, permission: PERMISSIONS.MODULE_ORG },
      { label: "Structure", to: "/organization/structure", icon: Network, permission: PERMISSIONS.MODULE_ORG },
      { label: "Approvals", to: "/approvals", icon: CheckSquare, permission: PERMISSIONS.MODULE_APPROVALS },
      { label: "Forms", to: "/forms", icon: FileText, permission: PERMISSIONS.MODULE_FORMS },
    ],
  },
  {
    heading: "Integrations",
    items: [
      { label: "CRM Integrations", to: "/settings", icon: Settings, permission: PERMISSIONS.PAGE_ADMIN_SETTINGS },
    ],
  },
  {
    heading: "Finance",
    items: [
      { label: "Accounting", to: "/accounting", icon: Calculator, permission: PERMISSIONS.PAGE_ACCOUNTING },
      { label: "Reports", to: "/reports", icon: BarChart3, permission: PERMISSIONS.PAGE_REPORTS },
    ],
  },
  {
    heading: "Administration",
    items: [
      { label: "Users", to: "/users", icon: Users, permission: PERMISSIONS.PAGE_ADMIN_USERS },
    ],
  },
];

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const isCollapsed = !isExpanded;
  const { data: currentUser } = useCurrentUser({ enabled: hasStoredSession() });

  const isItemVisible = (item: SidebarNavItem) => {
    if (!item.permission) return true;
    return hasPermission(currentUser, item.permission);
  };

  function handleBlur(event: FocusEvent<HTMLElement>): void {
    const nextFocusedElement = event.relatedTarget;
    if (
      nextFocusedElement instanceof Node &&
      event.currentTarget.contains(nextFocusedElement)
    ) {
      return;
    }
    setIsExpanded(false);
  }

  return (
    <aside
      className={cn(
        "h-screen shrink-0 border-r border-blue-100 bg-white text-slate-700 transition-[width] duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}
      aria-label="ERP navigation sidebar"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      onFocusCapture={() => setIsExpanded(true)}
      onBlurCapture={handleBlur}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b border-blue-100 px-3">
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center",
              isCollapsed ? "justify-center" : "gap-3"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
              <Building2 className="h-4 w-4" aria-hidden="true" />
            </div>

            <div
              className={cn(
                "min-w-0 overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-200",
                isCollapsed ? "max-w-0 opacity-0" : "max-w-36 opacity-100"
              )}
            >
              <p className="truncate text-sm font-semibold tracking-tight">Fawnix ERP</p>
              <p className="truncate text-xs text-slate-500">Enterprise Suite</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {ERP_NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter(isItemVisible);
            if (visibleItems.length === 0) {
              return null;
            }
            return (
            <section key={section.heading} className="space-y-2">
              <h2
                className={cn(
                  "px-3 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-400",
                  isCollapsed && "sr-only"
                )}
              >
                {section.heading}
              </h2>

              <ul className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        title={isCollapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          cn(
                            "group flex items-center rounded-md border-l-2 py-2.5 text-sm font-medium transition-colors duration-200",
                            isCollapsed
                              ? "justify-center gap-0 px-2"
                              : "gap-3 px-3",
                            isActive
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-transparent text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={cn(
                                "h-4 w-4 shrink-0 transition-colors duration-200",
                                isActive
                                  ? "text-blue-600"
                                  : "text-slate-400 group-hover:text-blue-600"
                              )}
                              aria-hidden="true"
                            />
                            <span
                              className={cn(
                                "overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-200",
                                isCollapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100"
                              )}
                            >
                              {item.label}
                            </span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </section>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
