import { useEffect, useState } from "react";
import Alert from "../../components/common/Alert";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { Icons } from "../../components/common/Icons";
import StatusBadge from "../../components/common/StatusBadge";
import Table from "../../components/common/Table";
import visitorRequestService from "../../services/visitorRequestService";
import { initials } from "../../utils/visitorUtils";

function VisitorRequests() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const refresh = async () => {
    try {
      const data = await visitorRequestService.getAll();
      console.log("[API] GET /api/visitor-requests:", data);
      setVisitors(data);
    } catch (err) {
      console.error("[API] getAll error:", err);
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

  const runAction = async (type, visitor) => {
    if (type === "delete" || type === "reject") {
      setRejectionReason("");
      setConfirmAction({ type, visitor });
      return;
    }

    try {
      if (type === "approve") {
        await visitorRequestService.approve(visitor.id);
        setAlert({ type: "success", title: "Approved", message: `${visitor.name} has been approved.` });
      } else if (type === "checkIn") {
        await visitorRequestService.checkIn(visitor.id, visitor.qrCodeData);
        setAlert({ type: "success", title: "Checked in", message: `${visitor.name} has checked in.` });
      } else if (type === "checkOut") {
        await visitorRequestService.checkOut(visitor.id, visitor.qrCodeData);
        setAlert({ type: "success", title: "Checked out", message: `${visitor.name} has checked out.` });
      }
      await refresh();
    } catch (err) {
      console.error(`[API] ${type} error:`, err);
      setAlert({ type: "error", title: "Action failed", message: err.message || "Operation failed. Try again." });
    }
  };

  const confirmComplete = async () => {
    if (!confirmAction) return;
    const { type, visitor } = confirmAction;

    try {
      if (type === "delete") {
        await visitorRequestService.delete(visitor.id);
        setAlert({ type: "success", title: "Deleted", message: `${visitor.name} was removed.` });
      } else if (type === "reject") {
        await visitorRequestService.reject(visitor.id, rejectionReason);
        setAlert({ type: "success", title: "Rejected", message: `${visitor.name} has been rejected.` });
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

  const exportCsv = () => {
    const rows = [
      ["Visitor ID", "Name", "Email", "Mobile", "Company", "Purpose", "Host", "From", "To", "Status", "Check In", "Check Out"],
      ...visitors.map((v) => [
        v.visitorId, v.name, v.email, v.mobile, v.company, v.purpose,
        v.employeeToMeet, v.fromDateTime, v.toDateTime, v.status,
        v.checkIn || "", v.checkOut || "",
      ]),
    ];
    const blob = new Blob(
      [rows.map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8;" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "visitor-requests.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      header: "Visitor",
      accessor: "name",
      render: (visitor) => (
        <div className="visitor-cell">
          {visitor.photo ? (
            <img className="visitor-photo" src={visitor.photo} alt="" />
          ) : (
            <span className="visitor-avatar">{initials(visitor.name)}</span>
          )}
          <div>
            <div className="cell-title">{visitor.name}</div>
            <div className="cell-subtitle">{visitor.mobile || "No mobile"}</div>
          </div>
        </div>
      ),
    },
    { header: "Visitor ID", accessor: "visitorId", render: (_, value) => <span className="mono">{value || "-"}</span> },
    { header: "Company", accessor: "company", render: (_, value) => value || "-" },
    { header: "Host", accessor: "employeeToMeet", render: (_, value) => value || "-" },
    { header: "From", accessor: "fromDateTime", render: (_, value) => value ? value.replace("T", " ").slice(0, 16) : "-" },
    { header: "Status", accessor: "status", render: (visitor) => <StatusBadge status={visitor.status} /> },
    {
      id: "actions",
      header: "Actions",
      accessor: "id",
      sortable: false,
      searchable: false,
      render: (visitor) => (
        <div className="row-actions">
          {visitor.status === "Pending" && (
            <>
              <button className="btn btn-success btn-sm" type="button" onClick={() => runAction("approve", visitor)}>Approve</button>
              <button className="btn btn-danger btn-sm" type="button" onClick={() => runAction("reject", visitor)}>Reject</button>
            </>
          )}
          {visitor.status === "Approved" && !visitor.checkIn && (
            <button className="btn btn-primary btn-sm" type="button" onClick={() => runAction("checkIn", visitor)}>Check In</button>
          )}
          {visitor.checkIn && !visitor.checkOut && (
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => runAction("checkOut", visitor)}>Check Out</button>
          )}
          <button className="icon-button" type="button" onClick={() => runAction("delete", visitor)} aria-label={`Delete ${visitor.name}`}>
            <Icons.Trash />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-stack">
      {/* <div className="page-header"> */}
        {/* <div className="page-title">
          <h1>Visitor Requests</h1>
          <p className="page-description">Search, sort, approve, check in, and export visitor request records.</p>
        </div> */}
      {/* </div> */}

      {alert && (
        <Alert type={alert.type} title={alert.title} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {loading ? (
        <div className="card empty-state">
          <Icons.Activity />
          <strong>Loading visitor requests...</strong>
        </div>
      ) : (
        <Table
          columns={columns}
          data={visitors}
          searchable
          searchPlaceholder="Search name, ID, host, company"
          emptyMessage="No visitor requests found."
          toolbar={
            <button className="btn btn-outline" type="button" onClick={exportCsv} disabled={visitors.length === 0}>
              <Icons.Download />
              Export CSV
            </button>
          }
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.type === "delete" ? "Delete visitor request" : "Reject visitor"}
        message={
          confirmAction?.type === "reject"
            ? `Reject ${confirmAction?.visitor.name || "this visitor"}? Enter a reason below.`
            : `Delete ${confirmAction?.visitor.name || "this visitor"} from the request log? This cannot be undone.`
        }
        confirmLabel={confirmAction?.type === "delete" ? "Delete" : "Reject"}
        tone="danger"
        onCancel={() => { setConfirmAction(null); setRejectionReason(""); }}
        onConfirm={confirmComplete}
      >
        {confirmAction?.type === "reject" && (
          <textarea
            className="form-control"
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

export default VisitorRequests;
