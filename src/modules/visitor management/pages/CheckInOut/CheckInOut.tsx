import { useState } from "react";
import Alert from "../../components/common/Alert";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { Icons } from "../../components/common/Icons";
import StatusBadge from "../../components/common/StatusBadge";
import flowService from "../../services/flowService";
import visitorRequestService from "../../services/visitorRequestService";
import { initials } from "../../utils/visitorUtils";

function CheckInOut() {
  const [qrInput, setQrInput] = useState(() => flowService.getCurrentVisitor()?.qrCodeData || "");
  const [visitor, setVisitor] = useState(() => flowService.getCurrentVisitor());
  const [alert, setAlert] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [loading, setLoading] = useState(false);

  const lookup = async (e) => {
    e.preventDefault();
    const input = qrInput.trim();
    if (!input) {
      setAlert({ type: "error", title: "Input required", message: "Scan or enter a QR code / Visitor ID." });
      return;
    }
    setLoading(true);
    try {
      const found = await visitorRequestService.verifyQr(input);
      setVisitor(found);
      flowService.setCurrentVisitor(found);
      setAlert({ type: "success", title: "Visitor loaded", message: `${found.name} is ready for desk processing.` });
    } catch (err) {
      setVisitor(null);
      setAlert({ type: "error", title: "Visitor not found", message: err.message || "Check the QR code and try again." });
    } finally {
      setLoading(false);
    }
  };

  const completeAction = async () => {
    if (!confirmAction || !visitor) return;
    try {
      let updated;
      if (confirmAction === "checkIn") {
        updated = await visitorRequestService.checkIn(visitor.id, visitor.qrCodeData);
        setAlert({ type: "success", title: "Checked in", message: `${visitor.name} checked in successfully.` });
        flowService.setCurrentVisitor(updated);
        setVisitor(updated);
      } else if (confirmAction === "checkOut") {
        updated = await visitorRequestService.checkOut(visitor.id, visitor.qrCodeData);
        setAlert({ type: "success", title: "Checked out", message: `${visitor.name} checked out successfully.` });
        flowService.setCurrentVisitor(updated);
        setVisitor(updated);
      } else if (confirmAction === "reject") {
        updated = await visitorRequestService.reject(visitor.id, "Rejected at desk");
        setAlert({ type: "success", title: "Rejected", message: `${visitor.name}'s request has been rejected.` });
        flowService.setCurrentVisitor(updated);
        setVisitor(updated);
      } else if (confirmAction === "delete") {
        await visitorRequestService.delete(visitor.id);
        setAlert({ type: "success", title: "Deleted", message: `${visitor.name} was removed.` });
        flowService.clearCurrentVisitor();
        setVisitor(null);
        setQrInput("");
      }
    } catch (err) {
      setAlert({ type: "error", title: "Action failed", message: err.message || "Operation failed. Try again." });
    } finally {
      setConfirmAction(null);
    }
  };

  const fmt = (dt) => (dt ? dt.replace("T", " ").slice(0, 16) : "-");

  const detailRows = visitor
    ? [
        { label: "Host", icon: <Icons.UserPlus />, value: visitor.employeeToMeet || "-" },
        { label: "Check In", icon: <Icons.Calendar />, value: fmt(visitor.checkIn) },
        { label: "Check Out", icon: <Icons.Calendar />, value: fmt(visitor.checkOut) },
        { label: "Status", icon: <Icons.Shield />, value: <StatusBadge status={visitor.status} /> },
      ]
    : [];

  return (
    <div className="cio-page">
      {alert && (
        <Alert type={alert.type} title={alert.title} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* ── Card 1: QR Scan ── */}
      <div className="card cio-scan-card">
        <div className="cio-scan-header">
          <div className="cio-scan-title">
            <span className="cio-scan-icon"><Icons.QrCode /></span>
            <div>
              <h3>QR Scan / Visitor Lookup</h3>
              <p>Scan the badge QR code or enter the Visitor ID</p>
            </div>
          </div>
          {visitor && <StatusBadge status={visitor.status} />}
        </div>

        <div className="cio-scan-body">
          <div className="cio-qr-frame">
            <span className="cio-corner cio-tl" />
            <span className="cio-corner cio-tr" />
            <span className="cio-corner cio-bl" />
            <span className="cio-corner cio-br" />
            <div className="qr-box">
              {Array.from({ length: 25 }).map((_, i) => <span key={i} />)}
            </div>
          </div>

          <form className="cio-lookup-form" onSubmit={lookup}>
            <div className="form-group">
              <label htmlFor="deskQrInput">Visitor ID / QR Code</label>
              <input
                id="deskQrInput"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="VMS... or VISITOR_12"
                disabled={loading}
              />
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
              <Icons.Search />
              {loading ? "Loading..." : "Load Visitor"}
            </button>
          </form>
        </div>
      </div>

      {/* ── Card 2: Visitor Details ── */}
      {visitor && (
        <div className="card cio-details-card">
          <div className="cio-details-header">
            <span className="cio-details-icon"><Icons.UserPlus /></span>
            <h3>Visitor Details</h3>
          </div>

          <div className="cio-details-body">
            {/* Left: photo + profile */}
            <div className="cio-profile">
              {visitor.photo ? (
                <img className="cio-photo" src={visitor.photo} alt={visitor.name} />
              ) : (
                <span className="cio-photo cio-photo-fallback">
                  {initials(visitor.name)}
                </span>
              )}
              <div className="cio-profile-info">
                <h2 className="cio-visitor-name">{visitor.name}</h2>
                <p className="cio-visitor-id">{visitor.visitorId}</p>
                <div className="cio-meta-item">
                  <span className="cio-meta-icon cio-meta-blue"><Icons.Building /></span>
                  <div>
                    <small>Company</small>
                    <strong>{visitor.company || "Individual"}</strong>
                  </div>
                </div>
                <div className="cio-meta-item">
                  <span className="cio-meta-icon cio-meta-purple"><Icons.Briefcase /></span>
                  <div>
                    <small>Purpose</small>
                    <strong>{visitor.purpose || "-"}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: detail rows */}
            <div className="cio-detail-panel">
              {detailRows.map(({ label, icon, value }) => (
                <div className="cio-detail-row" key={label}>
                  <span className="cio-detail-label">
                    <span className="cio-detail-row-icon">{icon}</span>
                    {label}
                  </span>
                  <span className="cio-detail-value">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Action buttons ── */}
      {visitor && (
        <div className="cio-actions">
          <button
            className="btn cio-btn-checkin"
            type="button"
            onClick={() => setConfirmAction("checkIn")}
            disabled={visitor.status !== "Approved" || Boolean(visitor.checkIn)}
          >
            <Icons.LogIn />
            Check In
          </button>
          <button
            className="btn cio-btn-checkout"
            type="button"
            onClick={() => setConfirmAction("checkOut")}
            disabled={!visitor.checkIn || Boolean(visitor.checkOut)}
          >
            <Icons.LogOut />
            Check Out
          </button>
          <button
            className="btn cio-btn-reject"
            type="button"
            onClick={() => setConfirmAction("reject")}
            disabled={visitor.status === "Rejected" || visitor.status === "Checked Out"}
          >
            <Icons.X />
            Reject
          </button>
          <button
            className="btn btn-danger"
            type="button"
            onClick={() => setConfirmAction("delete")}
          >
            <Icons.Trash />
            Delete
          </button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction === "checkIn" ? "Confirm check-in" :
          confirmAction === "checkOut" ? "Confirm check-out" :
          confirmAction === "delete" ? "Delete visitor request" :
          "Confirm rejection"
        }
        message={
          confirmAction === "delete"
            ? `Delete ${visitor?.name || "this visitor"} from the request log? This cannot be undone.`
            : `${
                confirmAction === "checkIn" ? "Check in" :
                confirmAction === "checkOut" ? "Check out" :
                "Reject"
              } ${visitor?.name || "this visitor"} now?`
        }
        confirmLabel={
          confirmAction === "checkIn" ? "Check In" :
          confirmAction === "checkOut" ? "Check Out" :
          confirmAction === "delete" ? "Delete" :
          "Reject"
        }
        tone={
          confirmAction === "checkIn" ? "success" :
          confirmAction === "checkOut" ? "primary" :
          "danger"
        }
        onCancel={() => setConfirmAction(null)}
        onConfirm={completeAction}
      />
    </div>
  );
}

export default CheckInOut;
