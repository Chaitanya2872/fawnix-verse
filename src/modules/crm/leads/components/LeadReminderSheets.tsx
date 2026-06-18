import { CalendarDays, CheckCircle2, Clock3, MapPin, PhoneCall, Video, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  type AssigneeOption,
  type CreateLeadScheduleInput,
  type LeadScheduleCallType as LeadScheduleCallTypeValue,
  type LeadScheduleMode as LeadScheduleModeValue,
  type LeadSchedule,
  LeadScheduleCallType,
  LeadScheduleMode,
  LeadScheduleStatus,
  LeadScheduleType,
} from "../types";
import { AssigneeSearchSelect } from "./AssigneeSearchSelect";
import { fmtDateTime } from "../lead-ui";

export type LeadActionSheetKind = "demo" | "followUp" | "siteVisit";

export type LeadActionFormState = {
  date: string;
  time: string;
  durationMinutes: string;
  assignedTo: string;
  assignedToUserId: string | null;
  mode: string;
  location: string;
  meetingLink: string;
  remarks: string;
  callType: string;
};

const DEFAULT_FORM: LeadActionFormState = {
  date: "",
  time: "",
  durationMinutes: "60",
  assignedTo: "",
  assignedToUserId: null,
  mode: LeadScheduleMode.IN_PERSON,
  location: "",
  meetingLink: "",
  remarks: "",
  callType: LeadScheduleCallType.PHONE,
};

function getSheetConfig(kind: LeadActionSheetKind) {
  switch (kind) {
    case "demo":
      return {
        title: "Schedule Demo Visit",
        description: "Create a demo activity, add a reminder, and assign the visit owner.",
        activityType: LeadScheduleType.DEMO_VISIT,
      };
    case "followUp":
      return {
        title: "Schedule Follow-up Call",
        description: "Create a follow-up reminder with the right call channel and owner.",
        activityType: LeadScheduleType.FOLLOW_UP_CALL,
      };
    case "siteVisit":
      return {
        title: "Schedule Site Visit",
        description: "Plan a future site visit and keep it visible in reminders and timeline.",
        activityType: LeadScheduleType.SITE_VISIT,
      };
  }
}

function toLocalParts(value: string | null | undefined) {
  if (!value) {
    return { date: "", time: "" };
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { date: "", time: "" };
  }
  const timezoneOffsetMs = parsed.getTimezoneOffset() * 60_000;
  const local = new Date(parsed.getTime() - timezoneOffsetMs).toISOString();
  return {
    date: local.slice(0, 10),
    time: local.slice(11, 16),
  };
}

export function createActionFormState(
  kind: LeadActionSheetKind,
  assigneeName: string,
  assigneeUserId: string | null,
  schedule?: LeadSchedule | null
): LeadActionFormState {
  if (!schedule) {
    return {
      ...DEFAULT_FORM,
      assignedTo: assigneeName,
      assignedToUserId: assigneeUserId,
      mode: kind === "followUp" ? "" : LeadScheduleMode.IN_PERSON,
    };
  }

  const local = toLocalParts(schedule.scheduledAt);
  return {
    date: local.date,
    time: local.time,
    durationMinutes: schedule.durationMinutes ? String(schedule.durationMinutes) : "60",
    assignedTo: schedule.assignedTo,
    assignedToUserId: schedule.assignedToUserId,
    mode: schedule.mode ?? (kind === "followUp" ? "" : LeadScheduleMode.IN_PERSON),
    location: schedule.location ?? "",
    meetingLink: schedule.meetingLink ?? "",
    remarks: schedule.notes ?? "",
    callType: schedule.callType ?? LeadScheduleCallType.PHONE,
  };
}

export function buildSchedulePayload(
  kind: LeadActionSheetKind,
  form: LeadActionFormState
): CreateLeadScheduleInput {
  const config = getSheetConfig(kind);
  const scheduledAt = new Date(`${form.date}T${form.time || "09:00"}:00`);
  const payload: CreateLeadScheduleInput = {
    type: config.activityType,
    title: config.title,
    scheduledAt: scheduledAt.toISOString(),
    durationMinutes:
      kind === "followUp" ? null : Number(form.durationMinutes || "0") || null,
    assignedTo: form.assignedTo || null,
    assignedToUserId: form.assignedToUserId,
    notes: form.remarks || null,
  };

  if (kind === "followUp") {
    payload.callType = (form.callType || LeadScheduleCallType.PHONE) as LeadScheduleCallTypeValue;
  } else {
    payload.mode = (form.mode || LeadScheduleMode.IN_PERSON) as LeadScheduleModeValue;
    payload.location = form.location || null;
    payload.meetingLink = form.meetingLink || null;
  }

  return payload;
}

