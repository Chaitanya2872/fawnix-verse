import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  LogIn,
  LogOut,
  QrCode,
  Search,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BadgePreview } from "../../components/vms/BadgePreview";
import {
  EmptyState,
  VmsAlert,
  VmsCard,
  VmsCardHeader,
  VmsIconBadge,
  VmsPage,
} from "../../components/vms/VmsPage";
import { StatusPill } from "../../components/vms/StatusPill";
import { VisitorActionDialog } from "../../components/vms/VisitorActionDialog";
import { useVisitorActions } from "../../hooks/useVisitors";
import faceCaptureService from "../../services/faceCaptureService";
import flowService from "../../services/flowService";
import visitorRequestService from "../../services/visitorRequestService";
import { VMS_PATHS } from "../../routes/paths";
import type { VisitorAction, VisitorRecord } from "../../types";
import {
  canCheckIn,
  canCheckOut,
  canReject,
  formatDateTime,
  getInitials,
  getPurposeLabel,
  getVisitWindowState,
} from "../../utils/visitorWorkflow";

function CheckInOut() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [qrInput, setQrInput] = useState(() => flowService.getCurrentVisitor()?.qrCodeData || "");
  const [visitor, setVisitor] = useState<VisitorRecord | null>(() => flowService.getCurrentVisitor());
  const [lookupLoading, setLookupLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [faceMode, setFaceMode] = useState<"idle" | "camera" | "verifying" | "verified" | "failed">("idle");
  const [livePreview, setLivePreview] = useState<string | null>(null);
  const [faceResult, setFaceResult] = useState<{ confidence?: number; message: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<VisitorAction | null>(null);
  const { runAction, busyAction, error: actionError, setError: setActionError } = useVisitorActions(async (updated) => {
    if (updated) {
      setVisitor(updated);
    } else {
      setVisitor(null);
      setQrInput("");
    }
  });

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (faceMode === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [faceMode]);

  useEffect(() => () => stopCamera(), []);

  const lookup = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const input = qrInput.trim();
    if (!input) {
      setMessage({ type: "error", text: "Scan or enter a QR code or Visitor ID." });
      return;
    }

    setLookupLoading(true);
    setMessage(null);
    setActionError(null);
    try {
      const found = (await visitorRequestService.verifyQr(input)) as VisitorRecord;
      setVisitor(found);
      flowService.setCurrentVisitor(found);
      setFaceMode("idle");
      setLivePreview(null);
      setFaceResult(null);
      setMessage({ type: "success", text: `${found.name} loaded for desk processing.` });
    } catch (error) {
      setVisitor(null);
      setFaceMode("idle");
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Visitor not found." });
    } finally {
      setLookupLoading(false);
    }
  };

  const startFaceCheck = async () => {
    if (!visitor) return;
    if (!visitor.photo && !visitor.faceRegistered) {
      setFaceMode("failed");
      setFaceResult(null);
      setMessage({ type: "error", text: "Register a face profile before running verification." });
      return;
    }
    setMessage(null);
    setLivePreview(null);
    setFaceResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setFaceMode("camera");
    } catch {
      setMessage({ type: "error", text: "Camera access is required for live face verification." });
    }
  };

  const captureLiveFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    const width = video.videoWidth || 960;
    const height = video.videoHeight || 720;
    if (!width || !height) return null;

    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.86);
  };

  const verifyLiveImage = async (imageBase64: string) => {
    if (!visitor) return;

    stopCamera();
    setLivePreview(imageBase64);
    setFaceMode("verifying");
    setMessage({ type: "info", text: "Verifying live face against the registered profile..." });

    try {
      const result = await faceCaptureService.verifyFace({
        requestId: visitor.id,
        imageBase64,
        qrCodeData: visitor.qrCodeData,
        visitorId: visitor.visitorId,
      });
      setFaceMode("verified");
      setFaceResult({ confidence: result.confidence, message: result.message });
      setMessage({
        type: "success",
        text: `${result.message}${typeof result.confidence === "number" ? ` Confidence: ${result.confidence}%.` : ""}`,
      });
    } catch (error) {
      setFaceMode("failed");
      setFaceResult(null);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Face verification failed." });
    }
  };

  const runFaceMatch = async () => {
    const imageBase64 = captureLiveFrame();

    if (!imageBase64) {
      setMessage({ type: "error", text: "Could not capture a live frame from the camera. Try again." });
      return;
    }

    await verifyLiveImage(imageBase64);
  };

  const handleLivePhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Upload a live verification photo smaller than 5 MB." });
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = typeof loadEvent.target?.result === "string" ? loadEvent.target.result : "";
      if (dataUrl) {
        void verifyLiveImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const openAction = (action: VisitorAction) => {
    setPendingAction(action);
    setMessage(null);
    setActionError(null);
  };

  const completeAction = async (reason: string) => {
    if (!visitor || !pendingAction) return;
    try {
      const updated = await runAction(pendingAction, visitor, reason);
      setMessage({
        type: "success",
        text: updated ? `${updated.name} updated successfully.` : "Visitor record deleted.",
      });
      setPendingAction(null);
    } catch {
      // Hook exposes the message for display.
    }
  };

  const windowState = getVisitWindowState(visitor);
  const faceReady = faceMode === "verified";
  const canDeskCheckIn = visitor ? canCheckIn(visitor) && windowState.state === "active" : false;
  const faceStatus = faceMode === "verified" ? "Approved" : faceMode === "failed" ? "Rejected" : "Pending";

  return (
    <VmsPage
      title="Desk Check-In"
      description="Use this console at reception to scan a QR code, verify identity, print badge details, and complete arrival or departure."
      actions={
        <Button asChild variant="outline">
          <Link to={VMS_PATHS.visitors}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Visitor List
          </Link>
        </Button>
      }
    >
      {message ? (
        <VmsAlert tone={message.type === "success" ? "success" : message.type === "error" ? "error" : "info"}>
          {message.text}
        </VmsAlert>
      ) : null}

      {actionError ? (
        <VmsAlert tone="error">{actionError}</VmsAlert>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <VmsCard>
            <VmsCardHeader
              title="QR / Visitor ID Lookup"
              description="Scan the badge QR code or enter a Visitor ID to load the active request."
              actions={visitor ? <StatusPill status={visitor.status} /> : null}
            />
            <div className="grid gap-5 p-5 lg:grid-cols-[240px_1fr]">
              <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-border bg-muted/50">
                <div className="grid h-32 w-32 grid-cols-5 gap-1 rounded-lg border border-border bg-card p-3 shadow-sm" aria-hidden="true">
                  {Array.from({ length: 25 }).map((_, index) => (
                    <span key={index} className={(index + Math.floor(index / 5)) % 3 === 0 ? "rounded-sm bg-primary" : "rounded-sm bg-muted"} />
                  ))}
                </div>
              </div>
              <form className="space-y-4" onSubmit={lookup}>
                <div className="space-y-2">
                  <Label htmlFor="qrInput">QR Code / Visitor ID</Label>
                  <Input
                    id="qrInput"
                    value={qrInput}
                    onChange={(event) => setQrInput(event.target.value)}
                    placeholder="VMS|... or VISITOR_12"
                    disabled={lookupLoading}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={lookupLoading}>
                    <Search className="h-4 w-4" aria-hidden="true" />
                    {lookupLoading ? "Loading..." : "Load Visitor"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setQrInput(flowService.getCurrentVisitor()?.qrCodeData || "")}
                  >
                    <QrCode className="h-4 w-4" aria-hidden="true" />
                    Use Current
                  </Button>
                </div>
                {visitor ? (
                  <VmsAlert tone={windowState.state === "active" ? "success" : "warning"}>
                    {windowState.message}
                  </VmsAlert>
                ) : null}
              </form>
            </div>
          </VmsCard>

          <VmsCard>
            <VmsCardHeader
              title="Face Verification"
              description="Compare the live camera with the registered face profile before check-in."
              actions={
                <StatusPill status={faceStatus} />
              }
            />
            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="flex min-h-72 items-center justify-center overflow-hidden rounded-lg border border-border bg-foreground">
                {faceMode === "camera" ? (
                  <video ref={videoRef} autoPlay playsInline muted className="h-full min-h-72 w-full object-cover" />
                ) : livePreview ? (
                  <img src={livePreview} alt="Live verification capture" className="h-full min-h-72 w-full object-cover" />
                ) : visitor?.photo ? (
                  <img src={visitor.photo} alt={visitor.name} className="h-full min-h-72 w-full object-cover" />
                ) : (
                  <div className="px-6 text-center text-background/80">
                    <Camera className="mx-auto h-10 w-10" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold">No registered face preview</p>
                    <p className="mt-1 text-xs text-background/60">Register a face profile from visitor details or the action below.</p>
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLivePhotoUpload} />
              <div className="space-y-3">
                {visitor ? (
                  <>
                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="text-sm font-semibold text-foreground">{visitor.name}</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{visitor.visitorId || visitor.id}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Face profile: {visitor.photo || visitor.faceRegistered ? "Available" : "Missing"}</p>
                    </div>
                    {faceMode === "camera" ? (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={() => { stopCamera(); setFaceMode("idle"); }}>
                          <X className="h-4 w-4" aria-hidden="true" />
                          Cancel
                        </Button>
                        <Button type="button" onClick={() => void runFaceMatch()}>
                          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                          Run Match
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" onClick={startFaceCheck} disabled={faceMode === "verifying"}>
                          <Camera className="h-4 w-4" aria-hidden="true" />
                          {faceMode === "verifying" ? "Verifying..." : "Start Face Check"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileRef.current?.click()}
                          disabled={faceMode === "verifying"}
                        >
                          <Camera className="h-4 w-4" aria-hidden="true" />
                          Upload Live Photo
                        </Button>
                        <Button asChild variant="outline">
                          <Link to={VMS_PATHS.faceRegistrationFor(visitor.id)}>
                            Register Face
                          </Link>
                        </Button>
                      </div>
                    )}
                    {faceMode === "verified" ? (
                      <VmsAlert tone="success" className="px-3 py-2">
                        <CheckCircle2 className="mr-1 inline h-4 w-4" aria-hidden="true" />
                        {faceResult?.message || "Face verification passed."}
                        {typeof faceResult?.confidence === "number" ? ` Confidence: ${faceResult.confidence}%.` : ""}
                      </VmsAlert>
                    ) : null}
                    {faceMode === "failed" ? (
                      <VmsAlert tone="error" className="px-3 py-2">
                        <AlertCircle className="mr-1 inline h-4 w-4" aria-hidden="true" />
                        Face verification failed. Check-in remains blocked.
                      </VmsAlert>
                    ) : null}
                  </>
                ) : (
                  <EmptyState
                    icon={<QrCode className="h-5 w-5" aria-hidden="true" />}
                    title="Load a visitor first"
                    description="Face verification becomes available after QR or Visitor ID lookup."
                  />
                )}
              </div>
            </div>
          </VmsCard>
        </div>

        <aside className="space-y-4">
          {visitor ? (
            <>
              <VisitorProfile visitor={visitor} />
              <BadgePreview visitor={visitor} compact />
              <VmsCard>
                <VmsCardHeader title="Desk Actions" description="Only valid next steps are enabled." />
                <div className="grid gap-2 p-4">
                  <Button
                    type="button"
                    className="justify-start"
                    onClick={() => openAction("checkIn")}
                    disabled={!canDeskCheckIn || !faceReady}
                  >
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                    Check In
                  </Button>
                  {!faceReady && canDeskCheckIn ? (
                    <VmsAlert tone="warning" className="px-3 py-2 text-xs">
                      Face verification must pass before check-in is enabled.
                    </VmsAlert>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start"
                    onClick={() => openAction("checkOut")}
                    disabled={!canCheckOut(visitor)}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Check Out
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="justify-start"
                    onClick={() => openAction("reject")}
                    disabled={!canReject(visitor)}
                  >
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    Reject at Desk
                  </Button>
                </div>
              </VmsCard>
            </>
          ) : (
            <EmptyState
              icon={<Search className="h-5 w-5" aria-hidden="true" />}
              title="No visitor loaded"
              description="Scan a QR code or enter a Visitor ID to begin desk processing."
            />
          )}
        </aside>
      </section>

      <VisitorActionDialog
        action={pendingAction}
        visitor={visitor}
        busy={Boolean(busyAction)}
        onCancel={() => setPendingAction(null)}
        onConfirm={completeAction}
      />
    </VmsPage>
  );
}

function VisitorProfile({ visitor }: { visitor: VisitorRecord }) {
  return (
    <VmsCard>
      <VmsCardHeader title="Visitor Details" actions={<StatusPill status={visitor.status} />} />
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          {visitor.photo ? (
            <img src={visitor.photo} alt={visitor.name} className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <VmsIconBadge tone="strong" className="h-14 w-14 text-sm font-semibold">
              {getInitials(visitor.name)}
            </VmsIconBadge>
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">{visitor.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{visitor.visitorId || visitor.id}</p>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <DetailRow label="Company" value={visitor.company || "Individual"} />
          <DetailRow label="Purpose" value={getPurposeLabel(visitor.purpose)} />
          <DetailRow label="Host" value={visitor.employeeToMeet || "-"} />
          <DetailRow label="Visit Start" value={formatDateTime(visitor.fromDateTime)} />
          <DetailRow label="Visit End" value={formatDateTime(visitor.toDateTime)} />
          <DetailRow label="Check In" value={formatDateTime(visitor.checkIn)} />
          <DetailRow label="Check Out" value={formatDateTime(visitor.checkOut)} />
        </div>
      </div>
    </VmsCard>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <strong className="text-right font-medium text-foreground">{value}</strong>
    </div>
  );
}

export default CheckInOut;
