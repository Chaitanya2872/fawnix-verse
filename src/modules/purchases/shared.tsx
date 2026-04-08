import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "P2P Dashboard", to: "/p2p" },
  { label: "PR Input", to: "/p2p/pr" },
  { label: "Purchase Order", to: "/p2p/po" },
];

export function P2PHeader() {
  return (
    <header className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Procurement-to-Purchase
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">P2P Workflow Console</h1>
          <p className="text-sm text-slate-500">
            Track procurement requirements, approvals, and signed documents end-to-end.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm">
          <span className="text-slate-500">Request ID</span>
          <span className="font-semibold text-slate-900">P2P-REQ-1024</span>
        </div>
      </div>
    </header>
  );
}

export function P2PNavigation() {
  return (
    <nav className="flex flex-wrap items-center gap-2">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/p2p"}
          className={({ isActive }) =>
            cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition",
              isActive
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
