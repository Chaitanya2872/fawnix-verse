import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  FileCheck2,
  FileText,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { useCurrentUser } from "@/modules/auth/hooks";
import { useCreateInvoice, useInvoices, usePurchaseOrders, useReviewInvoice } from "@/modules/purchases/hooks";
import type { Invoice, InvoiceStatus, PurchaseOrder } from "@/modules/purchases/types";
import { P2PCard, P2PFormField, P2PLayout, P2PStatusBadge, P2PTable } from "../components";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function fieldShellClass(disabled = false) {
  return `w-full rounded-2xl border px-4 py-3 text-sm text-slate-700 transition focus:outline-none ${
    disabled
      ? "border-slate-200 bg-slate-100 text-slate-400"
      : "border-slate-200 bg-slate-50/80 hover:border-slate-300 focus:border-blue-500 focus:bg-white"
  }`;
}

function toneForStatus(status: InvoiceStatus) {
  switch (status) {
    case "APPROVED":
    case "PAID":
      return "success";
    case "REJECTED":
      return "danger";
    case "PENDING_APPROVAL":
      return "warning";
    default:
      return "neutral";
  }
}

function toneForMatching(status: Invoice["matchingStatus"]) {
  switch (status) {
    case "MATCHED":
      return "success";
    case "MISMATCH":
      return "danger";
    default:
      return "warning";
  }
}

function InvoiceStat({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>{icon}</div>
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-xl font-semibold text-slate-900">{value}</p>
          {sub ? <p className="text-[11px] text-slate-500">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

function CreateInvoicePanel({
  receivedOrders,
  purchaseOrderId,
  invoiceNumber,
  invoiceDate,
  dueDate,
  amount,
  selectedOrder,
  isCreating,
  errorMessage,
  onClose,
  onPurchaseOrderIdChange,
  onInvoiceNumberChange,
  onInvoiceDateChange,
  onDueDateChange,
  onAmountChange,
  onCreate,
}: {
  receivedOrders: PurchaseOrder[];
  purchaseOrderId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: string;
  selectedOrder: PurchaseOrder | null;
  isCreating: boolean;
  errorMessage?: string;
  onClose: () => void;
  onPurchaseOrderIdChange: (value: string) => void;
  onInvoiceNumberChange: (value: string) => void;
  onInvoiceDateChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[88vw] lg:w-[48vw] lg:max-w-[820px]">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Invoice</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Create Invoice</h2>
              <p className="mt-1 text-sm text-slate-500">Register a vendor bill against a received PO and send it into approval.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <section className="grid gap-4 md:grid-cols-2">
            <P2PFormField label="Received PO" hint="Invoices can only be created from received orders.">
              <select
                value={purchaseOrderId}
                onChange={(event) => onPurchaseOrderIdChange(event.target.value)}
                className={fieldShellClass()}
              >
                <option value="">Select received PO</option>
                {receivedOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.poNumber} · {order.vendor.vendorName}
                  </option>
                ))}
              </select>
            </P2PFormField>

            <P2PFormField label="Invoice Number" hint="Vendor invoice reference.">
              <input
                value={invoiceNumber}
                onChange={(event) => onInvoiceNumberChange(event.target.value)}
                placeholder="Invoice number"
                className={fieldShellClass()}
              />
            </P2PFormField>

            <P2PFormField label="Invoice Date" hint="Supplier invoice date.">
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(event) => onInvoiceDateChange(event.target.value)}
                  className={`${fieldShellClass()} pl-11`}
                />
              </div>
            </P2PFormField>

            <P2PFormField label="Due Date" hint="Optional payment due date.">
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => onDueDateChange(event.target.value)}
                  className={`${fieldShellClass()} pl-11`}
                />
              </div>
            </P2PFormField>

            <div className="md:col-span-2">
              <P2PFormField label="Invoice Amount" hint="Bill amount used in 3-way matching.">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => onAmountChange(event.target.value)}
                  placeholder="Invoice amount"
                  className={fieldShellClass()}
                />
              </P2PFormField>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected PO Snapshot</p>
            {selectedOrder ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs text-slate-500">PO Number</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedOrder.poNumber}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs text-slate-500">Vendor</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedOrder.vendor.vendorName}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs text-slate-500">PO Total</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(selectedOrder.totalAmount)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs text-slate-500">Expected Delivery</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(selectedOrder.expectedDeliveryDate)}</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Choose a received purchase order to create an invoice.</p>
            )}
          </section>
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Invoice Value</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{amount ? formatCurrency(Number(amount)) : "-"}</p>
            </div>
            <button
              type="button"
              onClick={onCreate}
              disabled={!purchaseOrderId || !invoiceNumber.trim() || !amount || isCreating}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Invoice
            </button>
          </div>
          {errorMessage ? <p className="mt-3 text-sm text-rose-600">{errorMessage}</p> : null}
        </div>
      </div>
    </div>
  );
}

