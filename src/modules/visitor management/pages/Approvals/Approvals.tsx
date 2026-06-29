import { useEffect, useState } from "react";
import Alert from "../../components/common/Alert";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { Icons } from "../../components/common/Icons";
import StatusBadge from "../../components/common/StatusBadge";
import visitorRequestService from "../../services/visitorRequestService";
import { initials } from "../../utils/visitorUtils";

function Approvals() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const refresh = async () => {
    try {
      const data = await visitorRequestService.getAll();
      console.log("[API] GET /api/visitor-requests (approvals):", data);
      setVisitors(data);
    } catch (err) {
      console.error("[API] Approvals load error:", err);
      setAlert({ type: "error", title: "Load failed", message: err.message || "Could not load visitor requests." });
    }
  };

  useEffect(() => {
    const load = async () => {
      await refresh();
      setLoading(false);
    };

    void load();
  }, []);

  const pendingVisitors = visitors.filter((v) => v.status === "Pending");

  const completeAction = async () => {
    if (!confirmAction) return;
    const { type, visitor } = confirmAction;

    try {
      if (type === "approve") {
        await visitorRequestService.approve(visitor.id);
        setAlert({ type: "success", title: "Approved", message: `${visitor.name} has been approved.` });
      } else if (type === "reject") {
        await visitorRequestService.reject(visitor.id, rejectionReason);
        setAlert({ type: "success", title: "Rejected", message: `${visitor.name} has been rejected.` });
      } else if (type === "delete") {
        await visitorRequestService.delete(visitor.id);
        setAlert({ type: "success", title: "Deleted", message: `${visitor.name} was removed.` });
      }
      await refresh();
    } catch (err) {
      console.error(`[API] ${type} error:`, err);
      setAlert({ type: "error", title: "Action failed", message: err.message || "Operation failed. Try again." });
    } finally {
      setConfirmAction(null);
      setRejectionReason("");
    }
  };

  return (
    <div className="page-stack">
      {/* <div className="page-header"> */}
        {/* <div className="page-title">
          <h1>Approvals</h1>
          <p className="page-description">Review pending visitor requests before allowing arrival at reception.</p>
        </div> */}
      {/* </div> */}

      {alert && (
        <Alert type={alert.type} title={alert.title} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      <section className="two-column-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Pending Queue</h3>
              <p>{pendingVisitors.length} request{pendingVisitors.length === 1 ? "" : "s"} awaiting approval</p>
            </div>
            <StatusBadge status="Pending" />
          </div>

          {loading ? (
            <div className="empty-state">
              <Icons.Activity />
              <strong>Loading approvals...</strong>
            </div>
          ) : pendingVisitors.length === 0 ? (
            <div className="empty-state">
              <Icons.Check />
              <strong>No pending approvals</strong>
              <span>New visitor requests will appear here.</span>
            </div>
          ) : (
            <div className="approval-list">
              {pendingVisitors.map((visitor) => (
                <article className="approval-item" key={visitor.id}>
                  <div className="visitor-cell">
                    {visitor.photo ? (
                      <img className="visitor-photo" src={visitor.photo} alt="" />
                    ) : (
                      <span className="visitor-avatar">{initials(visitor.name)}</span>
                    )}
                    <div>
                      <div className="cell-title">{visitor.name}</div>
                      <div className="cell-subtitle">{visitor.visitorId}</div>
                    </div>
                  </div>
                  <div className="row-actions">
                    <button className="btn btn-success btn-sm" type="button" onClick={() => setConfirmAction({ type: "approve", visitor })}>
                      Approve
                    </button>
                    <button className="btn btn-danger btn-sm" type="button" onClick={() => { setRejectionReason(""); setConfirmAction({ type: "reject", visitor }); }}>
                      Reject
                    </button>
                    <button className="icon-button" type="button" onClick={() => setConfirmAction({ type: "delete", visitor })} aria-label={`Delete ${visitor.name}`}>
                      <Icons.Trash />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="card">
          <div className="card-header">
            <div>
              <h3>Review Context</h3>
              <p>Use host, purpose, and visit details when approving access.</p>
            </div>
          </div>
          <div className="detail-list">
            <div className="detail-row">
              <span>Total requests</span>
              <strong>{visitors.length}</strong>
            </div>
            <div className="detail-row">
              <span>Pending approvals</span>
              <strong>{pendingVisitors.length}</strong>
            </div>
            <div className="detail-row">
              <span>Approved</span>
              <strong>{visitors.filter((v) => v.status === "Approved" || v.status === "Checked In").length}</strong>
            </div>
            <div className="detail-row">
              <span>Rejected</span>
              <strong>{visitors.filter((v) => v.status === "Rejected").length}</strong>
            </div>
          </div>
        </aside>
      </section>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === "approve" ? "Approve visitor" :
          confirmAction?.type === "delete" ? "Delete visitor request" :
          "Reject visitor"
        }
        message={
          confirmAction?.type === "delete"
            ? `Delete ${confirmAction?.visitor.name || "this visitor"} from the request log? This cannot be undone.`
            : `${confirmAction?.type === "approve" ? "Approve" : "Reject"} ${confirmAction?.visitor.name || "this visitor"} for the scheduled visit?`
        }
        confirmLabel={
          confirmAction?.type === "approve" ? "Approve" :
          confirmAction?.type === "delete" ? "Delete" :
          "Reject"
        }
        tone={confirmAction?.type === "approve" ? "success" : "danger"}
        onCancel={() => { setConfirmAction(null); setRejectionReason(""); }}
        onConfirm={completeAction}
      >
        {confirmAction?.type === "reject" && (
          <textarea
            placeholder="Rejection reason (optional)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            style={{ width: "100%", marginTop: 8, minHeight: 72 }}
          />
        )}
      </ConfirmDialog>
    </div>
  );
}

export default Approvals;
