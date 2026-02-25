import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout() {
  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900">
      <div className="flex h-full overflow-hidden">

        {/* Sidebar */}
        <Sidebar />

        {/* Main Area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

          {/* Topbar */}
          <Topbar />

          {/* Page Content — no max-width wrapper, modules own their own layout */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>

        </div>
      </div>
    </div>
  );
}