import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { useCurrentUser } from "@/modules/auth/hooks";
import { useCreatePayment, useInvoices, usePayments, useReviewPayment } from "@/modules/purchases/hooks";
import type { Payment, PaymentStatus, Invoice } from "@/modules/purchases/types";
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

function toneForStatus(status: PaymentStatus) {
  switch (status) {
    case "PAID":
      return "success";
    case "REJECTED":
      return "danger";
    default:
      return "warning";
  }
}

function PaymentStat({
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

function CreatePaymentPanel({
  approvedInvoices,
  invoiceId,
  paymentDate,
  remarks,
  selectedInvoice,
  isCreating,
  errorMessage,
  onClose,
  onInvoiceIdChange,
  onPaymentDateChange,
  onRemarksChange,
  onCreate,
}: {
  approvedInvoices: Invoice[];
  invoiceId: string;
  paymentDate: string;
  remarks: string;
  selectedInvoice: Invoice | null;
  isCreating: boolean;
  errorMessage?: string;
  onClose: () => void;
  onInvoiceIdChange: (value: string) => void;
  onPaymentDateChange: (value: string) => void;
  onRemarksChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[88vw] lg:w-[46vw] lg:max-w-[780px]">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Payment</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Request Payment</h2>
              <p className="mt-1 text-sm text-slate-500">Create a finance settlement request for an approved supplier invoice.</p>
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
          <section className="space-y-4">
            <P2PFormField label="Approved Invoice" hint="Payments can only be requested from approved invoices.">
              <select
                value={invoiceId}
                onChange={(event) => onInvoiceIdChange(event.target.value)}
                className={fieldShellClass()}
              >
                <option value="">Select approved invoice</option>
                {approvedInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} · {invoice.vendor.vendorName}
                  </option>
                ))}
              </select>
            </P2PFormField>

            <P2PFormField label="Payment Date" hint="Requested settlement date.">
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(event) => onPaymentDateChange(event.target.value)}
                  className={`${fieldShellClass()} pl-11`}
                />
              </div>
            </P2PFormField>

            <P2PFormField label="Settlement Notes" hint="Capture settlement remarks or release conditions.">
              <textarea
                rows={4}
                value={remarks}
                onChange={(event) => onRemarksChange(event.target.value)}
                placeholder="Settlement notes"
                className={fieldShellClass()}
              />
            </P2PFormField>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected Invoice Snapshot</p>
            {selectedInvoice ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs text-slate-500">Invoice</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs text-slate-500">Vendor</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedInvoice.vendor.vendorName}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs text-slate-500">Amount</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(selectedInvoice.amount)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs text-slate-500">3-Way Match</p>
                  <div className="mt-1">
                    <P2PStatusBadge label={selectedInvoice.matchingStatus.replace("_", " ")} tone={selectedInvoice.matchingStatus === "MATCHED" ? "success" : selectedInvoice.matchingStatus === "MISMATCH" ? "danger" : "warning"} />
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Choose an approved invoice to request payment.</p>
            )}
          </section>
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Settlement Value</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {selectedInvoice ? formatCurrency(selectedInvoice.amount) : "-"}
              </p>
            </div>
            <button
              type="button"
              onClick={onCreate}
              disabled={!invoiceId || isCreating}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Request Payment
            </button>
          </div>
          {errorMessage ? <p className="mt-3 text-sm text-rose-600">{errorMessage}</p> : null}
        </div>
      </div>
    </div>
  );
}

