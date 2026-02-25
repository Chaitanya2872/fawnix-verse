import { useState, type FocusEvent } from "react";
import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  Building2,
  Calculator,
  LayoutDashboard,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Target,
  UserPlus,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

type SidebarNavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
};

type SidebarNavSection = {
  heading: string;
  items: readonly SidebarNavItem[];
};

const ERP_NAV_SECTIONS: readonly SidebarNavSection[] = [
  {
    heading: "Main",
    items: [
      { label: "Dashboard", to: "/", icon: LayoutDashboard, end: true },
    ],
  },
  {
    heading: "Operations",
    items: [
      { label: "Inventory", to: "/inventory", icon: Boxes },
      { label: "Sales", to: "/sales", icon: ShoppingCart },
      { label: "Purchases", to: "/purchases", icon: ShoppingBag },
    ],
  },
  {
    heading: "CRM",
    items: [
      { label: "Leads", to: "/crm/leads", icon: UserPlus },
      { label: "Opportunities", to: "/crm/opportunities", icon: Target },
    ],
  },
  {
    heading: "Finance",
    items: [
      { label: "Accounting", to: "/accounting", icon: Calculator },
      { label: "Reports", to: "/reports", icon: BarChart3 },
    ],
  },
  {
    heading: "Administration",
    items: [
      { label: "Users", to: "/users", icon: Users },
      { label: "Settings", to: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const isCollapsed = !isExpanded;

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
          {ERP_NAV_SECTIONS.map((section) => (
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
                {section.items.map((item) => {
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
          ))}
        </nav>
      </div>
    </aside>
  );
}
