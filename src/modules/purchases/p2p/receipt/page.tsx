import { useMemo, useState } from "react";
import {
  CalendarDays,
  Loader2,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";
import { useCurrentUser } from "@/modules/auth/hooks";
import { useCreateGoodsReceipt, useGoodsReceipts, usePurchaseOrders } from "@/modules/purchases/hooks";
import type { GoodsReceipt, PurchaseOrder } from "@/modules/purchases/types";
import { P2PCard, P2PFormField, P2PLayout, P2PStatusBadge, P2PTable } from "../components";

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

function ReceiptStat({
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

function CreateReceiptPanel({
  currentUserName,
  receivableOrders,
  purchaseOrderId,
  receiptDate,
  remarks,
  selectedOrder,
  isCreating,
  errorMessage,
  onClose,
  onPurchaseOrderIdChange,
  onReceiptDateChange,
  onRemarksChange,
  onCreate,
}: {
  currentUserName?: string;
  receivableOrders: PurchaseOrder[];
  purchaseOrderId: string;
  receiptDate: string;
  remarks: string;
  selectedOrder: PurchaseOrder | null;
  isCreating: boolean;
  errorMessage?: string;
  onClose: () => void;
  onPurchaseOrderIdChange: (value: string) => void;
  onReceiptDateChange: (value: string) => void;
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
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Material Receipt</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Create GRN</h2>
              <p className="mt-1 text-sm text-slate-500">Confirm warehouse receipt against an issued purchase order.</p>
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
            <P2PFormField label="Purchase Order" hint="Only orders awaiting warehouse confirmation appear here.">
              <select
                value={purchaseOrderId}
                onChange={(event) => onPurchaseOrderIdChange(event.target.value)}
                className={fieldShellClass()}
              >
                <option value="">Select purchase order</option>
                {receivableOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.poNumber} · {order.vendor.vendorName}
                  </option>
                ))}
              </select>
            </P2PFormField>

            <div className="grid gap-4 md:grid-cols-2">
              <P2PFormField label="Receipt Date" hint="Warehouse confirmation date.">
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(event) => onReceiptDateChange(event.target.value)}
                    className={`${fieldShellClass()} pl-11`}
                  />
                </div>
              </P2PFormField>

              <P2PFormField label="Received By" hint="Current warehouse operator.">
                <input value={currentUserName ?? ""} disabled className={fieldShellClass(true)} />
              </P2PFormField>
            </div>

            <P2PFormField label="Remarks" hint="Condition, variance, or receiving notes.">
              <textarea
                rows={4}
                value={remarks}
                onChange={(event) => onRemarksChange(event.target.value)}
                placeholder="Condition, variance, or receiving remarks"
                className={fieldShellClass()}
              />
            </P2PFormField>
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
                  <p className="text-xs text-slate-500">Expected Delivery</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(selectedOrder.expectedDeliveryDate)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs text-slate-500">Items</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedOrder.items.length}</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Choose a purchase order to view receipt context.</p>
            )}
          </section>
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCreate}
              disabled={!purchaseOrderId || isCreating}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50"
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
              Confirm Receipt
            </button>
          </div>
          {errorMessage ? <p className="mt-3 text-sm text-rose-600">{errorMessage}</p> : null}
        </div>
      </div>
    </div>
  );
}

