/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, MoreHorizontal, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuotes } from "@/modules/sales/hooks";
import { QuoteStatus } from "@/modules/sales/types";
import {
  CreateOrderDrawer,
  OrderDetailDrawer,
  fmtCurrency,
  toLabel,
} from "./components";
import {
  useCreateSalesOrder,
  useSalesDeliveries,
  useSalesInvoices,
  useSalesOrder,
  useSalesPayments,
  useSalesOrders,
  useUpdateSalesOrder,
  useUpdateSalesOrderStatus,
} from "./hooks";
import {
  PaymentMode,
  SalesDeliveryStatus,
  SalesInvoiceStatus,
  SalesOrderStatus,
  type CreateSalesOrderInput,
  type ManualOrderFormState,
  type ManualOrderItemDraft,
  type SalesOrder,
  type SalesOrderFilter,
  type SalesOrderSummary,
  type UpdateSalesOrderInput,
} from "./types";

// ─── Recharts (already in your deps) ──────────────────────────────────────────
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const DRAWER_STATUS_OPTIONS: SalesOrderStatus[] = [
  SalesOrderStatus.DRAFT,
  SalesOrderStatus.SUBMITTED,
  SalesOrderStatus.PENDING_APPROVAL,
  SalesOrderStatus.APPROVED,
  SalesOrderStatus.REJECTED,
  SalesOrderStatus.CONFIRMED,
  SalesOrderStatus.PARTIALLY_DELIVERED,
  SalesOrderStatus.DELIVERED,
  SalesOrderStatus.INVOICED,
  SalesOrderStatus.PARTIALLY_PAID,
  SalesOrderStatus.PAID,
  SalesOrderStatus.CLOSED,
  SalesOrderStatus.CANCELLED,
];

// ─── Status colour map ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  [SalesOrderStatus.DRAFT]:              { bg: "bg-slate-100",   text: "text-slate-600",  dot: "#888780" },
  [SalesOrderStatus.SUBMITTED]:          { bg: "bg-blue-50",     text: "text-blue-700",   dot: "#378ADD" },
  [SalesOrderStatus.PENDING_APPROVAL]:   { bg: "bg-amber-50",    text: "text-amber-700",  dot: "#EF9F27" },
  [SalesOrderStatus.APPROVED]:           { bg: "bg-teal-50",     text: "text-teal-700",   dot: "#1D9E75" },
  [SalesOrderStatus.REJECTED]:           { bg: "bg-red-50",      text: "text-red-600",    dot: "#E24B4A" },
  [SalesOrderStatus.CONFIRMED]:          { bg: "bg-blue-50",     text: "text-blue-700",   dot: "#378ADD" },
  [SalesOrderStatus.PARTIALLY_DELIVERED]:{ bg: "bg-amber-50",    text: "text-amber-700",  dot: "#EF9F27" },
  [SalesOrderStatus.DELIVERED]:          { bg: "bg-green-50",    text: "text-green-700",  dot: "#639922" },
  [SalesOrderStatus.INVOICED]:           { bg: "bg-blue-50",     text: "text-blue-700",   dot: "#378ADD" },
  [SalesOrderStatus.PARTIALLY_PAID]:     { bg: "bg-amber-50",    text: "text-amber-700",  dot: "#EF9F27" },
  [SalesOrderStatus.PAID]:               { bg: "bg-green-50",    text: "text-green-700",  dot: "#639922" },
  [SalesOrderStatus.CLOSED]:             { bg: "bg-slate-100",   text: "text-slate-600",  dot: "#888780" },
  [SalesOrderStatus.CANCELLED]:          { bg: "bg-red-50",      text: "text-red-600",    dot: "#E24B4A" },
};

function statusStyle(status: string) {
  return STATUS_COLORS[status] ?? { bg: "bg-slate-100", text: "text-slate-600", dot: "#888780" };
}

// ─── Order form helpers ────────────────────────────────────────────────────────

