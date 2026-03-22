"use client";

import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  ClipboardList,
  PhoneCall,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { LeadStatus, LEAD_STATUS_LABELS } from "@/modules/crm/leads/types";
import { usePreSalesOverview } from "./hooks";

const fmtDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "-";

type LeadQuickView = {
  id: string;
  name: string;
  company: string;
  status: LeadStatus;
  assignedToName: string;
  lastContactedAt: string | null;
  createdAt: string;
};

function LeadKanbanCard({
  lead,
  onOpen,
}: {
  lead: LeadQuickView;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onOpen(lead.id)}
      className="group flex w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{lead.name}</p>
          <p className="text-xs text-slate-500">{lead.company}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-sky-500" />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
          {LEAD_STATUS_LABELS[lead.status]}
        </span>
        <span>Owner: {lead.assignedToName || "Unassigned"}</span>
        <span>Last contact: {fmtDate(lead.lastContactedAt)}</span>
      </div>
    </button>
  );
}

function KanbanColumn({
  title,
  tone,
  icon,
  description,
  leads,
  onOpen,
}: {
  title: string;
  tone: string;
  icon: ReactNode;
  description: string;
  leads: LeadQuickView[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="flex min-w-[260px] min-h-[360px] flex-1 flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tone}`}>
              {icon}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              <p className="text-xs text-slate-500">{description}</p>
            </div>
          </div>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-sm">
          {leads.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 p-4 text-xs text-slate-500">
            No leads in this lane.
          </div>
        ) : (
          leads.map((lead) => <LeadKanbanCard key={lead.id} lead={lead} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}

export default function PreSalesOverviewPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = usePreSalesOverview();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-slate-500">
          Loading tasks dashboard...
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-slate-500">
          {error instanceof Error ? error.message : "Failed to load tasks data."}
        </CardContent>
      </Card>
    );
  }

  const columns = [
    {
      key: "needs-contact",
      title: "Needs First Contact",
      description: "New leads awaiting outreach",
      tone: "bg-sky-100 text-sky-600",
      icon: <PhoneCall className="h-4 w-4" />,
      leads: data.needsContact,
    },
    {
      key: "follow-ups",
      title: "Follow Ups",
      description: "Next callbacks to schedule",
      tone: "bg-amber-100 text-amber-600",
      icon: <AlertCircle className="h-4 w-4" />,
      leads: data.followUps,
    },
    {
      key: "my-queue",
      title: "My Queue",
      description: "Active conversations to push forward",
      tone: "bg-emerald-100 text-emerald-600",
      icon: <Target className="h-4 w-4" />,
      leads: data.myQueue,
    },
    {
      key: "awaiting-assignment",
      title: "Awaiting Assignment",
      description: "Qualified leads to hand off",
      tone: "bg-violet-100 text-violet-600",
      icon: <Users className="h-4 w-4" />,
      leads: data.awaitingAssignment,
    },
  ];

  const stageSeries = [
    { status: LeadStatus.NEW, label: "New", tone: "bg-sky-500" },
    { status: LeadStatus.CONTACTED, label: "Contacted", tone: "bg-indigo-500" },
    { status: LeadStatus.FOLLOW_UP, label: "Follow Up", tone: "bg-amber-500" },
    { status: LeadStatus.QUALIFIED, label: "Qualified", tone: "bg-emerald-500" },
    {
      status: LeadStatus.ASSIGNED_TO_SALESPERSON,
      label: "Assigned",
      tone: "bg-violet-500",
    },
  ];
  const stageMax = Math.max(
    1,
    ...stageSeries.map((item) => data.statusCounts?.[item.status] ?? 0)
  );
  const laneSeries = [
    { label: "Needs Contact", value: data.needsContact.length, tone: "bg-sky-500" },
    { label: "Follow Ups", value: data.followUps.length, tone: "bg-amber-500" },
    { label: "My Queue", value: data.myQueue.length, tone: "bg-emerald-500" },
    { label: "Awaiting Assign", value: data.awaitingAssignment.length, tone: "bg-violet-500" },
  ];
  const laneMax = Math.max(1, ...laneSeries.map((item) => item.value));
  const totalTracked = stageSeries.reduce(
    (sum, item) => sum + (data.statusCounts?.[item.status] ?? 0),
    0
  );

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700">
              <Sparkles className="h-3 w-3" />
              Tasks Command Center
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Move every lead to the next action in minutes.
            </h1>
            <p className="max-w-xl text-sm text-slate-500">
              Keep follow-ups on time, prioritize outreach, and hand qualified
              opportunities to sales without the noise.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate("/crm/leads")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
            >
              <ClipboardList className="h-4 w-4" />
              Open Leads
            </button>
            <button
              onClick={() => navigate("/crm/leads")}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-sky-700"
            >
              <Sparkles className="h-4 w-4" />
              Quick Review
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Stage Distribution
              </p>
              <p className="text-sm text-slate-500">Where leads are right now</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {totalTracked} total
            </span>
          </div>
          <div className="space-y-3">
            {stageSeries.map((item) => {
              const value = data.statusCounts?.[item.status] ?? 0;
              const width = Math.round((value / stageMax) * 100);
              return (
                <div key={item.status} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-medium text-slate-600">
                    {item.label}
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${item.tone}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-semibold text-slate-700">
                    {value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Queue Load
              </p>
              <p className="text-sm text-slate-500">What needs attention first</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {laneSeries.reduce((sum, item) => sum + item.value, 0)} items
            </span>
          </div>
          <div className="space-y-3">
            {laneSeries.map((item) => {
              const width = Math.round((item.value / laneMax) * 100);
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="w-28 text-xs font-medium text-slate-600">
                    {item.label}
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${item.tone}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-semibold text-slate-700">
                    {item.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">Quick stats:</span>
        <span>New: {data.statusCounts?.[LeadStatus.NEW] ?? 0}</span>
        <span>Contacted: {data.statusCounts?.[LeadStatus.CONTACTED] ?? 0}</span>
        <span>Qualified: {data.statusCounts?.[LeadStatus.QUALIFIED] ?? 0}</span>
        <span>Assigned to Sales: {data.statusCounts?.[LeadStatus.ASSIGNED_TO_SALESPERSON] ?? 0}</span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map((column) => (
          <KanbanColumn
            key={column.key}
            title={column.title}
            description={column.description}
            tone={column.tone}
            icon={column.icon}
            leads={column.leads}
            onOpen={(id) => navigate(`/crm/leads/${id}`)}
          />
        ))}
      </div>
    </div>
  );
}
