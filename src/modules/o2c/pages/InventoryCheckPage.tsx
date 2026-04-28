import { useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { AlertTriangle, Box, CheckCircle2, Wrench } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useOrders } from "../hooks/useOrders";
import { formatCurrency } from "../utils/format";
import { InventoryCheckStatus, OrderStatus, type InventoryCheckResult } from "../types";
import { INVENTORY_STATUS_LABELS } from "../utils/status";
import * as inventoryService from "../services/inventoryService";
import { seedProducts } from "../utils/seed";
import { toApiError } from "@/services/api";
import { toast } from "react-toastify";

export default function InventoryCheckPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const { getOrderById, inventoryResults, setInventoryResult, updateOrderStatus } = useOrders();
  const order = Number.isNaN(orderId) ? undefined : getOrderById(orderId);
  const [isChecking, setIsChecking] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!order) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Order not found. <NavLink to="/orders" className="text-blue-600">Return to list</NavLink>.
      </div>
    );
  }

  const result = inventoryResults[order.id];

  const fallbackCheck = (): InventoryCheckResult => {
    const missingItems = order.items.filter((item) => {
      const product = item.product ?? seedProducts.find((p) => p.id === item.product_id);
      return product ? item.quantity > product.stock_quantity : true;
    });

    let status = InventoryCheckStatus.FULL;
    if (missingItems.length === order.items.length) {
      status = InventoryCheckStatus.OUT_OF_STOCK;
    } else if (missingItems.length > 0) {
      status = InventoryCheckStatus.PARTIAL;
    }

    return { status, missingItems };
  };

  async function handleCheck() {
    setIsChecking(true);
    setError(null);
    try {
      const data = await inventoryService.checkInventory(order.id);
      setInventoryResult(order.id, data);
      toast.success("Inventory check completed.");
    } catch (err) {
      const apiError = toApiError(err, "Unable to check inventory.");
      setError(apiError.message);
      const fallback = fallbackCheck();
      setInventoryResult(order.id, fallback);
      toast.error(apiError.message);
    } finally {
      setIsChecking(false);
    }
  }

  async function handleIssueMaterial() {
    setIsIssuing(true);
    setError(null);
    try {
      await inventoryService.issueMaterial(order.id);
      await updateOrderStatus(order.id, OrderStatus.MATERIAL_ISSUED);
      toast.success("Material issued to warehouse.");
    } catch (err) {
      const apiError = toApiError(err, "Unable to issue material.");
      setError(apiError.message);
      toast.error(apiError.message);
    } finally {
      setIsIssuing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Order #{order.id}</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Inventory Check</h2>
          <p className="text-sm text-slate-500">Validate available stock for each line item.</p>
        </div>
        <NavLink
          to={`/orders/${order.id}`}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Back to order
        </NavLink>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Box className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Inventory Status</span>
          </div>
          {result ? <StatusBadge status={result.status} /> : null}
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {result
            ? `Result: ${INVENTORY_STATUS_LABELS[result.status]}`
            : "Run inventory validation to see availability."}
        </p>
        {error ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
            {error}
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCheck}
            disabled={isChecking}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-70"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isChecking ? "Checking..." : "Check Inventory"}
          </button>
          <button
            type="button"
            onClick={handleIssueMaterial}
            disabled={isIssuing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 disabled:opacity-70"
          >
            <Wrench className="h-4 w-4" />
            {isIssuing ? "Issuing..." : "Issue Material"}
          </button>
          {result?.status === InventoryCheckStatus.OUT_OF_STOCK ? (
            <span className="inline-flex items-center gap-1 text-xs text-rose-600">
              <AlertTriangle className="h-3 w-3" />
              Stock shortages detected.
            </span>
          ) : null}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">Line Items</h3>
        <div className="mt-4">
          <Table
            data={order.items}
            rowKey={(row) => row.id}
            columns={[
              {
                key: "product",
                header: "Product",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-slate-900">{row.product?.name ?? "Product"}</p>
                    <p className="text-xs text-slate-500">SKU: {row.product?.sku ?? row.product_id}</p>
                  </div>
                ),
              },
              {
                key: "qty",
                header: "Qty",
                render: (row) => row.quantity,
              },
              {
                key: "price",
                header: "Unit Price",
                render: (row) => formatCurrency(row.price),
              },
              {
                key: "total",
                header: "Line Total",
                render: (row) => formatCurrency(row.price * row.quantity),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
