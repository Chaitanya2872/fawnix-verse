import { CheckCircle2, Edit3 } from "lucide-react";
import { P2PCard, P2PLayout, P2PStatusBadge, P2PTable } from "../components";
import { NEGOTIATION_HISTORY } from "../data";

export default function P2PNegotiationPage() {
  const columns = [
    { key: "item", label: "Item" },
    { key: "initial", label: "Initial Price" },
    { key: "revised", label: "Revised Price" },
    { key: "savings", label: "Savings" },
    { key: "actions", label: "Edit", className: "text-right" },
  ];

  const rows = [
    {
      id: "n-1",
      item: "RFID scanners (40 units)",
      initial: "INR 5.8L",
      revised: (
        <input
          type="text"
          defaultValue="INR 5.4L"
          className="w-28 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
        />
      ),
      savings: <P2PStatusBadge label="6.9%" tone="success" />,
      actions: (
        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Update
          </button>
        </div>
      ),
    },
  ];

  return (
    <P2PLayout
      title="Negotiation"
      subtitle="Track vendor pricing changes and finalize the agreed value."
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <P2PCard
          title="Editable Pricing"
          description="Capture negotiated price changes before final approval."
          action={<P2PStatusBadge label="In negotiation" tone="warning" />}
        >
          <P2PTable columns={columns} rows={rows} />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/20"
            >
              Save negotiation
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Send counter
            </button>
          </div>
        </P2PCard>

        <P2PCard title="Negotiation History" description="Chronological updates and remarks.">
          <div className="space-y-3">
            {NEGOTIATION_HISTORY.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{log.date}</p>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                    {log.owner}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{log.detail}</p>
              </div>
            ))}
          </div>
        </P2PCard>
      </div>

      <P2PCard
        title="Finalize Vendor"
        description="Lock in the negotiated price and proceed to PO."
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Trackon Systems</p>
            <p className="text-xs text-slate-500">Final agreed price INR 5.4L</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/20"
          >
            <CheckCircle2 className="h-4 w-4" />
            Finalize and Generate PO
          </button>
        </div>
      </P2PCard>
    </P2PLayout>
  );
}
