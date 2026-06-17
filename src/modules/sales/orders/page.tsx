"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, MoreHorizontal, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuotes } from "@/modules/sales/hooks";
import { QuoteStatus } from "@/modules/sales/types";
import {
  CreateOrderDrawer,
  OrderDetailDrawer,
  fmtCurrency,
  toLabel,
} from "./components";
import {
  useCreateSalesOrder,
  useSalesDeliveries,
  useSalesInvoices,
  useSalesOrder,
  useSalesPayments,
  useSalesOrders,
  useUpdateSalesOrder,
  useUpdateSalesOrderStatus,
} from "./hooks";
import {
  PaymentMode,
  SalesDeliveryStatus,
  SalesInvoiceStatus,
  SalesOrderStatus,
  type CreateSalesOrderInput,
  type ManualOrderFormState,
  type ManualOrderItemDraft,
  type SalesOrder,
  type SalesOrderFilter,
  type SalesOrderSummary,
  type UpdateSalesOrderInput,
} from "./types";

const PAGE_SIZE = 50;

const DRAWER_STATUS_OPTIONS: SalesOrderStatus[] = [
  SalesOrderStatus.DRAFT,
  SalesOrderStatus.SUBMITTED,
  SalesOrderStatus.PENDING_APPROVAL,
  SalesOrderStatus.APPROVED,
  SalesOrderStatus.REJECTED,
  SalesOrderStatus.CONFIRMED,
  SalesOrderStatus.PARTIALLY_DELIVERED,
  SalesOrderStatus.DELIVERED,
  SalesOrderStatus.INVOICED,
  SalesOrderStatus.PARTIALLY_PAID,
  SalesOrderStatus.PAID,
  SalesOrderStatus.CLOSED,
  SalesOrderStatus.CANCELLED,
];

function createDraftItem(): ManualOrderItemDraft {
  return {
    key: globalThis.crypto.randomUUID(),
    inventoryProductId: "",
    name: "",
    make: "",
    description: "",
    utility: "",
    quantity: "1",
    unit: "",
    unitPrice: "0",
  };
}

function createInitialManualForm(): ManualOrderFormState {
  return {
    customerName: "",
    company: "",
    email: "",
    phone: "",
    billingAddress: "",
    shippingAddress: "",
    currency: "INR",
    status: SalesOrderStatus.DRAFT,
    deliveryDate: "",
    paymentTerms: "Net 15",
    customerPoNumber: "",
    quotationReference: "",
    paymentDueDays: "15",
    taxRate: "0",
    discountPercent: "0",
    customerCreditLimit: "0",
    customerOutstandingAmount: "0",
    confirmationAttachmentUrl: "",
    notes: "",
    items: [createDraftItem()],
  };
}

