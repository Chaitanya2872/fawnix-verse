// import { useEffect, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import Alert from "../../components/common/Alert";
// import { Icons } from "../../components/common/Icons";
// import StatusBadge from "../../components/common/StatusBadge";
// import flowService from "../../services/flowService";
// import faceCaptureService from "../../services/faceCaptureService";

// function CameraCapture() {
//   const navigate = useNavigate();
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const fileRef = useRef(null);
//   const streamRef = useRef(null);

//   const [mode, setMode] = useState("idle");
//   const [preview, setPreview] = useState(null);
//   const [alert, setAlert] = useState(null);
//   const [starting, setStarting] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [currentVisitor, setCurrentVisitor] = useState(() => flowService.getCurrentVisitor());

//   const stopCamera = () => {
//     streamRef.current?.getTracks().forEach((track) => track.stop());
//     streamRef.current = null;
//   };

//   useEffect(() => {
//     if (mode === "camera" && videoRef.current && streamRef.current) {
//       videoRef.current.srcObject = streamRef.current;
//     }
//   }, [mode]);

//   useEffect(() => {
//     return () => stopCamera();
//   }, []);

//   const startCamera = async () => {
//     setAlert(null);
//     setStarting(true);
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: "user" },
//         audio: false,
//       });
//       streamRef.current = stream;
//       setMode("camera");
//     } catch {
//       setAlert({ type: "error", title: "Camera unavailable", message: "Allow camera access or upload a visitor photo file." });
//     } finally {
//       setStarting(false);
//     }
//   };

//   const capturePhoto = () => {
//     const video = videoRef.current;
//     const canvas = canvasRef.current;
//     if (!video || !canvas) return;
//     canvas.width = video.videoWidth || 960;
//     canvas.height = video.videoHeight || 720;
//     canvas.getContext("2d").drawImage(video, 0, 0);
//     setPreview(canvas.toDataURL("image/jpeg", 0.86));
//     stopCamera();
//     setMode("captured");
//     setAlert({ type: "success", title: "Photo captured", message: "Review the photo and save it to the visitor record." });
//   };

//   const handleFileUpload = (event) => {
//     const file = event.target.files?.[0];
//     if (!file) return;
//     if (file.size > 5 * 1024 * 1024) {
//       setAlert({ type: "error", title: "File too large", message: "Upload a photo smaller than 5 MB." });
//       return;
//     }
//     const reader = new FileReader();
//     reader.onload = (loadEvent) => {
//       setPreview(loadEvent.target.result);
//       setMode("captured");
//       setAlert({ type: "success", title: "Photo uploaded", message: "Review the photo and save it to the visitor record." });
//     };
//     reader.readAsDataURL(file);
//   };

//   const resetCapture = () => {
//     stopCamera();
//     setMode("idle");
//     setPreview(null);
//     if (fileRef.current) fileRef.current.value = "";
//   };

//   const savePhoto = async () => {
//     if (!preview) return;

//     const latestVisitor = flowService.getCurrentVisitor();
//     if (!latestVisitor) {
//       setAlert({ type: "error", title: "No visitor selected", message: "Create or select a visitor before saving a face registration photo." });
//       return;
//     }

//     setSaving(true);
//     try {
//       // requestId is the backend's numeric id
//       const response = await faceCaptureService.uploadFace({
//         requestId: latestVisitor.id,
//         imageBase64: preview,
//       });
//       console.log("[API] POST /api/public/visitor/register-face response:", response);
//     } catch (err) {
//       console.error("[API] POST /api/public/visitor/register-face error:", err);
//       setSaving(false);
//       setAlert({ type: "error", title: "Upload failed", message: err.message || "Failed to upload the face photo to the server." });
//       return;
//     }

//     const updated = { ...latestVisitor, photo: preview };
//     flowService.setCurrentVisitor(updated);
//     setCurrentVisitor(updated);
//     setSaving(false);
//     setAlert({ type: "success", title: "Face registered", message: "The visitor photo is saved for validation." });
//     window.setTimeout(() => navigate("/visitor-verification"), 650);
//   };

//   return (
//     <div className="camera-grid">
//       <section className="tool-card">
//         <div className="card-header">
//           <div>
//             <h3>Camera Preview</h3>
//             <p>Capture a clear front-facing image or upload an approved photo.</p>
//           </div>
//           <StatusBadge status={preview ? "Completed" : "Pending"} />
//         </div>

//         <div className="card-body">
//           {alert && (
//             <Alert type={alert.type} title={alert.title} onClose={() => setAlert(null)}>
//               {alert.message}
//             </Alert>
//           )}

