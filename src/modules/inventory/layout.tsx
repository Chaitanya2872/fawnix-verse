"use client";

import React from "react";

interface InventoryLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  addProductButton?: React.ReactNode;
}

function InventoryLayout({
  children,
  title = "Inventory",
  description = "Manage products, stock movement, and inline stock control in one place.",
  eyebrow = "Module",
  actions,
  addProductButton,
}: InventoryLayoutProps) {
  const headerActions = actions ?? addProductButton;

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
              <span className="h-1 w-1 rounded-full bg-primary" />
              {eyebrow}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        {headerActions && (
          <div className="flex-shrink-0 pt-1">{headerActions}</div>
        )}
      </div>

      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}

export { InventoryLayout };
export default InventoryLayout;
