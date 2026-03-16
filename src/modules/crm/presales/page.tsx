"use client";

import { AlertCircle, Phone, Target, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadStatus, LEAD_STATUS_LABELS } from "@/modules/crm/leads/types";
import { usePreSalesOverview } from "./hooks";

const MYRA_FLOW = [
  "Marketing",
  "Lead Management",
  "Pre-Sales Qualification",
  "Sales Opportunity Pipeline",
  "Quotation & Negotiation",
  "Order Confirmation",
  "Procurement & Vendor Management",
  "Installation / Project Execution",
  "Billing & Payments",
  "Post-Sales Support",
];

const fmtDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "—";

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadTable({
  title,
  leads,
}: {
  title: string;
  leads: {
    id: string;
    name: string;
    company: string;
    status: LeadStatus;
    assignedToName: string;
    lastContactedAt: string | null;
  }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Focus on the next best action.</CardDescription>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-muted-foreground">
            No leads to show right now.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase text-slate-400">
                  <th className="px-3 py-2 text-left">Lead</th>
                  <th className="px-3 py-2 text-left">Company</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Owner</th>
                  <th className="px-3 py-2 text-left">Last Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td className="px-3 py-2 font-medium text-slate-700">{lead.name}</td>
                    <td className="px-3 py-2 text-slate-600">{lead.company}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {LEAD_STATUS_LABELS[lead.status]}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{lead.assignedToName}</td>
                    <td className="px-3 py-2 text-slate-600">{fmtDate(lead.lastContactedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PreSalesOverviewPage() {
  const { data, isLoading, isError, error } = usePreSalesOverview();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pre-Sales Overview</CardTitle>
          <CardDescription>Loading workflow insights…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pre-Sales Overview</CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : "Failed to load pre-sales data."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const statusCounts = data.statusCounts ?? {};

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-sky-600">
            <span className="h-1 w-1 rounded-full bg-sky-500" />
            CRM
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Pre-Sales Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stay on top of call activity, qualification, and handoffs.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="New Leads" value={statusCounts[LeadStatus.NEW] ?? 0} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Contacted" value={statusCounts[LeadStatus.CONTACTED] ?? 0} icon={<Phone className="h-4 w-4" />} />
        <StatCard label="Follow Up" value={statusCounts[LeadStatus.FOLLOW_UP] ?? 0} icon={<AlertCircle className="h-4 w-4" />} />
        <StatCard label="Qualified" value={statusCounts[LeadStatus.QUALIFIED] ?? 0} icon={<Target className="h-4 w-4" />} />
        <StatCard label="Unqualified" value={statusCounts[LeadStatus.UNQUALIFIED] ?? 0} icon={<AlertCircle className="h-4 w-4" />} />
        <StatCard label="Assigned to Sales" value={statusCounts[LeadStatus.ASSIGNED_TO_SALESPERSON] ?? 0} icon={<Users className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <LeadTable title="My Queue" leads={data.myQueue} />
          <LeadTable title="Needs First Contact" leads={data.needsContact} />
          <LeadTable title="Follow Ups" leads={data.followUps} />
          <LeadTable title="Awaiting Sales Assignment" leads={data.awaitingAssignment} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Myra Flow Snapshot</CardTitle>
            <CardDescription>Where pre-sales fits in the end-to-end journey.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {MYRA_FLOW.map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {index + 1}
                </span>
                <span
                  className={`text-sm ${
                    step === "Pre-Sales Qualification" ? "font-semibold text-sky-600" : "text-slate-600"
                  }`}
                >
                  {step}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