function createDraftItem(): ManualOrderItemDraft {
  return {
    key: globalThis.crypto.randomUUID(),
    inventoryProductId: "",
    name: "",
    make: "",
    description: "",
    utility: "",
    quantity: "1",
    unit: "",
    unitPrice: "0",
  };
}

function createInitialManualForm(): ManualOrderFormState {
  return {
    customerName: "",
    company: "",
    email: "",
    phone: "",
    billingAddress: "",
    shippingAddress: "",
    currency: "INR",
    status: SalesOrderStatus.DRAFT,
    deliveryDate: "",
    paymentTerms: "Net 15",
    customerPoNumber: "",
    quotationReference: "",
    paymentDueDays: "15",
    taxRate: "0",
    discountPercent: "0",
    customerCreditLimit: "0",
    customerOutstandingAmount: "0",
    confirmationAttachmentUrl: "",
    notes: "",
    items: [createDraftItem()],
  };
}

function toStringValue(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function buildManualFormFromOrder(order: SalesOrder): ManualOrderFormState {
  return {
    customerName: order.customerName ?? "",
    company: order.company ?? "",
    email: order.email ?? "",
    phone: order.phone ?? "",
    billingAddress: order.billingAddress ?? "",
    shippingAddress: order.shippingAddress ?? "",
    currency: order.currency ?? "INR",
    status: order.status,
    deliveryDate: order.deliveryDate ?? "",
    paymentTerms: order.paymentTerms ?? "",
    customerPoNumber: order.customerPoNumber ?? "",
    quotationReference: order.quotationReference ?? "",
    paymentDueDays: toStringValue(order.paymentDueDays),
    taxRate: toStringValue(order.taxRate),
    discountPercent: toStringValue(order.discountPercent),
    customerCreditLimit: toStringValue(order.customerCreditLimit),
    customerOutstandingAmount: toStringValue(order.customerOutstandingAmount),
    confirmationAttachmentUrl: order.confirmationAttachmentUrl ?? "",
    notes: order.notes ?? "",
    items: order.items.length
      ? order.items.map((item) => ({
          key: item.id || globalThis.crypto.randomUUID(),
          inventoryProductId: item.inventoryProductId ?? "",
          name: item.name ?? "",
          make: item.make ?? "",
          description: item.description ?? "",
          utility: item.utility ?? "",
          quantity: toStringValue(item.quantity),
          unit: item.unit ?? "",
          unitPrice: toStringValue(item.unitPrice),
        }))
      : [createDraftItem()],
  };
}

function cleanOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

// ─── Derived status helpers ────────────────────────────────────────────────────

function getShipmentStatus(
  order: SalesOrderSummary,
  deliveryMap: Map<string, string>
) {
  if (deliveryMap.has(order.id)) return toLabel(deliveryMap.get(order.id) ?? "");
  if ([SalesOrderStatus.DELIVERED, SalesOrderStatus.PARTIALLY_DELIVERED].includes(order.status))
    return toLabel(order.status);
  return "Not created";
}

function getPaymentStatus(
  orderId: string,
  invoiceMap: Map<string, { status: string; balanceDue: number }>,
  paymentCountMap: Map<string, number>
) {
  const invoice = invoiceMap.get(orderId);
  if (!invoice) return "Not invoiced";
  if (invoice.balanceDue <= 0 || invoice.status === SalesInvoiceStatus.PAID) return "Paid";
  if ((paymentCountMap.get(orderId) ?? 0) > 0 || invoice.status === SalesInvoiceStatus.PARTIALLY_PAID)
    return "Partially paid";
  return "Unpaid";
}

// ─── Analytics components ──────────────────────────────────────────────────────

/**
 * Donut chart rendered in pure SVG/CSS — no extra dependency.
 * Accepts segments as { label, value, color }.
 */
function DonutChart({
  segments,
  total,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  total: number;
}) {
  const R = 64;
  const cx = 80;
  const cy = 80;
  const strokeW = 18;
  const circ = 2 * Math.PI * R;
  let offset = 0;
  const arcs = segments.map((s) => {
    const dash = (s.value / total) * circ;
    const arc = { ...s, dash, offset };
    offset += dash;
    return arc;
  });
  return (
    <svg viewBox="0 0 160 160" className="w-full max-w-[160px]" aria-hidden="true">
      {arcs.map((arc) => (
        <circle
          key={arc.label}
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          stroke={arc.color}
          strokeWidth={strokeW}
          strokeDasharray={`${arc.dash} ${circ - arc.dash}`}
          strokeDashoffset={-arc.offset + circ * 0.25}
          className="transition-all duration-500"
        />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={20} fontWeight={500} fill="currentColor" className="text-slate-900">
        {total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={11} fill="#888780">
        orders
      </text>
    </svg>
  );
}

/**
 * OrdersAnalytics — bar chart (left) + donut (right) replacing the old KPI cards.
 */
function OrdersAnalytics({
  orders,
  year,
  onYearChange,
}: {
  orders: SalesOrderSummary[];
  year: number;
  onYearChange: (y: number) => void;
}) {
  // Build month buckets from real order data
  const monthlyData = useMemo(() => {
    const placed = Array(12).fill(0);
    const completed = Array(12).fill(0);
    const completedStatuses: SalesOrderStatus[] = [
      SalesOrderStatus.DELIVERED,
      SalesOrderStatus.PAID,
      SalesOrderStatus.CLOSED,
    ];
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      if (d.getFullYear() !== year) return;
      const m = d.getMonth();
      placed[m]++;
      if (completedStatuses.includes(o.status)) completed[m]++;
    });
    return MONTHS_SHORT.map((month, i) => ({ month, placed: placed[i], completed: completed[i] }));
  }, [orders, year]);

  // Status breakdown for donut
  const statusBreakdown = useMemo(() => {
    const yearOrders = orders.filter((o) => new Date(o.createdAt).getFullYear() === year);
    const counts: Record<string, number> = {};
    yearOrders.forEach((o) => { counts[o.status] = (counts[o.status] ?? 0) + 1; });
    const total = yearOrders.length;

    // Group minor statuses into "Other" to keep the donut readable
    const main: SalesOrderStatus[] = [
      SalesOrderStatus.CONFIRMED,
      SalesOrderStatus.DELIVERED,
      SalesOrderStatus.PAID,
      SalesOrderStatus.PENDING_APPROVAL,
      SalesOrderStatus.DRAFT,
      SalesOrderStatus.CANCELLED,
    ];
    const segments = main
      .filter((s) => (counts[s] ?? 0) > 0)
      .map((s) => ({
        label: toLabel(s),
        value: counts[s] ?? 0,
        color: statusStyle(s).dot,
      }));
    const otherVal = Object.entries(counts)
      .filter(([s]) => !main.includes(s as SalesOrderStatus))
      .reduce((sum, [, v]) => sum + v, 0);
    if (otherVal > 0) segments.push({ label: "Other", value: otherVal, color: "#B4B2A9" });
    return { segments, total };
  }, [orders, year]);

  const availableYears = useMemo(() => {
    const ys = new Set(orders.map((o) => new Date(o.createdAt).getFullYear()));
    return Array.from(ys).sort((a, b) => b - a);
  }, [orders]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      {/* ── Bar chart ── */}
      <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Monthly order trend</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Legend */}
            <div className="flex items-center gap-3 mr-2">
              {[
                { label: "Placed", color: "#378ADD" },
                { label: "Completed", color: "#1D9E75" },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="inline-block w-2 h-2 rounded-[2px]" style={{ background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
            <select
              value={year}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none"
            >
              {(availableYears.length ? availableYears : [new Date().getFullYear()]).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-4 py-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} barGap={3} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="#f1efe8" strokeWidth={0.5} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#888780" }}
                axisLine={{ stroke: "#e8e6e0" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#888780" }}
                axisLine={false}
                tickLine={false}
                width={28}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "white",
                  border: "0.5px solid #e0dfd8",
                  borderRadius: 8,
                  fontSize: 12,
                  padding: "8px 12px",
                }}
                cursor={{ fill: "rgba(0,0,0,0.03)" }}
              />
              <Bar dataKey="placed" name="Placed" fill="#378ADD" radius={[3, 3, 0, 0]} maxBarSize={18} />
              <Bar dataKey="completed" name="Completed" fill="#1D9E75" radius={[3, 3, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Donut ── */}
      <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <span className="text-sm font-medium text-slate-700">Status breakdown</span>
        </div>
        <div className="flex flex-col items-center px-4 py-4 gap-4">
          {statusBreakdown.total > 0 ? (
            <>
              <DonutChart
                segments={statusBreakdown.segments}
                total={statusBreakdown.total}
              />
              <div className="w-full divide-y divide-slate-50">
                {statusBreakdown.segments.map((s) => (
                  <div key={s.label} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="inline-block w-2 h-2 rounded-[2px]" style={{ background: s.color }} />
                      {s.label}
                    </div>
                    <span className="text-xs font-medium text-slate-800">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="py-10 text-xs text-slate-400">No orders for {year}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SalesOrdersPage() {
  const navigate = useNavigate();
  const [detailId, setDetailId] = useState("");
  const [editingOrderId, setEditingOrderId] = useState("");
  const [isCreateDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [manualForm, setManualForm] = useState<ManualOrderFormState>(() => createInitialManualForm());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filter, setFilter] = useState<SalesOrderFilter>({
    search: "",
    status: "ALL",
    page: 1,
    pageSize: PAGE_SIZE,
  });

  const ordersQuery = useSalesOrders(filter);
  const detailQuery = useSalesOrder(detailId);
  const editingOrderQuery = useSalesOrder(editingOrderId);
  const deliveriesQuery = useSalesDeliveries();
  const invoicesQuery = useSalesInvoices();
  const paymentsQuery = useSalesPayments();
  const quotesQuery = useQuotes({ search: "", status: QuoteStatus.ACCEPTED, page: 1, pageSize: 200 });
  const createMutation = useCreateSalesOrder();
  const updateMutation = useUpdateSalesOrder();
  const statusMutation = useUpdateSalesOrderStatus();

  const orders = useMemo(() => ordersQuery.data?.data ?? [], [ordersQuery.data?.data]);
  const deliveries = deliveriesQuery.data?.data ?? [];
  const invoices = invoicesQuery.data?.data ?? [];
  const payments = paymentsQuery.data?.data ?? [];
  const acceptedQuotes = quotesQuery.data?.data ?? [];
  const detail = detailQuery.data ?? null;

  useEffect(() => {
    if (!editingOrderQuery.data || !isCreateDrawerOpen) return;
    setManualForm(buildManualFormFromOrder(editingOrderQuery.data));
  }, [editingOrderQuery.data, isCreateDrawerOpen]);

  const manualSubtotal = manualForm.items.reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  }, 0);
  const manualDiscount = (manualSubtotal * (Number(manualForm.discountPercent) || 0)) / 100;
  const discountedSubtotal = manualSubtotal - manualDiscount;
  const manualTaxRate = Number(manualForm.taxRate) || 0;
  const manualTotal = discountedSubtotal + (discountedSubtotal * manualTaxRate) / 100;

  const deliveryMap = useMemo(
    () => new Map(deliveries.map((d) => [d.salesOrderId, d.status])),
    [deliveries]
  );

  const invoiceMap = useMemo(
    () => new Map(invoices.map((inv) => [inv.salesOrderId, { status: inv.status, balanceDue: inv.balanceDue }])),
    [invoices]
  );

  const paymentCountMap = useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach((p) => { map.set(p.salesOrderId, (map.get(p.salesOrderId) ?? 0) + 1); });
    return map;
  }, [payments]);

  function updateManualField<K extends keyof ManualOrderFormState>(field: K, value: ManualOrderFormState[K]) {
    setManualForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateManualItem(key: string, field: keyof ManualOrderItemDraft, value: string) {
    setManualForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    }));
  }

  function addManualItem() {
    setManualForm((prev) => ({ ...prev, items: [...prev.items, createDraftItem()] }));
  }

  function removeManualItem(key: string) {
    setManualForm((prev) => ({
      ...prev,
      items: prev.items.length === 1 ? prev.items : prev.items.filter((item) => item.key !== key),
    }));
  }

  function resetManualForm() {
    setManualForm(createInitialManualForm());
  }

  function handleOrderDrawerOpenChange(open: boolean) {
    setCreateDrawerOpen(open);
    if (!open) {
      setEditingOrderId("");
      resetManualForm();
    }
  }

  function handleCreateOrder() {
    const customerName = manualForm.customerName.trim();
    if (!customerName) { toast.error("Customer name is required."); return; }

    const items = manualForm.items.map((item) => ({
      inventoryProductId: cleanOptional(item.inventoryProductId ?? ""),
      name: item.name.trim(),
      make: cleanOptional(item.make),
      description: cleanOptional(item.description),
      utility: cleanOptional(item.utility),
      quantity: Number(item.quantity),
      unit: cleanOptional(item.unit),
      unitPrice: Number(item.unitPrice),
    }));

    if (items.some((item) => !item.name)) { toast.error("Each line item needs a name."); return; }

    const basePayload = {
      customerName,
      company: cleanOptional(manualForm.company),
      email: cleanOptional(manualForm.email),
      phone: cleanOptional(manualForm.phone),
      billingAddress: cleanOptional(manualForm.billingAddress),
      shippingAddress: cleanOptional(manualForm.shippingAddress),
      currency: cleanOptional(manualForm.currency) || "INR",
      deliveryDate: cleanOptional(manualForm.deliveryDate),
      paymentTerms: cleanOptional(manualForm.paymentTerms),
      customerPoNumber: cleanOptional(manualForm.customerPoNumber),
      quotationReference: cleanOptional(manualForm.quotationReference),
      paymentDueDays: Number(manualForm.paymentDueDays) || 0,
      taxRate: manualTaxRate,
      discountPercent: Number(manualForm.discountPercent) || 0,
      customerCreditLimit: Number(manualForm.customerCreditLimit) || 0,
      customerOutstandingAmount: Number(manualForm.customerOutstandingAmount) || 0,
      confirmationAttachmentUrl: cleanOptional(manualForm.confirmationAttachmentUrl),
      notes: cleanOptional(manualForm.notes),
      items,
    };

    if (editingOrderId) {
      updateMutation.mutate(
        { id: editingOrderId, payload: basePayload as UpdateSalesOrderInput },
        {
          onSuccess: (updated) => {
            toast.success(`Order ${updated.orderNumber} updated.`);
            handleOrderDrawerOpenChange(false);
            navigate(`/sales/orders/${updated.id}`);
          },
          onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update order."),
        }
      );
      return;
    }

    createMutation.mutate(
      { ...basePayload, status: manualForm.status } as CreateSalesOrderInput,
      {
        onSuccess: (created) => {
          toast.success(`Order ${created.orderNumber} created.`);
          handleOrderDrawerOpenChange(false);
          navigate(`/sales/orders/${created.id}`);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create order."),
      }
    );
  }

  function handleEditOrder(orderId: string) {
    setEditingOrderId(orderId);
    setCreateDrawerOpen(true);
  }

  // All orders for the analytics panel (unfiltered — use a separate all-orders query if available)
  const allOrders = orders;

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium text-slate-900">Order to cash</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage, track, and close sales orders</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Create order
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 border-slate-200 bg-white text-sm">
            <DropdownMenuItem onClick={() => setCreateDrawerOpen(true)}>
              Create manually
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (!acceptedQuotes.length) { toast.error("No accepted quotes ready."); return; }
                navigate("/sales");
              }}
            >
              From accepted quote
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Analytics: bar chart + donut ── */}
      <OrdersAnalytics
        orders={allOrders}
        year={selectedYear}
        onYearChange={setSelectedYear}
      />

      {/* ── Orders table ── */}
      <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
        {/* Filter bar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center">
          <input
            value={filter.search}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, search: e.target.value, page: 1 }))
            }
            placeholder="Search order number, customer, company…"
            className="h-8 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-slate-300 placeholder:text-slate-400"
          />
          <select
            value={filter.status}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, status: e.target.value as SalesOrderFilter["status"], page: 1 }))
            }
            className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none"
          >
            <option value="ALL">All statuses</option>
            {Object.values(SalesOrderStatus).map((s) => (
              <option key={s} value={s}>{toLabel(s)}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-50 text-sm" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "130px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "60px" }} />
            </colgroup>
            <thead>
              <tr>
                {["Order no.", "Customer", "Date", "Status", "Payment", "Shipment", "Total", ""].map((h) => (
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
              {ordersQuery.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-4">
                      <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : orders.length ? (
                orders.map((order) => {
                  const invoiceExists = invoiceMap.has(order.id);
                  const shipmentExists = deliveryMap.has(order.id);
                  const paymentExists = (paymentCountMap.get(order.id) ?? 0) > 0;
                  const st = statusStyle(order.status);

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                      onClick={() => navigate(`/sales/orders/${order.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 truncate">{order.orderNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 truncate">{order.customerName}</p>
                        <p className="text-xs text-slate-400 truncate">{order.company ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.bg} ${st.text}`}>
                          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />
                          {toLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 truncate">
                        {getPaymentStatus(order.id, invoiceMap, paymentCountMap)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 truncate">
                        {getShipmentStatus(order, deliveryMap)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 truncate">
                        {fmtCurrency(order.total)}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                              aria-label={`Actions for ${order.orderNumber}`}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 border-slate-200 bg-white text-sm">
                            <DropdownMenuItem onClick={() => navigate(`/sales/orders/${order.id}`)}>
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditOrder(order.id)}>
                              Edit order
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/sales/orders/${order.id}?panel=invoice`)}>
                              {invoiceExists ? "View invoice" : "Create invoice"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/sales/shipments?orderId=${order.id}`)}>
                              {shipmentExists ? "View shipment" : "Create shipment"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/sales/payments?orderId=${order.id}`)}>
                              {paymentExists ? "View payment" : "Record payment"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-xs text-slate-400">
                    No orders match the current search and filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Drawers ── */}
      <CreateOrderDrawer
        open={isCreateDrawerOpen}
        onOpenChange={handleOrderDrawerOpenChange}
        form={manualForm}
        subtotal={manualSubtotal}
        total={manualTotal}
        pending={createMutation.isPending || updateMutation.isPending || editingOrderQuery.isLoading}
        title={editingOrderId ? "Edit sales order" : "Create sales order"}
        description={
          editingOrderId
            ? "Update customer, commercial, fulfillment, and line item details."
            : "Enter customer, commercial, and fulfillment details to create a new order."
        }
        submitLabel={editingOrderId ? "Save changes" : "Create order"}
        onFieldChange={updateManualField}
        onItemChange={updateManualItem}
        onAddItem={addManualItem}
        onRemoveItem={removeManualItem}
        onReset={resetManualForm}
        onSubmit={handleCreateOrder}
      />

      <OrderDetailDrawer
        open={Boolean(detailId)}
        onOpenChange={(open) => { if (!open) setDetailId(""); }}
        order={detail}
        loading={detailQuery.isLoading}
        statusOptions={DRAWER_STATUS_OPTIONS}
        onStatusChange={(status) => {
          if (!detail) return;
          statusMutation.mutate(
            { id: detail.id, status },
            { onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update order status.") }
          );
        }}
        statusPending={statusMutation.isPending}
      />
    </div>
  );
}