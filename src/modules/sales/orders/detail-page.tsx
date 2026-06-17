"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Plus } from "lucide-react";
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
import { InvoiceEditDrawer, InvoiceViewDrawer, CompactSection, InfoGrid } from "./order-detail-sections";
import { SalesInvoiceStatus, type CreateSalesInvoiceInput } from "./types";

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
    if (!invoice) {
      return "Not invoiced";
    }
    if (invoice.balanceDue <= 0 || invoice.status === SalesInvoiceStatus.PAID) {
      return "Paid";
    }
    if (payments.length || invoice.status === SalesInvoiceStatus.PARTIALLY_PAID) {
      return "Partially paid";
    }
    return "Unpaid";
  }, [invoice, payments.length]);

  useEffect(() => {
    setInvoiceForm({ salesOrderId: orderId });
  }, [orderId]);

  useEffect(() => {
    const panel = searchParams.get("panel");
    if (panel !== "invoice") {
      return;
    }

    if (invoice) {
      setInvoiceViewOpen(true);
    } else {
      setInvoiceCreateOpen(true);
    }

    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete("panel");
      return next;
    }, { replace: true });
  }, [invoice, searchParams, setSearchParams]);

  if (orderQuery.isLoading) {
    return (
      <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-12 text-sm text-slate-500 shadow-sm">
        Loading order detail...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-12 text-sm text-rose-600 shadow-sm">
        Unable to load this order.
      </div>
    );
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
        <CompactSection
          title="Shipment"
          action={
            <Button type="button" variant="outline" onClick={() => navigate(`/sales/shipments?orderId=${order.id}`)} className="rounded-xl">
              Open Shipments
            </Button>
          }
        >
          <InfoGrid
            items={[
              { label: "Inventory Reserved", value: order.inventoryReserved ? "Yes" : "No" },
              { label: "Stock Available", value: order.stockAvailable ? "Yes" : "No" },
              { label: "Reservation Note", value: order.inventoryReservationMessage ?? "No reservation message" },
              { label: "Delivery Status", value: toLabel(order.status) },
            ]}
          />
        </CompactSection>

        <CompactSection
          title="Payment"
          action={
            <Button type="button" variant="outline" onClick={() => navigate(`/sales/payments?orderId=${order.id}`)} className="rounded-xl">
              Open Payments
            </Button>
          }
        >
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
        orderOptions={[{ id: order.id, label: `${order.orderNumber} - ${order.customerName}` }]}
        form={invoiceForm}
        pending={createInvoiceMutation.isPending}
        onFieldChange={(field, value) => setInvoiceForm((previous) => ({ ...previous, [field]: value }))}
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
          if (!invoice) {
            return;
          }
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
