import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Clock3,
  Download,
  LogIn,
  Plus,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VmsPage, VmsCard, VmsCardHeader } from "../../components/vms/VmsPage";
import { VisitorTable } from "../../components/vms/VisitorTable";
import { useVisitors } from "../../hooks/useVisitors";
import { VMS_PATHS } from "../../routes/paths";
import {
  downloadCsv,
  getPurposeLabel,
  getVisitorStats,
  isCheckedIn,
  isRejected,
  isToday,
  sortVisitorsNewest,
  toVisitorCsv,
} from "../../utils/visitorWorkflow";

function Reports() {
  const { visitors, loading, error } = useVisitors();
  const stats = useMemo(() => getVisitorStats(visitors), [visitors]);
  const today = useMemo(
    () => visitors.filter((visitor) => isToday(visitor.fromDateTime) || isToday(visitor.createdAt)),
    [visitors],
  );
  const onPremises = useMemo(() => visitors.filter(isCheckedIn), [visitors]);
  const purposeBreakdown = useMemo(() => buildPurposeBreakdown(visitors), [visitors]);
  const recentExceptions = useMemo(() => sortVisitorsNewest(visitors.filter(isRejected)).slice(0, 6), [visitors]);

  return (
    <VmsPage
      title="Reports"
      description="Operational reporting for visitor volume, approvals, current premises, and audit exports."
      actions={
        <>
          <Button type="button" variant="outline" onClick={() => downloadCsv("visitor-report.csv", toVisitorCsv(visitors))} disabled={visitors.length === 0}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export All
          </Button>
          <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
            <Link to={VMS_PATHS.newVisitor}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Visitor
            </Link>
          </Button>
        </>
      }
    >
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportMetric label="Total Requests" value={stats.totalRequests} helper="All visitor records" icon={<Users className="h-5 w-5" aria-hidden="true" />} />
        <ReportMetric label="Today" value={stats.todayVisitors} helper="Scheduled or created today" icon={<Clock3 className="h-5 w-5" aria-hidden="true" />} />
        <ReportMetric label="On Premises" value={stats.currentlyArrived} helper="Currently checked in" icon={<LogIn className="h-5 w-5" aria-hidden="true" />} />
        <ReportMetric label="Rejected" value={stats.rejectedRequests} helper="Denied or blocked requests" icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <VmsCard>
          <VmsCardHeader title="Today's Visitor Activity" description="Visitors relevant to today's operations." />
          <div className="p-4">
            <VisitorTable
              visitors={today}
              loading={loading}
              actionScope="readonly"
              emptyMessage="No visitor activity today."
            />
          </div>
        </VmsCard>

        <div className="space-y-4">
          <VmsCard>
            <VmsCardHeader title="Purpose Breakdown" description="Distribution by visit purpose." />
            <div className="space-y-3 p-4">
              {purposeBreakdown.length === 0 ? (
                <p className="text-sm text-slate-500">No purpose data available.</p>
              ) : (
                purposeBreakdown.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-700">{item.label}</span>
                      <span className="text-slate-500">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{ width: `${Math.max(8, item.percent)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </VmsCard>

          <VmsCard>
            <VmsCardHeader title="Currently On Premises" description={`${onPremises.length} active visitor${onPremises.length === 1 ? "" : "s"}.`} />
            <div className="space-y-2 p-4">
              {onPremises.length === 0 ? (
                <p className="text-sm text-slate-500">No active visitors right now.</p>
              ) : (
                onPremises.slice(0, 6).map((visitor) => (
                  <Link key={visitor.id} to={VMS_PATHS.visitorDetails(visitor.id)} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm hover:border-blue-200 hover:bg-blue-50">
                    <span className="font-medium text-slate-800">{visitor.name}</span>
                    <span className="font-mono text-xs text-slate-500">{visitor.visitorId || visitor.id}</span>
                  </Link>
                ))
              )}
            </div>
          </VmsCard>

          <VmsCard>
            <VmsCardHeader title="Recent Exceptions" description="Rejected visitor requests for quick audit review." />
            <div className="space-y-2 p-4">
              {recentExceptions.length === 0 ? (
                <p className="text-sm text-slate-500">No rejected visitor records.</p>
              ) : (
                recentExceptions.map((visitor) => (
                  <Link key={visitor.id} to={VMS_PATHS.visitorDetails(visitor.id)} className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm hover:border-rose-200">
                    <span className="font-medium text-rose-900">{visitor.name}</span>
                    <span className="text-xs text-rose-700">{visitor.rejectionReason || "Rejected"}</span>
                  </Link>
                ))
              )}
            </div>
          </VmsCard>
        </div>
      </section>
    </VmsPage>
  );
}

function ReportMetric({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: number;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

function buildPurposeBreakdown(visitors: Array<{ purpose?: string }>) {
  const counts = visitors.reduce<Record<string, number>>((acc, visitor) => {
    const label = getPurposeLabel(visitor.purpose);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const total = Math.max(1, visitors.length);

  return Object.entries(counts)
    .map(([label, count]) => ({
      label,
      count,
      percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export default Reports;