//           <div className="camera-frame">
//             {mode === "camera" && (
//               <>
//                 <video ref={videoRef} autoPlay playsInline muted />
//                 <div className="camera-overlay" />
//               </>
//             )}
//             {mode === "captured" && preview && <img src={preview} alt="Visitor face preview" />}
//             {mode === "idle" && (
//               <div className="camera-empty">
//                 <Icons.Camera />
//                 <strong>Camera ready</strong>
//                 <span>Open the webcam or upload a visitor photo.</span>
//               </div>
//             )}
//           </div>

//           <canvas ref={canvasRef} style={{ display: "none" }} />
//           <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />

//           <div className="card-footer">
//             {mode === "idle" && (
//               <>
//                 <button className="btn btn-primary" type="button" onClick={startCamera} disabled={starting}>
//                   <Icons.Camera />
//                   {starting ? "Opening Camera..." : "Open Camera"}
//                 </button>
//                 <button className="btn btn-secondary" type="button" onClick={() => fileRef.current?.click()}>
//                   Upload Photo
//                 </button>
//               </>
//             )}
//             {mode === "camera" && (
//               <>
//                 <button className="btn btn-secondary" type="button" onClick={resetCapture}>Cancel</button>
//                 <button className="btn btn-primary" type="button" onClick={capturePhoto}>Capture Photo</button>
//               </>
//             )}
//             {mode === "captured" && (
//               <>
//                 <button className="btn btn-secondary" type="button" onClick={resetCapture}>Retake</button>
//                 <button className="btn btn-primary" type="button" onClick={savePhoto} disabled={saving}>
//                   {saving ? "Uploading..." : "Save and Validate"}
//                   {!saving && <Icons.ArrowRight />}
//                 </button>
//               </>
//             )}
//           </div>
//         </div>
//       </section>

//       <aside className="tool-card result-card">
//         <div className="card-header">
//           <div>
//             <h3>Registration Result</h3>
//             <p>Visitor context and face registration status.</p>
//           </div>
//         </div>

//         {currentVisitor ? (
//           <>
//             <div className={`result-status ${currentVisitor.photo || preview ? "success" : ""}`}>
//               {currentVisitor.photo || preview ? <Icons.Check /> : <Icons.Clock />}
//               <div>
//                 <strong>{currentVisitor.photo || preview ? "Photo ready" : "Awaiting photo"}</strong>
//                 <p>{currentVisitor.visitorId}</p>
//               </div>
//             </div>

//             <div className="detail-list">
//               <div className="detail-row"><span>Visitor</span><strong>{currentVisitor.name}</strong></div>
//               <div className="detail-row"><span>Host</span><strong>{currentVisitor.employeeToMeet || "-"}</strong></div>
//               <div className="detail-row">
//                 <span>Visit</span>
//                 <strong>{currentVisitor.fromDateTime ? currentVisitor.fromDateTime.replace("T", " ").slice(0, 16) : "-"}</strong>
//               </div>
//               <div className="detail-row"><span>Status</span><StatusBadge status={currentVisitor.status} /></div>
//             </div>
//           </>
//         ) : (
//           <div className="empty-state">
//             <Icons.UserPlus />
//             <strong>No visitor selected</strong>
//             <span>Create a visitor request before registering a face photo.</span>
//             <button className="btn btn-primary" type="button" onClick={() => navigate("/create-visitor")}>
//               Create Visitor
//             </button>
//           </div>
//         )}
//       </aside>
//     </div>
//   );
// }

// export default CameraCapture;
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "../../components/common/Alert";
import { Icons } from "../../components/common/Icons";
import StatusBadge from "../../components/common/StatusBadge";
import flowService from "../../services/flowService";
import faceCaptureService from "../../services/faceCaptureService";
import { VMS_PATHS } from "../../routes/paths";

const POSES = [
  { id: "front", label: "Look straight ahead", hint: "Center your face in the frame, neutral expression." },
  { id: "left", label: "Turn head left", hint: "Slowly turn your head to the left, about 45 degrees." },
  { id: "right", label: "Turn head right", hint: "Slowly turn your head to the right, about 45 degrees." },
  { id: "up", label: "Tilt head up", hint: "Tilt your chin slightly upward." },
  { id: "down", label: "Tilt head down", hint: "Tilt your chin slightly downward." },
  { id: "tilt-left", label: "Tilt head to left shoulder", hint: "Keep facing forward, tilt your head toward your left shoulder." },
  { id: "tilt-right", label: "Tilt head to right shoulder", hint: "Keep facing forward, tilt your head toward your right shoulder." },
  { id: "smile", label: "Smile", hint: "Look straight ahead with a natural smile." },
];

