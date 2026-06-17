/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  FileText,
  Plus,
  User,
  Package,
  Truck,
  CreditCard,
  ReceiptText,
  Calendar,
  Hash,
  Mail,
  Phone,
  Building2,
  CircleDollarSign,
  Wallet,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Boxes,
  ShieldCheck,
  StickyNote,
  BadgePercent,
} from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CreateInvoiceDrawer, fmtCurrency, toLabel } from "./components";
import {
  useCreateSalesInvoice,
  useSalesInvoices,
  useSalesOrder,
  useSalesPayments,
  useUpdateSalesInvoiceStatus,
} from "./hooks";
import {
  InvoiceEditDrawer,
  InvoiceViewDrawer,
  Section,
  KVGrid,
  Panel,
  StatusBadge,
} from "./order-detail-sections";
import { SalesInvoiceStatus, type CreateSalesInvoiceInput } from "./types";

// ─── Util: map status strings to badge variants ────────────────────────────────

function orderStatusVariant(status: string): "green" | "amber" | "red" | "blue" | "slate" {
  const s = status.toLowerCase();
  if (s.includes("paid") || s.includes("confirmed") || s.includes("delivered")) return "green";
  if (s.includes("partial") || s.includes("pending") || s.includes("transit")) return "amber";
  if (s.includes("cancel") || s.includes("overdue")) return "red";
  if (s.includes("sent") || s.includes("draft")) return "blue";
  return "slate";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
    () => (paymentsQuery.data?.data ?? []).filter((p) => p.salesOrderId === orderId),
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
    if (panel !== "invoice") return;
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
  }, [invoice, searchParams, setSearchParams]);

  // ─── Loading / error ────────────────────────────────────────────────────────

  if (orderQuery.isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-5 py-10 text-sm text-slate-400">
        <Clock className="h-4 w-4 animate-pulse" />
        Loading order…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-5 py-10 text-sm text-red-600">
        <AlertCircle className="h-4 w-4" />
        Unable to load this order.
      </div>
    );
  }

  // ─── Page ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/sales/orders"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to orders
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
              <ClipboardList className="h-4.5 w-4.5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold leading-tight text-slate-900">{order.orderNumber}</h1>
              <p className="text-xs text-slate-400 mt-0.5">Order workspace — invoice, shipment, payment</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/sales/shipments?orderId=${order.id}`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Truck className="h-3.5 w-3.5" />
            Shipment
          </button>
          <button
            type="button"
            onClick={() => navigate(`/sales/payments?orderId=${order.id}`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Payment
          </button>
          {invoice ? (
            <button
              type="button"
              onClick={() => setInvoiceViewOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              View invoice
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setInvoiceCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Create invoice
            </button>
          )}
        </div>
      </div>

      {/* ── Order summary ─────────────────────────────────────────────────────── */}
      <Section icon={<Hash className="h-3.5 w-3.5" />} title="Order summary">
        <KVGrid
          items={[
            {
              label: "Status",
              value: <StatusBadge label={toLabel(order.status)} variant={orderStatusVariant(order.status)} />,
              icon: <CheckCircle2 className="h-3 w-3" />,
            },
            {
              label: "Order date",
              value: new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              icon: <Calendar className="h-3 w-3" />,
            },
            {
              label: "Delivery date",
              value: order.deliveryDate
                ? new Date(order.deliveryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Not scheduled",
              icon: <Clock className="h-3 w-3" />,
            },
            {
              label: "Total",
              value: fmtCurrency(order.total, order.currency),
              icon: <CircleDollarSign className="h-3 w-3" />,
            },
          ]}
        />
      </Section>

      {/* ── Customer ──────────────────────────────────────────────────────────── */}
      <Section icon={<User className="h-3.5 w-3.5" />} title="Customer">
        <KVGrid
          items={[
            { label: "Name", value: order.customerName, icon: <User className="h-3 w-3" /> },
            { label: "Company", value: order.company ?? "—", icon: <Building2 className="h-3 w-3" /> },
            { label: "Email", value: order.email ?? "—", icon: <Mail className="h-3 w-3" /> },
            { label: "Phone", value: order.phone ?? "—", icon: <Phone className="h-3 w-3" /> },
          ]}
        />
      </Section>

      {/* ── Items table ───────────────────────────────────────────────────────── */}
      <Section icon={<Package className="h-3.5 w-3.5" />} title="Items">
        <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead>
              <tr>
                {["Item", "Description", "Qty", "Unit price", "Line total"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {order.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-slate-400">{item.description ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.quantity}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtCurrency(item.unitPrice, order.currency)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{fmtCurrency(item.lineTotal, order.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Shipment / Payment / Invoice panels ───────────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          icon={<Truck className="h-3.5 w-3.5" />}
          title="Shipment"
          action={
            <button
              type="button"
              onClick={() => navigate(`/sales/shipments?orderId=${order.id}`)}
              className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
            >
              Open →
            </button>
          }
          rows={[
            {
              label: "Inventory reserved",
              value: order.inventoryReserved
                ? <StatusBadge label="Yes" variant="green" />
                : <StatusBadge label="No" variant="red" />,
              icon: <Boxes className="h-3 w-3" />,
            },
            {
              label: "Stock available",
              value: order.stockAvailable
                ? <StatusBadge label="Yes" variant="green" />
                : <StatusBadge label="No" variant="amber" />,
              icon: <ShieldCheck className="h-3 w-3" />,
            },
            {
              label: "Reservation note",
              value: order.inventoryReservationMessage ?? "—",
              icon: <StickyNote className="h-3 w-3" />,
            },
            {
              label: "Delivery status",
              value: <StatusBadge label={toLabel(order.status)} variant={orderStatusVariant(order.status)} />,
              icon: <Truck className="h-3 w-3" />,
            },
          ]}
        />

        <Panel
          icon={<CreditCard className="h-3.5 w-3.5" />}
          title="Payment"
          action={
            <button
              type="button"
              onClick={() => navigate(`/sales/payments?orderId=${order.id}`)}
              className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
            >
              Open →
            </button>
          }
          rows={[
            {
              label: "Payment status",
              value: <StatusBadge label={paymentStatus} variant={orderStatusVariant(paymentStatus)} />,
              icon: <TrendingUp className="h-3 w-3" />,
            },
            {
              label: "Payments logged",
              value: `${payments.length}`,
              icon: <ClipboardList className="h-3 w-3" />,
            },
            {
              label: "Outstanding",
              value: invoice ? fmtCurrency(invoice.balanceDue, invoice.currency) : "—",
              icon: <Wallet className="h-3 w-3" />,
            },
            {
              label: "Terms",
              value: order.paymentTerms ?? "Not set",
              icon: <BadgePercent className="h-3 w-3" />,
            },
          ]}
        />

        <Panel
          icon={<ReceiptText className="h-3.5 w-3.5" />}
          title="Invoice"
          action={
            invoice ? (
              <button
                type="button"
                onClick={() => setInvoiceViewOpen(true)}
                className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
              >
                View →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setInvoiceCreateOpen(true)}
                className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
              >
                Create →
              </button>
            )
          }
          rows={[
            {
              label: "Invoice number",
              value: invoice?.invoiceNumber ?? "Not created",
              icon: <Hash className="h-3 w-3" />,
            },
            {
              label: "Invoice status",
              value: invoice
                ? <StatusBadge label={toLabel(invoice.status)} variant={orderStatusVariant(invoice.status)} />
                : <StatusBadge label="Pending" variant="slate" />,
              icon: <CheckCircle2 className="h-3 w-3" />,
            },
            {
              label: "Total",
              value: invoice
                ? fmtCurrency(invoice.total, invoice.currency)
                : fmtCurrency(order.total, order.currency),
              icon: <CircleDollarSign className="h-3 w-3" />,
            },
            {
              label: "Payment status",
              value: <StatusBadge label={paymentStatus} variant={orderStatusVariant(paymentStatus)} />,
              icon: <TrendingUp className="h-3 w-3" />,
            },
          ]}
        />
      </div>

      {/* ── Drawers ───────────────────────────────────────────────────────────── */}
      <CreateInvoiceDrawer
        open={isInvoiceCreateOpen}
        onOpenChange={setInvoiceCreateOpen}
        orderOptions={[{ id: order.id, label: `${order.orderNumber} - ${order.customerName}` }]}
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
            onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create invoice."),
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
              onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update invoice."),
            }
          );
        }}
      />
    </div>
  );
}