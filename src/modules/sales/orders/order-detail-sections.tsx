/* eslint-disable react-hooks/set-state-in-effect */
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Pencil,
  X,
  FileText,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtCurrency, toLabel } from "./components";
import { SalesInvoiceStatus, type SalesInvoice } from "./types";
import { useEffect, useState, type ReactNode } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function SectionHeader({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          {icon}
        </span>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function KVGrid({
  items,
}: {
  items: Array<{ label: string; value: ReactNode; icon?: ReactNode }>;
}) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white md:grid-cols-4">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-1.5 px-4 py-3">
          <div className="flex items-center gap-1.5">
            {item.icon && (
              <span className="text-slate-400">{item.icon}</span>
            )}
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {item.label}
            </p>
          </div>
          <div className="text-sm font-medium text-slate-900">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function StatusBadge({ label, variant }: { label: string; variant: "green" | "amber" | "red" | "blue" | "slate" }) {
  const styles = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    red: "bg-red-50 text-red-600 ring-red-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[variant]}`}>
      {label}
    </span>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────────

export function Section({
  icon,
  title,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <SectionHeader icon={icon} title={title} action={action} />
      {children}
    </section>
  );
}

// ─── Panel (for the 3-col bottom row) ─────────────────────────────────────────

export function Panel({
  icon,
  title,
  action,
  rows,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  rows: Array<{ label: string; value: ReactNode; icon?: ReactNode }>;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500">
            {icon}
          </span>
          <span className="text-sm font-semibold text-slate-800">{title}</span>
        </div>
        {action}
      </div>
      <div className="divide-y divide-slate-50">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-4 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              {row.icon && <span className="text-slate-300">{row.icon}</span>}
              {row.label}
            </div>
            <div className="text-xs font-medium text-slate-800 text-right">{row.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Invoice View Drawer ───────────────────────────────────────────────────────

export function InvoiceViewDrawer({
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
  lineItems: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    description: string | null;
  }>;
  paymentStatus: string;
  onEdit: () => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[2px]" />
        <DialogPrimitive.Content className="fixed inset-y-3 right-3 z-50 flex w-[calc(100vw-1.5rem)] max-w-[520px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white outline-none">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                <FileText className="h-4 w-4 text-slate-600" />
              </span>
              <div>
                <DialogPrimitive.Title className="text-base font-semibold text-slate-900">
                  {invoice?.invoiceNumber ?? "Invoice"}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-slate-400 mt-0.5">
                  Summary, line items, and payment status
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogPrimitive.Close className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto">
            {invoice ? (
              <>
                {/* Stats row */}
                <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-b border-slate-100">
                  {[
                    { label: "Invoice status", value: toLabel(invoice.status), icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
                    { label: "Payment status", value: paymentStatus, icon: <TrendingUp className="h-3.5 w-3.5" /> },
                    { label: "Total", value: fmtCurrency(invoice.total, invoice.currency), icon: <DollarSign className="h-3.5 w-3.5" /> },
                    { label: "Balance due", value: fmtCurrency(invoice.balanceDue, invoice.currency), icon: <AlertCircle className="h-3.5 w-3.5" /> },
                  ].map((stat, i) => (
                    <div key={i} className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
                        {stat.icon}
                        <span className="text-[10px] uppercase tracking-widest font-semibold">{stat.label}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Line items */}
                <div className="px-6 py-5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Package className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Line items</p>
                  </div>
                  <div className="space-y-2">
                    {lineItems.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-4 rounded-lg bg-slate-50 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{item.description ?? "No description"}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-slate-900">{fmtCurrency(item.lineTotal, invoice.currency)}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{item.quantity} × {fmtCurrency(item.unitPrice, invoice.currency)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="px-6 py-5">
                  <div className="flex items-center gap-1.5 mb-3">
                    <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Totals</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span className="font-medium text-slate-800">{fmtCurrency(invoice.subtotal, invoice.currency)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Tax</span>
                      <span className="font-medium text-slate-800">{fmtCurrency(invoice.taxTotal, invoice.currency)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-2.5">
                      <span className="font-semibold text-slate-900">Grand total</span>
                      <span className="font-semibold text-slate-900">{fmtCurrency(invoice.total, invoice.currency)}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 rounded-lg border-slate-200 text-sm">
              Close
            </Button>
            <Button type="button" onClick={onEdit} className="h-9 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800">
              <Pencil className="h-3.5 w-3.5" />
              Edit invoice
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ─── Invoice Edit Drawer ───────────────────────────────────────────────────────

export function InvoiceEditDrawer({
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
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[2px]" />
        <DialogPrimitive.Content className="fixed inset-y-3 right-3 z-50 flex w-[calc(100vw-1.5rem)] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                <Pencil className="h-4 w-4 text-slate-600" />
              </span>
              <div>
                <DialogPrimitive.Title className="text-base font-semibold text-slate-900">Edit invoice</DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-slate-400 mt-0.5">
                  Update status and balance due
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogPrimitive.Close className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 space-y-5 px-6 py-6">
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                <CheckCircle2 className="h-3 w-3" />
                Invoice status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SalesInvoiceStatus)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                {Object.values(SalesInvoiceStatus).map((entry) => (
                  <option key={entry} value={entry}>{toLabel(entry)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                <DollarSign className="h-3 w-3" />
                Balance due
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={String(balanceDue)}
                onChange={(e) => setBalanceDue(Number(e.target.value) || 0)}
                className="h-10 rounded-lg border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 rounded-lg border-slate-200 text-sm">
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || !invoice}
              onClick={() => onSubmit({ status, balanceDue })}
              className="h-9 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-50"
            >
              Save changes
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}