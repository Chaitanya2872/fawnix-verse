import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ClipboardCheck, RefreshCcw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  VmsAlert,
  VmsCard,
  VmsCardHeader,
  VmsMetricCard,
  VmsPage,
} from "../../components/vms/VmsPage";
import { VisitorActionDialog } from "../../components/vms/VisitorActionDialog";
import { VisitorTable } from "../../components/vms/VisitorTable";
import { StatusPill } from "../../components/vms/StatusPill";
import { useVisitorActions, useVisitors } from "../../hooks/useVisitors";
import { VMS_PATHS } from "../../routes/paths";
import type { VisitorAction, VisitorRecord } from "../../types";
import { getVisitorStats, isPending } from "../../utils/visitorWorkflow";

function Approvals() {
  const { visitors, loading, error, refresh } = useVisitors();
  const [pendingAction, setPendingAction] = useState<VisitorAction | null>(null);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pendingVisitors = useMemo(() => visitors.filter(isPending), [visitors]);
  const stats = useMemo(() => getVisitorStats(visitors), [visitors]);
  const { runAction, busyAction, error: actionError, setError: setActionError } = useVisitorActions(async () => {
    await refresh();
  });

  const openAction = (action: VisitorAction, visitor: VisitorRecord) => {
    setSelectedVisitor(visitor);
    setPendingAction(action);
    setNotice(null);
    setActionError(null);
  };

  const completeAction = async (reason: string) => {
    if (!selectedVisitor || !pendingAction) return;
    try {
      await runAction(pendingAction, selectedVisitor, reason);
      setNotice(`${selectedVisitor.name} moved out of the pending queue.`);
      setPendingAction(null);
      setSelectedVisitor(null);
    } catch {
      // Hook exposes the message for display.
    }
  };

  return (
    <VmsPage
      title="Approvals"
      description="A focused queue for pending visitor requests. Review, approve, reject, or open the full visitor profile for more context."
      actions={
        <>
          <Button type="button" variant="outline" onClick={() => void refresh()} disabled={loading}>
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          <Button asChild variant="outline">
            <Link to={VMS_PATHS.visitors}>
              <Users className="h-4 w-4" aria-hidden="true" />
              All Visitors
            </Link>
          </Button>
        </>
      }
    >
      <section className="grid gap-4 md:grid-cols-4">
        <ApprovalMetric label="Pending" value={stats.pendingRequests} status="Pending" />
        <ApprovalMetric label="Approved" value={stats.approvedRequests} status="Approved" />
        <ApprovalMetric label="Rejected" value={stats.rejectedRequests} status="Rejected" />
        <ApprovalMetric label="Total" value={stats.totalRequests} status="Completed" />
      </section>

      {error ? (
        <VmsAlert tone="error">{error}</VmsAlert>
      ) : null}

      {notice ? (
        <VmsAlert tone="success">{notice}</VmsAlert>
      ) : null}

      {actionError ? (
        <VmsAlert tone="error">{actionError}</VmsAlert>
      ) : null}

      <VmsCard>
        <VmsCardHeader
          title="Pending Queue"
          description={`${pendingVisitors.length} request${pendingVisitors.length === 1 ? "" : "s"} awaiting approval.`}
          actions={<StatusPill status="Pending" />}
        />
        <div className="p-4">
          {pendingVisitors.length === 0 && !loading ? (
            <EmptyState
              icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
              title="No pending approvals"
              description="New visitor requests will appear here automatically."
              actions={
                <Button asChild variant="outline">
                  <Link to={VMS_PATHS.newVisitor}>Create Visitor</Link>
                </Button>
              }
            />
          ) : (
            <VisitorTable
              visitors={pendingVisitors}
              loading={loading}
              actionScope="approval"
              onAction={openAction}
              embedded
              emptyMessage="No pending approvals."
            />
          )}
        </div>
      </VmsCard>

      <VisitorActionDialog
        action={pendingAction}
        visitor={selectedVisitor}
        busy={Boolean(busyAction)}
        onCancel={() => {
          setPendingAction(null);
          setSelectedVisitor(null);
        }}
        onConfirm={completeAction}
      />
    </VmsPage>
  );
}

function ApprovalMetric({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: string;
}) {
  return (
    <VmsMetricCard
      label={label}
      value={value}
      icon={<ClipboardCheck className="h-5 w-5" aria-hidden="true" />}
      footer={<StatusPill status={status} />}
    />
  );
}

export default Approvals;