function PaymentDetailPanel({
  payment,
  currentUserId,
  isReviewing,
  onClose,
  onApprove,
  onReject,
}: {
  payment: Payment;
  currentUserId?: string;
  isReviewing: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const canReview = payment.status === "PENDING_APPROVAL" && !!currentUserId;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[84vw] lg:w-[44vw] lg:max-w-[760px]">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700">
                PY
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold text-slate-900">{payment.paymentNumber}</h2>
                  <P2PStatusBadge label={payment.status.replace("_", " ")} tone={toneForStatus(payment.status)} />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {payment.invoiceNumber} · {formatCurrency(payment.amount)} · {payment.vendor.vendorName}
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
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment Summary</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p><span className="text-slate-500">Invoice:</span> {payment.invoiceNumber}</p>
                <p><span className="text-slate-500">Requested By:</span> {payment.requestedBy}</p>
                <p><span className="text-slate-500">Approved By:</span> {payment.approvedBy || "-"}</p>
                <p><span className="text-slate-500">Payment Date:</span> {formatDate(payment.paymentDate)}</p>
                <p><span className="text-slate-500">Amount:</span> {formatCurrency(payment.amount)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vendor</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p><span className="text-slate-500">Vendor:</span> {payment.vendor.vendorName}</p>
                <p><span className="text-slate-500">Email:</span> {payment.vendor.email || "-"}</p>
                <p><span className="text-slate-500">Phone:</span> {payment.vendor.phone || "-"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Remarks</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">{payment.remarks || "No settlement remarks added."}</p>
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
            <p className="text-sm text-slate-500">This payment request is already closed or not waiting for approval.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function P2PPaymentPage() {
  const { data: currentUser } = useCurrentUser();
  const { data: invoices = [] } = useInvoices();
  const { data: payments = [], isLoading, isError, error } = usePayments();
  const createPayment = useCreatePayment();
  const reviewPayment = useReviewPayment();

  const [invoiceId, setInvoiceId] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<"ALL" | "PENDING" | "PAID" | "REJECTED">("ALL");
  const [queueSearch, setQueueSearch] = useState("");

  const approvedInvoices = useMemo(() => invoices.filter((item) => item.status === "APPROVED"), [invoices]);
  const selectedInvoice = approvedInvoices.find((entry) => entry.id === invoiceId) ?? null;
  const selectedPayment = payments.find((entry) => entry.id === selectedPaymentId) ?? null;

  const queueStats = useMemo(() => {
    const totalValue = payments.reduce((sum, payment) => sum + payment.amount, 0);
    return {
      total: payments.length,
      pending: payments.filter((payment) => payment.status === "PENDING_APPROVAL").length,
      paid: payments.filter((payment) => payment.status === "PAID").length,
      rejected: payments.filter((payment) => payment.status === "REJECTED").length,
      totalValue,
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const search = queueSearch.trim().toLowerCase();
    return payments.filter((payment) => {
      const matchesFilter =
        queueFilter === "ALL"
          ? true
          : queueFilter === "PENDING"
            ? payment.status === "PENDING_APPROVAL"
            : queueFilter === "PAID"
              ? payment.status === "PAID"
              : payment.status === "REJECTED";

      const matchesSearch =
        !search ||
        payment.paymentNumber.toLowerCase().includes(search) ||
        payment.invoiceNumber.toLowerCase().includes(search) ||
        payment.vendor.vendorName.toLowerCase().includes(search) ||
        payment.status.toLowerCase().includes(search);

      return matchesFilter && matchesSearch;
    });
  }, [payments, queueFilter, queueSearch]);

  function resetCreateForm() {
    setInvoiceId("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setRemarks("");
  }

  function handleCreatePayment() {
    if (!currentUser?.id || !invoiceId) return;
    createPayment.mutate(
      {
        invoiceId,
        requestedBy: currentUser.id,
        paymentDate: paymentDate || undefined,
        remarks: remarks.trim() || undefined,
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
    { key: "paymentNumber", label: "Payment Ref" },
    { key: "invoice", label: "Invoice" },
    { key: "vendor", label: "Vendor" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
  ];

  const rows = filteredPayments.map((payment) => ({
    id: payment.id,
    paymentNumber: (
      <div className="text-left">
        <p className="font-semibold text-slate-900">{payment.paymentNumber}</p>
        <p className="text-xs text-slate-500">{formatDate(payment.paymentDate)}</p>
      </div>
    ),
    invoice: payment.invoiceNumber,
    vendor: payment.vendor.vendorName,
    amount: formatCurrency(payment.amount),
    status: <P2PStatusBadge label={payment.status.replace("_", " ")} tone={toneForStatus(payment.status)} />,
  }));

  return (
    <>
      <P2PLayout
        title="Payment"
        subtitle="Review the payment register, raise new payment requests, and clear approvals from a single desk."
        meta={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreatePanelOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Request Payment
            </button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PaymentStat label="Requests" value={queueStats.total} sub="all payment entries" icon={<Wallet className="h-4.5 w-4.5 text-blue-700" />} accent="bg-blue-100" />
          <PaymentStat label="Pending Approval" value={queueStats.pending} sub="finance queue" icon={<ShieldCheck className="h-4.5 w-4.5 text-amber-700" />} accent="bg-amber-100" />
          <PaymentStat label="Paid" value={queueStats.paid} sub={`${queueStats.rejected} rejected`} icon={<CreditCard className="h-4.5 w-4.5 text-emerald-700" />} accent="bg-emerald-100" />
          <PaymentStat label="Settlement Value" value={formatCurrency(queueStats.totalValue)} sub="sum of payment requests" icon={<CircleDollarSign className="h-4.5 w-4.5 text-violet-700" />} accent="bg-violet-100" />
        </div>

        <P2PCard
          title="Payment Queue"
          description="Filter the payment register, open any request in a side panel, and handle approval actions in-place."
          contentClassName="-mx-6 -mb-6"
        >
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2 pl-2">
              {[
                { key: "ALL", label: "All" },
                { key: "PENDING", label: "Pending Approval" },
                { key: "PAID", label: "Paid" },
                { key: "REJECTED", label: "Rejected" },
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
                placeholder="Search payment ref, invoice, vendor..."
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
              <p className="mt-3 text-sm text-slate-500">Loading payment requests...</p>
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-sm text-rose-600">
              {error instanceof Error ? error.message : "Failed to load payment requests."}
            </div>
          ) : (
            <P2PTable columns={columns} rows={rows} className="rounded-none border-x-0 border-b-0" onRowClick={(rowId) => setSelectedPaymentId(rowId)} />
          )}
        </P2PCard>
      </P2PLayout>

      {selectedPayment ? (
        <PaymentDetailPanel
          payment={selectedPayment}
          currentUserId={currentUser?.id}
          isReviewing={reviewPayment.isPending}
          onClose={() => setSelectedPaymentId(null)}
          onApprove={() =>
            currentUser?.id &&
            reviewPayment.mutate({
              id: selectedPayment.id,
              payload: { action: "APPROVED", actorId: currentUser.id },
            })
          }
          onReject={() =>
            currentUser?.id &&
            reviewPayment.mutate({
              id: selectedPayment.id,
              payload: { action: "REJECTED", actorId: currentUser.id, remarks: "Rejected from payment desk" },
            })
          }
        />
      ) : null}

      {isCreatePanelOpen ? (
        <CreatePaymentPanel
          approvedInvoices={approvedInvoices}
          invoiceId={invoiceId}
          paymentDate={paymentDate}
          remarks={remarks}
          selectedInvoice={selectedInvoice}
          isCreating={createPayment.isPending}
          errorMessage={createPayment.error instanceof Error ? createPayment.error.message : undefined}
          onClose={() => {
            setIsCreatePanelOpen(false);
            if (!createPayment.isPending) resetCreateForm();
          }}
          onInvoiceIdChange={setInvoiceId}
          onPaymentDateChange={setPaymentDate}
          onRemarksChange={setRemarks}
          onCreate={handleCreatePayment}
        />
      ) : null}
    </>
  );
}
