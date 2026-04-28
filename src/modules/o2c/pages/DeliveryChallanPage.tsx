import { useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { FileText, Truck } from "lucide-react";
import { toApiError } from "@/services/api";
import { toast } from "react-toastify";
import { StatusBadge } from "../components/StatusBadge";
import { useOrders } from "../hooks/useOrders";
import { formatDateShort } from "../utils/format";
import { createDeliveryChallan } from "../services/orderService";

export default function DeliveryChallanPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const { getOrderById, deliveryChallans, setDeliveryChallan } = useOrders();
  const order = Number.isNaN(orderId) ? undefined : getOrderById(orderId);
  const challan = order ? deliveryChallans[order.id] : undefined;
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!order) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Order not found. <NavLink to="/orders" className="text-blue-600">Return to list</NavLink>.
      </div>
    );
  }

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await createDeliveryChallan(order.id);
      setDeliveryChallan(order.id, data);
      toast.success("Delivery challan generated.");
    } catch (err) {
      const apiError = toApiError(err, "Unable to generate delivery challan.");
      setError(apiError.message);
      const fallback = {
        id: Date.now(),
        order_id: order.id,
        dc_number: `DC-${order.id}-${new Date().getFullYear()}`,
        issued_at: new Date().toISOString(),
        status: "CREATED" as const,
      };
      setDeliveryChallan(order.id, fallback);
      toast.error(apiError.message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Order #{order.id}</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Delivery Challan</h2>
          <p className="text-sm text-slate-500">Generate and share dispatch details.</p>
        </div>
        <NavLink
          to={`/orders/${order.id}`}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Back to order
        </NavLink>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Challan Details</span>
          </div>
          {challan ? <StatusBadge status={challan.status} /> : null}
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
            {error}
          </div>
        ) : null}

        {challan ? (
          <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Challan Number</p>
              <p className="mt-1 font-semibold text-slate-900">{challan.dc_number}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Issued</p>
              <p className="mt-1 font-semibold text-slate-900">{formatDateShort(challan.issued_at)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Customer</p>
              <p className="mt-1 font-semibold text-slate-900">{order.customer?.name ?? "Customer"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Address</p>
              <p className="mt-1 text-slate-600">{order.customer?.address ?? "-"}</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            No challan generated yet.
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-70"
          >
            <Truck className="h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate Delivery Challan"}
          </button>
          <NavLink
            to={`/orders/${order.id}/invoice`}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            Continue to invoice
          </NavLink>
        </div>
      </div>
    </div>
  );
}
