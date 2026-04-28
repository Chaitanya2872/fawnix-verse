import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { Filter, PlusCircle, Search } from "lucide-react";
import { Loader } from "../components/Loader";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useOrders } from "../hooks/useOrders";
import { formatCurrency, formatDateShort } from "../utils/format";
import { ORDER_STATUS_LABELS } from "../utils/status";
import { OrderStatus } from "../types";

const STATUS_OPTIONS = [
  { label: "All", value: "ALL" },
  ...Object.values(OrderStatus).map((status) => ({
    label: ORDER_STATUS_LABELS[status],
    value: status,
  })),
] as const;

type StatusFilter = "ALL" | OrderStatus;

export default function OrdersListPage() {
  const { orders, isLoading, error } = useOrders();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        String(order.id).includes(normalizedSearch) ||
        (order.customer?.name ?? "").toLowerCase().includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    });
  }, [orders, searchTerm, statusFilter]);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Loader label="Loading orders" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          {error}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Orders</h2>
          <p className="text-sm text-slate-500">Search, filter, and move orders forward.</p>
        </div>
        <NavLink
          to="/orders/new"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700"
        >
          <PlusCircle className="h-4 w-4" />
          Create Order
        </NavLink>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by order ID or customer"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="bg-transparent text-sm text-slate-700 focus:outline-none"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Table
        data={filteredOrders}
        rowKey={(row) => row.id}
        emptyState="No orders match the current filters."
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
            key: "created",
            header: "Created",
            render: (row) => formatDateShort(row.created_at),
          },
          {
            key: "action",
            header: "",
            render: (row) => (
              <NavLink
                to={`/orders/${row.id}`}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                View Details
              </NavLink>
            ),
            className: "text-right",
            headerClassName: "text-right",
          },
        ]}
      />
    </div>
  );
}
