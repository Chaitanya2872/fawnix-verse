import { useEffect } from "react";
import { NavLink, useParams } from "react-router-dom";
import { FileCheck2 } from "lucide-react";
import { Loader } from "../components/Loader";
import { StatusBadge } from "../components/StatusBadge";
import { useOrders } from "../hooks/useOrders";
import { useInvoice } from "../hooks/useInvoice";
import { formatCurrency, formatDateShort } from "../utils/format";

export default function InvoicePage() {
  const { id } = useParams();
  const orderId = Number(id);
  const { getOrderById } = useOrders();
  const order = Number.isNaN(orderId) ? undefined : getOrderById(orderId);
  const { invoice, isLoading, error, loadInvoice, generateInvoice } = useInvoice(order?.id);

  useEffect(() => {
    if (!invoice && order?.id) {
      void loadInvoice();
    }
  }, [invoice, loadInvoice, order?.id]);

  if (!order) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Order not found. <NavLink to="/orders" className="text-blue-600">Return to list</NavLink>.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Order #{order.id}</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Invoice</h2>
          <p className="text-sm text-slate-500">Generate and send customer invoice.</p>
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
            <FileCheck2 className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Invoice Details</span>
          </div>
          {invoice ? <StatusBadge status={invoice.status} /> : null}
        </div>

        {isLoading ? (
          <div className="mt-4">
            <Loader label="Loading invoice" />
          </div>
        ) : null}
        {error ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
            {error}
          </div>
        ) : null}

        {invoice ? (
          <div className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Invoice Number</p>
              <p className="mt-1 font-semibold text-slate-900">{invoice.invoice_number}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Amount</p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatCurrency(invoice.amount)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Customer</p>
              <p className="mt-1 font-semibold text-slate-900">{order.customer?.name ?? "Customer"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Created</p>
              <p className="mt-1 text-slate-600">{formatDateShort(order.created_at)}</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            No invoice generated yet.
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={generateInvoice}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-70"
          >
            {isLoading ? "Generating..." : "Generate Invoice"}
          </button>
          <NavLink
            to={`/orders/${order.id}/payment`}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            Proceed to payment
          </NavLink>
        </div>
      </div>
    </div>
  );
}
