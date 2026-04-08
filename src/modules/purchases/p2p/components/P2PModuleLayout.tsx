import { NavLink, Outlet } from "react-router-dom";

import { cn } from "@/lib/utils";
import { P2P_NAV_SECTIONS } from "../data";

export function P2PModuleLayout() {
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-0 lg:h-[calc(100vh-7rem)]">
        <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
              P2P Suite
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">Procure-to-Pay</h2>
            <p className="mt-1 text-sm text-slate-500">
              Navigate intake, approvals, purchase order, and downstream fulfillment.
            </p>
          </div>

          <div className="mt-4 flex-1 space-y-5 overflow-y-auto pr-1">
            {P2P_NAV_SECTIONS.map((section) => (
              <div key={section.heading} className="space-y-2">
                <p className="px-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {section.heading}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition",
                          isActive
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-transparent text-slate-600 hover:border-blue-100 hover:bg-slate-50 hover:text-blue-700"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={cn(
                              "shrink-0 text-slate-400 transition-colors group-hover:text-blue-600",
                              isActive && "text-blue-600"
                            )}
                          >
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
