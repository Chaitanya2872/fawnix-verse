"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Pencil, Plus, Wallet, X } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CreateInvoiceDrawer,
  fmtCurrency,
  toLabel,
} from "./components";
import {
  useCreateSalesInvoice,
  useSalesInvoices,
  useSalesOrder,
  useSalesPayments,
  useUpdateSalesInvoiceStatus,
} from "./hooks";
import {
  SalesInvoiceStatus,
  type CreateSalesInvoiceInput,
  type SalesInvoice,
} from "./types";

function CompactSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function InfoGrid({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function InvoiceViewDrawer({
  open,
  onOpenChange,
  invoice,
  lineItems,
  paymentStatus,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: SalesInvoice | null;
  lineItems: Array<{ id: string; name: string; quantity: number; unitPrice: number; lineTotal: number; description: string | null }>;
  paymentStatus: string;
  onEdit: () => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/25 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed inset-y-3 right-3 z-50 flex w-[calc(100vw-1.5rem)] max-w-[560px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_-28px_rgba(15,23,42,0.45)] outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold text-slate-950">
                {invoice?.invoiceNumber ?? "Invoice"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-slate-500">
                Invoice summary, line items, totals, and payment posture for this order.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {invoice ? (
              <>
                <InfoGrid
                  items={[
                    { label: "Invoice Status", value: toLabel(invoice.status) },
                    { label: "Payment Status", value: paymentStatus },
                    { label: "Total", value: fmtCurrency(invoice.total, invoice.currency) },
                    { label: "Balance Due", value: fmtCurrency(invoice.balanceDue, invoice.currency) },
                  ]}
                />
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-sm font-semibold text-slate-950">Line Items</p>
                  <div className="mt-3 space-y-3">
                    {lineItems.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.description ?? "No description"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-950">{fmtCurrency(item.lineTotal, invoice.currency)}</p>
                            <p className="text-xs text-slate-500">{item.quantity} × {fmtCurrency(item.unitPrice, invoice.currency)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-slate-950">Totals</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="font-semibold text-slate-950">{fmtCurrency(invoice.subtotal, invoice.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Tax</span>
                      <span className="font-semibold text-slate-950">{fmtCurrency(invoice.taxTotal, invoice.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="font-semibold text-slate-700">Grand Total</span>
                      <span className="font-semibold text-slate-950">{fmtCurrency(invoice.total, invoice.currency)}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl">
              Close
            </Button>
            <Button type="button" onClick={onEdit} className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function InvoiceEditDrawer({
  open,
  onOpenChange,
  invoice,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: SalesInvoice | null;
  pending: boolean;
  onSubmit: (values: { status: SalesInvoiceStatus; balanceDue: number }) => void;
}) {
  const [status, setStatus] = useState<SalesInvoiceStatus>(invoice?.status ?? SalesInvoiceStatus.DRAFT);
  const [balanceDue, setBalanceDue] = useState<number>(invoice?.balanceDue ?? 0);

  useEffect(() => {
    if (!invoice || !open) return;
    setStatus(invoice.status);
    setBalanceDue(invoice.balanceDue);
  }, [invoice, open]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/25 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed inset-y-3 right-3 z-50 flex w-[calc(100vw-1.5rem)] max-w-[460px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_-28px_rgba(15,23,42,0.45)] outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold text-slate-950">Edit Invoice</DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-slate-500">
                Update the invoice control fields currently supported by the live API.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 space-y-4 px-6 py-6">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Invoice Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as SalesInvoiceStatus)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none"
              >
                {Object.values(SalesInvoiceStatus).map((entry) => (
                  <option key={entry} value={entry}>
                    {toLabel(entry)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Balance Due</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={String(balanceDue)}
                onChange={(event) => setBalanceDue(Number(event.target.value) || 0)}
                className="h-11 rounded-2xl border-slate-200"
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl">
              Cancel
            </Button>
            <Button type="button" disabled={pending || !invoice} onClick={() => onSubmit({ status, balanceDue })} className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800">
              Save Changes
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default function SalesOrderDetailPage() {
  const navigate = useNavigate();
  const { orderId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isInvoiceCreateOpen, setInvoiceCreateOpen] = useState(false);
  const [isInvoiceViewOpen, setInvoiceViewOpen] = useState(false);
  const [isInvoiceEditOpen, setInvoiceEditOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState<CreateSalesInvoiceInput>({ salesOrderId: orderId });

  const orderQuery = useSalesOrder(orderId);
  const invoicesQuery = useSalesInvoices(orderId);
  const paymentsQuery = useSalesPayments();
  const createInvoiceMutation = useCreateSalesInvoice();
  const updateInvoiceMutation = useUpdateSalesInvoiceStatus();

  const order = orderQuery.data ?? null;
  const invoice = (invoicesQuery.data?.data ?? [])[0] ?? null;
  const payments = useMemo(
    () => (paymentsQuery.data?.data ?? []).filter((payment) => payment.salesOrderId === orderId),
    [orderId, paymentsQuery.data?.data]
  );

  const paymentStatus = useMemo(() => {
    if (!invoice) return "Not invoiced";
    if (invoice.balanceDue <= 0 || invoice.status === SalesInvoiceStatus.PAID) return "Paid";
    if (payments.length || invoice.status === SalesInvoiceStatus.PARTIALLY_PAID) return "Partially paid";
    return "Unpaid";
  }, [invoice, payments.length]);

  useEffect(() => {
    setInvoiceForm({ salesOrderId: orderId });
  }, [orderId]);

  useEffect(() => {
    const panel = searchParams.get("panel");
    if (panel === "invoice") {
      if (invoice) {
        setInvoiceViewOpen(true);
      } else {
        setInvoiceCreateOpen(true);
      }
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("panel");
        return next;
      }, { replace: true });
    }
  }, [invoice, searchParams, setSearchParams]);

  if (orderQuery.isLoading) {
    return <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-12 text-sm text-slate-500 shadow-sm">Loading order detail...</div>;
  }

  if (!order) {
    return <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-12 text-sm text-rose-600 shadow-sm">Unable to load this order.</div>;
  }

  return (
    <div className="space-y-5 text-slate-900">
      <section className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link to="/sales/orders" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Order Detail</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-slate-500">Central workspace for order, invoice, shipment, and payment follow-up.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(`/sales/shipments?orderId=${order.id}`)} className="rounded-xl">
            Shipment
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(`/sales/payments?orderId=${order.id}`)} className="rounded-xl">
            Payment
          </Button>
          {invoice ? (
            <Button type="button" onClick={() => setInvoiceViewOpen(true)} className="rounded-xl bg-slate-950 text-white hover:bg-slate-800">
              <FileText className="h-4 w-4" />
              View Invoice
            </Button>
          ) : (
            <Button type="button" onClick={() => setInvoiceCreateOpen(true)} className="rounded-xl bg-slate-950 text-white hover:bg-slate-800">
              <Plus className="h-4 w-4" />
              Create Invoice
            </Button>
          )}
        </div>
      </section>

      <CompactSection title="Order Summary">
        <InfoGrid
          items={[
            { label: "Status", value: toLabel(order.status) },
            { label: "Order Date", value: new Date(order.createdAt).toLocaleDateString("en-US") },
            { label: "Delivery Date", value: order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString("en-US") : "Not scheduled" },
            { label: "Total", value: fmtCurrency(order.total, order.currency) },
          ]}
        />
      </CompactSection>

      <CompactSection title="Customer Details">
        <InfoGrid
          items={[
            { label: "Customer", value: order.customerName },
            { label: "Company", value: order.company ?? "No company" },
            { label: "Email", value: order.email ?? "Not provided" },
            { label: "Phone", value: order.phone ?? "Not provided" },
          ]}
        />
      </CompactSection>

      <CompactSection title="Items">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50/80">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Unit Price</th>
                <th className="px-4 py-3">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.description ?? "No description"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.quantity}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtCurrency(item.unitPrice, order.currency)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{fmtCurrency(item.lineTotal, order.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CompactSection>

      <div className="grid gap-5 xl:grid-cols-3">
        <CompactSection title="Shipment" action={<Button type="button" variant="outline" onClick={() => navigate(`/sales/shipments?orderId=${order.id}`)} className="rounded-xl">Open Shipments</Button>}>
          <InfoGrid
            items={[
              { label: "Inventory Reserved", value: order.inventoryReserved ? "Yes" : "No" },
              { label: "Stock Available", value: order.stockAvailable ? "Yes" : "No" },
              { label: "Reservation Note", value: order.inventoryReservationMessage ?? "No reservation message" },
              { label: "Delivery Status", value: toLabel(order.status) },
            ]}
          />
        </CompactSection>

        <CompactSection title="Payment" action={<Button type="button" variant="outline" onClick={() => navigate(`/sales/payments?orderId=${order.id}`)} className="rounded-xl">Open Payments</Button>}>
          <InfoGrid
            items={[
              { label: "Payment Status", value: paymentStatus },
              { label: "Payments Logged", value: String(payments.length) },
              { label: "Outstanding", value: invoice ? fmtCurrency(invoice.balanceDue, invoice.currency) : "Not invoiced" },
              { label: "Terms", value: order.paymentTerms ?? "Not set" },
            ]}
          />
        </CompactSection>

        <CompactSection
          title="Invoice"
          action={
            invoice ? (
              <Button type="button" onClick={() => setInvoiceViewOpen(true)} className="rounded-xl bg-slate-950 text-white hover:bg-slate-800">
                View Invoice
              </Button>
            ) : (
              <Button type="button" onClick={() => setInvoiceCreateOpen(true)} className="rounded-xl bg-slate-950 text-white hover:bg-slate-800">
                Create Invoice
              </Button>
            )
          }
        >
          <InfoGrid
            items={[
              { label: "Invoice Number", value: invoice?.invoiceNumber ?? "Not created" },
              { label: "Invoice Status", value: invoice ? toLabel(invoice.status) : "Pending" },
              { label: "Total", value: invoice ? fmtCurrency(invoice.total, invoice.currency) : fmtCurrency(order.total, order.currency) },
              { label: "Payment Status", value: paymentStatus },
            ]}
          />
        </CompactSection>
      </div>

      <CreateInvoiceDrawer
        open={isInvoiceCreateOpen}
        onOpenChange={setInvoiceCreateOpen}
        orderOptions={[{ id: order.id, label: `${order.orderNumber} • ${order.customerName}` }]}
        form={invoiceForm}
        pending={createInvoiceMutation.isPending}
        onFieldChange={(field, value) => setInvoiceForm((prev) => ({ ...prev, [field]: value }))}
        onSubmit={() =>
          createInvoiceMutation.mutate(invoiceForm, {
            onSuccess: () => {
              toast.success("Invoice created.");
              setInvoiceCreateOpen(false);
              setInvoiceViewOpen(true);
            },
            onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create invoice."),
          })
        }
      />

      <InvoiceViewDrawer
        open={isInvoiceViewOpen}
        onOpenChange={setInvoiceViewOpen}
        invoice={invoice}
        lineItems={order.items}
        paymentStatus={paymentStatus}
        onEdit={() => {
          setInvoiceViewOpen(false);
          setInvoiceEditOpen(true);
        }}
      />

      <InvoiceEditDrawer
        open={isInvoiceEditOpen}
        onOpenChange={setInvoiceEditOpen}
        invoice={invoice}
        pending={updateInvoiceMutation.isPending}
        onSubmit={(values) => {
          if (!invoice) return;
          updateInvoiceMutation.mutate(
            { id: invoice.id, status: values.status, balanceDue: values.balanceDue },
            {
              onSuccess: () => {
                toast.success("Invoice updated.");
                setInvoiceEditOpen(false);
                setInvoiceViewOpen(true);
              },
              onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update invoice."),
            }
          );
        }}
      />
    </div>
  );
}
