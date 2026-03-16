"use client";

import { BarChart3, TrendingUp, Users, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER, type LeadStatus } from "@/modules/crm/leads/types";
import { useReportsOverview } from "./hooks";

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);

const fmtPercent = (value: number) => `${Math.round(value * 100)}%`;

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tracking-tight">{value}</p>
          {sub ? <p className="text-[11px] text-muted-foreground">{sub}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const { data, isLoading, isError, error } = useReportsOverview();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reports & Analytics</CardTitle>
          <CardDescription>Loading insights…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reports & Analytics</CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : "Failed to load reports."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const statusCounts = data.statusCounts ?? {};
  const maxStatusCount = Math.max(
    1,
    ...LEAD_STATUS_ORDER.map((status) => statusCounts[status] ?? 0)
  );

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-600">
            <span className="h-1 w-1 rounded-full bg-emerald-500" />
            Analytics
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pipeline performance, conversion trends, and rep impact.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Leads"
          value={data.totalLeads}
          sub={`Conversion rate ${fmtPercent(data.conversionRate)}`}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Pipeline Value"
          value={fmtCurrency(data.pipelineValue)}
          sub="Qualified and beyond"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Converted"
          value={data.convertedCount}
          sub={`Loss rate ${fmtPercent(data.lossRate)}`}
          icon={<Zap className="h-4 w-4" />}
        />
        <StatCard
          label="Avg. Days to First Contact"
          value={data.avgDaysToFirstContact.toFixed(1)}
          sub="Across contacted leads"
          icon={<BarChart3 className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline Funnel</CardTitle>
            <CardDescription>Stage distribution in the CRM flow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {LEAD_STATUS_ORDER.map((status) => {
              const count = statusCounts[status] ?? 0;
              const percent = Math.round((count / maxStatusCount) * 100);
              return (
                <div key={status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>{LEAD_STATUS_LABELS[status]}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-sky-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average Days in Stage</CardTitle>
            <CardDescription>Based on status history entries.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {LEAD_STATUS_ORDER.map((status) => {
              const value = data.avgDaysInStage?.[status as LeadStatus];
              if (value === undefined) return null;
              return (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{LEAD_STATUS_LABELS[status]}</span>
                  <span className="font-semibold">{value.toFixed(1)} days</span>
                </div>
              );
            })}
            {!data.avgDaysInStage || Object.keys(data.avgDaysInStage).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Stage timing will appear once history data is collected.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source Performance</CardTitle>
            <CardDescription>Lead volume and conversions by source.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase text-slate-400">
                    <th className="px-3 py-2 text-left">Source</th>
                    <th className="px-3 py-2 text-right">Leads</th>
                    <th className="px-3 py-2 text-right">Converted</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.sourcePerformance.map((row) => (
                    <tr key={row.source}>
                      <td className="px-3 py-2 font-medium text-slate-700">{row.source}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{row.total}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{row.converted}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-700">
                        {fmtPercent(row.conversionRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rep Performance</CardTitle>
            <CardDescription>Active pipeline and conversions by assignee.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase text-slate-400">
                    <th className="px-3 py-2 text-left">Rep</th>
                    <th className="px-3 py-2 text-right">Assigned</th>
                    <th className="px-3 py-2 text-right">Active</th>
                    <th className="px-3 py-2 text-right">Converted</th>
                    <th className="px-3 py-2 text-right">Pipeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.repPerformance.map((row) => (
                    <tr key={row.userId ?? row.name}>
                      <td className="px-3 py-2 font-medium text-slate-700">{row.name}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{row.assigned}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{row.active}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{row.converted}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-700">
                        {fmtCurrency(row.pipelineValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