function InvoiceDetailPanel({
  invoice,
  currentUserId,
  isReviewing,
  onClose,
  onApprove,
  onReject,
}: {
  invoice: Invoice;
  currentUserId?: string;
  isReviewing: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const canReview = invoice.status === "PENDING_APPROVAL" && !!currentUserId;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[84vw] lg:w-[46vw] lg:max-w-[780px]">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700">
                IV
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold text-slate-900">{invoice.invoiceNumber}</h2>
                  <P2PStatusBadge label={invoice.status.replace("_", " ")} tone={toneForStatus(invoice.status)} />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {invoice.poNumber} · {formatCurrency(invoice.amount)} · {invoice.vendor.vendorName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Invoice Summary</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p><span className="text-slate-500">Invoice Date:</span> {formatDate(invoice.invoiceDate)}</p>
                <p><span className="text-slate-500">Due Date:</span> {formatDate(invoice.dueDate)}</p>
                <p><span className="text-slate-500">PO Number:</span> {invoice.poNumber}</p>
                <p><span className="text-slate-500">Amount:</span> {formatCurrency(invoice.amount)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">3-Way Match</p>
              <div className="mt-3">
                <P2PStatusBadge label={invoice.matchingStatus.replace("_", " ")} tone={toneForMatching(invoice.matchingStatus)} />
                <p className="mt-3 text-sm leading-6 text-slate-700">{invoice.matchingNotes}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vendor</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p><span className="text-slate-500">Vendor:</span> {invoice.vendor.vendorName}</p>
              <p><span className="text-slate-500">Email:</span> {invoice.vendor.email || "-"}</p>
              <p><span className="text-slate-500">Phone:</span> {invoice.vendor.phone || "-"}</p>
            </div>
          </section>
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          {canReview ? (
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={onReject}
                disabled={isReviewing}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
              <button
                type="button"
                onClick={onApprove}
                disabled={isReviewing}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isReviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Approve
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">This invoice is already closed or not waiting for approval.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function P2PInvoicePage() {
  const { data: currentUser } = useCurrentUser();
  const { data: orders = [] } = usePurchaseOrders();
  const { data: invoices = [], isLoading, isError, error } = useInvoices();
  const createInvoice = useCreateInvoice();
  const reviewInvoice = useReviewInvoice();

  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<"ALL" | "PENDING" | "MATCHED" | "PAID">("ALL");
  const [queueSearch, setQueueSearch] = useState("");

  const receivedOrders = useMemo(() => orders.filter((item) => item.status === "RECEIVED"), [orders]);
  const selectedOrder = receivedOrders.find((entry) => entry.id === purchaseOrderId) ?? null;
  const selectedInvoice = invoices.find((entry) => entry.id === selectedInvoiceId) ?? null;

  const queueStats = useMemo(() => {
    const totalValue = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    return {
      total: invoices.length,
      pending: invoices.filter((invoice) => invoice.status === "PENDING_APPROVAL").length,
      matched: invoices.filter((invoice) => invoice.matchingStatus === "MATCHED").length,
      paid: invoices.filter((invoice) => invoice.status === "PAID").length,
      totalValue,
    };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const search = queueSearch.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesFilter =
        queueFilter === "ALL"
          ? true
          : queueFilter === "PENDING"
            ? invoice.status === "PENDING_APPROVAL"
            : queueFilter === "MATCHED"
              ? invoice.matchingStatus === "MATCHED"
              : invoice.status === "PAID";

      const matchesSearch =
        !search ||
        invoice.invoiceNumber.toLowerCase().includes(search) ||
        invoice.poNumber.toLowerCase().includes(search) ||
        invoice.vendor.vendorName.toLowerCase().includes(search) ||
        invoice.status.toLowerCase().includes(search);

      return matchesFilter && matchesSearch;
    });
  }, [invoices, queueFilter, queueSearch]);

  function resetCreateForm() {
    setPurchaseOrderId("");
    setInvoiceNumber("");
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setDueDate("");
    setAmount("");
  }

  function handleCreateInvoice() {
    if (!purchaseOrderId || !invoiceNumber.trim() || !invoiceDate || !amount) return;
    createInvoice.mutate(
      {
        purchaseOrderId,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        dueDate: dueDate || undefined,
        amount: Number(amount),
      },
      {
        onSuccess: () => {
          setIsCreatePanelOpen(false);
          resetCreateForm();
        },
      }
    );
  }

  const columns = [
    { key: "invoiceNumber", label: "Invoice" },
    { key: "purchaseOrder", label: "PO" },
    { key: "vendor", label: "Vendor" },
    { key: "matching", label: "3-Way Match" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
  ];

  const rows = filteredInvoices.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: (
      <div className="text-left">
        <p className="font-semibold text-slate-900">{invoice.invoiceNumber}</p>
        <p className="text-xs text-slate-500">{formatDate(invoice.invoiceDate)}</p>
      </div>
    ),
    purchaseOrder: invoice.poNumber,
    vendor: invoice.vendor.vendorName,
    matching: (
      <div className="text-left">
        <P2PStatusBadge label={invoice.matchingStatus.replace("_", " ")} tone={toneForMatching(invoice.matchingStatus)} />
        <p className="mt-1 text-xs text-slate-500">{invoice.matchingNotes}</p>
      </div>
    ),
    amount: formatCurrency(invoice.amount),
    status: <P2PStatusBadge label={invoice.status.replace("_", " ")} tone={toneForStatus(invoice.status)} />,
  }));

  return (
    <>
      <P2PLayout
        title="Invoice"
        subtitle="Track supplier invoices, review 3-way matching, and handle approvals from one invoice desk."
        meta={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreatePanelOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Invoice
            </button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InvoiceStat label="Invoices" value={queueStats.total} sub="all supplier bills" icon={<FileText className="h-4.5 w-4.5 text-blue-700" />} accent="bg-blue-100" />
          <InvoiceStat label="Pending Approval" value={queueStats.pending} sub="review queue" icon={<ShieldCheck className="h-4.5 w-4.5 text-amber-700" />} accent="bg-amber-100" />
          <InvoiceStat label="Matched" value={queueStats.matched} sub="ready for finance" icon={<FileCheck2 className="h-4.5 w-4.5 text-emerald-700" />} accent="bg-emerald-100" />
          <InvoiceStat label="Invoice Value" value={formatCurrency(queueStats.totalValue)} sub={`${queueStats.paid} already paid`} icon={<CircleDollarSign className="h-4.5 w-4.5 text-violet-700" />} accent="bg-violet-100" />
        </div>

        <P2PCard
          title="Invoice Queue"
          description="Filter the invoice register, open any bill in a side panel, and manage approval decisions without leaving the page."
          contentClassName="-mx-6 -mb-6"
        >
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2 pl-2">
              {[
                { key: "ALL", label: "All" },
                { key: "PENDING", label: "Pending Approval" },
                { key: "MATCHED", label: "Matched" },
                { key: "PAID", label: "Paid" },
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setQueueFilter(filter.key as typeof queueFilter)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    queueFilter === filter.key
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="relative w-full lg:mr-2 lg:w-[340px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={queueSearch}
                onChange={(event) => setQueueSearch(event.target.value)}
                placeholder="Search invoice, PO, vendor..."
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
              <p className="mt-3 text-sm text-slate-500">Loading invoices...</p>
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-sm text-rose-600">
              {error instanceof Error ? error.message : "Failed to load invoices."}
            </div>
          ) : (
            <P2PTable columns={columns} rows={rows} className="rounded-none border-x-0 border-b-0" onRowClick={(rowId) => setSelectedInvoiceId(rowId)} />
          )}
        </P2PCard>
      </P2PLayout>

      {selectedInvoice ? (
        <InvoiceDetailPanel
          invoice={selectedInvoice}
          currentUserId={currentUser?.id}
          isReviewing={reviewInvoice.isPending}
          onClose={() => setSelectedInvoiceId(null)}
          onApprove={() =>
            currentUser?.id &&
            reviewInvoice.mutate({
              id: selectedInvoice.id,
              payload: { action: "APPROVED", actorId: currentUser.id },
            })
          }
          onReject={() =>
            currentUser?.id &&
            reviewInvoice.mutate({
              id: selectedInvoice.id,
              payload: { action: "REJECTED", actorId: currentUser.id, remarks: "Rejected from invoice desk" },
            })
          }
        />
      ) : null}

      {isCreatePanelOpen ? (
        <CreateInvoicePanel
          receivedOrders={receivedOrders}
          purchaseOrderId={purchaseOrderId}
          invoiceNumber={invoiceNumber}
          invoiceDate={invoiceDate}
          dueDate={dueDate}
          amount={amount}
          selectedOrder={selectedOrder}
          isCreating={createInvoice.isPending}
          errorMessage={createInvoice.error instanceof Error ? createInvoice.error.message : undefined}
          onClose={() => {
            setIsCreatePanelOpen(false);
            if (!createInvoice.isPending) resetCreateForm();
          }}
          onPurchaseOrderIdChange={(value) => {
            setPurchaseOrderId(value);
            const order = receivedOrders.find((entry) => entry.id === value);
            setAmount(order ? String(order.totalAmount) : "");
          }}
          onInvoiceNumberChange={setInvoiceNumber}
          onInvoiceDateChange={setInvoiceDate}
          onDueDateChange={setDueDate}
          onAmountChange={setAmount}
          onCreate={handleCreateInvoice}
        />
      ) : null}
    </>
  );
}
