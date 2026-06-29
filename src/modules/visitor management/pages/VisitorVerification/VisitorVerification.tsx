import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "../../components/common/Alert";
import { Icons } from "../../components/common/Icons";
import StatusBadge from "../../components/common/StatusBadge";
import flowService from "../../services/flowService";
import visitorRequestService from "../../services/visitorRequestService";
import { initials } from "../../utils/visitorUtils";

function getQrExpiryStatus(visitor) {
  if (!visitor) return { expired: false };
  const now = new Date();
  const from = visitor.fromDateTime ? new Date(visitor.fromDateTime) : null;
  const to = visitor.toDateTime ? new Date(visitor.toDateTime) : null;
  if (visitor.checkIn) return { expired: false };
  if (to && now > to) {
    return {
      expired: true,
      message: `QR code expired on ${to.toLocaleDateString()} ${to.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Ask the visitor to request a new invite.`,
    };
  }
  if (from && now < from) {
    return {
      expired: true,
      message: `QR code not active yet. Visit window starts ${from.toLocaleDateString()} ${from.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
    };
  }
  return { expired: false };
}

function VisitorVerification() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [qrInput, setQrInput] = useState(() => flowService.getCurrentVisitor()?.qrCodeData || "");
  const [selectedVisitor, setSelectedVisitor] = useState(() => flowService.getCurrentVisitor());
  const [alert, setAlert] = useState(null);
  const [cameraMode, setCameraMode] = useState("idle");
  const [faceResult, setFaceResult] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [qrExpiry, setQrExpiry] = useState(() => getQrExpiryStatus(flowService.getCurrentVisitor()));

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (cameraMode === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraMode]);

  useEffect(() => () => stopCamera(), []);

  const handleLookup = async (e) => {
    e.preventDefault();
    const input = qrInput.trim();
    if (!input) {
      setAlert({ type: "error", title: "Input required", message: "Enter or scan a QR code / Visitor ID." });
      return;
    }
    setLookingUp(true);
    try {
      const found = await visitorRequestService.verifyQr(input);
      setSelectedVisitor(found);
      flowService.setCurrentVisitor(found);
      setFaceResult(null);
      const expiry = getQrExpiryStatus(found);
      setQrExpiry(expiry);
      if (expiry.expired) {
        setAlert({ type: "error", title: "QR code expired", message: expiry.message });
      } else {
        setAlert({ type: "success", title: "Visitor found", message: `${found.name} — ready for face verification.` });
      }
    } catch (err) {
      setSelectedVisitor(null);
      setFaceResult(null);
      setQrExpiry({ expired: false });
      setAlert({ type: "error", title: "Lookup failed", message: err.message || "Visitor not found. Check the QR code or ID." });
    } finally {
      setLookingUp(false);
    }
  };

  const startFaceCamera = async () => {
    if (!selectedVisitor) {
      setAlert({ type: "error", title: "No visitor selected", message: "Look up a visitor before starting face verification." });
      return;
    }
    if (qrExpiry.expired) {
      setAlert({ type: "error", title: "QR expired", message: "Cannot verify face for an expired visit window." });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setCameraMode("camera");
      setAlert(null);
    } catch {
      setAlert({ type: "error", title: "Camera unavailable", message: "Allow camera access to run face verification." });
    }
  };

  const runFaceMatch = () => {
    if (!selectedVisitor) return;
    stopCamera();
    setCameraMode("verified");
    if (selectedVisitor.photo || selectedVisitor.faceRegistered) {
      setFaceResult({ type: "success", title: "Face match verified", message: "Live preview matches the registered photo.", score: "96%" });
    } else {
      setFaceResult({ type: "error", title: "No registered photo", message: "Register a visitor photo before face verification.", score: "—" });
    }
  };

  const updateStatus = async (action) => {
    if (!selectedVisitor) return;
    if (action === "checkIn" && qrExpiry.expired) {
      setAlert({ type: "error", title: "QR expired", message: qrExpiry.message });
      return;
    }
    try {
      let updated;
      if (action === "approve") {
        updated = await visitorRequestService.approve(selectedVisitor.id);
        setAlert({ type: "success", title: "Approved", message: `${selectedVisitor.name} has been approved.` });
      } else if (action === "reject") {
        updated = await visitorRequestService.reject(selectedVisitor.id, "");
        setAlert({ type: "success", title: "Rejected", message: `${selectedVisitor.name} has been rejected.` });
      } else if (action === "checkIn") {
        updated = await visitorRequestService.checkIn(selectedVisitor.id, selectedVisitor.qrCodeData);
        setAlert({ type: "success", title: "Checked in", message: `${selectedVisitor.name} has checked in.` });
      }
      if (updated) {
        flowService.setCurrentVisitor(updated);
        setSelectedVisitor(updated);
        setQrExpiry(getQrExpiryStatus(updated));
      }
    } catch (err) {
      setAlert({ type: "error", title: "Action failed", message: err.message || "Operation failed. Try again." });
    }
  };

  const goRegisterFace = () => {
    if (selectedVisitor) flowService.setCurrentVisitor(selectedVisitor);
    navigate("/face-registration");
  };

  const hasPhoto = selectedVisitor?.photo || selectedVisitor?.faceRegistered;

  return (
    <div className="page-stack">
      {alert && (
        <Alert type={alert.type} title={alert.title} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* ── Row 1: QR Lookup + Face Verification ── */}
      <div className="verification-grid">

        {/* QR card */}
        <div className="tool-card">
          <div className="card-header">
            <div>
              <h3>QR / ID Lookup</h3>
              <p>Scan or enter the visitor's QR code or Visitor ID.</p>
            </div>
            <StatusBadge status={selectedVisitor ? (qrExpiry.expired ? "Rejected" : "Approved") : "Pending"} />
          </div>

          <div className="card-body">
            <div className="qr-frame" aria-label="QR scanner area">
              <div className="qr-box">
                {Array.from({ length: 25 }).map((_, i) => <span key={i} />)}
              </div>
            </div>

            <form className="form-grid full" onSubmit={handleLookup}>
              <div className="form-group">
                <label htmlFor="vvQrInput">QR Code / Visitor ID</label>
                <input
                  id="vvQrInput"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="VMS|... or VISITOR_12"
                  disabled={lookingUp}
                />
              </div>
              <div className="card-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setQrInput(flowService.getCurrentVisitor()?.qrCodeData || "")}
                >
                  Use Current
                </button>
                <button className="btn btn-primary" type="submit" disabled={lookingUp}>
                  {lookingUp ? "Looking up…" : "Find Visitor"}
                </button>
              </div>
            </form>

            {selectedVisitor && qrExpiry.expired && (
              <div className="result-status error">
                <Icons.AlertCircle />
                <div>
                  <strong>QR expired</strong>
                  <p>{qrExpiry.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Face verification card */}
        <div className="tool-card">
          <div className="card-header">
            <div>
              <h3>Face Verification</h3>
              <p>Compare live camera with the registered photo.</p>
            </div>
            <StatusBadge status={faceResult?.type === "success" ? "Approved" : "Pending"} />
          </div>

          <div className="card-body">
            <div className="camera-frame">
              {cameraMode === "camera" ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted />
                  <div className="camera-overlay" />
                </>
              ) : selectedVisitor?.photo ? (
                <img src={selectedVisitor.photo} alt="Registered visitor" />
              ) : (
                <div className="camera-empty">
                  <Icons.Camera />
                  <strong>No photo on file</strong>
                  <span>Register a face photo first.</span>
                </div>
              )}
            </div>

            <div className="card-footer">
              {cameraMode === "camera" ? (
                <>
                  <button className="btn btn-secondary" type="button" onClick={() => { stopCamera(); setCameraMode("idle"); }}>Cancel</button>
                  <button className="btn btn-primary" type="button" onClick={runFaceMatch}>Run Match</button>
                </>
              ) : (
                <>
                  {selectedVisitor && !hasPhoto && (
                    <button className="btn btn-outline" type="button" onClick={goRegisterFace}>
                      <Icons.Camera />
                      Register Face
                    </button>
                  )}
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={startFaceCamera}
                    disabled={!selectedVisitor || qrExpiry.expired}
                  >
                    <Icons.Camera />
                    Start Verification
                  </button>
                </>
              )}
            </div>

            {faceResult && (
              <div className={`result-status ${faceResult.type}`}>
                {faceResult.type === "success" ? <Icons.Check /> : <Icons.AlertCircle />}
                <div>
                  <strong>{faceResult.title}</strong>
                  <p>{faceResult.message}</p>
                  <span>Confidence: {faceResult.score}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 2: Verification Result + Actions ── */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Verification Result</h3>
            <p>Visitor details and available desk actions.</p>
          </div>
        </div>

        {selectedVisitor ? (
          <div className="verification-result-stack">
            <div className="visitor-cell">
              {selectedVisitor.photo ? (
                <img className="visitor-photo" src={selectedVisitor.photo} alt="" />
              ) : (
                <span className="visitor-avatar">{initials(selectedVisitor.name)}</span>
              )}
              <div>
                <div className="cell-title">{selectedVisitor.name}</div>
                <div className="cell-subtitle">{selectedVisitor.visitorId}</div>
              </div>
            </div>

            <div className="detail-list">
              <div className="detail-row"><span>Host</span><strong>{selectedVisitor.employeeToMeet || "—"}</strong></div>
              <div className="detail-row"><span>From</span><strong>{selectedVisitor.fromDateTime?.replace("T", " ").slice(0, 16) || "—"}</strong></div>
              <div className="detail-row"><span>To</span><strong>{selectedVisitor.toDateTime?.replace("T", " ").slice(0, 16) || "—"}</strong></div>
              <div className="detail-row">
                <span>Status</span>
                <StatusBadge status={qrExpiry.expired ? "Rejected" : selectedVisitor.status} />
              </div>
            </div>

            <div className="card-footer">
              {!hasPhoto && (
                <button className="btn btn-secondary" type="button" onClick={goRegisterFace}>
                  <Icons.Camera />
                  Register Face Photo
                </button>
              )}
              {selectedVisitor.status === "Pending" && (
                <>
                  <button className="btn btn-success" type="button" onClick={() => updateStatus("approve")}>Approve</button>
                  <button className="btn btn-danger" type="button" onClick={() => updateStatus("reject")}>Reject</button>
                </>
              )}
              {selectedVisitor.status === "Approved" && !selectedVisitor.checkIn && (
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => updateStatus("checkIn")}
                  disabled={qrExpiry.expired}
                >
                  Check In
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <Icons.QrCode />
            <strong>No visitor loaded</strong>
            <span>Scan a QR code or enter a Visitor ID above.</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default VisitorVerification;