export function LeadActionSheet({
  open,
  onOpenChange,
  kind,
  form,
  assignees,
  pending,
  onFormChange,
  onSubmit,
  headingSuffix,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: LeadActionSheetKind;
  form: LeadActionFormState;
  assignees: AssigneeOption[];
  pending: boolean;
  onFormChange: (next: LeadActionFormState) => void;
  onSubmit: () => void;
  headingSuffix?: string | null;
}) {
  const config = getSheetConfig(kind);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-border px-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 pb-4">
          <SheetTitle>{config.title}</SheetTitle>
          <SheetDescription>
            {config.description}
            {headingSuffix ? ` ${headingSuffix}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {kind === "followUp" ? "Follow-up Date" : "Date"}
              </span>
              <Input
                type="date"
                value={form.date}
                onChange={(event) => onFormChange({ ...form, date: event.target.value })}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {kind === "followUp" ? "Follow-up Time" : "Time"}
              </span>
              <Input
                type="time"
                value={form.time}
                onChange={(event) => onFormChange({ ...form, time: event.target.value })}
              />
            </label>
          </div>

          {kind !== "followUp" ? (
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Duration
              </span>
              <Input
                type="number"
                min="0"
                value={form.durationMinutes}
                onChange={(event) => onFormChange({ ...form, durationMinutes: event.target.value })}
                placeholder="Minutes"
              />
            </label>
          ) : null}

          {kind === "followUp" ? (
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Call Type
              </span>
              <select
                value={form.callType}
                onChange={(event) => onFormChange({ ...form, callType: event.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={LeadScheduleCallType.PHONE}>Phone</option>
                <option value={LeadScheduleCallType.WHATSAPP}>WhatsApp</option>
                <option value={LeadScheduleCallType.VIDEO_CALL}>Video Call</option>
              </select>
            </label>
          ) : (
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Meeting Mode
              </span>
              <select
                value={form.mode}
                onChange={(event) => onFormChange({ ...form, mode: event.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={LeadScheduleMode.IN_PERSON}>In Person</option>
                <option value={LeadScheduleMode.ONLINE}>Online</option>
              </select>
            </label>
          )}

          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Assigned Employee
            </span>
            <AssigneeSearchSelect
              assignees={assignees}
              value={form.assignedTo}
              onChange={(value) => {
                const assignee = assignees.find((entry) => entry.name === value) ?? null;
                onFormChange({
                  ...form,
                  assignedTo: value,
                  assignedToUserId: assignee?.id ?? null,
                });
              }}
              placeholder="Search and assign employee"
            />
          </div>

          {kind !== "followUp" ? (
            <div className="grid gap-4">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Meeting Location
                </span>
                <Input
                  value={form.location}
                  onChange={(event) => onFormChange({ ...form, location: event.target.value })}
                  placeholder="Site or office location"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Meeting Link
                </span>
                <Input
                  value={form.meetingLink}
                  onChange={(event) => onFormChange({ ...form, meetingLink: event.target.value })}
                  placeholder="Online meeting link"
                />
              </label>
            </div>
          ) : null}

          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Remarks
            </span>
            <textarea
              rows={4}
              value={form.remarks}
              onChange={(event) => onFormChange({ ...form, remarks: event.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-sky-500"
              placeholder="Context, expectations, or follow-up notes"
            />
          </label>
        </div>

        <SheetFooter className="border-t border-border px-6 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={pending || !form.date || !form.time || !form.assignedTo}
            className="rounded-xl bg-sky-600 text-white hover:bg-sky-700"
          >
            Save Activity
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case LeadScheduleStatus.SCHEDULED:
      return "Pending";
    case LeadScheduleStatus.COMPLETED:
      return "Completed";
    case LeadScheduleStatus.MISSED:
      return "Missed";
    case LeadScheduleStatus.CANCELLED:
      return "Cancelled";
    default:
      return status.replace(/_/g, " ");
  }
}

function activityIcon(type: string) {
  switch (type) {
    case LeadScheduleType.DEMO_VISIT:
    case LeadScheduleType.DEMO:
      return <Video className="h-4 w-4" />;
    case LeadScheduleType.FOLLOW_UP_CALL:
      return <PhoneCall className="h-4 w-4" />;
    default:
      return <MapPin className="h-4 w-4" />;
  }
}

export function LeadRemindersSheet({
  open,
  onOpenChange,
  schedules,
  onComplete,
  onCancel,
  onReschedule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedules: LeadSchedule[];
  onComplete: (schedule: LeadSchedule) => void;
  onCancel: (schedule: LeadSchedule) => void;
  onReschedule: (schedule: LeadSchedule) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-border px-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 pb-4">
          <SheetTitle>Reminders</SheetTitle>
          <SheetDescription>
            View pending, completed, missed, and cancelled lead reminders in one place.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-6 py-5">
          {schedules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
              No reminders are scheduled for this lead yet.
            </div>
          ) : (
            schedules.map((schedule) => {
              const actionable = schedule.status === LeadScheduleStatus.SCHEDULED || schedule.status === LeadScheduleStatus.MISSED;
              return (
                <div key={schedule.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-sky-50 p-2 text-sky-700">
                        {activityIcon(schedule.type)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {schedule.title ?? schedule.type.replace(/_/g, " ")}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {fmtDateTime(schedule.scheduledAt)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {statusLabel(schedule.status)}
                          </span>
                          <span>{schedule.assignedTo || "Unassigned"}</span>
                        </div>
                        {schedule.notes ? (
                          <p className="mt-2 text-sm text-muted-foreground">{schedule.notes}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => onReschedule(schedule)}>
                      Reschedule
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => onOpenChange(false)}>
                      Open Lead
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!actionable}
                      className="rounded-full"
                      onClick={() => onComplete(schedule)}
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Mark Completed
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!actionable}
                      className="rounded-full text-rose-600"
                      onClick={() => onCancel(schedule)}
                    >
                      <XCircle className="mr-1 h-3.5 w-3.5" />
                      Cancel Reminder
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
