"use client";

import React from "react";
import { NavLink } from "react-router-dom";

interface InventoryLayoutProps {
  children: React.ReactNode;
  addProductButton?: React.ReactNode;
}

function InventoryLayout({ children, addProductButton }: InventoryLayoutProps) {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `border-b-2 px-1 pb-2 text-sm font-semibold transition-colors ${
      isActive ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-900"
    }`;

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
              <span className="h-1 w-1 rounded-full bg-primary" />
              Module
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage products, stock movement, and inline stock control in one place.
          </p>
          <div className="mt-4 flex items-center gap-5 border-b border-slate-200">
            <NavLink to="/inventory" end className={navLinkClass}>
              Stock Control
            </NavLink>
            <NavLink to="/inventory/transactions" className={navLinkClass}>
              Transactions
            </NavLink>
          </div>
        </div>
        {addProductButton && (
          <div className="flex-shrink-0 pt-1">{addProductButton}</div>
        )}
      </div>

      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}

export { InventoryLayout };
export default InventoryLayout;
