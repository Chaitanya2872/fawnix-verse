"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  CheckCircle2,
  ClipboardList,
  FileText,
  PackageCheck,
  ReceiptText,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLeadDetail } from "@/modules/crm/leads/hooks";
import { useQuotes } from "@/modules/sales/hooks";
import { QuoteStatus } from "@/modules/sales/types";
import {
  AcceptedQuotesCard,
  CreateDeliveryDrawer,
  CreateInvoiceDrawer,
  CreateOrderDrawer,
  CreatePaymentDrawer,
  CreateReturnDrawer,
  OperationsSnapshotCard,
  OrderDetailDrawer,
  PendingApprovalsCard,
  QuickStatsCard,
  SalesOrdersHero,
  SalesOrdersKpis,
  SalesOrdersQueueCard,
  fmtCurrency,
  toLabel,
} from "./components";
import {
  useApprovalRules,
  useConfirmSalesOrder,
  useConvertQuoteToOrder,
  useCreateSalesDelivery,
  useCreateSalesInvoice,
  useCreateSalesOrder,
  useCreateSalesPayment,
  useCreateSalesReturn,
  useSalesDeliveries,
  useSalesInvoices,
  useSalesOrder,
  useSalesOrderApprovalAction,
  useSalesOrders,
  useSalesPayments,
  useSalesReportOverview,
  useSalesReturns,
  useSubmitSalesOrder,
  useUpdateSalesDeliveryStatus,
  useUpdateSalesInvoiceStatus,
  useUpdateSalesOrderStatus,
  useUpdateSalesReturnStatus,
} from "./hooks";
import {
  PaymentMode,
  SalesDeliveryStatus,
  SalesInvoiceStatus,
  SalesOrderStatus,
  type CreateSalesDeliveryInput,
  type CreateSalesInvoiceInput,
  type CreateSalesOrderInput,
  type CreateSalesPaymentInput,
  type CreateSalesReturnInput,
  type ManualOrderFormState,
  type ManualOrderItemDraft,
  type SalesOrder,
  type SalesOrderFilter,
  type SalesOrderSummary,
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

const QUEUE_TABS = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Drafts" },
  { key: "PENDING_APPROVAL", label: "Pending approval" },
  { key: "FULFILLMENT", label: "Fulfillment" },
  { key: "COLLECTION", label: "Collection" },
  { key: "CLOSED", label: "Closed" },
] as const;

type QueueTabKey = (typeof QUEUE_TABS)[number]["key"];

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

function cleanOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function orderMatchesTab(order: SalesOrderSummary, tab: QueueTabKey) {
  switch (tab) {
    case "DRAFT":
      return [SalesOrderStatus.DRAFT, SalesOrderStatus.REJECTED, SalesOrderStatus.SUBMITTED].includes(order.status);
    case "PENDING_APPROVAL":
      return order.status === SalesOrderStatus.PENDING_APPROVAL;
    case "FULFILLMENT":
      return [
        SalesOrderStatus.APPROVED,
        SalesOrderStatus.CONFIRMED,
        SalesOrderStatus.PARTIALLY_DELIVERED,
        SalesOrderStatus.DELIVERED,
        SalesOrderStatus.INVOICED,
      ].includes(order.status);
    case "COLLECTION":
      return [SalesOrderStatus.PARTIALLY_PAID, SalesOrderStatus.PAID].includes(order.status);
    case "CLOSED":
      return [SalesOrderStatus.CLOSED, SalesOrderStatus.CANCELLED].includes(order.status);
    default:
      return true;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function signalTone(active: boolean, warning?: boolean) {
  if (warning) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (active) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function FlowSignal({
  label,
  active,
  warning,
}: {
  label: string;
  active: boolean;
  warning?: boolean;
}) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${signalTone(active, warning)}`}>
      {label}
    </span>
  );
}

function WorkflowStageCard({
  title,
  helper,
  count,
  icon: Icon,
  toneClassName,
}: {
  title: string;
  helper: string;
  count: string;
  icon: typeof ClipboardList;
  toneClassName: string;
}) {
  return (
    <article className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.22)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{count}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl text-white ${toneClassName}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-500">{helper}</p>
    </article>
  );
}

function JourneySection({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white/92 p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.24)]">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function InfoTile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/85 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-2 text-sm font-semibold ${tone ?? "text-slate-950"}`}>{value}</p>
    </div>
  );
}

