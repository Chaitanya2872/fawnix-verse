import { useMemo, useState } from "react";
import { Loader2, PackageCheck } from "lucide-react";
import { useCurrentUser } from "@/modules/auth/hooks";
import {
  useCreateGoodsReceipt,
  useGoodsReceipts,
  usePurchaseOrders,
} from "@/modules/purchases/hooks";
import { P2PCard, P2PLayout, P2PStatusBadge, P2PTable } from "../components";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function P2PMaterialReceiptPage() {
  const { data: currentUser } = useCurrentUser();
  const { data: purchaseOrders = [] } = usePurchaseOrders();
  const { data: receipts = [], isLoading, isError, error } = useGoodsReceipts();
  const createGoodsReceipt = useCreateGoodsReceipt();

  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");

  const receivableOrders = useMemo(
    () => purchaseOrders.filter((order) => order.status === "CREATED"),
    [purchaseOrders]
  );
  const selectedOrder = receivableOrders.find((order) => order.id === purchaseOrderId) ?? null;

  const columns = [
    { key: "grnNumber", label: "GRN" },
    { key: "poNumber", label: "PO" },
    { key: "receiptDate", label: "Receipt Date" },
    { key: "receivedBy", label: "Received By" },
    { key: "status", label: "Status", className: "text-right" },
  ];

  const rows = receipts.map((receipt) => ({
    id: receipt.id,
    grnNumber: <span className="font-semibold text-slate-900">{receipt.grnNumber}</span>,
    poNumber: receipt.poNumber,
    receiptDate: formatDate(receipt.receiptDate),
    receivedBy: receipt.receivedBy,
    status: (
      <div className="flex justify-end">
        <P2PStatusBadge label={receipt.status} tone="success" />
      </div>
    ),
  }));

  return (
    <P2PLayout
      title="Goods Receipts"
      subtitle="Capture warehouse receipt confirmations against issued purchase orders."
    >
      <P2PCard
        title="Create GRN"
        description="Confirm receipt against a purchase order that is still awaiting warehouse acknowledgement."
        action={
          <button
            type="button"
            onClick={() => {
              if (!currentUser?.id || !purchaseOrderId) return;
              createGoodsReceipt.mutate({
                purchaseOrderId,
                receiptDate,
                receivedBy: currentUser.id,
                remarks: remarks.trim() || undefined,
              });
            }}
            disabled={!currentUser?.id || !purchaseOrderId || createGoodsReceipt.isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-600/20 disabled:opacity-50"
          >
            {createGoodsReceipt.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PackageCheck className="h-3.5 w-3.5" />}
            Confirm receipt
          </button>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <select
            value={purchaseOrderId}
            onChange={(event) => setPurchaseOrderId(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Select purchase order</option>
            {receivableOrders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.poNumber} · {order.vendor.vendorName}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={receiptDate}
            onChange={(event) => setReceiptDate(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={currentUser?.name ?? ""}
            disabled
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          />
        </div>
        <textarea
          rows={3}
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          placeholder="Condition, variance, or receiving remarks"
          className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {selectedOrder ? (
            <>
              <p><span className="text-slate-500">PO:</span> {selectedOrder.poNumber}</p>
              <p><span className="text-slate-500">Vendor:</span> {selectedOrder.vendor.vendorName}</p>
              <p><span className="text-slate-500">Expected Delivery:</span> {formatDate(selectedOrder.expectedDeliveryDate)}</p>
              <p><span className="text-slate-500">Items:</span> {selectedOrder.items.length}</p>
            </>
          ) : (
            <p className="text-slate-500">Choose a purchase order to view receipt context.</p>
          )}
        </div>

        {createGoodsReceipt.error instanceof Error ? (
          <p className="mt-3 text-sm text-rose-600">{createGoodsReceipt.error.message}</p>
        ) : null}
      </P2PCard>

      <P2PCard title="Receipt Register" description="Warehouse confirmations already recorded in procurement-service.">
        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
            <p className="mt-3 text-sm text-slate-500">Loading receipt register...</p>
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-sm text-rose-600">
            {error instanceof Error ? error.message : "Failed to load receipts."}
          </div>
        ) : (
          <P2PTable columns={columns} rows={rows} />
        )}
      </P2PCard>
    </P2PLayout>
  );
}
