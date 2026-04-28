import { NavLink } from "react-router-dom";
import { ArrowUpRight, FileText, PackageCheck, PlusCircle } from "lucide-react";
import { Loader } from "../components/Loader";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useOrders } from "../hooks/useOrders";
import { formatCurrency, formatDateShort } from "../utils/format";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "../utils/status";
import { OrderStatus } from "../types";

export default function DashboardPage() {
  const { orders, isLoading, error } = useOrders();

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Loader label="Loading O2C dashboard" />
      </div>
    );
  }

  const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
  const openOrders = orders.filter((order) => order.status !== OrderStatus.CLOSED).length;
  const invoiced = orders.filter((order) => order.status === OrderStatus.INVOICED).length;
  const paid = orders.filter((order) => order.status === OrderStatus.PAID).length;

  const statusCounts = ORDER_STATUS_FLOW.reduce<Record<OrderStatus, number>>((acc, status) => {
    acc[status] = orders.filter((order) => order.status === status).length;
    return acc;
  }, {
    [OrderStatus.CREATED]: 0,
    [OrderStatus.INVENTORY_CHECKED]: 0,
    [OrderStatus.MATERIAL_ISSUED]: 0,
    [OrderStatus.DC_CREATED]: 0,
    [OrderStatus.INVOICED]: 0,
    [OrderStatus.PAID]: 0,
    [OrderStatus.CLOSED]: 0,
  });

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          {error}
        </div>
      ) : null}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Order to Cash
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              Keep revenue flowing from order to payment.
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track every order, inventory check, and invoice in one place.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <NavLink
              to="/orders"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300"
            >
              <FileText className="h-4 w-4" />
              View Orders
            </NavLink>
            <NavLink
              to="/orders/new"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700"
            >
              <PlusCircle className="h-4 w-4" />
              Create Order
            </NavLink>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Revenue</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Across all open and closed orders.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Open Orders</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{openOrders}</p>
          <p className="mt-1 text-xs text-slate-500">Orders still moving through O2C.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Invoiced</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{invoiced}</p>
          <p className="mt-1 text-xs text-slate-500">Awaiting payment capture.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Paid</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{paid}</p>
          <p className="mt-1 text-xs text-slate-500">Ready to close and hand off.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Recent Orders</p>
              <p className="text-sm text-slate-500">Latest activity across the pipeline.</p>
            </div>
            <NavLink
              to="/orders"
              className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View all
              <ArrowUpRight className="h-3 w-3" />
            </NavLink>
          </div>
          <Table
            data={recentOrders}
            rowKey={(row) => row.id}
            columns={[
              {
                key: "id",
                header: "Order",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-slate-900">#{row.id}</p>
                    <p className="text-xs text-slate-500">{row.customer?.name ?? "Unknown"}</p>
                  </div>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (row) => <StatusBadge status={row.status} />,
              },
              {
                key: "amount",
                header: "Amount",
                render: (row) => formatCurrency(row.total_amount),
                className: "font-semibold text-slate-700",
              },
              {
                key: "date",
                header: "Created",
                render: (row) => formatDateShort(row.created_at),
              },
            ]}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pipeline</p>
              <p className="text-sm text-slate-500">Orders by stage.</p>
            </div>
            <PackageCheck className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-3">
            {ORDER_STATUS_FLOW.map((status) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  {ORDER_STATUS_LABELS[status]}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {statusCounts[status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
