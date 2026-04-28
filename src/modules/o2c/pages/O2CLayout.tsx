import { NavLink, Outlet } from "react-router-dom";
import { LayoutGrid, ListChecks, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderProvider } from "../context/OrderContext";

const navItems = [
  { label: "Dashboard", to: "/", icon: LayoutGrid, end: true },
  { label: "Orders", to: "/orders", icon: ListChecks },
  { label: "Create Order", to: "/orders/new", icon: PlusCircle },
];

export default function O2CLayout() {
  return (
    <OrderProvider>
      <div className="flex flex-col gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                O2C Control Center
              </p>
              <p className="text-sm text-slate-500">
                Orchestrate every stage from order intake to cash collection.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition",
                        isActive
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>

        <Outlet />
      </div>
    </OrderProvider>
  );
}
