"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CreatePaymentDrawer,
  fmtCurrency,
  toLabel,
} from "./components";
import {
  useCreateSalesPayment,
  useSalesInvoices,
  useSalesPayments,
} from "./hooks";
import {
  PaymentMode,
  type CreateSalesPaymentInput,
} from "./types";

export default function SalesPaymentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderIdFilter = searchParams.get("orderId") ?? "";
  const [search, setSearch] = useState("");
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateSalesPaymentInput>({
    salesInvoiceId: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    amount: 0,
    paymentMode: PaymentMode.UPI,
  });

  const paymentsQuery = useSalesPayments();
  const invoicesQuery = useSalesInvoices();
  const createMutation = useCreateSalesPayment();

  const invoices = invoicesQuery.data?.data ?? [];
  const payments = paymentsQuery.data?.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return payments.filter((payment) => {
      if (orderIdFilter && payment.salesOrderId !== orderIdFilter) return false;
      if (!term) return true;
      return [payment.paymentNumber, payment.customerName, payment.referenceNumber, payment.salesInvoiceId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [orderIdFilter, payments, search]);

  const invoiceOptions = useMemo(
    () =>
      invoices
        .filter((invoice) => !orderIdFilter || invoice.salesOrderId === orderIdFilter)
        .map((invoice) => ({ id: invoice.id, label: `${invoice.invoiceNumber} • ${invoice.customerName}` })),
    [invoices, orderIdFilter]
  );

  return (
    <div className="space-y-5 text-slate-900">
      <section className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Payments</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Manage Payments</h1>
          <p className="mt-1 text-sm text-slate-500">Collections are managed here, separate from order listing and shipment execution.</p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)} className="rounded-xl bg-slate-950 px-4 text-white hover:bg-slate-800">
          <Plus className="h-4 w-4" />
          Record Payment
        </Button>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search payment number, customer, reference"
            className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50/80">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <th className="px-5 py-3">Payment No</th>
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Mode</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paymentsQuery.isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td className="px-5 py-4" colSpan={8}>
                      <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : filtered.length ? (
                filtered.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4 font-semibold text-slate-950">{payment.paymentNumber}</td>
                    <td className="px-5 py-4 text-slate-700">{payment.salesOrderId}</td>
                    <td className="px-5 py-4 text-slate-700">{payment.customerName}</td>
                    <td className="px-5 py-4 text-slate-600">{new Date(payment.paymentDate).toLocaleDateString("en-US")}</td>
                    <td className="px-5 py-4 text-slate-600">{toLabel(payment.paymentMode)}</td>
                    <td className="px-5 py-4 font-semibold text-slate-950">{fmtCurrency(payment.amount, payment.currency)}</td>
                    <td className="px-5 py-4 text-slate-600">{payment.referenceNumber ?? "None"}</td>
                    <td className="px-5 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 border-slate-200 bg-white">
                          <DropdownMenuItem onClick={() => navigate(`/sales/orders/${payment.salesOrderId}`)}>View Order</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/sales/orders/${payment.salesOrderId}?panel=invoice`)}>View Invoice</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-500">
                    No payment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CreatePaymentDrawer
        open={isCreateOpen}
        onOpenChange={setCreateOpen}
        invoiceOptions={invoiceOptions}
        form={form}
        pending={createMutation.isPending}
        onFieldChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
        onSubmit={() =>
          createMutation.mutate(form, {
            onSuccess: () => {
              toast.success("Payment recorded.");
              setCreateOpen(false);
              setForm({
                salesInvoiceId: "",
                paymentDate: new Date().toISOString().slice(0, 10),
                amount: 0,
                paymentMode: PaymentMode.UPI,
              });
            },
            onError: (error) => toast.error(error instanceof Error ? error.message : "Could not record payment."),
          })
        }
      />
    </div>
  );
}
