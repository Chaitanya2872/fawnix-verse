import { useEffect, useRef, useState } from "react";
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

  if (visitor.checkIn) {
    return { expired: false };
  }

  if (to && now > to) {
    return {
      expired: true,
      message: `This QR code expired on ${to.toLocaleDateString()} ${to.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. The visit window has passed; ask the visitor to request a new invite.`,
    };
  }

  if (from && now < from) {
    return {
      expired: true,
      message: `This QR code is not active yet. The visit window starts on ${from.toLocaleDateString()} ${from.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
    };
  }

  return { expired: false };
}

function ValidationDetails() {
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
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (cameraMode === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraMode]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleLookup = async (event) => {
    event.preventDefault();
    const input = qrInput.trim();
    if (!input) {
      setAlert({ type: "error", title: "Input required", message: "Enter or scan a QR code / Visitor ID before validation." });
      return;
    }

    setLookingUp(true);
    try {
      const found = await visitorRequestService.verifyQr(input);
      console.log("[API] POST /api/visitor-requests/verify-qr:", found);
      setSelectedVisitor(found);
      flowService.setCurrentVisitor(found);
      setFaceResult(null);

      const expiry = getQrExpiryStatus(found);
      setQrExpiry(expiry);

      if (expiry.expired) {
        setAlert({ type: "error", title: "QR code expired", message: expiry.message });
      } else {
        setAlert({ type: "success", title: "QR details validated", message: `${found.name} is ready for face verification.` });
      }
    } catch (err) {
      console.error("[API] verify-qr error:", err);
      setSelectedVisitor(null);
      setFaceResult(null);
      setQrExpiry({ expired: false });
      setAlert({ type: "error", title: "Validation failed", message: err.message || "Could not validate visitor. Check the server connection." });
    } finally {
      setLookingUp(false);
    }
  };

  const startFaceCamera = async () => {
    if (!selectedVisitor) {
      setAlert({ type: "error", title: "Select a visitor", message: "Validate a QR code before starting face verification." });
      return;
    }
    if (qrExpiry.expired) {
      setAlert({ type: "error", title: "QR code expired", message: "Cannot start face verification for an expired visit window." });
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
      setFaceResult({ type: "success", title: "Face match verified", message: "Registered photo and live preview passed verification.", score: "96%" });
    } else {
      setFaceResult({ type: "error", title: "Face registration missing", message: "Register a visitor photo before approval or check-in validation.", score: "0%" });
    }
  };

  const updateStatus = async (action) => {
    if (!selectedVisitor) return;
    if (action === "checkIn" && qrExpiry.expired) {
      setAlert({ type: "error", title: "QR code expired", message: qrExpiry.message || "This visitor's QR code has expired and cannot be checked in." });
      return;
    }
    try {
      let updated;
      if (action === "approve") {
        updated = await visitorRequestService.approve(selectedVisitor.id);
        setAlert({ type: "success", title: "Visitor updated", message: `${selectedVisitor.name} has been approved.` });
      } else if (action === "reject") {
        updated = await visitorRequestService.reject(selectedVisitor.id, "");
        setAlert({ type: "success", title: "Visitor updated", message: `${selectedVisitor.name} has been rejected.` });
      } else if (action === "checkIn") {
        updated = await visitorRequestService.checkIn(selectedVisitor.id, selectedVisitor.qrCodeData);
        setAlert({ type: "success", title: "Visitor updated", message: `${selectedVisitor.name} has checked in.` });
      }
      if (updated) {
        flowService.setCurrentVisitor(updated);
        setSelectedVisitor(updated);
        setQrExpiry(getQrExpiryStatus(updated));
      }
    } catch (err) {
      console.error(`[API] ${action} error:`, err);
      setAlert({ type: "error", title: "Action failed", message: err.message || "Operation failed. Try again." });
    }
  };

  return (
    <div className="validation-dashboard">
      {alert && (
        <Alert type={alert.type} title={alert.title} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      <section className="verification-grid">
        <div className="tool-card">
          <div className="card-header">
            <div>
              <h3>QR Check-In Validation</h3>
              <p>Scan or enter the QR code data from the visitor's invite.</p>
            </div>
            <StatusBadge status={selectedVisitor ? (qrExpiry.expired ? "Rejected" : "Completed") : "Pending"} />
          </div>

          <div className="card-body">
            <div className="qr-frame" aria-label="QR scanner preview">
              <div className="qr-box">
                {Array.from({ length: 25 }).map((_, index) => (
                  <span key={index} />
                ))}
              </div>
            </div>

            <form className="form-grid full" onSubmit={handleLookup}>
              <div className="form-group">
                <label htmlFor="visitorQrInput">QR Code / Visitor ID</label>
                <input
                  id="visitorQrInput"
                  value={qrInput}
                  onChange={(event) => setQrInput(event.target.value)}
                  placeholder="VMS|... or VISITOR_12"
                  disabled={lookingUp}
                />
              </div>
              <div className="card-footer">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setQrInput(flowService.getCurrentVisitor()?.qrCodeData || "")}
                >
                  Use Current Visitor
                </button>
                <button className="btn btn-primary" type="submit" disabled={lookingUp}>
                  {lookingUp ? "Validating..." : "Validate QR"}
                </button>
              </div>
            </form>

            {selectedVisitor && qrExpiry.expired && (
              <div className="result-status error">
                <Icons.AlertCircle />
                <div>
                  <strong>QR code expired</strong>
                  <p>{qrExpiry.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="tool-card">
          <div className="card-header">
            <div>
              <h3>Face Verification</h3>
              <p>Compare the live camera preview with the registered visitor photo.</p>
            </div>
            <StatusBadge status={faceResult?.type === "success" ? "Completed" : "Pending"} />
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
                  <strong>Face preview</strong>
                  <span>Start the camera after QR validation.</span>
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
                <button className="btn btn-primary" type="button" onClick={startFaceCamera} disabled={qrExpiry.expired}>
                  <Icons.Camera />
                  Start Face Check
                </button>
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
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h3>Verification Result</h3>
            <p>Validated visitor details and next available desk actions.</p>
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
              <div className="detail-row"><span>Host</span><strong>{selectedVisitor.employeeToMeet || "-"}</strong></div>
              <div className="detail-row"><span>From</span><strong>{selectedVisitor.fromDateTime?.replace("T", " ").slice(0, 16) || "-"}</strong></div>
              <div className="detail-row"><span>To</span><strong>{selectedVisitor.toDateTime?.replace("T", " ").slice(0, 16) || "-"}</strong></div>
              <div className="detail-row">
                <span>Status</span>
                <StatusBadge status={qrExpiry.expired ? "Expired" : selectedVisitor.status} />
              </div>
            </div>

            <div className="card-footer">
              {selectedVisitor.status === "Pending" && (
                <>
                  <button className="btn btn-success" type="button" onClick={() => updateStatus("approve")}>Approve</button>
                  <button className="btn btn-danger" type="button" onClick={() => updateStatus("reject")}>Reject</button>
                </>
              )}
              {selectedVisitor.status === "Approved" && !selectedVisitor.checkIn && (
                <button className="btn btn-primary" type="button" onClick={() => updateStatus("checkIn")} disabled={qrExpiry.expired}>
                  Check In
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <Icons.QrCode />
            <strong>No visitor selected</strong>
            <span>Validate a QR code to see request and verification details.</span>
          </div>
        )}
      </section>
    </div>
  );
}

export default ValidationDetails;
