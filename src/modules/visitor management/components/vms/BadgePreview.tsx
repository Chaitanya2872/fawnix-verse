import QRCode from "react-qr-code";
import { Download, Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VisitorRecord } from "../../types";
import {
  formatDateTime,
  getBadgePayload,
  getInitials,
  getPurposeLabel,
} from "../../utils/visitorWorkflow";
import { StatusPill } from "./StatusPill";

export function BadgePreview({
  visitor,
  compact = false,
  className,
}: {
  visitor: VisitorRecord;
  compact?: boolean;
  className?: string;
}) {
  const payload = getBadgePayload(visitor);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const data = [
      `Visitor: ${visitor.name}`,
      `Visitor ID: ${visitor.visitorId || visitor.id}`,
      `Company: ${visitor.company || "Individual"}`,
      `Purpose: ${getPurposeLabel(visitor.purpose)}`,
      `Host: ${visitor.employeeToMeet || "-"}`,
      `Valid: ${formatDateTime(visitor.fromDateTime)} - ${formatDateTime(visitor.toDateTime)}`,
      `QR: ${payload}`,
    ].join("\n");
    const blob = new Blob([data], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${visitor.visitorId || visitor.id}-badge.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white p-4 shadow-sm", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {visitor.photo ? (
            <img
              src={visitor.photo}
              alt={visitor.name}
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
              {getInitials(visitor.name)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{visitor.name}</p>
            <p className="truncate font-mono text-xs text-slate-500">{visitor.visitorId || visitor.id}</p>
          </div>
        </div>
        <StatusPill status={visitor.status} />
      </div>

      <div className={cn("grid gap-4", compact ? "grid-cols-1" : "sm:grid-cols-[132px_1fr]")}>
        <div className="flex justify-center rounded-lg border border-slate-100 bg-slate-50 p-4">
          <QRCode value={payload} size={compact ? 104 : 120} />
        </div>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <BadgeField label="Company" value={visitor.company || "Individual"} />
            <BadgeField label="Host" value={visitor.employeeToMeet || "-"} />
            <BadgeField label="Purpose" value={getPurposeLabel(visitor.purpose)} />
            <BadgeField label="Valid From" value={formatDateTime(visitor.fromDateTime)} />
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            <span className="inline-flex items-center gap-1 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Security badge
            </span>
            <p className="mt-1">Scan the QR code at the desk for identity verification and visit status updates.</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Download
        </Button>
      </div>
    </div>
  );
}

function BadgeField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
