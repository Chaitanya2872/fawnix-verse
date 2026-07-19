"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { getApiErrorMessage } from "@/services/api-client";
import { useInventoryOverview, useProducts, useTransactions, useWarehouses } from "./hooks";
import { InventoryLayout } from "./layout";
import {
  type CategoryMetric,
  InventoryDashboardMetrics,
  StockByCategoryPanel,
  StockHealthPanel,
  formatCompactCurrency,
  toNumber,
} from "./dashboard-shared";
import { type InventoryTransaction } from "./types";

const DASHBOARD_FILTER = {
  search: "",
  category: "",
  brand: "",
  status: "ALL" as const,
  page: 1,
  pageSize: 24,
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

function isInbound(type: InventoryTransaction["txnType"]) {
  return type === "RECEIVED" || type === "INWARD" || type === "OPENING";
}

function typeBadgeClass(type: InventoryTransaction["txnType"]) {
  return isInbound(type)
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    : "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
}

export default function InventoryPage() {
  const [categoryMetric, setCategoryMetric] = useState<CategoryMetric>("units");
  const overviewQuery = useInventoryOverview();
  const productsQuery = useProducts(DASHBOARD_FILTER);
  const transactionsQuery = useTransactions();
  const warehousesQuery = useWarehouses({ search: "", status: "ALL", page: 1, pageSize: 100 });

  const categories = useMemo(() => overviewQuery.data?.categories ?? [], [overviewQuery.data?.categories]);
  const products = useMemo(() => productsQuery.data?.data ?? [], [productsQuery.data?.data]);
  const recentTransactions = useMemo(
    () => (transactionsQuery.data?.data ?? []).slice(0, 8),
    [transactionsQuery.data?.data]
  );

  const analyticsSummary = useMemo(() => {
    const totalItems = overviewQuery.data?.totalProducts ?? 0;
    const totalCategories = overviewQuery.data?.totalCategories ?? 0;
    const totalStock = overviewQuery.data?.totalStockQty ?? 0;
    const lowStock = categories.reduce((total, category) => total + toNumber(category.lowStockCount), 0);
    const outOfStock = categories.reduce((total, category) => total + toNumber(category.outOfStockCount), 0);
    const visibleStockValue = products.reduce((total, product) => {
      return total + toNumber(product.stockQty) * toNumber(product.price);
    }, 0);

    return {
      totalItems,
      totalCategories,
      totalStock,
      lowStock,
      outOfStock,
      visibleStockValue,
    };
  }, [categories, overviewQuery.data, products]);

  return (
    <InventoryLayout
      title="Inventory"
      description="Watch stock performance at a glance, then drill into master data, warehouses, and movement when you need operational control."
      eyebrow="Operations"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/inventory/master-data"
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Master Data
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/inventory/transactions"
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Transaction Heatmap
          </Link>
        </div>
      }
    >
      <div className="space-y-3">
        <InventoryDashboardMetrics
          totalItems={analyticsSummary.totalItems}
          totalCategories={analyticsSummary.totalCategories}
          warehouseCount={warehousesQuery.data?.total ?? 0}
          inventoryValue={analyticsSummary.visibleStockValue}
        />

        <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <StockByCategoryPanel
            categories={categories}
            products={products}
            metric={categoryMetric}
            onMetricChange={setCategoryMetric}
          />
          <StockHealthPanel
            totalItems={analyticsSummary.totalItems}
            lowStock={analyticsSummary.lowStock}
            outOfStock={analyticsSummary.outOfStock}
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                <Sparkles className="h-3.5 w-3.5" />
                Recent Transactions
              </div>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">Latest stock movement</h2>
              <p className="mt-1 text-sm text-slate-500">
                This sits directly under the dashboard charts so the team can connect movement trends with the newest actions.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Visible stock value</p>
                <p className="mt-1 font-semibold text-slate-900">{formatCompactCurrency(analyticsSummary.visibleStockValue)}</p>
              </div>
              <Link
                to="/inventory/master-data"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Manage items
              </Link>
            </div>
          </div>

          {transactionsQuery.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : transactionsQuery.isError ? (
            <div className="p-6 text-sm text-rose-600">
              {getApiErrorMessage(transactionsQuery.error, "Failed to load inventory transactions.")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 text-right font-semibold">Quantity</th>
                    <th className="px-4 py-3 font-semibold">Reference</th>
                    <th className="px-4 py-3 font-semibold">Issued / Vendor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTransactions.length ? (
                    recentTransactions.map((item) => (
                      <tr key={item.id} className="transition-colors hover:bg-slate-50/80">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(item.txnDate)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{item.productName}</p>
                          <p className="text-xs text-slate-400">{item.sku}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${typeBadgeClass(item.txnType)}`}>
                            {item.txnType}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                          {formatQuantity(item.quantity)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{item.txnRef}</td>
                        <td className="px-4 py-3 text-slate-500">{item.issuedBy ?? item.vendorName ?? "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                        No recent transactions are available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </InventoryLayout>
  );
}
