import { useMemo } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock3,
  DoorOpen,
  LogIn,
  Plus,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VMS_PATHS } from "../../routes/paths";
import { useVisitors } from "../../hooks/useVisitors";
import { VisitorTable } from "../../components/vms/VisitorTable";
import { EmptyState, VmsCard, VmsCardHeader, VmsPage } from "../../components/vms/VmsPage";
import {
  getVisitorStats,
  isToday,
  sortVisitorsNewest,
} from "../../utils/visitorWorkflow";

function Dashboard() {
  const { visitors, loading, error } = useVisitors();

  const stats = useMemo(() => getVisitorStats(visitors), [visitors]);
  const todaysVisitors = useMemo(
    () =>
      sortVisitorsNewest(visitors)
        .filter((visitor) => isToday(visitor.fromDateTime) || isToday(visitor.createdAt))
        .slice(0, 8),
    [visitors],
  );
  const recentVisitors = todaysVisitors.length > 0 ? todaysVisitors : sortVisitorsNewest(visitors).slice(0, 8);

  return (
    <VmsPage
      title="Visitor Operations"
      description="Manage the complete visitor lifecycle from registration and approval to identity verification, badge issue, check-in, and check-out."
      actions={
        <>
          <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
            <Link to={VMS_PATHS.newVisitor}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Visitor
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={VMS_PATHS.desk}>
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Open Desk
            </Link>
          </Button>
        </>
      }
    >
      {error ? (
        <EmptyState
          icon={<XCircle className="h-5 w-5" aria-hidden="true" />}
          title="Unable to load VMS data"
          description={error}
        />
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Today"
          value={loading ? "..." : stats.todayVisitors}
          helper="Scheduled or created today"
          icon={<DoorOpen className="h-5 w-5" aria-hidden="true" />}
          to={VMS_PATHS.visitors}
        />
        <MetricCard
          label="Pending Approval"
          value={loading ? "..." : stats.pendingRequests}
          helper="Waiting for host/security review"
          icon={<Clock3 className="h-5 w-5" aria-hidden="true" />}
          to={VMS_PATHS.approvals}
          highlight={stats.pendingRequests > 0}
        />
        <MetricCard
          label="On Premises"
          value={loading ? "..." : stats.currentlyArrived}
          helper="Currently checked in"
          icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
          to={VMS_PATHS.desk}
          highlight={stats.currentlyArrived > 0}
        />
        <MetricCard
          label="Completed"
          value={loading ? "..." : stats.completedRequests}
          helper="Checked out visitors"
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
          to={VMS_PATHS.history}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <WorkflowCard
          title="Register"
          description="Create a visitor request with visit timing and contact details."
          icon={<Plus className="h-5 w-5" aria-hidden="true" />}
          to={VMS_PATHS.newVisitor}
        />
        <WorkflowCard
          title="Approve"
          description="Review pending requests and approve or reject access."
          icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
          to={VMS_PATHS.approvals}
        />
        <WorkflowCard
          title="Desk"
          description="Scan QR codes, verify identity, and process entry or exit."
          icon={<LogIn className="h-5 w-5" aria-hidden="true" />}
          to={VMS_PATHS.desk}
        />
        <WorkflowCard
          title="Analyze"
          description="Track trends, history, current premises, and exports."
          icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
          to={VMS_PATHS.reports}
        />
      </section>

      <VmsCard>
        <VmsCardHeader
          title={todaysVisitors.length > 0 ? "Today's Visitors" : "Recent Visitors"}
          description="A live view of the records most likely to need desk action."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to={VMS_PATHS.visitors}>
                <Users className="h-4 w-4" aria-hidden="true" />
                View All
              </Link>
            </Button>
          }
        />
        <div className="p-4">
          <VisitorTable
            visitors={recentVisitors}
            loading={loading}
            actionScope="readonly"
            emptyMessage="No visitor records available yet."
          />
        </div>
      </VmsCard>
    </VmsPage>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  to,
  highlight = false,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: ReactNode;
  to: string;
  highlight?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`rounded-lg border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md ${
        highlight ? "border-blue-200 bg-blue-50/70" : "border-slate-200"
      }`}
    >
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
    </Link>
  );
}

function WorkflowCard({
  title,
  description,
  icon,
  to,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/50"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-blue-600 group-hover:text-white">
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
    </Link>
  );
}

export default Dashboard;
