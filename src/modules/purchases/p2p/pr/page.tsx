import { CheckCircle2, Plus, XCircle } from "lucide-react";
import { P2PCard, P2PFormField, P2PLayout, P2PStatusBadge, P2PTable } from "../components";
import { PR_ROWS } from "../data";

export default function P2PPrManagementPage() {
  const columns = [
    { key: "code", label: "PR ID" },
    { key: "item", label: "Item" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Actions", className: "text-right" },
  ];

  const rows = PR_ROWS.map((row) => ({
    id: row.id,
    code: <span className="font-semibold text-slate-900">{row.code}</span>,
    item: row.item,
    amount: row.amount,
    status: (
      <P2PStatusBadge
        label={row.status}
        tone={row.status === "Approved" ? "success" : row.status === "Rejected" ? "danger" : "warning"}
      />
    ),
    actions: (
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-600/20"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Approve
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-rose-600/20"
        >
          <XCircle className="h-3.5 w-3.5" />
          Reject
        </button>
      </div>
    ),
  }));

  return (
    <P2PLayout
      title="PR Management"
      subtitle="Create, review, and approve purchase requests before budget validation."
    >
      <P2PCard
        title="Create Purchase Request"
        description="Capture the requirement details for procurement review."
        action={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20"
          >
            <Plus className="h-3.5 w-3.5" />
            New PR
          </button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <P2PFormField label="Item Name">
            <input
              type="text"
              placeholder="RFID scanners"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </P2PFormField>
          <P2PFormField label="Quantity">
            <input
              type="number"
              defaultValue={40}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </P2PFormField>
          <P2PFormField label="Estimated Amount">
            <input
              type="text"
              defaultValue="INR 5.6L"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </P2PFormField>
          <P2PFormField label="Priority">
            <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none">
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </P2PFormField>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/20"
          >
            Submit PR
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
          >
            Save Draft
          </button>
        </div>
      </P2PCard>

      <P2PCard title="PR Queue" description="Recent requests with approval status.">
        <P2PTable columns={columns} rows={rows} />
      </P2PCard>
    </P2PLayout>
  );
}
