import { FileCheck2, Link2, Upload } from "lucide-react";
import { P2PCard, P2PLayout, P2PStatusBadge } from "../components";
import { INVOICE_ROWS } from "../data";

export default function P2PInvoicePage() {
  return (
    <P2PLayout
      title="Invoice Management"
      subtitle="Upload invoice, link to PO, and verify details."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <P2PCard
          title="Upload Invoice"
          description="Securely attach the latest vendor invoice."
          action={<P2PStatusBadge label="Awaiting upload" tone="warning" />}
        >
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
            <Upload className="mx-auto h-6 w-6 text-blue-600" />
            <p className="mt-2 text-sm font-semibold text-slate-700">Drag and drop files</p>
            <p className="text-xs text-slate-500">PDF, XLS, or image files up to 10MB</p>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/20"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload file
            </button>
          </div>
        </P2PCard>

        <P2PCard
          title="Invoice Details"
          description="Verify against the PO before approval."
          action={<P2PStatusBadge label="Match in progress" tone="info" />}
        >
          <div className="space-y-3 text-sm text-slate-700">
            {INVOICE_ROWS.map((row) => (
              <div key={row.id} className="flex items-center justify-between">
                <span className="text-slate-500">{row.label}</span>
                <span className="font-semibold text-slate-900">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Link2 className="h-4 w-4 text-blue-600" />
              Linked PO
            </div>
            <p className="mt-1 text-xs text-slate-500">PO-901 is linked and pending verification.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-600/20"
              >
                <FileCheck2 className="h-3.5 w-3.5" />
                Verify invoice
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Request clarification
              </button>
            </div>
          </div>
        </P2PCard>
      </div>
    </P2PLayout>
  );
}
