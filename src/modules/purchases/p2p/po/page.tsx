import { useMemo, useState } from "react";
import { FileText, Loader2, Send } from "lucide-react";
import {
  useCreatePurchaseOrder,
  usePurchaseOrders,
  usePurchaseRequisitions,
  useVendors,
} from "@/modules/purchases/hooks";
import { P2PCard, P2PLayout, P2PStatusBadge, P2PTable } from "../components";

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

export default function P2PPurchaseOrderPage() {
  const { data: purchaseOrders = [], isLoading, isError, error } = usePurchaseOrders();
  const { data: requisitions = [] } = usePurchaseRequisitions();
  const { data: vendors = [] } = useVendors();
  const createPurchaseOrder = useCreatePurchaseOrder();

  const [purchaseRequisitionId, setPurchaseRequisitionId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");

  const approvedRequisitions = useMemo(
    () => requisitions.filter((requisition) => requisition.status === "APPROVED"),
    [requisitions]
  );
  const selectedRequisition = approvedRequisitions.find((entry) => entry.id === purchaseRequisitionId) ?? null;
  const selectedVendor = vendors.find((entry) => entry.id === vendorId) ?? null;

  const columns = [
    { key: "poNumber", label: "PO Number" },
    { key: "requisition", label: "Requisition" },
    { key: "vendor", label: "Vendor" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
  ];

  const rows = purchaseOrders.map((order) => ({
    id: order.id,
    poNumber: (
      <div>
        <p className="font-semibold text-slate-900">{order.poNumber}</p>
        <p className="text-xs text-slate-500">{formatDate(order.orderDate)}</p>
      </div>
    ),
    requisition: order.requisitionNumber,
    vendor: order.vendor.vendorName,
    amount: formatCurrency(order.totalAmount),
    status: (
      <P2PStatusBadge
        label={order.status}
        tone={order.status === "RECEIVED" ? "success" : "info"}
      />
    ),
  }));

  return (
    <P2PLayout
      title="Purchase Orders"
      subtitle="Generate purchase orders from approved requisitions and assign them to approved vendors."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <P2PCard
          title="Create Purchase Order"
          description="Convert an approved PR into a PO through the gateway-backed procurement flow."
          action={
            <button
              type="button"
              onClick={() => {
                if (!purchaseRequisitionId || !vendorId || !orderDate) return;
                createPurchaseOrder.mutate({
                  purchaseRequisitionId,
                  payload: {
                    vendorId,
                    orderDate,
                    expectedDeliveryDate: expectedDeliveryDate || undefined,
                    notes: notes.trim() || undefined,
                  },
                });
              }}
              disabled={!purchaseRequisitionId || !vendorId || createPurchaseOrder.isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 disabled:opacity-50"
            >
              {createPurchaseOrder.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              Generate PO
            </button>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <select
              value={purchaseRequisitionId}
              onChange={(event) => setPurchaseRequisitionId(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Select approved requisition</option>
              {approvedRequisitions.map((requisition) => (
                <option key={requisition.id} value={requisition.id}>
                  {requisition.prNumber} · {requisition.department}
                </option>
              ))}
            </select>
            <select
              value={vendorId}
              onChange={(event) => setVendorId(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Select vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.vendorName}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={orderDate}
              onChange={(event) => setOrderDate(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={expectedDeliveryDate}
              onChange={(event) => setExpectedDeliveryDate(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Dispatch notes or payment terms"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Requisition Summary</p>
              {selectedRequisition ? (
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  <p><span className="text-slate-500">PR:</span> {selectedRequisition.prNumber}</p>
                  <p><span className="text-slate-500">Department:</span> {selectedRequisition.department}</p>
                  <p><span className="text-slate-500">Items:</span> {selectedRequisition.items.length}</p>
                  <p><span className="text-slate-500">Amount:</span> {formatCurrency(selectedRequisition.totalAmount)}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Choose an approved requisition.</p>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vendor Summary</p>
              {selectedVendor ? (
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  <p><span className="text-slate-500">Vendor:</span> {selectedVendor.vendorName}</p>
                  <p><span className="text-slate-500">Email:</span> {selectedVendor.email || "-"}</p>
                  <p><span className="text-slate-500">Phone:</span> {selectedVendor.phone || "-"}</p>
                  <p><span className="text-slate-500">City:</span> {selectedVendor.city || "-"}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Choose a vendor.</p>
              )}
            </div>
          </div>

          {createPurchaseOrder.error instanceof Error ? (
            <p className="mt-3 text-sm text-rose-600">{createPurchaseOrder.error.message}</p>
          ) : null}
        </P2PCard>

        <P2PCard
          title="Issued Purchase Orders"
          description="Track generated POs and their downstream receipt state."
          action={
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
            >
              <Send className="h-3.5 w-3.5" />
              Routed via gateway
            </button>
          }
        >
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
              <p className="mt-3 text-sm text-slate-500">Loading purchase orders...</p>
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-sm text-rose-600">
              {error instanceof Error ? error.message : "Failed to load purchase orders."}
            </div>
          ) : (
            <P2PTable columns={columns} rows={rows} />
          )}
        </P2PCard>
      </div>
    </P2PLayout>
  );
}