function RecordList({
  title,
  emptyLabel,
  records,
}: {
  title: string;
  emptyLabel: string;
  records: Array<{ id: string; title: string; subtitle: string; meta: string }>;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/75 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
          {records.length}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {records.length ? (
          records.map((record) => (
            <div key={record.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{record.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{record.subtitle}</p>
                </div>
                <p className="text-xs font-medium text-slate-500">{record.meta}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-sm text-slate-500">
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );
}

function SelectedOrderEmptyState() {
  return (
    <section className="rounded-[28px] border border-dashed border-slate-200 bg-white/88 px-6 py-12 text-center shadow-[0_18px_45px_-30px_rgba(15,23,42,0.18)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">Select an order to inspect the end-to-end flow</h3>
      <p className="mt-2 text-sm text-slate-500">
        The workspace will line up quote source, approval status, inventory readiness, delivery, billing, payment, and returns for the chosen customer order.
      </p>
    </section>
  );
}

export function SalesOrdersWorkspacePage() {
  const [queueTab, setQueueTab] = useState<QueueTabKey>("ALL");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [detailId, setDetailId] = useState("");
  const [isCreateDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [isDeliveryDrawerOpen, setDeliveryDrawerOpen] = useState(false);
  const [isInvoiceDrawerOpen, setInvoiceDrawerOpen] = useState(false);
  const [isPaymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [isReturnDrawerOpen, setReturnDrawerOpen] = useState(false);
  const [manualForm, setManualForm] = useState<ManualOrderFormState>(() => createInitialManualForm());
  const [deliveryForm, setDeliveryForm] = useState<CreateSalesDeliveryInput>({ salesOrderId: "" });
  const [invoiceForm, setInvoiceForm] = useState<CreateSalesInvoiceInput>({ salesOrderId: "" });
  const [paymentForm, setPaymentForm] = useState<CreateSalesPaymentInput>({
    salesInvoiceId: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    amount: 0,
    paymentMode: PaymentMode.UPI,
  });
  const [returnForm, setReturnForm] = useState<CreateSalesReturnInput>({
    salesOrderId: "",
    requestedAmount: 0,
    returnReason: "",
  });

  const [filter, setFilter] = useState<SalesOrderFilter>({
    search: "",
    status: "ALL",
    page: 1,
    pageSize: PAGE_SIZE,
  });

  const ordersQuery = useSalesOrders(filter);
  const selectedOrderQuery = useSalesOrder(selectedOrderId);
  const detailQuery = useSalesOrder(detailId);
  const leadQuery = useLeadDetail(selectedOrderQuery.data?.leadId ?? null);
  const quotesQuery = useQuotes({ search: "", status: "ALL", page: 1, pageSize: 200 });
  const rulesQuery = useApprovalRules();
  const deliveriesQuery = useSalesDeliveries();
  const invoicesQuery = useSalesInvoices();
  const paymentsQuery = useSalesPayments();
  const returnsQuery = useSalesReturns();
  const reportsQuery = useSalesReportOverview();

  const convertQuoteMutation = useConvertQuoteToOrder();
  const createMutation = useCreateSalesOrder();
  const statusMutation = useUpdateSalesOrderStatus();
  const submitMutation = useSubmitSalesOrder();
  const confirmMutation = useConfirmSalesOrder();
  const approvalMutation = useSalesOrderApprovalAction();
  const createDeliveryMutation = useCreateSalesDelivery();
  const deliveryStatusMutation = useUpdateSalesDeliveryStatus();
  const createInvoiceMutation = useCreateSalesInvoice();
  const invoiceStatusMutation = useUpdateSalesInvoiceStatus();
  const createPaymentMutation = useCreateSalesPayment();
  const createReturnMutation = useCreateSalesReturn();
  const returnStatusMutation = useUpdateSalesReturnStatus();

  const orders = useMemo(() => ordersQuery.data?.data ?? [], [ordersQuery.data?.data]);
  const selectedOrder = selectedOrderQuery.data ?? null;
  const detail = detailQuery.data ?? null;
  const allQuotes = useMemo(() => quotesQuery.data?.data ?? [], [quotesQuery.data?.data]);
  const acceptedQuotes = useMemo(
    () => allQuotes.filter((quote) => quote.status === QuoteStatus.ACCEPTED).slice(0, 6),
    [allQuotes]
  );
  const deliveries = deliveriesQuery.data?.data ?? [];
  const invoices = invoicesQuery.data?.data ?? [];
  const payments = paymentsQuery.data?.data ?? [];
  const returns = returnsQuery.data?.data ?? [];
  const approvalRules = rulesQuery.data ?? [];
  const report = reportsQuery.data;

  const queueCounts = useMemo(
    () =>
      QUEUE_TABS.map((tab) => ({
        key: tab.key,
        label: tab.label,
        count: orders.filter((order) => orderMatchesTab(order, tab.key)).length,
      })),
    [orders]
  );

  const visibleOrders = useMemo(() => orders.filter((order) => orderMatchesTab(order, queueTab)), [orders, queueTab]);

  useEffect(() => {
    if (!visibleOrders.length) {
      if (!filter.search && queueTab === "ALL") {
        setSelectedOrderId("");
      }
      return;
    }

    const stillVisible = visibleOrders.some((order) => order.id === selectedOrderId);
    if (!selectedOrderId || !stillVisible) {
      setSelectedOrderId(visibleOrders[0].id);
    }
  }, [filter.search, queueTab, selectedOrderId, visibleOrders]);

  const manualSubtotal = manualForm.items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    return sum + quantity * unitPrice;
  }, 0);
  const manualDiscount = (manualSubtotal * (Number(manualForm.discountPercent) || 0)) / 100;
  const discountedSubtotal = manualSubtotal - manualDiscount;
  const manualTaxRate = Number(manualForm.taxRate) || 0;
  const manualTotal = discountedSubtotal + (discountedSubtotal * manualTaxRate) / 100;

  const pendingApprovalOrders = useMemo(
    () =>
      orders
        .filter((order) => order.status === SalesOrderStatus.PENDING_APPROVAL)
        .slice(0, 5)
        .map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          total: order.total,
          updatedAt: order.updatedAt,
        })),
    [orders]
  );

  const kpis = useMemo(() => {
    const metricMap = new Map((report?.metrics ?? []).map((metric) => [metric.key, metric.value]));
    return [
      {
        key: "orders",
        label: "Total Orders",
        value: String(metricMap.get("totalOrders") ?? orders.length),
        trend: `${visibleOrders.length} active`,
        hint: "Live order intake across the current queue.",
        icon: ClipboardList,
        tone: "bg-slate-950",
        bars: [60, 72, 68, 80, 76, 82],
      },
      {
        key: "approvals",
        label: "Pending Approvals",
        value: String(metricMap.get("pendingApprovals") ?? pendingApprovalOrders.length),
        trend: `${approvalRules.length} rules`,
        hint: "Orders waiting on configured approval stages.",
        icon: CheckCircle2,
        tone: "bg-amber-500",
        bars: [30, 45, 35, 50, 42, 54],
      },
      {
        key: "delivered",
        label: "Delivered",
        value: String(metricMap.get("deliveredOrders") ?? deliveries.filter((item) => item.status === SalesDeliveryStatus.DELIVERED).length),
        trend: `${deliveries.length} notes`,
        hint: "Dispatch execution completed or in motion.",
        icon: PackageCheck,
        tone: "bg-emerald-500",
        bars: [25, 36, 44, 55, 62, 58],
      },
      {
        key: "outstanding",
        label: "Outstanding",
        value: fmtCurrency(Number(metricMap.get("outstandingAmount") ?? 0)),
        trend: `${invoices.length} invoices`,
        hint: "Open receivables waiting for collection.",
        icon: ReceiptText,
        tone: "bg-cyan-500",
        bars: [64, 58, 61, 49, 52, 47],
      },
      {
        key: "received",
        label: "Payments",
        value: fmtCurrency(Number(metricMap.get("paymentsReceived") ?? 0)),
        trend: `${payments.length} receipts`,
        hint: "Cash realized across the O2C cycle.",
        icon: Wallet,
        tone: "bg-violet-500",
        bars: [32, 48, 50, 66, 72, 80],
      },
    ];
  }, [approvalRules.length, deliveries, invoices.length, orders.length, payments.length, pendingApprovalOrders.length, report?.metrics, visibleOrders.length]);

  const selectedQuote = useMemo(
    () => allQuotes.find((quote) => quote.id === selectedOrder?.quoteId) ?? null,
    [allQuotes, selectedOrder?.quoteId]
  );
  const selectedDeliveries = useMemo(
    () => deliveries.filter((delivery) => delivery.salesOrderId === selectedOrderId),
    [deliveries, selectedOrderId]
  );
  const selectedInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.salesOrderId === selectedOrderId),
    [invoices, selectedOrderId]
  );
  const selectedPayments = useMemo(
    () => payments.filter((payment) => payment.salesOrderId === selectedOrderId),
    [payments, selectedOrderId]
  );
  const selectedReturns = useMemo(
    () => returns.filter((item) => item.salesOrderId === selectedOrderId),
    [returns, selectedOrderId]
  );

  const orderOptions = useMemo(
    () => orders.map((order) => ({ id: order.id, label: `${order.orderNumber} • ${order.customerName}` })),
    [orders]
  );

  const invoiceOptions = useMemo(
    () => invoices.map((invoice) => ({ id: invoice.id, label: `${invoice.invoiceNumber} • ${invoice.customerName}` })),
    [invoices]
  );

  const workflowStages = useMemo(
    () => [
      {
        title: "Lead / Quote Intake",
        helper: "Accepted presales handoffs waiting for order conversion.",
        count: String(acceptedQuotes.length),
        icon: FileText,
        toneClassName: "bg-sky-600",
      },
      {
        title: "Sales Orders",
        helper: "Orders currently tracked in the execution workspace.",
        count: String(orders.length),
        icon: ClipboardList,
        toneClassName: "bg-slate-950",
      },
      {
        title: "Approval Control",
        helper: "Orders blocked behind governance or threshold checks.",
        count: String(pendingApprovalOrders.length),
        icon: CheckCircle2,
        toneClassName: "bg-amber-500",
      },
      {
        title: "Inventory & Delivery",
        helper: "Orders needing reserve, dispatch, or final delivery actions.",
        count: String(
          orders.filter((order) => !order.inventoryReserved || !order.stockAvailable || ![SalesOrderStatus.DELIVERED, SalesOrderStatus.CLOSED].includes(order.status)).length
        ),
        icon: PackageCheck,
        toneClassName: "bg-emerald-600",
      },
      {
        title: "Invoice & Cash",
        helper: "Invoices and collections still open in the cash cycle.",
        count: String(invoices.filter((invoice) => invoice.balanceDue > 0).length),
        icon: Wallet,
        toneClassName: "bg-violet-600",
      },
      {
        title: "Returns / Recovery",
        helper: "Customer returns and credit adjustments being processed.",
        count: String(returns.filter((item) => item.status !== "CLOSED").length),
        icon: ArrowRightLeft,
        toneClassName: "bg-rose-600",
      },
    ],
    [acceptedQuotes.length, invoices, orders, pendingApprovalOrders.length, returns]
  );

  const quickStats = useMemo(
    () => [
      {
        label: "Converted from quotes",
        value: String(orders.filter((order) => Boolean(order.quoteId)).length),
        helper: "Orders already linked to presales quotations.",
      },
      {
        label: "Manual direct orders",
        value: String(orders.filter((order) => !order.quoteId).length),
        helper: "Sales orders created without a quote handoff.",
      },
      {
        label: "Collection in progress",
        value: String(invoices.filter((invoice) => invoice.balanceDue > 0).length),
        helper: "Invoices with a remaining customer balance.",
      },
    ],
    [invoices, orders]
  );

  const inventorySnapshot = useMemo(
    () => [
      {
        label: "Stock shortages",
        value: String(orders.filter((order) => !order.stockAvailable).length),
        helper: "Orders that still need inventory intervention.",
        tone: "text-amber-600",
      },
      {
        label: "Reservations done",
        value: String(orders.filter((order) => order.inventoryReserved).length),
        helper: "Orders already reserved in inventory.",
      },
      {
        label: "Pending dispatch",
        value: String(selectedDeliveries.filter((delivery) => delivery.status !== SalesDeliveryStatus.DELIVERED).length),
        helper: "Selected order delivery notes still in motion.",
      },
    ],
    [orders, selectedDeliveries]
  );

  const financeSnapshot = useMemo(
    () => [
      {
        label: "Outstanding balance",
        value: fmtCurrency(selectedInvoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0)),
        helper: "Remaining amount due for the selected order.",
        tone: selectedInvoices.some((invoice) => invoice.balanceDue > 0) ? "text-amber-600" : undefined,
      },
      {
        label: "Payments captured",
        value: fmtCurrency(selectedPayments.reduce((sum, payment) => sum + payment.amount, 0)),
        helper: "Total receipts posted against the selected order.",
      },
      {
        label: "Returns requested",
        value: String(selectedReturns.length),
        helper: "Recovery items raised for this customer journey.",
      },
    ],
    [selectedInvoices, selectedPayments, selectedReturns.length]
  );

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
        setCreateDrawerOpen(false);
        resetManualForm();
        setSelectedOrderId(created.id);
        setDetailId(created.id);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Could not create order.");
      },
    });
  }

  function openExecutionDrawer(orderId: string) {
    setSelectedOrderId(orderId);
    setDetailId(orderId);
  }

  function handleSelectedStatusChange(status: SalesOrderStatus) {
    if (!selectedOrder) return;
    statusMutation.mutate(
      { id: selectedOrder.id, status },
      { onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update order status.") }
    );
  }

  function handleDetailStatusChange(status: SalesOrderStatus) {
    if (!detail) return;
    statusMutation.mutate(
      { id: detail.id, status },
      { onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update order status.") }
    );
  }

  function handleSubmitSelectedOrder() {
    if (!selectedOrder) return;
    submitMutation.mutate(selectedOrder.id, {
      onError: (error) => toast.error(error instanceof Error ? error.message : "Could not submit the order."),
    });
  }

  function handleConfirmSelectedOrder() {
    if (!selectedOrder) return;
    confirmMutation.mutate(
      { id: selectedOrder.id, confirmationAttachmentUrl: selectedOrder.confirmationAttachmentUrl ?? undefined },
      {
        onError: (error) => toast.error(error instanceof Error ? error.message : "Could not confirm the order."),
      }
    );
  }

  function handleApprovalAction(action: "APPROVE" | "REJECT" | "SEND_BACK") {
    if (!selectedOrder) return;
    approvalMutation.mutate(
      { id: selectedOrder.id, action },
      {
        onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update approval."),
      }
    );
  }

  function handleConvertQuote(quoteId: string) {
    convertQuoteMutation.mutate(quoteId, {
      onSuccess: (created) => {
        toast.success(`Converted to ${created.orderNumber}.`);
        setSelectedOrderId(created.id);
        setDetailId(created.id);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Could not convert quote.");
      },
    });
  }

  function primeDeliveryDrawer() {
    if (!selectedOrderId) {
      toast.error("Select an order first.");
      return;
    }
    setDeliveryForm((prev) => ({ ...prev, salesOrderId: selectedOrderId }));
    setDeliveryDrawerOpen(true);
  }

  function primeInvoiceDrawer() {
    if (!selectedOrderId) {
      toast.error("Select an order first.");
      return;
    }
    setInvoiceForm((prev) => ({ ...prev, salesOrderId: selectedOrderId }));
    setInvoiceDrawerOpen(true);
  }

  function primePaymentDrawer() {
    const invoice = selectedInvoices[0];
    setPaymentForm((prev) => ({
      ...prev,
      salesInvoiceId: invoice?.id ?? prev.salesInvoiceId,
    }));
    setPaymentDrawerOpen(true);
  }

  function primeReturnDrawer() {
    if (!selectedOrderId) {
      toast.error("Select an order first.");
      return;
    }
    setReturnForm((prev) => ({
      ...prev,
      salesOrderId: selectedOrderId,
      salesInvoiceId: selectedInvoices[0]?.id ?? prev.salesInvoiceId,
    }));
    setReturnDrawerOpen(true);
  }

  function handleExport() {
    const rows = visibleOrders.map((order) => ({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      company: order.company ?? "",
      status: order.status,
      total: order.total,
      paymentTerms: order.paymentTerms ?? "",
      updatedAt: order.updatedAt,
    }));

    const csv = [
      ["Order Number", "Customer", "Company", "Status", "Total", "Payment Terms", "Updated At"],
      ...rows.map((row) => [row.orderNumber, row.customerName, row.company, row.status, row.total.toString(), row.paymentTerms, row.updatedAt]),
    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "order-to-cash.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 text-slate-900">
      <SalesOrdersHero orderCount={visibleOrders.length} onCreateOrder={() => setCreateDrawerOpen(true)} onExport={handleExport} />
      <SalesOrdersKpis metrics={kpis as never} isLoading={ordersQuery.isLoading || reportsQuery.isLoading} />

      <section className="rounded-[28px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.22),_transparent_32%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.94))] p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.24)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Lifecycle Workspace</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Lead → Quote → Order → Inventory → Delivery → Invoice → Payment</h2>
            <p className="mt-1 text-sm text-slate-500">
              One orchestration page for presales handoff, order governance, inventory readiness, commercial execution, and recovery workflows.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={primeDeliveryDrawer} className="rounded-2xl">
              Create delivery
            </Button>
            <Button type="button" variant="outline" onClick={primeInvoiceDrawer} className="rounded-2xl">
              Create invoice
            </Button>
            <Button type="button" variant="outline" onClick={primePaymentDrawer} className="rounded-2xl">
              Record payment
            </Button>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {workflowStages.map((stage) => (
            <WorkflowStageCard key={stage.title} {...stage} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.02fr_1.18fr_0.8fr]">
        <div className="space-y-6">
          <SalesOrdersQueueCard
            orders={visibleOrders}
            search={filter.search}
            onSearchChange={(value) => setFilter((prev) => ({ ...prev, search: value, page: 1 }))}
            tabs={queueCounts}
            activeTab={queueTab}
            onTabChange={(value) => setQueueTab(value as QueueTabKey)}
            isLoading={ordersQuery.isLoading}
            onOpenOrder={(orderId) => setSelectedOrderId(orderId)}
            onCreateOrder={() => setCreateDrawerOpen(true)}
          />
          <PendingApprovalsCard approvals={pendingApprovalOrders} onOpenOrder={openExecutionDrawer} />
        </div>

        <div className="space-y-6">
          {selectedOrder ? (
            <>
              <JourneySection
                eyebrow="Selected Journey"
                title={`${selectedOrder.orderNumber} · ${selectedOrder.customerName}`}
                description="Track the upstream source and downstream execution trail for the selected sales order."
                actions={
                  <>
                    <Button type="button" variant="outline" onClick={() => openExecutionDrawer(selectedOrder.id)} className="rounded-2xl">
                      Inspect full order
                    </Button>
                    <Button type="button" onClick={handleSubmitSelectedOrder} disabled={submitMutation.isPending} className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800">
                      Submit
                    </Button>
                  </>
                }
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <InfoTile label="Order status" value={toLabel(selectedOrder.status)} />
                  <InfoTile label="Commercial total" value={fmtCurrency(selectedOrder.total, selectedOrder.currency)} />
                  <InfoTile label="Requested delivery" value={formatDate(selectedOrder.deliveryDate)} />
                  <InfoTile label="Payment terms" value={selectedOrder.paymentTerms ?? "Not defined"} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <FlowSignal label={selectedOrder.quoteId ? "Quote linked" : "Manual intake"} active={Boolean(selectedOrder.quoteId)} />
                  <FlowSignal label={selectedOrder.validation.stockAvailable ? "Stock available" : "Stock shortage"} active={selectedOrder.validation.stockAvailable} warning={!selectedOrder.validation.stockAvailable} />
                  <FlowSignal label={selectedOrder.inventoryReserved ? "Inventory reserved" : "Reservation pending"} active={selectedOrder.inventoryReserved} warning={!selectedOrder.inventoryReserved} />
                  <FlowSignal label={selectedOrder.validation.creditLimitExceeded ? "Credit check failed" : "Credit within limit"} active={!selectedOrder.validation.creditLimitExceeded} warning={selectedOrder.validation.creditLimitExceeded} />
                  <FlowSignal label={selectedOrder.validation.riskyPaymentTerms ? "Risky terms" : "Terms acceptable"} active={!selectedOrder.validation.riskyPaymentTerms} warning={selectedOrder.validation.riskyPaymentTerms} />
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
                  <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/75 p-4">
                    <p className="text-sm font-semibold text-slate-950">Presales and source context</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <InfoTile label="Lead" value={leadQuery.data?.name ?? selectedOrder.leadId ?? "Direct order"} />
                      <InfoTile label="Quote" value={selectedQuote?.quoteNumber ?? selectedOrder.quotationReference ?? "Not linked"} />
                      <InfoTile label="Customer PO" value={selectedOrder.customerPoNumber ?? "Not attached"} />
                      <InfoTile label="Expected close" value={leadQuery.data?.expectedTimeline ?? "Not available"} />
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                      {leadQuery.data?.notes || selectedOrder.notes || "No contextual notes captured yet for this order journey."}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/75 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">Approval and confirmation control</p>
                        <p className="mt-1 text-xs text-slate-500">Drive submission, approval, send-back, and confirmation from the same workspace.</p>
                      </div>
                      <select
                        value={selectedOrder.status}
                        onChange={(event) => handleSelectedStatusChange(event.target.value as SalesOrderStatus)}
                        className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
                      >
                        {DRAWER_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {toLabel(status)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" onClick={() => handleApprovalAction("APPROVE")} disabled={approvalMutation.isPending} className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700">
                        Approve
                      </Button>
                      <Button type="button" variant="outline" onClick={() => handleApprovalAction("SEND_BACK")} disabled={approvalMutation.isPending} className="rounded-2xl">
                        Send back
                      </Button>
                      <Button type="button" variant="destructive" onClick={() => handleApprovalAction("REJECT")} disabled={approvalMutation.isPending} className="rounded-2xl">
                        Reject
                      </Button>
                      <Button type="button" variant="outline" onClick={handleConfirmSelectedOrder} disabled={confirmMutation.isPending} className="rounded-2xl">
                        Confirm order
                      </Button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {selectedOrder.approvals.length ? (
                        selectedOrder.approvals.map((approval) => (
                          <div key={approval.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-950">{approval.roleLabel}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Stage {approval.sequenceNo} · {toLabel(approval.status)}
                                </p>
                                {approval.remarks ? <p className="mt-2 text-sm text-slate-600">{approval.remarks}</p> : null}
                              </div>
                              <p className="text-xs text-slate-500">{approval.approverName || "Pending"}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-sm text-slate-500">
                          No approval stages have been recorded for this order yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </JourneySection>

              <JourneySection
                eyebrow="Execution Automation"
                title="Inventory, delivery, invoice, and collection alignment"
                description="This is where the order operationalizes into stock movement, customer billing, and cash realization."
                actions={
                  <>
                    <Button type="button" variant="outline" onClick={primeDeliveryDrawer} className="rounded-2xl">
                      Delivery
                    </Button>
                    <Button type="button" variant="outline" onClick={primeInvoiceDrawer} className="rounded-2xl">
                      Invoice
                    </Button>
                    <Button type="button" variant="outline" onClick={primePaymentDrawer} className="rounded-2xl">
                      Payment
                    </Button>
                    <Button type="button" variant="outline" onClick={primeReturnDrawer} className="rounded-2xl">
                      Return
                    </Button>
                  </>
                }
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <InfoTile label="Stock posture" value={selectedOrder.stockAvailable ? "Available" : "Shortage"} tone={selectedOrder.stockAvailable ? "text-emerald-600" : "text-amber-600"} />
                  <InfoTile label="Reservation" value={selectedOrder.inventoryReserved ? "Completed" : "Pending"} tone={selectedOrder.inventoryReserved ? "text-emerald-600" : "text-amber-600"} />
                  <InfoTile label="Invoice coverage" value={selectedInvoices.length ? `${selectedInvoices.length} invoice(s)` : "Not invoiced"} />
                  <InfoTile label="Collections" value={selectedPayments.length ? `${selectedPayments.length} payment(s)` : "No payments"} />
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <RecordList
                    title="Delivery records"
                    emptyLabel="No delivery note created yet for this order."
                    records={selectedDeliveries.map((delivery) => ({
                      id: delivery.id,
                      title: delivery.deliveryNumber,
                      subtitle: `${delivery.status.replaceAll("_", " ")} · ${delivery.carrier || "Carrier pending"}`,
                      meta: delivery.scheduledDate ? formatDate(delivery.scheduledDate) : "Not scheduled",
                    }))}
                  />
                  <RecordList
                    title="Invoice records"
                    emptyLabel="No invoice generated yet for this order."
                    records={selectedInvoices.map((invoice) => ({
                      id: invoice.id,
                      title: invoice.invoiceNumber,
                      subtitle: `${toLabel(invoice.status)} · ${fmtCurrency(invoice.total, invoice.currency)}`,
                      meta: invoice.dueDate ? `Due ${formatDate(invoice.dueDate)}` : "Due date pending",
                    }))}
                  />
                  <RecordList
                    title="Payment receipts"
                    emptyLabel="No payments have been posted yet."
                    records={selectedPayments.map((payment) => ({
                      id: payment.id,
                      title: payment.paymentNumber,
                      subtitle: `${toLabel(payment.paymentMode)} · ${fmtCurrency(payment.amount, payment.currency)}`,
                      meta: formatDate(payment.paymentDate),
                    }))}
                  />
                  <RecordList
                    title="Returns and credit recovery"
                    emptyLabel="No return workflow exists for this order."
                    records={selectedReturns.map((item) => ({
                      id: item.id,
                      title: item.returnNumber,
                      subtitle: `${toLabel(item.status)} · ${item.returnReason}`,
                      meta: fmtCurrency(item.requestedAmount),
                    }))}
                  />
                </div>
              </JourneySection>
            </>
          ) : (
            <SelectedOrderEmptyState />
          )}
        </div>

        <div className="space-y-6">
          <AcceptedQuotesCard
            quotes={acceptedQuotes}
            isLoading={quotesQuery.isLoading}
            isConverting={convertQuoteMutation.isPending}
            onConvert={handleConvertQuote}
          />
          <QuickStatsCard stats={quickStats} />
          <OperationsSnapshotCard
            title="Inventory Sync"
            subtitle="Expose where order execution still depends on inventory action."
            stats={inventorySnapshot}
          />
          <OperationsSnapshotCard
            title="Finance Pulse"
            subtitle="Keep billing, collection, and recovery visible while working the order."
            stats={financeSnapshot}
          />
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
        open={isDeliveryDrawerOpen}
        onOpenChange={setDeliveryDrawerOpen}
        orderOptions={orderOptions}
        form={deliveryForm}
        pending={createDeliveryMutation.isPending}
        onFieldChange={(field, value) => setDeliveryForm((prev) => ({ ...prev, [field]: value }))}
        onSubmit={() =>
          createDeliveryMutation.mutate(deliveryForm, {
            onSuccess: () => {
              toast.success("Delivery note created.");
              setDeliveryDrawerOpen(false);
              setDeliveryForm({ salesOrderId: selectedOrderId || "" });
            },
            onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create delivery."),
          })
        }
      />

      <CreateInvoiceDrawer
        open={isInvoiceDrawerOpen}
        onOpenChange={setInvoiceDrawerOpen}
        orderOptions={orderOptions}
        form={invoiceForm}
        pending={createInvoiceMutation.isPending}
        onFieldChange={(field, value) => setInvoiceForm((prev) => ({ ...prev, [field]: value }))}
        onSubmit={() =>
          createInvoiceMutation.mutate(invoiceForm, {
            onSuccess: () => {
              toast.success("Invoice generated.");
              setInvoiceDrawerOpen(false);
              setInvoiceForm({ salesOrderId: selectedOrderId || "" });
            },
            onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create invoice."),
          })
        }
      />

      <CreatePaymentDrawer
        open={isPaymentDrawerOpen}
        onOpenChange={setPaymentDrawerOpen}
        invoiceOptions={invoiceOptions}
        form={paymentForm}
        pending={createPaymentMutation.isPending}
        onFieldChange={(field, value) => setPaymentForm((prev) => ({ ...prev, [field]: value }))}
        onSubmit={() =>
          createPaymentMutation.mutate(paymentForm, {
            onSuccess: () => {
              toast.success("Payment recorded.");
              setPaymentDrawerOpen(false);
              setPaymentForm({
                salesInvoiceId: selectedInvoices[0]?.id ?? "",
                paymentDate: new Date().toISOString().slice(0, 10),
                amount: 0,
                paymentMode: PaymentMode.UPI,
              });
            },
            onError: (error) => toast.error(error instanceof Error ? error.message : "Could not record payment."),
          })
        }
      />

      <CreateReturnDrawer
        open={isReturnDrawerOpen}
        onOpenChange={setReturnDrawerOpen}
        orderOptions={orderOptions}
        invoiceOptions={invoiceOptions}
        form={returnForm}
        pending={createReturnMutation.isPending}
        onFieldChange={(field, value) => setReturnForm((prev) => ({ ...prev, [field]: value }))}
        onSubmit={() =>
          createReturnMutation.mutate(returnForm, {
            onSuccess: () => {
              toast.success("Return request created.");
              setReturnDrawerOpen(false);
              setReturnForm({
                salesOrderId: selectedOrderId || "",
                salesInvoiceId: selectedInvoices[0]?.id,
                requestedAmount: 0,
                returnReason: "",
              });
            },
            onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create return request."),
          })
        }
      />

      <OrderDetailDrawer
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) setDetailId("");
        }}
        order={detail}
        loading={detailQuery.isLoading}
        statusOptions={DRAWER_STATUS_OPTIONS}
        onStatusChange={handleDetailStatusChange}
        statusPending={statusMutation.isPending || submitMutation.isPending || confirmMutation.isPending || approvalMutation.isPending}
      />
    </div>
  );
}

export default function SalesOrdersPage() {
  return <SalesOrdersWorkspacePage />;
}
