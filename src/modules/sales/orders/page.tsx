"use client";

import { useMemo, useState } from "react";
import { PackageCheck, ReceiptText, Sparkles, TrendingUp, Truck } from "lucide-react";
import { toast } from "sonner";
import { useQuotes } from "@/modules/sales/hooks";
import { QuoteStatus, type QuoteFilter } from "@/modules/sales/types";
import {
  AcceptedQuotesCard,
  ActivityTimelineCard,
  CreateDeliveryDrawer,
  CreateInvoiceDrawer,
  CreateOrderDrawer,
  DeliveryBoardCard,
  fmtCurrency,
  InvoiceBoardCard,
  OrderDetailDrawer,
  OperationsSnapshotCard,
  PendingApprovalsCard,
  QuickStatsCard,
  SalesOrdersHero,
  SalesOrdersKpis,
  SalesOrdersQueueCard,
} from "./components";
import {
  useConvertQuoteToOrder,
  useCreateSalesDelivery,
  useCreateSalesInvoice,
  useCreateSalesOrder,
  useSalesDeliveries,
  useSalesInvoices,
  useSalesOrder,
  useSalesOrders,
  useUpdateSalesDeliveryStatus,
  useUpdateSalesInvoiceStatus,
  useUpdateSalesOrderStatus,
} from "./hooks";
import {
  SalesDeliveryStatus,
  SalesInvoiceStatus,
  SalesOrderStatus,
  type CreateSalesDeliveryInput,
  type CreateSalesInvoiceInput,
  type CreateSalesOrderInput,
  type ManualOrderFormState,
  type ManualOrderItemDraft,
  type SalesOrderFilter,
  type SalesOrderSummary,
} from "./types";

const PAGE_SIZE = 50;

const DRAWER_STATUS_OPTIONS: SalesOrderStatus[] = [
  SalesOrderStatus.DRAFT,
  SalesOrderStatus.PENDING_APPROVAL,
  SalesOrderStatus.APPROVED,
  SalesOrderStatus.PROCESSING,
  SalesOrderStatus.PACKED,
  SalesOrderStatus.SHIPPED,
  SalesOrderStatus.DELIVERED,
  SalesOrderStatus.CLOSED,
  SalesOrderStatus.CANCELLED,
];

const QUEUE_TABS = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "PROCESSING", label: "Processing" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

type QueueTabKey = (typeof QUEUE_TABS)[number]["key"];

function createDraftItem(): ManualOrderItemDraft {
  return {
    key: globalThis.crypto.randomUUID(),
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
    taxRate: "0",
    notes: "",
    items: [createDraftItem()],
  };
}

function cleanOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function orderMatchesTab(order: SalesOrderSummary, tab: QueueTabKey) {
  switch (tab) {
    case "DRAFT":
      return [SalesOrderStatus.DRAFT, SalesOrderStatus.PENDING_APPROVAL].includes(order.status);
    case "PROCESSING":
      return [
        SalesOrderStatus.APPROVED,
        SalesOrderStatus.PROCESSING,
        SalesOrderStatus.PACKED,
        SalesOrderStatus.SHIPPED,
      ].includes(order.status);
    case "COMPLETED":
      return [SalesOrderStatus.DELIVERED, SalesOrderStatus.CLOSED].includes(order.status);
    case "CANCELLED":
      return order.status === SalesOrderStatus.CANCELLED;
    default:
      return true;
  }
}