function CameraCapture() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const streamRef = useRef(null);

  const [mode, setMode] = useState("idle");
  const [poseIndex, setPoseIndex] = useState(0);
  const [captures, setCaptures] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(null);
  const [alert, setAlert] = useState(null);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [currentVisitor, setCurrentVisitor] = useState(() => flowService.getCurrentVisitor());

  const currentPose = POSES[poseIndex];
  const allPosesCaptured = POSES.every((pose) => captures[pose.id]);
  const capturedCount = Object.keys(captures).length;

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (mode === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [mode]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setAlert(null);
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setMode("camera");
    } catch {
      setAlert({ type: "error", title: "Camera unavailable", message: "Allow camera access or upload visitor photos as files." });
    } finally {
      setStarting(false);
    }
  };

  const captureCurrentPose = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.86);

    const updatedCaptures = { ...captures, [currentPose.id]: dataUrl };
    setCaptures(updatedCaptures);
    setPreview(dataUrl);

    const nextIndex = poseIndex + 1;
    if (nextIndex < POSES.length) {
      setPoseIndex(nextIndex);
      setAlert({ type: "success", title: `${currentPose.label} captured`, message: `Pose ${nextIndex} of ${POSES.length} done. Next: ${POSES[nextIndex].label}.` });
    } else {
      stopCamera();
      setMode("review");
      setAlert({ type: "success", title: "All poses captured", message: "Review the captured angles, then save to complete face registration." });
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAlert({ type: "error", title: "File too large", message: "Upload a photo smaller than 5 MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = typeof loadEvent.target?.result === "string" ? loadEvent.target.result : "";
      if (!dataUrl) return;
      const updatedCaptures = { ...captures, [currentPose.id]: dataUrl };
      setCaptures(updatedCaptures);
      setPreview(dataUrl);

      const nextIndex = poseIndex + 1;
      if (nextIndex < POSES.length) {
        setPoseIndex(nextIndex);
        setAlert({ type: "success", title: `${currentPose.label} uploaded`, message: `Pose ${nextIndex} of ${POSES.length} done. Next: ${POSES[nextIndex].label}.` });
      } else {
        setMode("review");
        setAlert({ type: "success", title: "All poses captured", message: "Review the captured angles, then save to complete face registration." });
      }
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const resetCapture = () => {
    stopCamera();
    setMode("idle");
    setPoseIndex(0);
    setCaptures({});
    setPreview(null);
    setUploadProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const savePhoto = async () => {
    if (!allPosesCaptured) return;

    const latestVisitor = flowService.getCurrentVisitor();
    if (!latestVisitor) {
      setAlert({ type: "error", title: "No visitor selected", message: "Create or select a visitor before saving a face registration photo." });
      return;
    }

    setSaving(true);
    setUploadProgress({ done: 0, total: POSES.length });

    try {
      let done = 0;
      for (const pose of POSES) {
        const response = await faceCaptureService.uploadFace({
          requestId: latestVisitor.id,
          imageBase64: captures[pose.id],
          pose: pose.id,
        });
        console.log(`[API] POST /api/public/visitor/register-face (${pose.id}) response:`, response);
        done += 1;
        setUploadProgress({ done, total: POSES.length });
      }
    } catch (err) {
      console.error("[API] POST /api/public/visitor/register-face error:", err);
      setSaving(false);
      setAlert({ type: "error", title: "Upload failed", message: err.message || "Failed to upload one or more face angles to the server. You can retry." });
      return;
    }

    const frontPhoto = captures.front || Object.values(captures)[0];
    const updated = { ...latestVisitor, photo: frontPhoto, faceRegistered: true, facePoses: Object.keys(captures).length };
    flowService.setCurrentVisitor(updated);
    setCurrentVisitor(updated);
    setSaving(false);
    setAlert({ type: "success", title: "Face registered", message: `All ${POSES.length} angles saved for validation.` });
    window.setTimeout(() => navigate(VMS_PATHS.desk), 650);
  };

  return (
    <div className="camera-grid">
      <section className="tool-card">
        <div className="card-header">
          <div>
            <h3>Camera Preview</h3>
            <p>Capture {POSES.length} angles for accurate face verification.</p>
          </div>
          <StatusBadge status={allPosesCaptured ? "Completed" : capturedCount > 0 ? "Pending" : "Pending"} />
        </div>

        <div className="card-body">
          {alert && (
            <Alert type={alert.type} title={alert.title} onClose={() => setAlert(null)}>
              {alert.message}
            </Alert>
          )}

          {mode !== "idle" && mode !== "review" && (
            <div className="alert alert-info">
              <div className="alert-icon"><Icons.Camera /></div>
              <div className="alert-content">
                <strong>Pose {poseIndex + 1} of {POSES.length}: {currentPose.label}</strong>
                <span>{currentPose.hint}</span>
              </div>
            </div>
          )}

          <div className="camera-frame">
            {mode === "camera" && (
              <>
                <video ref={videoRef} autoPlay playsInline muted />
                <div className="camera-overlay" />
              </>
            )}
            {mode === "review" && preview && <img src={captures.front || preview} alt="Visitor face preview" />}
            {mode === "idle" && (
              <div className="camera-empty">
                <Icons.Camera />
                <strong>Camera ready</strong>
                <span>Open the webcam to start guided multi-angle capture ({POSES.length} poses).</span>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: "none" }} />
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />

          <div className="card-footer">
            {mode === "idle" && (
              <>
                <button className="btn btn-primary" type="button" onClick={startCamera} disabled={starting}>
                  <Icons.Camera />
                  {starting ? "Opening Camera..." : "Start Guided Capture"}
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => fileRef.current?.click()}>
                  Upload Photo for This Pose
                </button>
              </>
            )}
            {mode === "camera" && (
              <>
                <button className="btn btn-secondary" type="button" onClick={resetCapture}>Cancel</button>
                <button className="btn btn-secondary" type="button" onClick={() => fileRef.current?.click()}>Upload Instead</button>
                <button className="btn btn-primary" type="button" onClick={captureCurrentPose}>
                  Capture: {currentPose.label}
                </button>
              </>
            )}
            {mode === "review" && (
              <>
                <button className="btn btn-secondary" type="button" onClick={resetCapture}>Start Over</button>
                <button className="btn btn-primary" type="button" onClick={savePhoto} disabled={saving || !allPosesCaptured}>
                  {saving
                    ? `Uploading ${uploadProgress?.done || 0}/${uploadProgress?.total || POSES.length}...`
                    : "Save and Validate"}
                  {!saving && <Icons.ArrowRight />}
                </button>
              </>
            )}
          </div>

          {/* <div className="form-section" style={{ marginTop: 4 }}>
            <div className="form-section-title">Pose Checklist ({capturedCount}/{POSES.length})</div>
            <div className="form-grid">
              {POSES.map((pose, index) => (
                <div key={pose.id} className="detail-row">
                  <span>{captures[pose.id] ? <Icons.Check /> : <Icons.Clock />} {pose.label}</span>
                  {captures[pose.id] && mode !== "camera" && (
                    <button className="btn btn-sm btn-secondary" type="button" onClick={() => { setMode("camera"); startCamera(); retakePose(index); }}>
                      Retake
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div> */}
        </div>
      </section>

      <aside className="tool-card result-card">
        <div className="card-header">
          <div>
            <h3>Registration Result</h3>
            <p>Visitor context and face registration status.</p>
          </div>
        </div>

        {currentVisitor ? (
          <>
            <div className={`result-status ${allPosesCaptured || currentVisitor.photo ? "success" : ""}`}>
              {allPosesCaptured || currentVisitor.photo ? <Icons.Check /> : <Icons.Clock />}
              <div>
                <strong>{allPosesCaptured ? "All angles ready" : currentVisitor.photo ? "Photo on file" : `Awaiting capture (${capturedCount}/${POSES.length})`}</strong>
                <p>{currentVisitor.visitorId}</p>
              </div>
            </div>

            <div className="detail-list">
              <div className="detail-row"><span>Visitor</span><strong>{currentVisitor.name}</strong></div>
              <div className="detail-row"><span>Host</span><strong>{currentVisitor.employeeToMeet || "-"}</strong></div>
              <div className="detail-row">
                <span>Visit</span>
                <strong>{currentVisitor.fromDateTime ? currentVisitor.fromDateTime.replace("T", " ").slice(0, 16) : "-"}</strong>
              </div>
              <div className="detail-row"><span>Status</span><StatusBadge status={currentVisitor.status} /></div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <Icons.UserPlus />
            <strong>No visitor selected</strong>
            <span>Create a visitor request before registering a face photo.</span>
            <button className="btn btn-primary" type="button" onClick={() => navigate(VMS_PATHS.newVisitor)}>
              Create Visitor
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

export default CameraCapture;