function ReceiptDetailPanel({
  receipt,
  relatedOrder,
  onClose,
}: {
  receipt: GoodsReceipt;
  relatedOrder: PurchaseOrder | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[84vw] lg:w-[44vw] lg:max-w-[760px]">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700">
                GR
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold text-slate-900">{receipt.grnNumber}</h2>
                  <P2PStatusBadge label={receipt.status} tone="success" />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {receipt.poNumber} · Received by {receipt.receivedBy}
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
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Receipt Summary</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p><span className="text-slate-500">GRN:</span> {receipt.grnNumber}</p>
              <p><span className="text-slate-500">PO Number:</span> {receipt.poNumber}</p>
              <p><span className="text-slate-500">Receipt Date:</span> {formatDate(receipt.receiptDate)}</p>
              <p><span className="text-slate-500">Received By:</span> {receipt.receivedBy}</p>
              <p><span className="text-slate-500">Remarks:</span> {receipt.remarks || "-"}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Linked Purchase Order</p>
            {relatedOrder ? (
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p><span className="text-slate-500">Vendor:</span> {relatedOrder.vendor.vendorName}</p>
                <p><span className="text-slate-500">Expected Delivery:</span> {formatDate(relatedOrder.expectedDeliveryDate)}</p>
                <p><span className="text-slate-500">Items:</span> {relatedOrder.items.length}</p>
                <p><span className="text-slate-500">Order Status:</span> {relatedOrder.status}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Linked purchase order details are not available.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function P2PMaterialReceiptPage() {
  const { data: currentUser } = useCurrentUser();
  const { data: purchaseOrders = [] } = usePurchaseOrders();
  const { data: receipts = [], isLoading, isError, error } = useGoodsReceipts();
  const createGoodsReceipt = useCreateGoodsReceipt();

  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [queueSearch, setQueueSearch] = useState("");

  const receivableOrders = useMemo(() => purchaseOrders.filter((order) => order.status === "CREATED"), [purchaseOrders]);
  const selectedOrder = receivableOrders.find((order) => order.id === purchaseOrderId) ?? null;
  const selectedReceipt = receipts.find((receipt) => receipt.id === selectedReceiptId) ?? null;
  const relatedSelectedOrder =
    selectedReceipt ? purchaseOrders.find((order) => order.poNumber === selectedReceipt.poNumber) ?? null : null;

  const queueStats = useMemo(() => {
    return {
      awaiting: receivableOrders.length,
      receipts: receipts.length,
      completed: receipts.filter((receipt) => receipt.status === "RECEIVED").length,
    };
  }, [receivableOrders.length, receipts]);

  const filteredReceipts = useMemo(() => {
    const search = queueSearch.trim().toLowerCase();
    return receipts.filter((receipt) => {
      if (!search) return true;
      return (
        receipt.grnNumber.toLowerCase().includes(search) ||
        receipt.poNumber.toLowerCase().includes(search) ||
        receipt.receivedBy.toLowerCase().includes(search)
      );
    });
  }, [queueSearch, receipts]);

  function resetCreateForm() {
    setPurchaseOrderId("");
    setReceiptDate(new Date().toISOString().slice(0, 10));
    setRemarks("");
  }

  function handleCreateReceipt() {
    if (!currentUser?.id || !purchaseOrderId) return;
    createGoodsReceipt.mutate(
      {
        purchaseOrderId,
        receiptDate,
        receivedBy: currentUser.id,
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
    { key: "grnNumber", label: "GRN" },
    { key: "poNumber", label: "PO" },
    { key: "receiptDate", label: "Receipt Date" },
    { key: "receivedBy", label: "Received By" },
    { key: "status", label: "Status" },
  ];

  const rows = filteredReceipts.map((receipt) => ({
    id: receipt.id,
    grnNumber: (
      <div className="text-left">
        <p className="font-semibold text-slate-900">{receipt.grnNumber}</p>
        <p className="text-xs text-slate-500">{receipt.poNumber}</p>
      </div>
    ),
    poNumber: receipt.poNumber,
    receiptDate: formatDate(receipt.receiptDate),
    receivedBy: receipt.receivedBy,
    status: <P2PStatusBadge label={receipt.status} tone="success" />,
  }));

  return (
    <>
      <P2PLayout
        title="Material Receipt"
        subtitle="Track GRNs, confirm warehouse receipts, and review receiving history from one operational desk."
        meta={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreatePanelOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Create GRN
            </button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <ReceiptStat label="Awaiting Receipt" value={queueStats.awaiting} sub="created POs pending warehouse" icon={<ShoppingCart className="h-4.5 w-4.5 text-sky-700" />} accent="bg-sky-100" />
          <ReceiptStat label="Receipts Logged" value={queueStats.receipts} sub="GRNs in register" icon={<Truck className="h-4.5 w-4.5 text-blue-700" />} accent="bg-blue-100" />
          <ReceiptStat label="Completed" value={queueStats.completed} sub="receipt confirmations closed" icon={<ShieldCheck className="h-4.5 w-4.5 text-emerald-700" />} accent="bg-emerald-100" />
        </div>

        <P2PCard
          title="Receipt Register"
          description="Search the GRN register, open any receipt in a detail panel, and manage receiving confirmations through a dedicated panel."
          contentClassName="-mx-6 -mb-6"
        >
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
              Warehouse receipts synced with procurement-service
            </div>
            <div className="relative w-full lg:mr-2 lg:w-[340px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={queueSearch}
                onChange={(event) => setQueueSearch(event.target.value)}
                placeholder="Search GRN, PO, receiver..."
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
              <p className="mt-3 text-sm text-slate-500">Loading receipt register...</p>
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-sm text-rose-600">
              {error instanceof Error ? error.message : "Failed to load receipts."}
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
              <p className="text-base font-semibold text-slate-900">No goods receipts match this view.</p>
              <p className="mt-2 text-sm text-slate-500">Try another search term or create the first GRN from the panel.</p>
            </div>
          ) : (
            <P2PTable columns={columns} rows={rows} className="rounded-none border-x-0 border-b-0" onRowClick={(rowId) => setSelectedReceiptId(rowId)} />
          )}
        </P2PCard>
      </P2PLayout>

      {selectedReceipt ? <ReceiptDetailPanel receipt={selectedReceipt} relatedOrder={relatedSelectedOrder} onClose={() => setSelectedReceiptId(null)} /> : null}

      {isCreatePanelOpen ? (
        <CreateReceiptPanel
          currentUserName={currentUser?.name}
          receivableOrders={receivableOrders}
          purchaseOrderId={purchaseOrderId}
          receiptDate={receiptDate}
          remarks={remarks}
          selectedOrder={selectedOrder}
          isCreating={createGoodsReceipt.isPending}
          errorMessage={createGoodsReceipt.error instanceof Error ? createGoodsReceipt.error.message : undefined}
          onClose={() => {
            setIsCreatePanelOpen(false);
            if (!createGoodsReceipt.isPending) resetCreateForm();
          }}
          onPurchaseOrderIdChange={setPurchaseOrderId}
          onReceiptDateChange={setReceiptDate}
          onRemarksChange={setRemarks}
          onCreate={handleCreateReceipt}
        />
      ) : null}
    </>
  );
}
