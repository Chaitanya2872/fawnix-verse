import { useMemo } from "react";
import { NavLink, useParams } from "react-router-dom";
import { CreditCard, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { toApiError } from "@/services/api";
import { StatusBadge } from "../components/StatusBadge";
import { useOrders } from "../hooks/useOrders";
import { formatCurrency } from "../utils/format";
import { recordPayment } from "../services/paymentService";
import { InvoiceStatus, OrderStatus, type PaymentInput } from "../types";

export default function PaymentPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const {
    getOrderById,
    invoices,
    setInvoice,
    paymentsByInvoice,
    addPayment,
    updateOrderStatus,
  } = useOrders();

  const order = Number.isNaN(orderId) ? undefined : getOrderById(orderId);
  const invoice = order ? invoices[order.id] : undefined;

  const payments = useMemo(() => {
    if (!invoice) return [];
    return paymentsByInvoice[invoice.id] ?? [];
  }, [invoice, paymentsByInvoice]);

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = invoice ? Math.max(0, invoice.amount - totalPaid) : 0;

  const { register, handleSubmit, reset } = useForm<PaymentInput>({
    defaultValues: {
      amount: remaining || 0,
      payment_mode: "Bank Transfer",
      payment_date: new Date().toISOString().slice(0, 10),
    },
  });

  if (!order) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Order not found. <NavLink to="/orders" className="text-blue-600">Return to list</NavLink>.
      </div>
    );
  }

  async function onSubmit(values: PaymentInput) {
    if (!invoice) return;
    try {
      const payment = await recordPayment(invoice.id, values);
      addPayment(payment);
      toast.success("Payment recorded.");
    } catch (err) {
      const apiError = toApiError(err, "Unable to record payment.");
      toast.error(apiError.message);
      const fallbackPayment = {
        id: Date.now(),
        invoice_id: invoice.id,
        amount: values.amount,
        payment_mode: values.payment_mode,
        payment_date: values.payment_date,
      };
      addPayment(fallbackPayment);
    }

    const updatedPaid = totalPaid + values.amount;
    if (updatedPaid >= (invoice?.amount ?? 0)) {
      const updatedInvoice = {
        ...invoice,
        status: InvoiceStatus.PAID,
      };
      setInvoice(updatedInvoice);
      await updateOrderStatus(order.id, OrderStatus.PAID);
    }

    reset({
      amount: Math.max(0, remaining - values.amount),
      payment_mode: values.payment_mode,
      payment_date: values.payment_date,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Order #{order.id}</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Payment</h2>
          <p className="text-sm text-slate-500">Capture payment and close the order.</p>
        </div>
        <NavLink
          to={`/orders/${order.id}`}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Back to order
        </NavLink>
      </div>

      {!invoice ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-600">
          No invoice found for this order. Please generate the invoice first.
          <NavLink to={`/orders/${order.id}/invoice`} className="ml-2 text-blue-600">
            Generate invoice
          </NavLink>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Payment Summary</h3>
              <StatusBadge status={invoice.status} />
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Invoice</p>
                <p className="mt-1 font-semibold text-slate-900">{invoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total</p>
                <p className="mt-1 font-semibold text-slate-900">{formatCurrency(invoice.amount)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Remaining</p>
                <p className="mt-1 font-semibold text-slate-900">{formatCurrency(remaining)}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-4 sm:grid-cols-3">
              <label className="text-xs font-semibold text-slate-600">
                Amount
                <input
                  type="number"
                  step={0.01}
                  min={0}
                  {...register("amount", { valueAsNumber: true })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Payment Mode
                <select
                  {...register("payment_mode")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Payment Date
                <input
                  type="date"
                  {...register("payment_date")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700"
              >
                <CreditCard className="h-4 w-4" />
                Record Payment
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Payment History</h3>
            </div>
            <div className="mt-4 space-y-3">
              {payments.length === 0 ? (
                <p className="text-xs text-slate-500">No payments recorded yet.</p>
              ) : (
                payments.map((payment) => (
                  <div key={payment.id} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">{payment.payment_date}</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-xs text-slate-500">{payment.payment_mode}</p>
                  </div>
                ))
              )}
            </div>

            {invoice.status === InvoiceStatus.PAID ? (
              <button
                type="button"
                onClick={() => updateOrderStatus(order.id, OrderStatus.CLOSED)}
                className="mt-4 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-300"
              >
                Close Order
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
