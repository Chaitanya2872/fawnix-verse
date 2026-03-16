"use client";

import React from "react";

interface LeadsLayoutProps {
  children: React.ReactNode;
  actionButton?: React.ReactNode;
}

function LeadsLayout({ children, actionButton }: LeadsLayoutProps) {
  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-sky-600 dark:text-sky-400">
              <span className="h-1 w-1 rounded-full bg-sky-500" />
              CRM
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track, qualify and convert leads into opportunities.
          </p>
        </div>
        {actionButton && <div className="flex-shrink-0 pt-1">{actionButton}</div>}
      </div>
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}

export { LeadsLayout };
export default LeadsLayout;