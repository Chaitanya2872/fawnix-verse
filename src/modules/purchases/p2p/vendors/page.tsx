import { CheckCircle2, Plus } from "lucide-react";
import { P2PCard, P2PFormField, P2PLayout, P2PStatusBadge, P2PTable } from "../components";
import { VENDOR_ROWS } from "../data";

export default function P2PVendorEvaluationPage() {
  const columns = [
    { key: "name", label: "Vendor" },
    { key: "price", label: "Price" },
    { key: "rating", label: "Rating" },
    { key: "delivery", label: "Delivery Time" },
    { key: "status", label: "Highlight" },
    { key: "select", label: "Select", className: "text-right" },
  ];

  const rows = VENDOR_ROWS.map((vendor) => ({
    id: vendor.id,
    name: <span className="font-semibold text-slate-900">{vendor.name}</span>,
    price: vendor.price,
    rating: (
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {vendor.rating}
        </span>
        <span className="text-xs text-slate-400">/ 5</span>
      </div>
    ),
    delivery: vendor.delivery,
    status: <P2PStatusBadge label={vendor.status} tone="info" />,
    select: (
      <div className="flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Choose
        </button>
      </div>
    ),
  }));

  return (
    <P2PLayout
      title="Vendor Evaluation"
      subtitle="Compare suppliers, cost, and delivery performance."
    >
      <P2PCard
        title="Add Vendors"
        description="Capture all shortlisted vendors for evaluation."
        action={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Vendor
          </button>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <P2PFormField label="Vendor Name">
            <input
              type="text"
              placeholder="Trackon Systems"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </P2PFormField>
          <P2PFormField label="Quoted Price">
            <input
              type="text"
              placeholder="INR 5.4L"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </P2PFormField>
          <P2PFormField label="Delivery Time">
            <input
              type="text"
              placeholder="7 days"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </P2PFormField>
        </div>
      </P2PCard>

      <P2PCard
        title="Vendor Comparison"
        description="Compare price, rating, and delivery time before selection."
        action={<P2PStatusBadge label="3 vendors" tone="neutral" />}
      >
        <P2PTable columns={columns} rows={rows} />
      </P2PCard>
    </P2PLayout>
  );
}