function toStringValue(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function buildManualFormFromOrder(order: SalesOrder): ManualOrderFormState {
  return {
    customerName: order.customerName ?? "",
    company: order.company ?? "",
    email: order.email ?? "",
    phone: order.phone ?? "",
    billingAddress: order.billingAddress ?? "",
    shippingAddress: order.shippingAddress ?? "",
    currency: order.currency ?? "INR",
    status: order.status,
    deliveryDate: order.deliveryDate ?? "",
    paymentTerms: order.paymentTerms ?? "",
    customerPoNumber: order.customerPoNumber ?? "",
    quotationReference: order.quotationReference ?? "",
    paymentDueDays: toStringValue(order.paymentDueDays),
    taxRate: toStringValue(order.taxRate),
    discountPercent: toStringValue(order.discountPercent),
    customerCreditLimit: toStringValue(order.customerCreditLimit),
    customerOutstandingAmount: toStringValue(order.customerOutstandingAmount),
    confirmationAttachmentUrl: order.confirmationAttachmentUrl ?? "",
    notes: order.notes ?? "",
    items: order.items.length
      ? order.items.map((item) => ({
          key: item.id || globalThis.crypto.randomUUID(),
          inventoryProductId: item.inventoryProductId ?? "",
          name: item.name ?? "",
          make: item.make ?? "",
          description: item.description ?? "",
          utility: item.utility ?? "",
          quantity: toStringValue(item.quantity),
          unit: item.unit ?? "",
          unitPrice: toStringValue(item.unitPrice),
        }))
      : [createDraftItem()],
  };
}

function cleanOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function CompactKpi({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="flex min-h-[92px] flex-col justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div>
        <p className="text-xl font-semibold text-slate-950">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{helper}</p>
      </div>
    </article>
  );
}

function getShipmentStatus(
  order: SalesOrderSummary,
  deliveryMap: Map<string, string>
) {
  if (deliveryMap.has(order.id)) {
    return toLabel(deliveryMap.get(order.id) ?? "");
  }
  if ([SalesOrderStatus.DELIVERED, SalesOrderStatus.PARTIALLY_DELIVERED].includes(order.status)) {
    return toLabel(order.status);
  }
  return "Not created";
}

function getPaymentStatus(
  orderId: string,
  invoiceMap: Map<string, { status: string; balanceDue: number }>,
  paymentCountMap: Map<string, number>
) {
  const invoice = invoiceMap.get(orderId);
  if (!invoice) {
    return "Not invoiced";
  }
  if (invoice.balanceDue <= 0 || invoice.status === SalesInvoiceStatus.PAID) {
    return "Paid";
  }
  if ((paymentCountMap.get(orderId) ?? 0) > 0 || invoice.status === SalesInvoiceStatus.PARTIALLY_PAID) {
    return "Partially paid";
  }
  return "Unpaid";
}

export default function SalesOrdersPage() {
  const navigate = useNavigate();
  const [detailId, setDetailId] = useState("");
  const [editingOrderId, setEditingOrderId] = useState("");
  const [isCreateDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [manualForm, setManualForm] = useState<ManualOrderFormState>(() => createInitialManualForm());
  const [filter, setFilter] = useState<SalesOrderFilter>({
    search: "",
    status: "ALL",
    page: 1,
    pageSize: PAGE_SIZE,
  });

  const ordersQuery = useSalesOrders(filter);
  const detailQuery = useSalesOrder(detailId);
  const editingOrderQuery = useSalesOrder(editingOrderId);
  const deliveriesQuery = useSalesDeliveries();
  const invoicesQuery = useSalesInvoices();
  const paymentsQuery = useSalesPayments();
  const quotesQuery = useQuotes({ search: "", status: QuoteStatus.ACCEPTED, page: 1, pageSize: 200 });
  const createMutation = useCreateSalesOrder();
  const updateMutation = useUpdateSalesOrder();
  const statusMutation = useUpdateSalesOrderStatus();

  const orders = useMemo(() => ordersQuery.data?.data ?? [], [ordersQuery.data?.data]);
  const deliveries = deliveriesQuery.data?.data ?? [];
  const invoices = invoicesQuery.data?.data ?? [];
  const payments = paymentsQuery.data?.data ?? [];
  const acceptedQuotes = quotesQuery.data?.data ?? [];
  const detail = detailQuery.data ?? null;

  useEffect(() => {
    if (!editingOrderQuery.data || !isCreateDrawerOpen) {
      return;
    }
    setManualForm(buildManualFormFromOrder(editingOrderQuery.data));
  }, [editingOrderQuery.data, isCreateDrawerOpen]);

  const manualSubtotal = manualForm.items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    return sum + quantity * unitPrice;
  }, 0);
  const manualDiscount = (manualSubtotal * (Number(manualForm.discountPercent) || 0)) / 100;
  const discountedSubtotal = manualSubtotal - manualDiscount;
  const manualTaxRate = Number(manualForm.taxRate) || 0;
  const manualTotal = discountedSubtotal + (discountedSubtotal * manualTaxRate) / 100;

  const deliveryMap = useMemo(
    () =>
      new Map(
        deliveries.map((delivery) => [delivery.salesOrderId, delivery.status])
      ),
    [deliveries]
  );

  const invoiceMap = useMemo(
    () =>
      new Map(
        invoices.map((invoice) => [
          invoice.salesOrderId,
          { status: invoice.status, balanceDue: invoice.balanceDue },
        ])
      ),
    [invoices]
  );

  const paymentCountMap = useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach((payment) => {
      map.set(payment.salesOrderId, (map.get(payment.salesOrderId) ?? 0) + 1);
    });
    return map;
  }, [payments]);

  const metrics = useMemo(() => {
    const totalValue = orders.reduce((sum, order) => sum + order.total, 0);
    const pendingCount = orders.filter((order) =>
      [
        SalesOrderStatus.DRAFT,
        SalesOrderStatus.SUBMITTED,
        SalesOrderStatus.PENDING_APPROVAL,
        SalesOrderStatus.APPROVED,
        SalesOrderStatus.CONFIRMED,
      ].includes(order.status)
    ).length;
    const completedCount = orders.filter((order) =>
      [SalesOrderStatus.DELIVERED, SalesOrderStatus.PAID, SalesOrderStatus.CLOSED].includes(order.status)
    ).length;

    return {
      totalOrders: orders.length,
      pendingOrders: pendingCount,
      completedOrders: completedCount,
      revenue: totalValue,
    };
  }, [orders]);

  function updateManualField<K extends keyof ManualOrderFormState>(field: K, value: ManualOrderFormState[K]) {
    setManualForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateManualItem(key: string, field: keyof ManualOrderItemDraft, value: string) {
    setManualForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    }));
  }

  function addManualItem() {
    setManualForm((prev) => ({ ...prev, items: [...prev.items, createDraftItem()] }));
  }

  function removeManualItem(key: string) {
    setManualForm((prev) => ({
      ...prev,
      items: prev.items.length === 1 ? prev.items : prev.items.filter((item) => item.key !== key),
    }));
  }

  function resetManualForm() {
    setManualForm(createInitialManualForm());
  }

  function handleOrderDrawerOpenChange(open: boolean) {
    setCreateDrawerOpen(open);
    if (!open) {
      setEditingOrderId("");
      resetManualForm();
    }
  }

  function handleCreateOrder() {
    const customerName = manualForm.customerName.trim();
    if (!customerName) {
      toast.error("Customer name is required.");
      return;
    }

    const items = manualForm.items.map((item) => ({
      inventoryProductId: cleanOptional(item.inventoryProductId ?? ""),
      name: item.name.trim(),
      make: cleanOptional(item.make),
      description: cleanOptional(item.description),
      utility: cleanOptional(item.utility),
      quantity: Number(item.quantity),
      unit: cleanOptional(item.unit),
      unitPrice: Number(item.unitPrice),
    }));

    if (items.some((item) => !item.name)) {
      toast.error("Each line item needs a name.");
      return;
    }

    if (editingOrderId) {
      const payload: UpdateSalesOrderInput = {
        customerName,
        company: cleanOptional(manualForm.company),
        email: cleanOptional(manualForm.email),
        phone: cleanOptional(manualForm.phone),
        billingAddress: cleanOptional(manualForm.billingAddress),
        shippingAddress: cleanOptional(manualForm.shippingAddress),
        currency: cleanOptional(manualForm.currency) || "INR",
        deliveryDate: cleanOptional(manualForm.deliveryDate),
        paymentTerms: cleanOptional(manualForm.paymentTerms),
        customerPoNumber: cleanOptional(manualForm.customerPoNumber),
        quotationReference: cleanOptional(manualForm.quotationReference),
        paymentDueDays: Number(manualForm.paymentDueDays) || 0,
        taxRate: manualTaxRate,
        discountPercent: Number(manualForm.discountPercent) || 0,
        customerCreditLimit: Number(manualForm.customerCreditLimit) || 0,
        customerOutstandingAmount: Number(manualForm.customerOutstandingAmount) || 0,
        confirmationAttachmentUrl: cleanOptional(manualForm.confirmationAttachmentUrl),
        notes: cleanOptional(manualForm.notes),
        items,
      };

      updateMutation.mutate(
        { id: editingOrderId, payload },
        {
          onSuccess: (updated) => {
            toast.success(`Order ${updated.orderNumber} updated.`);
            handleOrderDrawerOpenChange(false);
            navigate(`/sales/orders/${updated.id}`);
          },
          onError: (error) => {
            toast.error(error instanceof Error ? error.message : "Could not update order.");
          },
        }
      );
      return;
    }

    const payload: CreateSalesOrderInput = {
      customerName,
      company: cleanOptional(manualForm.company),
      email: cleanOptional(manualForm.email),
      phone: cleanOptional(manualForm.phone),
      billingAddress: cleanOptional(manualForm.billingAddress),
      shippingAddress: cleanOptional(manualForm.shippingAddress),
      currency: cleanOptional(manualForm.currency) || "INR",
      status: manualForm.status,
      deliveryDate: cleanOptional(manualForm.deliveryDate),
      paymentTerms: cleanOptional(manualForm.paymentTerms),
      customerPoNumber: cleanOptional(manualForm.customerPoNumber),
      quotationReference: cleanOptional(manualForm.quotationReference),
      paymentDueDays: Number(manualForm.paymentDueDays) || 0,
      taxRate: manualTaxRate,
      discountPercent: Number(manualForm.discountPercent) || 0,
      customerCreditLimit: Number(manualForm.customerCreditLimit) || 0,
      customerOutstandingAmount: Number(manualForm.customerOutstandingAmount) || 0,
      confirmationAttachmentUrl: cleanOptional(manualForm.confirmationAttachmentUrl),
      notes: cleanOptional(manualForm.notes),
      items,
    };

    createMutation.mutate(payload, {
      onSuccess: (created) => {
        toast.success(`Order ${created.orderNumber} created.`);
        handleOrderDrawerOpenChange(false);
        navigate(`/sales/orders/${created.id}`);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Could not create order.");
      },
    });
  }

  function handleEditOrder(orderId: string) {
    setEditingOrderId(orderId);
    setCreateDrawerOpen(true);
  }

  return (
    <div className="space-y-5 text-slate-900">
      <section className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Order to Cash</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" className="rounded-xl bg-blue-600 px-4 text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Create Order
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-slate-200 bg-white">
            <DropdownMenuItem onClick={() => setCreateDrawerOpen(true)}>
              Create Order
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (!acceptedQuotes.length) {
                  toast.error("No accepted quotes are ready for conversion.");
                  return;
                }
                navigate("/sales");
              }}
            >
              Fetch from Accepted Quotes
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CompactKpi label="Total Orders" value={String(metrics.totalOrders)} helper="All tracked sales orders" />
        <CompactKpi label="Pending Orders" value={String(metrics.pendingOrders)} helper="Draft, approval, and in-flight orders" />
        <CompactKpi label="Completed Orders" value={String(metrics.completedOrders)} helper="Delivered or commercially closed" />
        <CompactKpi label="Order Value" value={fmtCurrency(metrics.revenue)} helper="Total booked order amount" />
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <input
              value={filter.search}
              onChange={(event) => setFilter((prev) => ({ ...prev, search: event.target.value, page: 1 }))}
              placeholder="Search order number, customer, company"
              className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-300"
            />
            <select
              value={filter.status}
              onChange={(event) => setFilter((prev) => ({ ...prev, status: event.target.value as SalesOrderFilter["status"], page: 1 }))}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
            >
              <option value="ALL">All statuses</option>
              {Object.values(SalesOrderStatus).map((status) => (
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
                <th className="px-5 py-3">Order No</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Order Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Payment Status</th>
                <th className="px-5 py-3">Shipment Status</th>
                <th className="px-5 py-3">Total Amount</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ordersQuery.isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td className="px-5 py-4" colSpan={8}>
                      <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : orders.length ? (
                orders.map((order) => {
                  const invoiceExists = invoiceMap.has(order.id);
                  const shipmentExists = deliveryMap.has(order.id);
                  const paymentExists = (paymentCountMap.get(order.id) ?? 0) > 0;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-4 font-semibold text-slate-950">{order.orderNumber}</td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-medium text-slate-800">{order.customerName}</p>
                          <p className="text-xs text-slate-500">{order.company ?? "No company"}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{new Date(order.createdAt).toLocaleDateString("en-US")}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {toLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{getPaymentStatus(order.id, invoiceMap, paymentCountMap)}</td>
                      <td className="px-5 py-4 text-slate-600">{getShipmentStatus(order, deliveryMap)}</td>
                      <td className="px-5 py-4 font-semibold text-slate-950">{fmtCurrency(order.total)}</td>
                      <td className="px-5 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              aria-label={`Actions for ${order.orderNumber}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 border-slate-200 bg-white">
                            <DropdownMenuItem onClick={() => navigate(`/sales/orders/${order.id}`)}>View Details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditOrder(order.id)}>Edit Order</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/sales/orders/${order.id}?panel=invoice`)}>
                              {invoiceExists ? "View Invoice" : "Create Invoice"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/sales/shipments?orderId=${order.id}`)}>
                              {shipmentExists ? "View Shipment" : "Create Shipment"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/sales/payments?orderId=${order.id}`)}>
                              {paymentExists ? "View Payment" : "Record Payment"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-500">
                    No orders found for the current search and filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CreateOrderDrawer
        open={isCreateDrawerOpen}
        onOpenChange={handleOrderDrawerOpenChange}
        form={manualForm}
        subtotal={manualSubtotal}
        total={manualTotal}
        pending={createMutation.isPending || updateMutation.isPending || editingOrderQuery.isLoading}
        title={editingOrderId ? "Edit Sales Order" : "Create Sales Order"}
        description={
          editingOrderId
            ? "Update customer, commercial, fulfillment, and line item details for the selected order."
            : "Capture commercial, fulfillment, billing, and risk context in one revenue-grade intake panel."
        }
        submitLabel={editingOrderId ? "Save Changes" : "Create Order"}
        onFieldChange={updateManualField}
        onItemChange={updateManualItem}
        onAddItem={addManualItem}
        onRemoveItem={removeManualItem}
        onReset={resetManualForm}
        onSubmit={handleCreateOrder}
      />

      <OrderDetailDrawer
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) setDetailId("");
        }}
        order={detail}
        loading={detailQuery.isLoading}
        statusOptions={DRAWER_STATUS_OPTIONS}
        onStatusChange={(status) => {
          if (!detail) return;
          statusMutation.mutate(
            { id: detail.id, status },
            { onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update order status.") }
          );
        }}
        statusPending={statusMutation.isPending}
      />
    </div>
  );
}
