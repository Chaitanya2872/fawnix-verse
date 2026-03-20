"use client";

import type { ReactNode } from "react";
import { BarChart3, Sparkles, TrendingUp, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER, type LeadStatus } from "@/modules/crm/leads/types";
import { useReportsOverview } from "./hooks";

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const fmtPercent = (value: number) => `${Math.round(value * 100)}%`;

function KanbanLane({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-[280px] flex-1 flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {children}
      </div>
    </div>
  );
}

function InsightCard({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="text-lg font-semibold text-slate-900">{value}</p>
        {sub ? <p className="text-xs text-slate-500">{sub}</p> : null}
      </div>
      <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tone}`}>
        {icon}
      </span>
    </div>
  );
}

function StageCard({
  status,
  count,
  avgDays,
}: {
  status: LeadStatus;
  count: number;
  avgDays?: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{LEAD_STATUS_LABELS[status]}</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
          {count}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {avgDays === undefined ? "Timing pending" : `${avgDays.toFixed(1)} days avg`}
      </p>
    </div>
  );
}

function SourceCard({
  source,
  total,
  converted,
  conversionRate,
}: {
  source: string;
  total: number;
  converted: number;
  conversionRate: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{source}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>Leads: {total}</span>
        <span>Converted: {converted}</span>
      </div>
      <p className="mt-1 text-xs font-semibold text-slate-700">
        Rate: {fmtPercent(conversionRate)}
      </p>
    </div>
  );
}

function RepCard({
  name,
  assigned,
  active,
  converted,
  pipelineValue,
}: {
  name: string;
  assigned: number;
  active: number;
  converted: number;
  pipelineValue: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{name}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
        <span>Assigned: {assigned}</span>
        <span>Active: {active}</span>
        <span>Converted: {converted}</span>
        <span>Pipeline: {fmtCurrency(pipelineValue)}</span>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useReportsOverview();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-slate-500">Loading analytics...</CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-slate-500">
          {error instanceof Error ? error.message : "Failed to load reports."}
        </CardContent>
      </Card>
    );
  }

  const statusCounts = data.statusCounts ?? {};

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
              <Sparkles className="h-3 w-3" />
              Reports and Analytics
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">
              A focused view of pipeline and performance.
            </h1>
            <p className="max-w-xl text-sm text-slate-500">
              Monitor conversion health, lead sources, and rep impact in a single glance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate("/crm/leads")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
            >
              <Users className="h-4 w-4" />
              View Leads
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        <KanbanLane title="Executive Summary" description="Key business health metrics">
          <InsightCard
            label="Total Leads"
            value={data.totalLeads}
            sub={`Conversion ${fmtPercent(data.conversionRate)}`}
            tone="bg-sky-100 text-sky-600"
            icon={<Users className="h-4 w-4" />}
          />
          <InsightCard
            label="Pipeline Value"
            value={fmtCurrency(data.pipelineValue)}
            sub="Qualified and beyond"
            tone="bg-emerald-100 text-emerald-600"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <InsightCard
            label="Converted"
            value={data.convertedCount}
            sub={`Loss ${fmtPercent(data.lossRate)}`}
            tone="bg-amber-100 text-amber-600"
            icon={<Zap className="h-4 w-4" />}
          />
          <InsightCard
            label="Days to First Contact"
            value={data.avgDaysToFirstContact.toFixed(1)}
            sub="Across contacted leads"
            tone="bg-violet-100 text-violet-600"
            icon={<BarChart3 className="h-4 w-4" />}
          />
        </KanbanLane>
        <KanbanLane title="Pipeline Stages" description="Stage distribution with timing context">
          {LEAD_STATUS_ORDER.map((status) => (
            <StageCard
              key={status}
              status={status}
              count={statusCounts[status] ?? 0}
              avgDays={data.avgDaysInStage?.[status as LeadStatus]}
            />
          ))}
        </KanbanLane>

        <KanbanLane title="Source Performance" description="Lead volume and conversion rates">
          {data.sourcePerformance.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 p-4 text-xs text-slate-500">
              No source data yet.
            </div>
          ) : (
            data.sourcePerformance.map((row) => (
              <SourceCard
                key={row.source}
                source={row.source}
                total={row.total}
                converted={row.converted}
                conversionRate={row.conversionRate}
              />
            ))
          )}
        </KanbanLane>

        <KanbanLane title="Rep Performance" description="Active pipeline by assignee">
          {data.repPerformance.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 p-4 text-xs text-slate-500">
              No rep data yet.
            </div>
          ) : (
            data.repPerformance.map((row) => (
              <RepCard
                key={row.userId ?? row.name}
                name={row.name}
                assigned={row.assigned}
                active={row.active}
                converted={row.converted}
                pipelineValue={row.pipelineValue}
              />
            ))
          )}
        </KanbanLane>
      </div>
    </div>
  );
}
