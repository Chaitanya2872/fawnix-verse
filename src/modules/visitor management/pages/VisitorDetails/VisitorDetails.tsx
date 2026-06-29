import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  CheckCircle2,
  Clock3,
  LogIn,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BadgePreview } from "../../components/vms/BadgePreview";
import { EmptyState, VmsCard, VmsCardHeader, VmsPage } from "../../components/vms/VmsPage";
import { StatusPill } from "../../components/vms/StatusPill";
import { VisitorActionDialog } from "../../components/vms/VisitorActionDialog";
import { useVisitor, useVisitorActions } from "../../hooks/useVisitors";
import { VMS_PATHS } from "../../routes/paths";
import type { VisitorAction, VisitorRecord } from "../../types";
import {
  canApprove,
  canCheckIn,
  canCheckOut,
  canReject,
  formatDateTime,
  getInitials,
  getPurposeLabel,
  getVisitWindowState,
} from "../../utils/visitorWorkflow";

function VisitorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { visitor, loading, error, refresh } = useVisitor(id);
  const [pendingAction, setPendingAction] = useState<VisitorAction | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { runAction, busyAction, error: actionError, setError: setActionError } = useVisitorActions(async (updated) => {
    if (updated) {
      await refresh();
    } else {
      navigate(VMS_PATHS.visitors);
    }
  });

  const timeline = useMemo(() => (visitor ? buildTimeline(visitor) : []), [visitor]);

  const openAction = (action: VisitorAction) => {
    setPendingAction(action);
    setNotice(null);
    setActionError(null);
  };

  const completeAction = async (reason: string) => {
    if (!visitor || !pendingAction) return;
    try {
      const updated = await runAction(pendingAction, visitor, reason);
      setNotice(updated ? `${updated.name} updated successfully.` : "Visitor deleted.");
      setPendingAction(null);
    } catch {
      // Hook exposes the message for display.
    }
  };

  if (loading) {
    return (
      <VmsPage title="Visitor Details" description="Loading visitor profile.">
        <EmptyState icon={<Clock3 className="h-5 w-5" aria-hidden="true" />} title="Loading visitor..." />
      </VmsPage>
    );
  }

  if (error || !visitor) {
    return (
      <VmsPage
        title="Visitor Details"
        description="The requested visitor record could not be loaded."
        actions={
          <Button asChild variant="outline">
            <Link to={VMS_PATHS.visitors}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Visitors
            </Link>
          </Button>
        }
      >
        <EmptyState
          icon={<XCircle className="h-5 w-5" aria-hidden="true" />}
          title="Visitor not found"
          description={error || "Open the visitors table and select an available record."}
        />
      </VmsPage>
    );
  }

  const windowState = getVisitWindowState(visitor);

  return (
    <VmsPage
      title={visitor.name}
      description={`Visitor profile, badge preview, approval state, and visit timeline for ${visitor.visitorId || visitor.id}.`}
      actions={
        <>
          <Button asChild variant="outline">
            <Link to={VMS_PATHS.visitors}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Visitors
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={VMS_PATHS.faceRegistrationFor(visitor.id)}>
              <Camera className="h-4 w-4" aria-hidden="true" />
              Face Registration
            </Link>
          </Button>
          <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
            <Link to={VMS_PATHS.desk}>
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Open Desk
            </Link>
          </Button>
        </>
      }
    >
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

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <VmsCard>
            <VmsCardHeader title="Profile" actions={<StatusPill status={visitor.status} />} />
            <div className="grid gap-5 p-5 md:grid-cols-[220px_1fr]">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                {visitor.photo ? (
                  <img src={visitor.photo} alt={visitor.name} className="mx-auto h-40 w-40 rounded-lg object-cover" />
                ) : (
                  <span className="mx-auto flex h-40 w-40 items-center justify-center rounded-lg bg-blue-600 text-3xl font-semibold text-white">
                    {getInitials(visitor.name)}
                  </span>
                )}
                <p className="mt-4 text-sm font-semibold text-slate-950">{visitor.name}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">{visitor.visitorId || visitor.id}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoTile icon={<Mail className="h-4 w-4" aria-hidden="true" />} label="Email" value={visitor.email || "-"} />
                <InfoTile icon={<Phone className="h-4 w-4" aria-hidden="true" />} label="Mobile" value={visitor.mobile || "-"} />
                <InfoTile icon={<UserRound className="h-4 w-4" aria-hidden="true" />} label="Company" value={visitor.company || "Individual"} />
                <InfoTile icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />} label="Host" value={visitor.employeeToMeet || "-"} />
                <InfoTile icon={<BadgeCheck className="h-4 w-4" aria-hidden="true" />} label="Purpose" value={getPurposeLabel(visitor.purpose)} />
                <InfoTile icon={<Camera className="h-4 w-4" aria-hidden="true" />} label="Face Profile" value={visitor.photo || visitor.faceRegistered ? "Registered" : "Missing"} />
              </div>
            </div>
          </VmsCard>

          <VmsCard>
            <VmsCardHeader title="Visit Window" description={windowState.message} />
            <div className="grid gap-3 p-5 md:grid-cols-2">
              <DetailRow label="Visit Start" value={formatDateTime(visitor.fromDateTime)} />
              <DetailRow label="Visit End" value={formatDateTime(visitor.toDateTime)} />
              <DetailRow label="Check In" value={formatDateTime(visitor.checkIn)} />
              <DetailRow label="Check Out" value={formatDateTime(visitor.checkOut)} />
            </div>
          </VmsCard>

          <VmsCard>
            <VmsCardHeader title="Visitor Timeline" description="Lifecycle events based on the current visitor record." />
            <div className="space-y-3 p-5">
              {timeline.map((item) => (
                <div key={item.label} className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
                    {item.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </VmsCard>
        </div>

        <aside className="space-y-4">
          <BadgePreview visitor={visitor} />
          <VmsCard>
            <VmsCardHeader title="Available Actions" description="Actions adapt to the visitor's current lifecycle state." />
            <div className="grid gap-2 p-4">
              <Button type="button" className="justify-start bg-blue-600 text-white hover:bg-blue-700" onClick={() => openAction("approve")} disabled={!canApprove(visitor)}>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Approve
              </Button>
              <Button type="button" variant="outline" className="justify-start" onClick={() => openAction("checkIn")} disabled={!canCheckIn(visitor) || windowState.state !== "active"}>
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Check In
              </Button>
              <Button type="button" variant="outline" className="justify-start" onClick={() => openAction("checkOut")} disabled={!canCheckOut(visitor)}>
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Check Out
              </Button>
              <Button type="button" variant="destructive" className="justify-start" onClick={() => openAction("reject")} disabled={!canReject(visitor)}>
                <XCircle className="h-4 w-4" aria-hidden="true" />
                Reject
              </Button>
              <Button type="button" variant="outline" className="justify-start text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => openAction("delete")}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            </div>
          </VmsCard>
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

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </div>
      <p className="mt-2 break-words text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function buildTimeline(visitor: VisitorRecord) {
  return [
    {
      label: "Request Created",
      value: formatDateTime(visitor.createdAt),
      icon: <Clock3 className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: "Current Status",
      value: visitor.status || "Pending",
      icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: "Face Registration",
      value: visitor.photo || visitor.faceRegistered ? "Face profile available" : "Face profile missing",
      icon: <Camera className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: "Arrival",
      value: formatDateTime(visitor.checkIn),
      icon: <LogIn className="h-4 w-4" aria-hidden="true" />,
    },
    {
      label: "Departure",
      value: formatDateTime(visitor.checkOut),
      icon: <LogOut className="h-4 w-4" aria-hidden="true" />,
    },
  ];
}

export default VisitorDetails;