export default function SalesOrdersPage() {
  const [filter, setFilter] = useState<SalesOrderFilter>({
    search: "",
    status: "ALL",
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [activeTab, setActiveTab] = useState<QueueTabKey>("ALL");
  const [detailId, setDetailId] = useState("");
  const [isCreateDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [isCreateDeliveryDrawerOpen, setCreateDeliveryDrawerOpen] = useState(false);
  const [isCreateInvoiceDrawerOpen, setCreateInvoiceDrawerOpen] = useState(false);
  const [manualForm, setManualForm] = useState<ManualOrderFormState>(() => createInitialManualForm());
  const [deliveryForm, setDeliveryForm] = useState<CreateSalesDeliveryInput>({ salesOrderId: "" });
  const [invoiceForm, setInvoiceForm] = useState<CreateSalesInvoiceInput>({ salesOrderId: "" });

  const acceptedQuotesFilter: QuoteFilter = {
    search: "",
    status: QuoteStatus.ACCEPTED,
    page: 1,
    pageSize: 6,
  };

  const ordersQuery = useSalesOrders(filter);
  const detailQuery = useSalesOrder(detailId);
  const acceptedQuotesQuery = useQuotes(acceptedQuotesFilter);
  const deliveriesQuery = useSalesDeliveries();
  const invoicesQuery = useSalesInvoices();
  const convertMutation = useConvertQuoteToOrder();
  const createDeliveryMutation = useCreateSalesDelivery();
  const createInvoiceMutation = useCreateSalesInvoice();
  const createMutation = useCreateSalesOrder();
  const updateDeliveryStatusMutation = useUpdateSalesDeliveryStatus();
  const updateInvoiceStatusMutation = useUpdateSalesInvoiceStatus();
  const statusMutation = useUpdateSalesOrderStatus();

  const orders = ordersQuery.data?.data ?? [];
  const acceptedQuotes = acceptedQuotesQuery.data?.data ?? [];
  const detail = detailQuery.data ?? null;
  const deliveries = deliveriesQuery.data?.data ?? [];
  const invoices = invoicesQuery.data?.data ?? [];
  const orderOptions = orders.map((order) => ({
    id: order.id,
    label: `${order.orderNumber} | ${order.customerName}`,
  }));

  const tabCounts = useMemo(
    () =>
      QUEUE_TABS.map((tab) => ({
        key: tab.key,
        label: tab.label,
        count: orders.filter((order) => orderMatchesTab(order, tab.key)).length,
      })),
    [orders]
  );

  const visibleOrders = useMemo(() => orders.filter((order) => orderMatchesTab(order, activeTab)), [activeTab, orders]);

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const openFlowCount = orders.filter((order) =>
    ![SalesOrderStatus.DELIVERED, SalesOrderStatus.CLOSED, SalesOrderStatus.CANCELLED].includes(order.status)
  ).length;
  const pendingDeliveries = orders.filter((order) =>
    [SalesOrderStatus.APPROVED, SalesOrderStatus.PROCESSING, SalesOrderStatus.PACKED, SalesOrderStatus.SHIPPED].includes(order.status)
  ).length;
  const averageOrderValue = orders.length ? totalRevenue / orders.length : 0;
  const manualOrderCount = orders.filter((order) => !order.quoteId).length;
  const pendingApprovalOrders = orders
    .filter((order) => order.status === SalesOrderStatus.PENDING_APPROVAL)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const recentActivity = useMemo(() => {
    const orderActivity = orders.slice(0, 6).map((order) => ({
      id: `order-${order.id}`,
      title: `${order.orderNumber} is ${order.status.toLowerCase().replace(/_/g, " ")}`,
      subtitle: `${order.customerName} | ${fmtCurrency(order.total)}`,
      timestamp: order.updatedAt,
      kind:
        order.status === SalesOrderStatus.SHIPPED || order.status === SalesOrderStatus.DELIVERED ? ("delivery" as const) : ("order" as const),
    }));

    const quoteActivity = acceptedQuotes.slice(0, 3).map((quote) => ({
      id: `quote-${quote.id}`,
      title: `${quote.quoteNumber} accepted`,
      subtitle: `${quote.customerName} is ready for conversion`,
      timestamp: quote.updatedAt,
      kind: "quote" as const,
    }));

    return [...orderActivity, ...quoteActivity]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);
  }, [acceptedQuotes, orders]);

  const kpiMetrics = [
    {
      key: "orders",
      label: "Orders",
      value: String(ordersQuery.data?.total ?? 0),
      trend: `${visibleOrders.length} visible now`,
      hint: "Live order queue",
      icon: ReceiptText,
      tone: "bg-slate-300 dark:bg-slate-700",
      bars: [42, 60, 54, 72, 86, 64],
    },
    {
      key: "quotes",
      label: "Accepted Quotes",
      value: String(acceptedQuotes.length),
      trend: `${acceptedQuotes.length ? "Ready to convert" : "No backlog"}`,
      hint: "Presales handoff",
      icon: Sparkles,
      tone: "bg-emerald-300 dark:bg-emerald-700",
      bars: [32, 48, 62, 78, 68, 84],
    },
    {
      key: "open-flow",
      label: "Open Flow",
      value: String(openFlowCount),
      trend: `${pendingApprovalOrders.length} awaiting approvals`,
      hint: "Active O2C workload",
      icon: PackageCheck,
      tone: "bg-sky-300 dark:bg-sky-700",
      bars: [36, 44, 66, 72, 65, 88],
    },
    {
      key: "revenue",
      label: "Revenue",
      value: fmtCurrency(totalRevenue || 0),
      trend: `${fmtCurrency(averageOrderValue || 0)} avg`,
      hint: "Current queue value",
      icon: TrendingUp,
      tone: "bg-violet-300 dark:bg-violet-700",
      bars: [28, 40, 58, 76, 92, 78],
    },
    {
      key: "deliveries",
      label: "Pending Deliveries",
      value: String(pendingDeliveries),
      trend: `${manualOrderCount} manual orders`,
      hint: "Fulfillment handoff",
      icon: Truck,
      tone: "bg-cyan-300 dark:bg-cyan-700",
      bars: [30, 36, 52, 59, 74, 66],
    },
  ];

  const quickStats = [
    {
      label: "Manual intake",
      value: `${manualOrderCount}`,
      helper: "Orders created outside quote conversion",
    },
    {
      label: "Reserved inventory",
      value: `${orders.filter((order) => order.inventoryReserved).length}`,
      helper: "Orders already matched with stock",
    },
    {
      label: "Average value",
      value: fmtCurrency(averageOrderValue || 0),
      helper: "Per visible order in the queue",
    },
  ];

  const deliveryStats = [
    {
      label: "Ready to dispatch",
      value: String(
        orders.filter((order) =>
          [SalesOrderStatus.APPROVED, SalesOrderStatus.PROCESSING, SalesOrderStatus.PACKED].includes(order.status)
        ).length
      ),
      helper: "Approved or being prepared for shipment",
      tone: "text-sky-700 dark:text-sky-300",
    },
    {
      label: "Shipped",
      value: String(orders.filter((order) => order.status === SalesOrderStatus.SHIPPED).length),
      helper: "In transit to the customer",
      tone: "text-cyan-700 dark:text-cyan-300",
    },
    {
      label: "Delivered",
      value: String(orders.filter((order) => order.status === SalesOrderStatus.DELIVERED).length),
      helper: "Completed delivery handoff",
      tone: "text-emerald-700 dark:text-emerald-300",
    },
    {
      label: "Inventory reserved",
      value: String(orders.filter((order) => order.inventoryReserved).length),
      helper: "Orders already linked to reserved stock",
      tone: "text-violet-700 dark:text-violet-300",
    },
  ];

  const billingStats = [
    {
      label: "Commercial backlog",
      value: fmtCurrency(
        orders
          .filter((order) => ![SalesOrderStatus.CLOSED, SalesOrderStatus.CANCELLED].includes(order.status))
          .reduce((sum, order) => sum + order.total, 0)
      ),
      helper: "Active order value still moving through billing or fulfillment",
      tone: "text-slate-700 dark:text-slate-200",
    },
    {
      label: "Quote-converted",
      value: String(orders.filter((order) => Boolean(order.quoteId)).length),
      helper: "Orders inherited from accepted commercial quotes",
      tone: "text-emerald-700 dark:text-emerald-300",
    },
    {
      label: "Manual orders",
      value: String(manualOrderCount),
      helper: "Often need invoice follow-up outside quote flow",
      tone: "text-amber-700 dark:text-amber-300",
    },
    {
      label: "Pending approvals",
      value: String(pendingApprovalOrders.length),
      helper: "Orders likely waiting for billing or dispatch sign-off",
      tone: "text-sky-700 dark:text-sky-300",
    },
  ];

  const manualSubtotal = manualForm.items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    return sum + quantity * unitPrice;
  }, 0);
  const manualTaxRate = Number(manualForm.taxRate) || 0;
  const manualTotal = manualSubtotal + (manualSubtotal * manualTaxRate) / 100;

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

  function resetDeliveryForm() {
    setDeliveryForm({ salesOrderId: "" });
  }

  function resetInvoiceForm() {
    setInvoiceForm({ salesOrderId: "" });
  }

  function handleConvert(quoteId: string) {
    convertMutation.mutate(quoteId, {
      onSuccess: (created) => {
        toast.success(`Order ${created.orderNumber} created from quote.`);
        setDetailId(created.id);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Could not convert quote.");
      },
    });
  }

  function handleCreateOrder() {
    const customerName = manualForm.customerName.trim();
    if (!customerName) {
      toast.error("Customer name is required.");
      return;
    }

    const items = manualForm.items.map((item) => ({
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
    if (items.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0)) {
      toast.error("Line item quantity must be greater than 0.");
      return;
    }
    if (items.some((item) => !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
      toast.error("Line item unit price must be 0 or more.");
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
      taxRate: manualTaxRate,
      notes: cleanOptional(manualForm.notes),
      items,
    };

    createMutation.mutate(payload, {
      onSuccess: (created) => {
        toast.success(`Order ${created.orderNumber} created.`);
        setCreateDrawerOpen(false);
        resetManualForm();
        setDetailId(created.id);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Could not create order.");
      },
    });
  }

  function handleStatusChange(status: SalesOrderStatus) {
    if (!detail) {
      return;
    }

    statusMutation.mutate(
      { id: detail.id, status },
      {
        onSuccess: () => {
          toast.success("Order status updated.");
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Could not update status.");
        },
      }
    );
  }

  function handleCreateDelivery() {
    if (!deliveryForm.salesOrderId) {
      toast.error("Select a sales order for the delivery.");
      return;
    }
    createDeliveryMutation.mutate(deliveryForm, {
      onSuccess: (created) => {
        toast.success(`Delivery ${created.deliveryNumber} created.`);
        setCreateDeliveryDrawerOpen(false);
        resetDeliveryForm();
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Could not create delivery.");
      },
    });
  }

  function handleCreateInvoice() {
    if (!invoiceForm.salesOrderId) {
      toast.error("Select a sales order for the invoice.");
      return;
    }
    createInvoiceMutation.mutate(invoiceForm, {
      onSuccess: (created) => {
        toast.success(`Invoice ${created.invoiceNumber} created.`);
        setCreateInvoiceDrawerOpen(false);
        resetInvoiceForm();
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Could not create invoice.");
      },
    });
  }

  function handleDeliveryStatusChange(id: string, status: SalesDeliveryStatus) {
    updateDeliveryStatusMutation.mutate(
      { id, status },
      {
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Could not update delivery status.");
        },
      }
    );
  }

  function handleInvoiceStatusChange(id: string, status: SalesInvoiceStatus) {
    updateInvoiceStatusMutation.mutate(
      {
        id,
        status,
        balanceDue: status === SalesInvoiceStatus.PAID ? 0 : undefined,
      },
      {
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Could not update invoice status.");
        },
      }
    );
  }

  function handleExport() {
    const rows = visibleOrders.map((order) => ({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      company: order.company ?? "",
      status: order.status,
      total: order.total,
      updatedAt: order.updatedAt,
      source: order.quoteId ? "Quote conversion" : "Manual",
    }));

    const csv = [
      ["Order Number", "Customer", "Company", "Status", "Total", "Updated At", "Source"],
      ...rows.map((row) => [
        row.orderNumber,
        row.customerName,
        row.company,
        row.status,
        row.total.toString(),
        row.updatedAt,
        row.source,
      ]),
    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sales-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <SalesOrdersHero orderCount={visibleOrders.length} onCreateOrder={() => setCreateDrawerOpen(true)} onExport={handleExport} />

      <SalesOrdersKpis metrics={kpiMetrics} isLoading={ordersQuery.isLoading} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(330px,0.95fr)]">
        <div className="min-w-0">
          <SalesOrdersQueueCard
            orders={visibleOrders}
            search={filter.search}
            onSearchChange={(value) => setFilter((prev) => ({ ...prev, search: value, page: 1 }))}
            tabs={tabCounts}
            activeTab={activeTab}
            onTabChange={(value) => setActiveTab(value as QueueTabKey)}
            isLoading={ordersQuery.isLoading}
            onOpenOrder={setDetailId}
            onCreateOrder={() => setCreateDrawerOpen(true)}
          />
        </div>

        <div className="space-y-6">
          <AcceptedQuotesCard
            quotes={acceptedQuotes}
            isLoading={acceptedQuotesQuery.isLoading}
            isConverting={convertMutation.isPending}
            onConvert={handleConvert}
          />
          <QuickStatsCard stats={quickStats} />
          <OperationsSnapshotCard title="Delivery Operations" subtitle="Dispatch and fulfillment signals" stats={deliveryStats} />
          <DeliveryBoardCard
            deliveries={deliveries}
            isLoading={deliveriesQuery.isLoading}
            onCreate={() => setCreateDeliveryDrawerOpen(true)}
            onStatusChange={handleDeliveryStatusChange}
            statusPending={updateDeliveryStatusMutation.isPending}
          />
          <OperationsSnapshotCard title="Billing & Commercial" subtitle="Order value and invoicing-adjacent signals" stats={billingStats} />
          <InvoiceBoardCard
            invoices={invoices}
            isLoading={invoicesQuery.isLoading}
            onCreate={() => setCreateInvoiceDrawerOpen(true)}
            onStatusChange={handleInvoiceStatusChange}
            statusPending={updateInvoiceStatusMutation.isPending}
          />
          <PendingApprovalsCard
            approvals={pendingApprovalOrders.slice(0, 4).map((order) => ({
              id: order.id,
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              total: order.total,
              updatedAt: order.updatedAt,
            }))}
            onOpenOrder={setDetailId}
          />
          <ActivityTimelineCard items={recentActivity} />
        </div>
      </div>

      <CreateOrderDrawer
        open={isCreateDrawerOpen}
        onOpenChange={setCreateDrawerOpen}
        form={manualForm}
        subtotal={manualSubtotal}
        total={manualTotal}
        pending={createMutation.isPending}
        onFieldChange={updateManualField}
        onItemChange={updateManualItem}
        onAddItem={addManualItem}
        onRemoveItem={removeManualItem}
        onReset={resetManualForm}
        onSubmit={handleCreateOrder}
      />

      <CreateDeliveryDrawer
        open={isCreateDeliveryDrawerOpen}
        onOpenChange={setCreateDeliveryDrawerOpen}
        orderOptions={orderOptions}
        form={deliveryForm}
        pending={createDeliveryMutation.isPending}
        onFieldChange={(field, value) => setDeliveryForm((prev) => ({ ...prev, [field]: value }))}
        onSubmit={handleCreateDelivery}
      />

      <CreateInvoiceDrawer
        open={isCreateInvoiceDrawerOpen}
        onOpenChange={setCreateInvoiceDrawerOpen}
        orderOptions={orderOptions}
        form={invoiceForm}
        pending={createInvoiceMutation.isPending}
        onFieldChange={(field, value) => setInvoiceForm((prev) => ({ ...prev, [field]: value }))}
        onSubmit={handleCreateInvoice}
      />

      <OrderDetailDrawer
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailId("");
          }
        }}
        order={detail}
        loading={detailQuery.isLoading}
        statusOptions={DRAWER_STATUS_OPTIONS}
        onStatusChange={handleStatusChange}
        statusPending={statusMutation.isPending}
      />
    </div>
  );
}
