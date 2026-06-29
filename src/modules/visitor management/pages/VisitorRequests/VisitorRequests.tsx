import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCcw, Users, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VisitorActionDialog } from "../../components/vms/VisitorActionDialog";
import { VisitorTable } from "../../components/vms/VisitorTable";
import { EmptyState, VmsPage } from "../../components/vms/VmsPage";
import { useVisitorActions, useVisitors } from "../../hooks/useVisitors";
import { VMS_PATHS } from "../../routes/paths";
import type { VisitorAction, VisitorRecord } from "../../types";
import { downloadCsv, toVisitorCsv } from "../../utils/visitorWorkflow";

function VisitorRequests() {
  const { visitors, loading, error, refresh } = useVisitors();
  const [pendingAction, setPendingAction] = useState<VisitorAction | null>(null);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
      setNotice(`${selectedVisitor.name} updated successfully.`);
      setPendingAction(null);
      setSelectedVisitor(null);
    } catch {
      // Hook exposes the message for display.
    }
  };

  const exportVisitors = () => {
    downloadCsv("visitor-requests.csv", toVisitorCsv(visitors));
  };

  return (
    <VmsPage
      title="Visitors"
      description="Search and manage all visitor records from a single operational table. Every row links to details, badge preview, and the next valid workflow action."
      actions={
        <>
          <Button type="button" variant="outline" onClick={() => void refresh()} disabled={loading}>
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Refresh
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
        <EmptyState
          icon={<XCircle className="h-5 w-5" aria-hidden="true" />}
          title="Could not load visitors"
          description={error}
        />
      ) : null}

      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </div>
      ) : null}

      <VisitorTable
        visitors={visitors}
        loading={loading}
        actionScope="full"
        onAction={openAction}
        onExport={exportVisitors}
        emptyMessage="No visitors are registered yet."
      />

      {!loading && visitors.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
          title="Start with a visitor request"
          description="Create the first visitor request to unlock approvals, badge preview, and desk processing."
          actions={
            <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
              <Link to={VMS_PATHS.newVisitor}>Create Visitor</Link>
            </Button>
          }
        />
      ) : null}

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

export default VisitorRequests;
