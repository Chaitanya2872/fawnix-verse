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
  maxCount,
}: {
  status: LeadStatus;
  count: number;
  avgDays?: number;
  maxCount: number;
}) {
  const percent = Math.round((count / Math.max(1, maxCount)) * 100);
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
      <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-sky-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function SourceCard({
  source,
  total,
  converted,
  conversionRate,
  maxTotal,
}: {
  source: string;
  total: number;
  converted: number;
  conversionRate: number;
  maxTotal: number;
}) {
  const volumePercent = Math.round((total / Math.max(1, maxTotal)) * 100);
  const conversionPercent = Math.round(conversionRate * 100);
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
      <div className="mt-3 space-y-2 text-[10px] text-slate-400">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span>Volume</span>
            <span>{volumePercent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-emerald-500"
              style={{ width: `${volumePercent}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span>Conversion</span>
            <span>{conversionPercent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-sky-500"
              style={{ width: `${conversionPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RepCard({
  name,
  assigned,
  active,
  converted,
  pipelineValue,
  maxPipelineValue,
}: {
  name: string;
  assigned: number;
  active: number;
  converted: number;
  pipelineValue: number;
  maxPipelineValue: number;
}) {
  const pipelinePercent = Math.round(
    (pipelineValue / Math.max(1, maxPipelineValue)) * 100
  );
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{name}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
        <span>Assigned: {assigned}</span>
        <span>Active: {active}</span>
        <span>Converted: {converted}</span>
        <span>Pipeline: {fmtCurrency(pipelineValue)}</span>
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-violet-500"
          style={{ width: `${pipelinePercent}%` }}
        />
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
  const maxStatusCount = Math.max(
    1,
    ...LEAD_STATUS_ORDER.map((status) => statusCounts[status] ?? 0)
  );
  const maxSourceTotal = Math.max(
    1,
    ...data.sourcePerformance.map((row) => row.total)
  );
  const maxPipelineValue = Math.max(
    1,
    ...data.repPerformance.map((row) => row.pipelineValue)
  );

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
              maxCount={maxStatusCount}
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
                maxTotal={maxSourceTotal}
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
                maxPipelineValue={maxPipelineValue}
              />
            ))
          )}
        </KanbanLane>
      </div>
    </div>
  );
}
