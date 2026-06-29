import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Clock3, Download, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, VmsPage } from "../../components/vms/VmsPage";
import { VisitorTable } from "../../components/vms/VisitorTable";
import { useVisitors } from "../../hooks/useVisitors";
import { VMS_PATHS } from "../../routes/paths";
import {
  downloadCsv,
  isCancelled,
  isCheckedOut,
  isRejected,
  toVisitorCsv,
} from "../../utils/visitorWorkflow";

function VisitorHistory() {
  const { visitors, loading, error, refresh } = useVisitors();
  const history = useMemo(
    () => visitors.filter((visitor) => isCheckedOut(visitor) || isRejected(visitor) || isCancelled(visitor)),
    [visitors],
  );

  return (
    <VmsPage
      title="Visitor History"
      description="Completed, rejected, and cancelled visitor records for audit review and export."
      actions={
        <>
          <Button type="button" variant="outline" onClick={() => void refresh()} disabled={loading}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          <Button type="button" variant="outline" onClick={() => downloadCsv("visitor-history.csv", toVisitorCsv(history))} disabled={history.length === 0}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export
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

      {history.length === 0 && !loading ? (
        <EmptyState
          icon={<Clock3 className="h-5 w-5" aria-hidden="true" />}
          title="No history yet"
          description="Completed, rejected, and cancelled visitor records will appear here."
          actions={
            <Button asChild variant="outline">
              <Link to={VMS_PATHS.visitors}>Open Visitors</Link>
            </Button>
          }
        />
      ) : (
        <VisitorTable
          visitors={history}
          loading={loading}
          actionScope="history"
          emptyMessage="No historical visitor records."
        />
      )}
    </VmsPage>
  );
}

export default VisitorHistory;
