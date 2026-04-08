import { CalendarCheck, PackageCheck } from "lucide-react";
import { P2PCard, P2PLayout, P2PStatusBadge, P2PTable } from "../components";
import { RECEIPT_ITEMS } from "../data";

export default function P2PMaterialReceiptPage() {
  const columns = [
    { key: "item", label: "Item" },
    { key: "ordered", label: "Ordered" },
    { key: "received", label: "Received" },
    { key: "date", label: "Received Date" },
    { key: "status", label: "Status", className: "text-right" },
  ];

  const rows = RECEIPT_ITEMS.map((item) => ({
    id: item.id,
    item: <span className="font-semibold text-slate-900">{item.item}</span>,
    ordered: item.ordered,
    received: (
      <input
        type="number"
        defaultValue={item.received}
        className="w-20 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
      />
    ),
    date: (
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <CalendarCheck className="h-3.5 w-3.5 text-blue-600" />
        {item.date}
      </div>
    ),
    status: (
      <div className="flex justify-end">
        <P2PStatusBadge
          label={item.received >= item.ordered ? "Completed" : "Partial"}
          tone={item.received >= item.ordered ? "success" : "warning"}
        />
      </div>
    ),
  }));

  return (
    <P2PLayout
      title="Material Receipt"
      subtitle="Confirm received quantities and update delivery status."
    >
      <P2PCard
        title="Receipt Confirmation"
        description="Update quantities and confirm the received date."
        action={<P2PStatusBadge label="In warehouse" tone="info" />}
      >
        <P2PTable columns={columns} rows={rows} />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/20"
          >
            <PackageCheck className="h-4 w-4" />
            Confirm receipt
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
          >
            Flag discrepancy
          </button>
        </div>
      </P2PCard>
    </P2PLayout>
  );
}
