/* eslint-disable react-refresh/only-export-components */
"use client";

import React from "react";
import { Building2, Boxes, IndianRupee, Package, Tags } from "lucide-react";
import type { InventoryCategorySummary, Product } from "./types";

export type CategoryMetric = "units" | "value";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
}

export function formatCompactCurrency(value: number) {
  if (value >= 10_000_000) {
    return `${new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value / 10_000_000)} Cr`;
  }

  if (value >= 100_000) {
    return `${new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value / 100_000)} L`;
  }

  return formatCurrency(value);
}

export function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export function getStockHealthPercent(totalItems: number, lowStock: number, outOfStock: number) {
  if (!totalItems) return 0;
  return Math.max(0, Math.round(((totalItems - lowStock - outOfStock) / totalItems) * 100));
}

export function DashboardMetricCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "violet" | "amber";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${toneClass}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        </div>
      </div>
    </div>
  );
}

export function InventoryDashboardMetrics({
  totalItems,
  totalCategories,
  warehouseCount,
  inventoryValue,
}: {
  totalItems: number;
  totalCategories: number;
  warehouseCount: number;
  inventoryValue: number;
}) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <DashboardMetricCard
        label="Total Items"
        value={totalItems.toLocaleString("en-IN")}
        helper="All Products"
        icon={<Boxes className="h-5 w-5" />}
        tone="blue"
      />
      <DashboardMetricCard
        label="Categories"
        value={totalCategories.toLocaleString("en-IN")}
        helper="Product Categories"
        icon={<Tags className="h-5 w-5" />}
        tone="emerald"
      />
      <DashboardMetricCard
        label="Warehouses"
        value={warehouseCount.toLocaleString("en-IN")}
        helper="Active Warehouses"
        icon={<Building2 className="h-5 w-5" />}
        tone="violet"
      />
      <DashboardMetricCard
        label="Inventory Value"
        value={formatCompactCurrency(inventoryValue)}
        helper="Current Stock Value"
        icon={<IndianRupee className="h-5 w-5" />}
        tone="amber"
      />
    </section>
  );
}

export function StockByCategoryPanel({
  categories,
  products,
  metric,
  onMetricChange,
}: {
  categories: InventoryCategorySummary[];
  products: Product[];
  metric: CategoryMetric;
  onMetricChange: (metric: CategoryMetric) => void;
}) {
  const categoryValueMap = products.reduce<Record<string, number>>((acc, product) => {
    acc[product.category] = (acc[product.category] || 0) + toNumber(product.stockQty) * toNumber(product.price);
    return acc;
  }, {});

  const rows = categories
    .slice()
    .sort((left, right) => toNumber(right.totalStockQty) - toNumber(left.totalStockQty))
    .slice(0, 5)
    .map((category) => ({
      category: category.category,
      value: metric === "units" ? toNumber(category.totalStockQty) : categoryValueMap[category.category] || 0,
    }));
  const maxValue = Math.max(...rows.map((row) => row.value), 1);
  const tones = [
    { icon: "bg-blue-50 text-blue-700", bar: "bg-blue-600" },
    { icon: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" },
    { icon: "bg-violet-50 text-violet-700", bar: "bg-violet-500" },
    { icon: "bg-amber-50 text-amber-700", bar: "bg-amber-500" },
    { icon: "bg-rose-50 text-rose-700", bar: "bg-rose-500" },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-950">Stock by Category</h2>
          <p className="mt-1 text-xs text-slate-500">Units on hand across product categories</p>
        </div>
        <div className="inline-flex w-max rounded-md border border-slate-200 bg-slate-50 p-0.5">
          {(["units", "value"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onMetricChange(option)}
              className={`rounded px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                metric === option ? "bg-brand-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {rows.length ? (
          rows.map((row, index) => {
            const tone = tones[index % tones.length];
            const width = `${Math.max(5, Math.round((row.value / maxValue) * 100))}%`;
            const displayValue = metric === "units" ? row.value.toLocaleString("en-IN") : formatCompactCurrency(row.value);

            return (
              <div key={row.category} className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_86px] sm:items-center">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${tone.icon}`}>
                    <Package className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate text-xs font-semibold text-slate-700">{row.category}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div className={`h-2.5 rounded-full ${tone.bar}`} style={{ width }} />
                </div>
                <span className="text-right text-xs font-bold text-slate-700">{displayValue}</span>
              </div>
            );
          })
        ) : (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
            Category stock appears here once items are available.
          </div>
        )}
      </div>
    </div>
  );
}

export function StockHealthPanel({
  totalItems,
  lowStock,
  outOfStock,
}: {
  totalItems: number;
  lowStock: number;
  outOfStock: number;
}) {
  const healthy = Math.max(0, totalItems - lowStock - outOfStock);
  const healthyPercent = getStockHealthPercent(totalItems, lowStock, outOfStock);
  const healthyDegrees = totalItems ? (healthy / totalItems) * 360 : 0;
  const lowDegrees = totalItems ? (lowStock / totalItems) * 360 : 0;
  const outDegrees = totalItems ? (outOfStock / totalItems) * 360 : 0;
  const donutStyle = {
    background: totalItems
      ? `conic-gradient(#10b981 0deg ${healthyDegrees}deg, #f59e0b ${healthyDegrees}deg ${
          healthyDegrees + lowDegrees
        }deg, #f43f5e ${healthyDegrees + lowDegrees}deg ${
          healthyDegrees + lowDegrees + outDegrees
        }deg, #e2e8f0 ${healthyDegrees + lowDegrees + outDegrees}deg 360deg)`
      : "#e2e8f0",
  };

  const rows = [
    { label: "Healthy", value: healthy, percent: healthyPercent, dot: "bg-emerald-500" },
    {
      label: "Low Stock",
      value: lowStock,
      percent: totalItems ? Math.round((lowStock / totalItems) * 100) : 0,
      dot: "bg-amber-500",
    },
    {
      label: "Out of Stock",
      value: outOfStock,
      percent: totalItems ? Math.round((outOfStock / totalItems) * 100) : 0,
      dot: "bg-rose-500",
    },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div>
        <h2 className="text-sm font-bold text-slate-950">Stock Health</h2>
        <p className="mt-1 text-xs text-slate-500">Overview of stock availability</p>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[120px_130px_minmax(0,1fr)] lg:items-center">
        <div>
          <p className="text-4xl font-bold text-slate-950">{healthyPercent}%</p>
          <p className="mt-1 text-lg font-bold text-emerald-600">Healthy</p>
        </div>
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full" style={donutStyle}>
          <div className="h-16 w-16 rounded-full bg-white shadow-inner" />
        </div>
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_70px] items-center gap-3 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${row.dot}`} />
                <span className="font-semibold text-slate-700">{row.label}</span>
              </div>
              <span className="text-right font-bold text-slate-700">
                {row.percent}% ({row.value})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
