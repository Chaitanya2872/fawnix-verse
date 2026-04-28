import { cn } from "@/lib/utils";
import { InventoryCheckStatus, InvoiceStatus, OrderStatus } from "../types";
import {
  INVENTORY_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  ORDER_STATUS_LABELS,
} from "../utils/status";

type StatusValue = OrderStatus | InvoiceStatus | InventoryCheckStatus | string;

type StatusBadgeProps = {
  status: StatusValue;
  className?: string;
};

const STATUS_TONES: Record<string, string> = {
  [OrderStatus.CREATED]: "bg-slate-100 text-slate-700",
  [OrderStatus.INVENTORY_CHECKED]: "bg-amber-100 text-amber-700",
  [OrderStatus.MATERIAL_ISSUED]: "bg-indigo-100 text-indigo-700",
  [OrderStatus.DC_CREATED]: "bg-cyan-100 text-cyan-700",
  [OrderStatus.INVOICED]: "bg-violet-100 text-violet-700",
  [OrderStatus.PAID]: "bg-emerald-100 text-emerald-700",
  [OrderStatus.CLOSED]: "bg-slate-200 text-slate-700",
  [InvoiceStatus.PENDING]: "bg-amber-100 text-amber-700",
  [InvoiceStatus.PAID]: "bg-emerald-100 text-emerald-700",
  [InventoryCheckStatus.FULL]: "bg-emerald-100 text-emerald-700",
  [InventoryCheckStatus.PARTIAL]: "bg-amber-100 text-amber-700",
  [InventoryCheckStatus.OUT_OF_STOCK]: "bg-rose-100 text-rose-700",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label =
    ORDER_STATUS_LABELS[status as OrderStatus] ??
    INVOICE_STATUS_LABELS[status as InvoiceStatus] ??
    INVENTORY_STATUS_LABELS[status as InventoryCheckStatus] ??
    String(status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        STATUS_TONES[String(status)] ?? "bg-slate-100 text-slate-700",
        className
      )}
    >
      {label}
    </span>
  );
}
