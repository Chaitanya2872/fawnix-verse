"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, PackageCheck, ReceiptText, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CreateDeliveryDrawer,
  CreateInvoiceDrawer,
  CreateOrderDrawer,
  DeliveryBoardCard,
  InvoiceBoardCard,
  OrderDetailDrawer,
  PendingApprovalsCard,
  SalesOrdersHero,
  SalesOrdersKpis,
  SalesOrdersQueueCard,
  fmtCurrency,
  toLabel,
} from "./components";
import {
  useApprovalRules,
  useConfirmSalesOrder,
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
  SalesReturnStatus,
  type CreateSalesDeliveryInput,
  type CreateSalesInvoiceInput,
  type CreateSalesOrderInput,
  type CreateSalesPaymentInput,
  type CreateSalesReturnInput,
  type ManualOrderFormState,
  type ManualOrderItemDraft,
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

const O2C_TABS = ["Orders", "Approvals", "Delivery", "Invoices", "Payments", "Returns", "Reports"] as const;
type O2CTab = (typeof O2C_TABS)[number];

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

export default function SalesOrdersPage() {
  const [workspaceTab, setWorkspaceTab] = useState<O2CTab>("Orders");
  const [queueTab, setQueueTab] = useState<QueueTabKey>("ALL");
  const [detailId, setDetailId] = useState("");
  const [isCreateDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [isDeliveryDrawerOpen, setDeliveryDrawerOpen] = useState(false);
  const [isInvoiceDrawerOpen, setInvoiceDrawerOpen] = useState(false);
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
  const detailQuery = useSalesOrder(detailId);
  const rulesQuery = useApprovalRules();
  const deliveriesQuery = useSalesDeliveries();
  const invoicesQuery = useSalesInvoices();
  const paymentsQuery = useSalesPayments();
  const returnsQuery = useSalesReturns();
  const reportsQuery = useSalesReportOverview();

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
  const detail = detailQuery.data ?? null;
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
        setDetailId(created.id);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Could not create order.");
      },
    });
  }

  function handleStatusChange(status: SalesOrderStatus) {
    if (!detail) return;
    statusMutation.mutate(
      { id: detail.id, status },
      { onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update order status.") }
    );
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

  function renderWorkspaceTab() {
    switch (workspaceTab) {
      case "Approvals":
        return (
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Approval Queue</h3>
                  <p className="mt-1 text-sm text-slate-500">Review configured thresholds, pending orders, and approval history.</p>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                {detail?.approvals?.length ? (
                  detail.approvals.map((approval) => (
                    <div key={approval.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{approval.roleLabel}</p>
                          <p className="mt-1 text-xs text-slate-500">Stage {approval.sequenceNo} • {toLabel(approval.status)}</p>
                          {approval.remarks ? <p className="mt-2 text-sm text-slate-600">{approval.remarks}</p> : null}
                        </div>
                        <p className="text-xs text-slate-500">{approval.approverName || "Pending"}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
                    Open an order to view or action its approval timeline.
                  </div>
                )}
              </div>
              {detail ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => approvalMutation.mutate({ id: detail.id, action: "APPROVE" })}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => approvalMutation.mutate({ id: detail.id, action: "SEND_BACK" })}>Send Back</Button>
                  <Button size="sm" variant="destructive" onClick={() => approvalMutation.mutate({ id: detail.id, action: "REJECT" })}>Reject</Button>
                  <Button size="sm" variant="secondary" onClick={() => submitMutation.mutate(detail.id)}>Submit / Re-submit</Button>
                  <Button size="sm" variant="outline" onClick={() => confirmMutation.mutate({ id: detail.id })}>Confirm</Button>
                </div>
              ) : null}
            </section>
            <div className="space-y-6">
              <PendingApprovalsCard approvals={pendingApprovalOrders} onOpenOrder={setDetailId} />
              <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-950">Approval Rules</h3>
                <p className="mt-1 text-sm text-slate-500">Dynamic thresholds driving O2C governance.</p>
                <div className="mt-4 space-y-3">
                  {approvalRules.length ? (
                    approvalRules.map((rule) => (
                      <div key={rule.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{rule.roleLabel}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Stage {rule.sequenceNo} • {rule.active ? "Active" : "Inactive"}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500">
                            {rule.minOrderValue || rule.maxOrderValue ? `${rule.minOrderValue ?? 0} - ${rule.maxOrderValue ?? "∞"}` : "Conditional"}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
                      No approval rules configured yet. Orders will auto-approve until dynamic rules are created.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        );
      case "Delivery":
        return (
          <DeliveryBoardCard
            deliveries={deliveries}
            isLoading={deliveriesQuery.isLoading}
            onCreate={() => setDeliveryDrawerOpen(true)}
            onStatusChange={(id, status) => deliveryStatusMutation.mutate({ id, status })}
            statusPending={deliveryStatusMutation.isPending}
          />
        );
      case "Invoices":
        return (
          <InvoiceBoardCard
            invoices={invoices}
            isLoading={invoicesQuery.isLoading}
            onCreate={() => setInvoiceDrawerOpen(true)}
            onStatusChange={(id, status) => invoiceStatusMutation.mutate({ id, status })}
            statusPending={invoiceStatusMutation.isPending}
          />
        );
      case "Payments":
        return (
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Record Payment</h3>
              <div className="mt-4 grid gap-3">
                <select className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm" value={paymentForm.salesInvoiceId} onChange={(event) => setPaymentForm((prev) => ({ ...prev, salesInvoiceId: event.target.value }))}>
                  <option value="">Select invoice</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber} • {invoice.customerName}
                    </option>
                  ))}
                </select>
                <Input type="date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm((prev) => ({ ...prev, paymentDate: event.target.value }))} />
                <Input type="number" min="0" step="0.01" placeholder="Amount" value={paymentForm.amount || ""} onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: Number(event.target.value) }))} />
                <select className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm" value={paymentForm.paymentMode} onChange={(event) => setPaymentForm((prev) => ({ ...prev, paymentMode: event.target.value as CreateSalesPaymentInput["paymentMode"] }))}>
                  {Object.values(PaymentMode).map((mode) => <option key={mode} value={mode}>{toLabel(mode)}</option>)}
                </select>
                <Input placeholder="Reference number" value={paymentForm.referenceNumber ?? ""} onChange={(event) => setPaymentForm((prev) => ({ ...prev, referenceNumber: event.target.value }))} />
                <Input placeholder="Remarks" value={paymentForm.remarks ?? ""} onChange={(event) => setPaymentForm((prev) => ({ ...prev, remarks: event.target.value }))} />
                <Button
                  onClick={() =>
                    createPaymentMutation.mutate(paymentForm, {
                      onSuccess: () => toast.success("Payment recorded."),
                      onError: (error) => toast.error(error instanceof Error ? error.message : "Could not record payment."),
                    })
                  }
                  disabled={!paymentForm.salesInvoiceId || paymentForm.amount <= 0}
                >
                  Record payment
                </Button>
              </div>
            </section>
            <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Payment Register</h3>
              <div className="mt-4 space-y-3">
                {payments.length ? (
                  payments.map((payment) => (
                    <div key={payment.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{payment.paymentNumber}</p>
                          <p className="mt-1 text-xs text-slate-500">{payment.customerName} • {toLabel(payment.paymentMode)}</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-950">{fmtCurrency(payment.amount, payment.currency)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">No payments captured yet.</div>
                )}
              </div>
            </section>
          </div>
        );
      case "Returns":
        return (
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Create Return Request</h3>
              <div className="mt-4 grid gap-3">
                <select className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm" value={returnForm.salesOrderId} onChange={(event) => setReturnForm((prev) => ({ ...prev, salesOrderId: event.target.value }))}>
                  <option value="">Select order</option>
                  {orders.map((order) => <option key={order.id} value={order.id}>{order.orderNumber} • {order.customerName}</option>)}
                </select>
                <select className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm" value={returnForm.salesInvoiceId ?? ""} onChange={(event) => setReturnForm((prev) => ({ ...prev, salesInvoiceId: cleanOptional(event.target.value) }))}>
                  <option value="">Link invoice (optional)</option>
                  {invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber}</option>)}
                </select>
                <Input placeholder="Return reason" value={returnForm.returnReason} onChange={(event) => setReturnForm((prev) => ({ ...prev, returnReason: event.target.value }))} />
                <Input type="number" min="0" step="0.01" placeholder="Requested amount" value={returnForm.requestedAmount || ""} onChange={(event) => setReturnForm((prev) => ({ ...prev, requestedAmount: Number(event.target.value) }))} />
                <Input placeholder="Remarks" value={returnForm.remarks ?? ""} onChange={(event) => setReturnForm((prev) => ({ ...prev, remarks: event.target.value }))} />
                <Button
                  onClick={() =>
                    createReturnMutation.mutate(returnForm, {
                      onSuccess: () => toast.success("Return request created."),
                      onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create return request."),
                    })
                  }
                  disabled={!returnForm.salesOrderId || !returnForm.returnReason.trim()}
                >
                  Create return request
                </Button>
              </div>
            </section>
            <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Return Queue</h3>
              <div className="mt-4 space-y-3">
                {returns.length ? (
                  returns.map((salesReturn) => (
                    <div key={salesReturn.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{salesReturn.returnNumber}</p>
                          <p className="mt-1 text-xs text-slate-500">{salesReturn.customerName} • {toLabel(salesReturn.status)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs" value={salesReturn.status} onChange={(event) => returnStatusMutation.mutate({ id: salesReturn.id, status: event.target.value as typeof SalesReturnStatus[keyof typeof SalesReturnStatus], approvedAmount: salesReturn.requestedAmount })}>
                            {Object.values(SalesReturnStatus).map((status) => <option key={status} value={status}>{toLabel(status)}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">No returns are open right now.</div>
                )}
              </div>
            </section>
          </div>
        );
      case "Reports":
        return (
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Customer-wise Sales</h3>
              <div className="mt-4 space-y-3">
                {report?.customerSales?.length ? (
                  report.customerSales.map((row) => (
                    <div key={row.customerName} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{row.customerName}</p>
                        <p className="mt-1 text-xs text-slate-500">Outstanding {fmtCurrency(row.outstandingAmount)}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-950">{fmtCurrency(row.totalSales)}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">No sales report data available yet.</div>
                )}
              </div>
            </section>
            <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Overdue Customers</h3>
              <div className="mt-4 space-y-3">
                {report?.overdueCustomers?.length ? (
                  report.overdueCustomers.map((row) => (
                    <div key={`${row.customerName}-${row.outstandingAmount}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-950">{row.customerName}</p>
                      <p className="text-sm font-semibold text-rose-600">{fmtCurrency(row.outstandingAmount)}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">No overdue alerts right now.</div>
                )}
              </div>
            </section>
          </div>
        );
      default:
        return (
          <SalesOrdersQueueCard
            orders={visibleOrders}
            search={filter.search}
            onSearchChange={(value) => setFilter((prev) => ({ ...prev, search: value, page: 1 }))}
            tabs={queueCounts}
            activeTab={queueTab}
            onTabChange={(value) => setQueueTab(value as QueueTabKey)}
            isLoading={ordersQuery.isLoading}
            onOpenOrder={(orderId) => {
              setDetailId(orderId);
              setWorkspaceTab("Approvals");
            }}
            onCreateOrder={() => setCreateDrawerOpen(true)}
          />
        );
    }
  }

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <SalesOrdersHero orderCount={visibleOrders.length} onCreateOrder={() => setCreateDrawerOpen(true)} onExport={handleExport} />
      <SalesOrdersKpis metrics={kpis as never} isLoading={ordersQuery.isLoading || reportsQuery.isLoading} />

      <div className="flex flex-wrap gap-2">
        {O2C_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setWorkspaceTab(tab)}
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
              workspaceTab === tab
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {renderWorkspaceTab()}

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
        orderOptions={orders.map((order) => ({ id: order.id, label: `${order.orderNumber} • ${order.customerName}` }))}
        form={deliveryForm}
        pending={createDeliveryMutation.isPending}
        onFieldChange={(field, value) => setDeliveryForm((prev) => ({ ...prev, [field]: value }))}
        onSubmit={() =>
          createDeliveryMutation.mutate(deliveryForm, {
            onSuccess: () => {
              toast.success("Delivery note created.");
              setDeliveryDrawerOpen(false);
              setDeliveryForm({ salesOrderId: "" });
            },
            onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create delivery."),
          })
        }
      />

      <CreateInvoiceDrawer
        open={isInvoiceDrawerOpen}
        onOpenChange={setInvoiceDrawerOpen}
        orderOptions={orders.map((order) => ({ id: order.id, label: `${order.orderNumber} • ${order.customerName}` }))}
        form={invoiceForm}
        pending={createInvoiceMutation.isPending}
        onFieldChange={(field, value) => setInvoiceForm((prev) => ({ ...prev, [field]: value }))}
        onSubmit={() =>
          createInvoiceMutation.mutate(invoiceForm, {
            onSuccess: () => {
              toast.success("Invoice generated.");
              setInvoiceDrawerOpen(false);
              setInvoiceForm({ salesOrderId: "" });
            },
            onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create invoice."),
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
        onStatusChange={handleStatusChange}
        statusPending={statusMutation.isPending || submitMutation.isPending || confirmMutation.isPending || approvalMutation.isPending}
      />
    </div>
  );
}
