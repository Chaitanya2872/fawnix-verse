import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plus, Send, Trash2, XCircle } from "lucide-react";
import { useCurrentUser } from "@/modules/auth/hooks";
import {
  useCreatePurchaseRequisition,
  useProcurementProducts,
  usePurchaseRequisitions,
  useReviewPurchaseRequisition,
  useSubmitPurchaseRequisition,
} from "@/modules/purchases/hooks";
import type { PurchaseRequisitionStatus } from "@/modules/purchases/types";
import { P2PCard, P2PFormField, P2PLayout, P2PStatusBadge, P2PTable } from "../components";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function toneForStatus(status: PurchaseRequisitionStatus) {
  switch (status) {
    case "APPROVED":
    case "PO_CREATED":
      return "success";
    case "REJECTED":
      return "danger";
    case "SUBMITTED":
      return "warning";
    default:
      return "neutral";
  }
}

type DraftItem = {
  productId: string;
  quantity: number;
  remarks: string;
};

const emptyDraft: DraftItem = {
  productId: "",
  quantity: 1,
  remarks: "",
};

export default function P2PPrManagementPage() {
  const { data: currentUser } = useCurrentUser();
  const { data: products = [], isLoading: isProductsLoading } = useProcurementProducts();
  const { data: requisitions = [], isLoading, isError, error } = usePurchaseRequisitions();
  const createRequisition = useCreatePurchaseRequisition();
  const submitRequisition = useSubmitPurchaseRequisition();
  const reviewRequisition = useReviewPurchaseRequisition();

  const [department, setDepartment] = useState("");
  const [purpose, setPurpose] = useState("");
  const [neededByDate, setNeededByDate] = useState("");
  const [draftItem, setDraftItem] = useState<DraftItem>(emptyDraft);
  const [items, setItems] = useState<DraftItem[]>([]);

  const totalDraftAmount = useMemo(
    () =>
      items.reduce((total, item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return total + (product?.price ?? 0) * item.quantity;
      }, 0),
    [items, products]
  );

  function resetForm() {
    setDepartment("");
    setPurpose("");
    setNeededByDate("");
    setDraftItem(emptyDraft);
    setItems([]);
  }

  function handleAddItem() {
    if (!draftItem.productId || draftItem.quantity <= 0) return;
    setItems((current) => [...current, draftItem]);
    setDraftItem(emptyDraft);
  }

  function handleCreateRequisition() {
    if (!currentUser?.id || !department.trim() || items.length === 0) return;
    createRequisition.mutate(
      {
        requesterId: currentUser.id,
        department: department.trim(),
        purpose: purpose.trim() || undefined,
        neededByDate: neededByDate || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          remarks: item.remarks.trim() || undefined,
        })),
      },
      {
        onSuccess: () => resetForm(),
      }
    );
  }

  const columns = [
    { key: "code", label: "PR ID" },
    { key: "department", label: "Department" },
    { key: "neededBy", label: "Needed By" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Actions", className: "text-right" },
  ];

  const rows = requisitions.map((requisition) => ({
    id: requisition.id,
    code: (
      <div>
        <p className="font-semibold text-slate-900">{requisition.prNumber}</p>
        <p className="text-xs text-slate-500">{requisition.items.length} item(s)</p>
      </div>
    ),
    department: requisition.department,
    neededBy: formatDate(requisition.neededByDate),
    amount: formatCurrency(requisition.totalAmount),
    status: (
      <P2PStatusBadge label={requisition.status.replace("_", " ")} tone={toneForStatus(requisition.status)} />
    ),
    actions: (
      <div className="flex justify-end gap-2">
        {requisition.status === "DRAFT" && currentUser?.id ? (
          <button
            type="button"
            onClick={() => submitRequisition.mutate({ id: requisition.id, actorId: currentUser.id })}
            disabled={submitRequisition.isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            Submit
          </button>
        ) : null}
        {requisition.status === "SUBMITTED" && currentUser?.id ? (
          <>
            <button
              type="button"
              onClick={() =>
                reviewRequisition.mutate({
                  id: requisition.id,
                  payload: { action: "APPROVED", actorId: currentUser.id },
                })
              }
              disabled={reviewRequisition.isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-600/20 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve
            </button>
            <button
              type="button"
              onClick={() =>
                reviewRequisition.mutate({
                  id: requisition.id,
                  payload: { action: "REJECTED", actorId: currentUser.id, remarks: "Rejected from P2P workspace" },
                })
              }
              disabled={reviewRequisition.isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-rose-600/20 disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </button>
          </>
        ) : null}
      </div>
    ),
  }));

  return (
    <P2PLayout
      title="PR Management"
      subtitle="Create, submit, and approve purchase requisitions with live inventory-backed product selection."
    >
      <P2PCard
        title="Create Purchase Requisition"
        description="Build a requisition from inventory items and push it into approval."
        action={
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Requester</p>
            <p className="text-sm font-semibold text-slate-900">{currentUser?.name ?? "Loading user..."}</p>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <P2PFormField label="Department">
            <input
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              placeholder="Operations"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </P2PFormField>
          <P2PFormField label="Needed By">
            <input
              type="date"
              value={neededByDate}
              onChange={(event) => setNeededByDate(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </P2PFormField>
          <div className="md:col-span-2">
            <P2PFormField label="Purpose">
              <textarea
                rows={3}
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder="Procure access control devices for warehouse expansion."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </P2PFormField>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Add PR Item</h3>
              <p className="text-xs text-slate-500">Pick products from inventory-service data.</p>
            </div>
            {isProductsLoading ? (
              <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading products...
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,2fr)_120px_minmax(0,1.5fr)_auto]">
            <select
              value={draftItem.productId}
              onChange={(event) => setDraftItem((current) => ({ ...current, productId: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={draftItem.quantity}
              onChange={(event) =>
                setDraftItem((current) => ({ ...current, quantity: Number(event.target.value) || 1 }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
            <input
              value={draftItem.remarks}
              onChange={(event) => setDraftItem((current) => ({ ...current, remarks: event.target.value }))}
              placeholder="Optional remarks"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {items.length === 0 ? (
              <p className="text-sm text-slate-500">No items added yet.</p>
            ) : (
              items.map((item, index) => {
                const product = products.find((entry) => entry.id === item.productId);
                return (
                  <div
                    key={`${item.productId}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{product?.name ?? item.productId}</p>
                      <p className="text-xs text-slate-500">
                        Qty {item.quantity} · {formatCurrency((product?.price ?? 0) * item.quantity)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setItems((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                      className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            Estimated Total: <span className="font-semibold text-slate-900">{formatCurrency(totalDraftAmount)}</span>
          </div>
          <button
            type="button"
            onClick={handleCreateRequisition}
            disabled={!currentUser?.id || !department.trim() || items.length === 0 || createRequisition.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 disabled:opacity-50"
          >
            {createRequisition.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create PR
          </button>
        </div>

        {createRequisition.error instanceof Error ? (
          <p className="mt-3 text-sm text-rose-600">{createRequisition.error.message}</p>
        ) : null}
      </P2PCard>

      <P2PCard title="PR Queue" description="Live requisitions flowing through approval and PO conversion.">
        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
            <p className="mt-3 text-sm text-slate-500">Loading requisitions...</p>
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-sm text-rose-600">
            {error instanceof Error ? error.message : "Failed to load requisitions."}
          </div>
        ) : (
          <P2PTable columns={columns} rows={rows} />
        )}
      </P2PCard>
    </P2PLayout>
  );
}
