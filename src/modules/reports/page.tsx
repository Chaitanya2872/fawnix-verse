"use client";

import { useState, type ReactNode } from "react";
import { BarChart3, Maximize2, Sparkles, TrendingUp, Users, Zap } from "lucide-react";
import { jsPDF } from "jspdf";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const chartPalette = [
  "#38bdf8",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#0ea5e9",
  "#129081",
];

const STAGE_CHART_LABELS: Partial<Record<LeadStatus, string>> = {
  ASSIGNED_TO_SALESPERSON: "Assigned",
  PROPOSAL_SENT: "Proposal",
  FOLLOW_UP: "Follow Up",
};

type ExpandedChartKey = "stageProgression" | "timeInStage" | "leadSources";

const EXPANDED_CHART_COPY: Record<ExpandedChartKey, { title: string; subtitle: string }> = {
  stageProgression: {
    title: "Stage Progression",
    subtitle: "Lead volume across each CRM funnel stage.",
  },
  timeInStage: {
    title: "Time in Stage",
    subtitle: "Average days leads spend in each stage.",
  },
  leadSources: {
    title: "Lead Sources",
    subtitle: "Source contribution by lead volume.",
  },
};

function ChartCard({
  title,
  subtitle,
  children,
  onExpand,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onExpand?: () => void;
}) {
  const content = (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {title}
          </p>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        {onExpand ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition group-hover:border-sky-200 group-hover:bg-sky-50 group-hover:text-sky-600">
            <Maximize2 className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      {children}
    </>
  );

  if (onExpand) {
    return (
      <button
        type="button"
        onClick={onExpand}
        aria-label={`Expand ${title} chart`}
        className="group block h-full w-full cursor-zoom-in rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-sky-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      {content}
    </div>
  );
}

function DonutChart({
  segments,
  totalLabel,
  expanded = false,
}: {
  segments: { label: string; value: number; color: string }[];
  totalLabel: string;
  expanded?: boolean;
}) {
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  let running = 0;
  const gradient =
    total === 0
      ? "#e2e8f0 0 360deg"
      : segments
          .map((segment) => {
            const start = (running / total) * 360;
            running += segment.value;
            const end = (running / total) * 360;
            return `${segment.color} ${start}deg ${end}deg`;
          })
          .join(", ");

  return (
    <div className={`flex flex-wrap items-center ${expanded ? "gap-8" : "gap-6"}`}>
      <div
        className={`relative flex items-center justify-center ${
          expanded ? "h-64 w-64" : "h-32 w-32"
        }`}
      >
        <div className="h-full w-full rounded-full" style={{ background: `conic-gradient(${gradient})` }} />
        <div className={`absolute rounded-full bg-white ${expanded ? "h-36 w-36" : "h-20 w-20"}`} />
        <div className="absolute text-center">
          <p className="text-[10px] font-semibold uppercase text-slate-400">{totalLabel}</p>
          <p className={expanded ? "text-2xl font-semibold text-slate-900" : "text-sm font-semibold text-slate-900"}>
            {total}
          </p>
        </div>
      </div>
      <div className={`${expanded ? "grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2" : "space-y-2"} text-xs text-slate-500`}>
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="w-24 truncate">{segment.label}</span>
            <span className="text-slate-700">{segment.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StageProgressionBarChart({
  items,
  expanded = false,
}: {
  items: { label: string; fullLabel: string; value: number; color: string }[];
  expanded?: boolean;
}) {
  return (
    <div className={expanded ? "h-[420px] w-full" : "h-64 w-full"}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={items}
          layout="vertical"
          margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
        >
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 10 }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={expanded ? 124 : 88}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: expanded ? 12 : 10 }}
          />
          <Tooltip
            cursor={{ fill: "#f8fafc" }}
            formatter={(value) => [`${Number(value)} leads`, "Count"]}
            labelFormatter={(label) => items.find((item) => item.label === label)?.fullLabel ?? label}
            contentStyle={{
              borderRadius: 12,
              borderColor: "#e2e8f0",
              boxShadow: "0 12px 24px rgb(15 23 42 / 0.08)",
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={expanded ? 18 : 14}>
            {items.map((item) => (
              <Cell key={item.fullLabel} fill={item.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TimeInStageAreaChart({
  items,
  expanded = false,
}: {
  items: { label: string; days: number }[];
  expanded?: boolean;
}) {
  return (
    <div className={expanded ? "h-[420px] w-full" : "h-52 w-full"}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={items} margin={{ top: 8, right: 8, bottom: 8, left: -18 }}>
          <defs>
            <linearGradient id="timeInStageArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            interval={0}
            height={42}
            tick={{ fill: "#64748b", fontSize: 10 }}
            tickMargin={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 10 }}
            tickFormatter={(value) => `${value}d`}
          />
          <Tooltip
            cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }}
            formatter={(value) => [`${Number(value).toFixed(1)} days`, "Avg time"]}
            contentStyle={{
              borderRadius: 12,
              borderColor: "#e2e8f0",
              boxShadow: "0 12px 24px rgb(15 23 42 / 0.08)",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="days"
            stroke="#0ea5e9"
            strokeWidth={2}
            fill="url(#timeInStageArea)"
            dot={{ r: 3, fill: "#0ea5e9", strokeWidth: 0 }}
            activeDot={{ r: 4, stroke: "#0284c7", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
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

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function RepPerformanceTable({
  rows,
}: {
  rows: {
    userId: string | null;
    name: string;
    assigned: number;
    active: number;
    converted: number;
    lost: number;
    pipelineValue: number;
  }[];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        No rep data yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-[760px] w-full table-fixed text-left text-xs">
        <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-[28%] px-4 py-3">Rep</th>
            <th className="px-3 py-3 text-right">Assigned</th>
            <th className="px-3 py-3 text-right">Active</th>
            <th className="px-3 py-3 text-right">Converted</th>
            <th className="px-3 py-3 text-right">Lost</th>
            <th className="px-3 py-3 text-right">Conversion</th>
            <th className="px-4 py-3 text-right">Pipeline</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => {
            const conversionRate = row.assigned === 0 ? 0 : row.converted / row.assigned;
            return (
              <tr key={row.userId ?? row.name} className="text-slate-600">
                <td className="px-4 py-3">
                  <p className="truncate font-semibold text-slate-900">{row.name}</p>
                </td>
                <td className="px-3 py-3 text-right font-medium text-slate-800">{row.assigned}</td>
                <td className="px-3 py-3 text-right">{row.active}</td>
                <td className="px-3 py-3 text-right text-emerald-700">{row.converted}</td>
                <td className="px-3 py-3 text-right text-rose-700">{row.lost}</td>
                <td className="px-3 py-3 text-right font-medium text-slate-800">
                  {fmtPercent(conversionRate)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                  {fmtCurrency(row.pipelineValue)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StageCard({
  status,
  count,
  avgDays,
  maxCount,
  compact,
}: {
  status: LeadStatus;
  count: number;
  avgDays?: number;
  maxCount: number;
  compact?: boolean;
}) {
  const percent = Math.round((count / Math.max(1, maxCount)) * 100);
  const baseClasses = compact
    ? "rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
    : "rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm";

  return (
    <div className={baseClasses}>
      <div className="flex items-center justify-between">
        <p className={`text-sm font-semibold ${compact ? "text-slate-900" : "text-slate-900"}`}>
          {LEAD_STATUS_LABELS[status]}
        </p>
        <span
          className={`rounded-full px-2 text-[10px] font-semibold ${
            compact ? "bg-slate-100 text-slate-600" : "bg-slate-100 text-slate-600"
          }`}
        >
          {count}
        </span>
      </div>
      <p className={compact ? "mt-1 text-[11px] text-slate-500" : "mt-1 text-xs text-slate-500"}>
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

export default function ReportsPage() {
  const navigate = useNavigate();
  const [expandedChart, setExpandedChart] = useState<ExpandedChartKey | null>(null);
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
          {error instanceof Error ? error.message : "Failed to load analytics."}
        </CardContent>
      </Card>
    );
  }

  const statusCounts = data.statusCounts ?? {};
  const maxStatusCount = Math.max(
    1,
    ...LEAD_STATUS_ORDER.map((status) => statusCounts[status] ?? 0)
  );
  const stageChartItems = LEAD_STATUS_ORDER.map((status, index) => ({
    label: STAGE_CHART_LABELS[status] ?? LEAD_STATUS_LABELS[status],
    fullLabel: LEAD_STATUS_LABELS[status],
    value: statusCounts[status] ?? 0,
    color: chartPalette[index % chartPalette.length],
  }));
  const stageTimeItems = LEAD_STATUS_ORDER.map((status) => ({
    label: STAGE_CHART_LABELS[status] ?? LEAD_STATUS_LABELS[status],
    days: Number((data.avgDaysInStage?.[status] ?? 0).toFixed(1)),
  }));

  const sourceChartItems = data.sourcePerformance.map((row, index) => ({
    label: row.source,
    value: row.total,
    color: chartPalette[index % chartPalette.length],
  }));
  const expandedChartMeta = expandedChart ? EXPANDED_CHART_COPY[expandedChart] : null;

  const handleExportCSV = () => {
    const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows: string[] = [];
    rows.push(["Section", "Label", "Details"].join(","));
    stageChartItems.forEach((item) => {
      rows.push(
        ["Stages", item.label, `${item.value} leads`]
          .map(quote)
          .join(",")
      );
    });
    if (data.sourcePerformance.length) {
      rows.push("");
      data.sourcePerformance.forEach((row) => {
        rows.push(
          ["Sources", row.source, `${row.total} leads, ${row.converted} converted, ${Math.round(row.conversionRate * 100)}% rate`]
            .map(quote)
            .join(",")
        );
      });
    }
    if (data.repPerformance.length) {
      rows.push("");
      data.repPerformance.forEach((row) => {
        rows.push(
          ["Reps", row.name, `${row.assigned} assigned, pipeline ${fmtCurrency(row.pipelineValue)}`]
            .map(quote)
            .join(",")
        );
      });
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    triggerBlobDownload(blob, `fawnix-analytics-${Date.now()}.csv`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    let y = 40;
    doc.setFontSize(16);
    doc.text("Fawnix Verse CRM Analytics", 40, y);
    y += 24;
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, y);
    y += 18;
    doc.text(`Total Leads: ${data.totalLeads}`, 40, y);
    y += 16;
    doc.text(`Pipeline Value: ${fmtCurrency(data.pipelineValue)}`, 40, y);
    y += 16;
    doc.text(`Converted: ${data.convertedCount} (Loss ${fmtPercent(data.lossRate)})`, 40, y);
    y += 20;

    const addLines = (title: string, lines: string[]) => {
      doc.setFontSize(12);
      doc.text(title, 40, y);
      y += 18;
      doc.setFontSize(10);
      lines.forEach((line) => {
        doc.text(line, 40, y);
        y += 14;
        if (y > 750) {
          doc.addPage();
          y = 40;
        }
      });
      y += 10;
    };

    addLines(
      "Stage Distribution",
      stageChartItems.map((item) => `${item.label}: ${item.value} leads`)
    );
    addLines(
      "Source Performance",
      data.sourcePerformance.map(
        (row) =>
          `${row.source}: ${row.total} leads, ${row.converted} converted (${Math.round(row.conversionRate * 100)}% rate)`
      )
    );
    addLines(
      "Rep Performance",
      data.repPerformance.map(
        (row) => `${row.name}: ${row.assigned} assigned, ${fmtCurrency(row.pipelineValue)} pipeline`
      )
    );

    doc.save(`fawnix-analytics-${Date.now()}.pdf`);
  };

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
              <Sparkles className="h-3 w-3" />
              Analytics
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
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
            >
              Export CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 space-y-6">
          <div className="grid gap-4 xl:grid-cols-3">
            <ChartCard
              title="Stage Progression"
              subtitle="Lead volume across each funnel stage"
              onExpand={() => setExpandedChart("stageProgression")}
            >
              <StageProgressionBarChart items={stageChartItems} />
            </ChartCard>
            <ChartCard
              title="Time in Stage"
              subtitle="Average days spent in each stage"
              onExpand={() => setExpandedChart("timeInStage")}
            >
              <TimeInStageAreaChart items={stageTimeItems} />
            </ChartCard>
            <ChartCard
              title="Lead Sources"
              subtitle="Where demand is coming from"
              onExpand={() => setExpandedChart("leadSources")}
            >
              {sourceChartItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                  No source data yet.
                </div>
              ) : (
                <DonutChart segments={sourceChartItems} totalLabel="Total leads" />
              )}
            </ChartCard>
          </div>

          <ChartCard title="Rep Performance" subtitle="Assigned leads, outcomes, and pipeline by owner">
            <RepPerformanceTable rows={data.repPerformance} />
          </ChartCard>
        </div>

        <aside className="w-full max-w-sm space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-900">Stage pipeline snapshot</p>
              <p className="text-xs text-slate-500">See how leads flow through the funnel.</p>
            </div>
            <div className="space-y-3">
              {LEAD_STATUS_ORDER.map((status) => (
                <StageCard
                  key={status}
                  status={status}
                  count={statusCounts[status] ?? 0}
                  avgDays={data.avgDaysInStage?.[status as LeadStatus]}
                  maxCount={maxStatusCount}
                  compact
                />
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Top source highlights</p>
            <p className="text-xs text-slate-500">Showing volume and conversion.</p>
            <div className="mt-4 space-y-3">
              {data.sourcePerformance.slice(0, 3).map((row) => (
                <div key={row.source} className="rounded-2xl border border-slate-100 bg-white p-3 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold text-slate-900">{row.source}</span>
                    <span>{fmtPercent(row.conversionRate)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{row.total} leads · {row.converted} converted</p>
                </div>
              ))}
              {data.sourcePerformance.length === 0 && (
                <p className="text-[11px] text-slate-400">No source highlights yet.</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <Dialog
        open={expandedChart !== null}
        onOpenChange={(open) => {
          if (!open) {
            setExpandedChart(null);
          }
        }}
      >
        {expandedChartMeta ? (
          <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl overflow-y-auto border-slate-200 bg-white p-6 sm:rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl text-slate-900">{expandedChartMeta.title}</DialogTitle>
              <DialogDescription className="text-slate-500">
                {expandedChartMeta.subtitle}
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {expandedChart === "stageProgression" ? (
                <StageProgressionBarChart items={stageChartItems} expanded />
              ) : null}
              {expandedChart === "timeInStage" ? (
                <TimeInStageAreaChart items={stageTimeItems} expanded />
              ) : null}
              {expandedChart === "leadSources" ? (
                sourceChartItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                    No source data yet.
                  </div>
                ) : (
                  <DonutChart segments={sourceChartItems} totalLabel="Total leads" expanded />
                )
              ) : null}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
