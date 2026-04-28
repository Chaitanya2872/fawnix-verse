import { NavLink, useParams } from "react-router-dom";
import { ArrowUpRight, PackageCheck, ReceiptText } from "lucide-react";
import { Loader } from "../components/Loader";
import { StatusBadge } from "../components/StatusBadge";
import { Stepper } from "../components/Stepper";
import { Table } from "../components/Table";
import { useOrders } from "../hooks/useOrders";
import { formatCurrency, formatDateShort } from "../utils/format";
import { ORDER_STATUS_FLOW, ORDER_STEP_LABELS } from "../utils/status";

export default function OrderDetailsPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const { getOrderById, isLoading } = useOrders();
  const order = Number.isNaN(orderId) ? undefined : getOrderById(orderId);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Loader label="Loading order" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Order not found. <NavLink to="/orders" className="text-blue-600">Return to list</NavLink>.
      </div>
    );
  }

  const currentIndex = Math.max(0, ORDER_STATUS_FLOW.indexOf(order.status));
  const steps = ORDER_STEP_LABELS.map((label, index) => ({
    label,
    state: index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming",
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Order #{order.id}</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            {order.customer?.name ?? "Customer"}
          </h2>
          <p className="text-sm text-slate-500">Created {formatDateShort(order.created_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          <NavLink
            to={`/orders/${order.id}/inventory`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300"
          >
            <PackageCheck className="h-4 w-4" />
            Inventory
          </NavLink>
          <NavLink
            to={`/orders/${order.id}/delivery`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300"
          >
            <ReceiptText className="h-4 w-4" />
            Delivery Challan
          </NavLink>
          <NavLink
            to={`/orders/${order.id}/invoice`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300"
          >
            <ArrowUpRight className="h-4 w-4" />
            Invoice
          </NavLink>
          <NavLink
            to={`/orders/${order.id}/payment`}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700"
          >
            Collect Payment
          </NavLink>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">Order Progress</h3>
        <div className="mt-4">
          <Stepper steps={steps} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">Customer</h3>
          <div className="mt-3 space-y-1 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">{order.customer?.name ?? "Unknown"}</p>
            <p>{order.customer?.email ?? "No email"}</p>
            <p>{order.customer?.phone ?? "No phone"}</p>
            <p className="text-xs text-slate-500">{order.customer?.address ?? "No address"}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">Totals</h3>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Items</span>
              <span className="font-semibold text-slate-700">{order.items.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Order Value</span>
              <span className="font-semibold text-slate-900">{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">Next Steps</h3>
          <p className="mt-2 text-sm text-slate-500">
            Move this order forward by checking inventory, issuing material, and invoicing.
          </p>
          <NavLink
            to={`/orders/${order.id}/inventory`}
            className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            Start inventory check
            <ArrowUpRight className="h-3 w-3" />
          </NavLink>
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
                header: "Price",
                render: (row) => formatCurrency(row.price),
              },
              {
                key: "total",
                header: "Line Total",
                render: (row) => formatCurrency(row.price * row.quantity),
                className: "font-semibold text-slate-700",
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
