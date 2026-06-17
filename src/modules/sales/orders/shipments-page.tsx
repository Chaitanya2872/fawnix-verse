"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateDeliveryDrawer, toLabel } from "./components";
import {
  useCreateSalesDelivery,
  useSalesDeliveries,
  useSalesOrders,
  useUpdateSalesDeliveryStatus,
} from "./hooks";
import {
  SalesDeliveryStatus,
  type CreateSalesDeliveryInput,
} from "./types";

export default function SalesShipmentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderIdFilter = searchParams.get("orderId") ?? "";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | SalesDeliveryStatus>("ALL");
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateSalesDeliveryInput>({ salesOrderId: orderIdFilter });

  const deliveriesQuery = useSalesDeliveries();
  const ordersQuery = useSalesOrders({ search: "", status: "ALL", page: 1, pageSize: 200 });
  const createMutation = useCreateSalesDelivery();
  const statusMutation = useUpdateSalesDeliveryStatus();

  const deliveries = deliveriesQuery.data?.data ?? [];
  const orders = ordersQuery.data?.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return deliveries.filter((delivery) => {
      if (orderIdFilter && delivery.salesOrderId !== orderIdFilter) return false;
      if (statusFilter !== "ALL" && delivery.status !== statusFilter) return false;
      if (!term) return true;
      return [delivery.deliveryNumber, delivery.salesOrderNumber, delivery.customerName, delivery.carrier, delivery.trackingNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [deliveries, orderIdFilter, search, statusFilter]);

  const orderOptions = useMemo(
    () => orders.map((order) => ({ id: order.id, label: `${order.orderNumber} • ${order.customerName}` })),
    [orders]
  );

  return (
    <div className="space-y-5 text-slate-900">
      <section className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Shipments</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Manage Shipments</h1>
          <p className="mt-1 text-sm text-slate-500">Dispatch and delivery records live here, separate from the order list.</p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)} className="rounded-xl bg-slate-950 px-4 text-white hover:bg-slate-800">
          <Plus className="h-4 w-4" />
          Create Shipment
        </Button>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search shipment, order, customer, carrier"
              className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "ALL" | SalesDeliveryStatus)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
            >
              <option value="ALL">All statuses</option>
              {Object.values(SalesDeliveryStatus).map((status) => (
                <option key={status} value={status}>
                  {toLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50/80">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <th className="px-5 py-3">Shipment No</th>
                <th className="px-5 py-3">Order No</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Scheduled</th>
                <th className="px-5 py-3">Carrier</th>
                <th className="px-5 py-3">Tracking</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deliveriesQuery.isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td className="px-5 py-4" colSpan={8}>
                      <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : filtered.length ? (
                filtered.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4 font-semibold text-slate-950">{delivery.deliveryNumber}</td>
                    <td className="px-5 py-4 text-slate-700">{delivery.salesOrderNumber}</td>
                    <td className="px-5 py-4 text-slate-700">{delivery.customerName}</td>
                    <td className="px-5 py-4">
                      <select
                        value={delivery.status}
                        onChange={(event) => statusMutation.mutate({ id: delivery.id, status: event.target.value as SalesDeliveryStatus })}
                        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700"
                      >
                        {Object.values(SalesDeliveryStatus).map((status) => (
                          <option key={status} value={status}>
                            {toLabel(status)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{delivery.scheduledDate ? new Date(delivery.scheduledDate).toLocaleDateString("en-US") : "Not scheduled"}</td>
                    <td className="px-5 py-4 text-slate-600">{delivery.carrier ?? "Pending"}</td>
                    <td className="px-5 py-4 text-slate-600">{delivery.trackingNumber ?? "Pending"}</td>
                    <td className="px-5 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 border-slate-200 bg-white">
                          <DropdownMenuItem onClick={() => navigate(`/sales/orders/${delivery.salesOrderId}`)}>View Order</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/sales/orders/${delivery.salesOrderId}?panel=invoice`)}>View Invoice</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-500">
                    No shipment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CreateDeliveryDrawer
        open={isCreateOpen}
        onOpenChange={setCreateOpen}
        orderOptions={orderOptions}
        form={form}
        pending={createMutation.isPending}
        onFieldChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
        onSubmit={() =>
          createMutation.mutate(form, {
            onSuccess: () => {
              toast.success("Shipment created.");
              setCreateOpen(false);
              setForm({ salesOrderId: orderIdFilter });
            },
            onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create shipment."),
          })
        }
      />
    </div>
  );
}
