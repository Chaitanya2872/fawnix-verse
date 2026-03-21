"use client";

import type { ReactNode } from "react";
import { BarChart3, Sparkles, TrendingUp, Users, Zap } from "lucide-react";
import { jsPDF } from "jspdf";
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

const chartPalette = [
  "#38bdf8",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#0ea5e9",
  "#14b8a6",
];

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          {title}
        </p>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function DonutChart({
  segments,
  totalLabel,
}: {
  segments: { label: string; value: number; color: string }[];
  totalLabel: string;
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
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative flex h-32 w-32 items-center justify-center">
        <div className="h-full w-full rounded-full" style={{ background: `conic-gradient(${gradient})` }} />
        <div className="absolute h-20 w-20 rounded-full bg-white" />
        <div className="absolute text-center">
          <p className="text-[10px] font-semibold uppercase text-slate-400">{totalLabel}</p>
          <p className="text-sm font-semibold text-slate-900">{total}</p>
        </div>
      </div>
      <div className="space-y-2 text-xs text-slate-500">
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

function VerticalBarChart({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  const maxValue = Math.max(1, ...items.map((item) => item.value));
  return (
    <div className="flex h-36 items-end gap-3">
      {items.map((item) => {
        const height = Math.round((item.value / maxValue) * 100);
        return (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-24 w-full items-end rounded-xl bg-slate-100">
              <div
                className="w-full rounded-xl"
                style={{ height: `${height}%`, backgroundColor: item.color }}
              />
            </div>
            <span className="text-[10px] text-slate-500">{item.label}</span>
            <span className="text-xs font-semibold text-slate-700">{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBarChart({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  const maxValue = Math.max(1, ...items.map((item) => item.value));
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const width = Math.round((item.value / maxValue) * 100);
        return (
          <div key={item.label} className="flex items-center gap-3 text-xs text-slate-500">
            <span className="w-24 truncate font-medium text-slate-600">{item.label}</span>
            <div className="h-2 flex-1 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full"
                style={{ width: `${width}%`, backgroundColor: item.color }}
              />
            </div>
            <span className="w-16 text-right text-slate-700">{fmtCurrency(item.value)}</span>
          </div>
        );
      })}
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

function DetailCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="space-y-3">{children}</div>
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

  const stageChartItems = LEAD_STATUS_ORDER.map((status, index) => ({
    label: LEAD_STATUS_LABELS[status],
    value: statusCounts[status] ?? 0,
    color: chartPalette[index % chartPalette.length],
  }));

  const sourceChartItems = data.sourcePerformance.map((row, index) => ({
    label: row.source,
    value: row.total,
    color: chartPalette[index % chartPalette.length],
  }));

  const repChartItems = data.repPerformance.slice(0, 6).map((row, index) => ({
    label: row.name,
    value: row.pipelineValue,
    color: chartPalette[index % chartPalette.length],
  }));

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
    triggerBlobDownload(blob, `fawnix-reports-${Date.now()}.csv`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    let y = 40;
    doc.setFontSize(16);
    doc.text("Fawnix Verse CRM Report", 40, y);
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

    doc.save(`fawnix-reports-${Date.now()}.pdf`);
  };

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

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Pipeline Stages" subtitle="Lead distribution across the funnel">
          <VerticalBarChart items={stageChartItems} />
        </ChartCard>
        <ChartCard title="Lead Sources" subtitle="Where demand is coming from">
          {sourceChartItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
              No source data yet.
            </div>
          ) : (
            <DonutChart segments={sourceChartItems} totalLabel="Total leads" />
          )}
        </ChartCard>
        <ChartCard title="Pipeline by Rep" subtitle="Top pipeline contributors">
          {repChartItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
              No rep data yet.
            </div>
          ) : (
            <HorizontalBarChart items={repChartItems} />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <DetailCard title="Stage Timing" subtitle="Average time spent in each stage">
          {LEAD_STATUS_ORDER.map((status) => (
            <StageCard
              key={status}
              status={status}
              count={statusCounts[status] ?? 0}
              avgDays={data.avgDaysInStage?.[status as LeadStatus]}
              maxCount={maxStatusCount}
            />
          ))}
        </DetailCard>

        <DetailCard title="Source Performance" subtitle="Lead volume and conversion rates">
          {data.sourcePerformance.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
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
        </DetailCard>

        <DetailCard title="Rep Performance" subtitle="Activity and conversion by owner">
          {data.repPerformance.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
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
        </DetailCard>
      </div>
    </div>
  );
}
