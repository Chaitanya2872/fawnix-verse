
"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  type AssigneeOption,
  type Lead,
  type LeadFilter,
  type LeadFormData,
  type LeadImportResult,
  type LeadUpdateData,
  getLeadStatusTransitions,
  LeadPriority,
  LeadSource,
  LeadStatus,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_ORDER,
} from "./types";
import {
  useAssignLead,
  useCreateLead,
  useCreateLeadRemark,
  useDeleteLead,
  useEditLeadRemark,
  useLeadAssignees,
  useLeadDetail,
  useLeadNotifications,
  useLeads,
  useImportLeads,
  useUpdateLead,
  useUpdateLeadPriority,
} from "./hooks";
import { LeadsLayout } from "./layout";
import { useCurrentUser } from "@/modules/auth/hooks";
import { RowActions } from "./components/RowActions";
import { LeadDetailPanel } from "./components/LeadDetailPanel";
import { fmt, fmtDate, fmtDateTime, PriorityDot, REP_COLORS, StatusBadge, getInitials } from "./lead-ui";

const PAGE_SIZE = 10;

const BASE_FORM: LeadFormData = {
  name: "",
  company: "",
  email: "",
  phone: "",
  status: LeadStatus.NEW,
  source: LeadSource.WEBSITE,
  priority: LeadPriority.MEDIUM,
  assignedTo: "",
  assignedToUserId: null,
  estimatedValue: 0,
  notes: "",
  tags: [],
  followUpAt: null,
};

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function toDateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDateInputValue(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

type LeadDialogMode = "create" | "edit";

function findAssigneeByName(assignees: AssigneeOption[], name: string) {
  return assignees.find((assignee) => assignee.name === name) ?? null;
}

function leadToFormData(lead: Lead): LeadFormData {
  return {
    name: lead.name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    source: lead.source,
    priority: lead.priority,
    assignedTo: lead.assignedTo,
    assignedToUserId: lead.assignedToUserId,
    estimatedValue: lead.estimatedValue,
    notes: lead.notes,
    tags: [...lead.tags],
    followUpAt: lead.followUpAt,
  };
}
function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${accent}`}>{icon}</div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tracking-tight">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function CreateLeadDialog({
  mode,
  assignees,
  initialData,
  onClose,
  onSave,
  isLoading,
  errorMessage,
}: {
  mode: LeadDialogMode;
  assignees: AssigneeOption[];
  initialData?: LeadFormData | null;
  onClose: () => void;
  onSave: (d: LeadFormData) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}) {
  const [form, setForm] = useState<LeadFormData>(() => initialData ?? BASE_FORM);

  const resolvedAssigneeId = useMemo(() => {
    if (form.assignedToUserId) {
      return form.assignedToUserId;
    }
    return findAssigneeByName(assignees, form.assignedTo)?.id ?? null;
  }, [assignees, form.assignedTo, form.assignedToUserId]);

  function updateAssignee(name: string) {
    if (!name) {
      setForm((previous) => ({
        ...previous,
        assignedTo: "",
        assignedToUserId: null,
      }));
      return;
    }
    const nextAssignee = findAssigneeByName(assignees, name);
    setForm((previous) => ({
      ...previous,
      assignedTo: name,
      assignedToUserId: nextAssignee?.id ?? null,
    }));
  }

  const inputCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-colors";
  const labelCls = "mb-1.5 block text-xs font-medium text-muted-foreground";
  const followUpValue = toDateTimeLocalValue(form.followUpAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">{mode === "create" ? "Create New Lead" : "Edit Lead"}</h2>
            <p className="text-xs text-muted-foreground">
              {mode === "create"
                ? "Add a new lead to your CRM pipeline"
                : "Update the selected lead details"}
            </p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Full Name</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Company</label>
              <input value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as LeadStatus }))} className={inputCls}>
                {LEAD_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {LEAD_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Source</label>
              <select value={form.source} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value as LeadSource }))} className={inputCls}>
                {Object.entries(LEAD_SOURCE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as LeadPriority }))} className={inputCls}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Assign To</label>
              <select value={form.assignedTo} onChange={(e) => updateAssignee(e.target.value)} className={inputCls}>
                <option value="">Unassigned</option>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.name}>
                    {assignee.name}
                  </option>
                ))}
              </select>
            </div>
            {form.status === LeadStatus.FOLLOW_UP ? (
              <div>
                <label className={labelCls}>Follow Up Date</label>
                <input
                  type="datetime-local"
                  value={followUpValue}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      followUpAt: fromDateTimeLocalValue(e.target.value),
                    }))
                  }
                  className={inputCls}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          {errorMessage && <p className="mr-auto text-xs font-medium text-red-600">{errorMessage}</p>}
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">Cancel</button>
          <button
            disabled={isLoading || !form.name || !form.company || (form.status === LeadStatus.FOLLOW_UP && !form.followUpAt)}
            onClick={() => onSave({ ...form, assignedToUserId: resolvedAssigneeId })}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {mode === "create" ? "Create Lead" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
function DeleteLeadDialog({
  open,
  lead,
  onClose,
  onConfirm,
  isLoading,
  errorMessage,
}: {
  open: boolean;
  lead: Lead | null;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}) {
  if (!open || !lead) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
          <Trash2 className="h-5 w-5 text-red-500" />
        </div>
        <h3 className="mb-1 text-base font-semibold text-card-foreground">Delete Lead?</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{lead.name}</span> will be permanently removed.
        </p>
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {errorMessage}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isLoading} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-opacity hover:bg-red-700 disabled:opacity-50">
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function StageUpdateDialog({
  open,
  lead,
  targetStatus,
  allowedStatuses,
  remark,
  followUpAt,
  onTargetStatusChange,
  onRemarkChange,
  onFollowUpAtChange,
  onClose,
  onConfirm,
  isLoading,
  errorMessage,
}: {
  open: boolean;
  lead: Lead | null;
  targetStatus: LeadStatus | null;
  allowedStatuses: LeadStatus[];
  remark: string;
  followUpAt: string;
  onTargetStatusChange: (value: LeadStatus) => void;
  onRemarkChange: (value: string) => void;
  onFollowUpAtChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}) {
  if (!open || !lead || !targetStatus) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h3 className="text-base font-semibold">
          {allowedStatuses.length > 1 ? "Add Stage Entry" : `Move to ${LEAD_STATUS_LABELS[targetStatus]}`}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          A remark is required to update the stage history.
        </p>
        {allowedStatuses.length > 1 ? (
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Stage</label>
            <select
              value={targetStatus}
              onChange={(e) => onTargetStatusChange(e.target.value as LeadStatus)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-sky-500"
            >
              {allowedStatuses.map((status) => (
                <option key={status} value={status}>
                  {LEAD_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {targetStatus === LeadStatus.FOLLOW_UP ? (
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Follow Up Date</label>
            <input
              type="datetime-local"
              value={followUpAt}
              onChange={(e) => onFollowUpAtChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-sky-500"
            />
          </div>
        ) : null}
        <textarea
          rows={3}
          value={remark}
          onChange={(e) => onRemarkChange(e.target.value)}
          className="mt-4 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-sky-500"
        />
        {errorMessage && <p className="mt-2 text-xs font-medium text-red-600">{errorMessage}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">Cancel</button>
          <button onClick={onConfirm} disabled={isLoading} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50">
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function FollowUpCalendarDialog({
  open,
  leads,
  dueCount,
  month,
  selectedDate,
  onMonthChange,
  onSelectDate,
  onClose,
  onOpenLead,
}: {
  open: boolean;
  leads: Lead[];
  dueCount: number;
  month: Date;
  selectedDate: string;
  onMonthChange: (value: string) => void;
  onSelectDate: (value: string) => void;
  onClose: () => void;
  onOpenLead: (lead: Lead) => void;
}) {
  if (!open) return null;

  const formatFollowUpAt = (value: string | null | undefined) => {
    if (!value) {
      return "-";
    }
    try {
      return fmtDateTime(value);
    } catch {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
    }
  };

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const firstGridDate = new Date(monthStart);
  firstGridDate.setDate(monthStart.getDate() - monthStart.getDay());

  const selectedEntries = leads
    .filter((lead) => lead.followUpAt?.slice(0, 10) === selectedDate)
    .sort((left, right) => new Date(left.followUpAt ?? "").getTime() - new Date(right.followUpAt ?? "").getTime());

  const gridDates = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDate);
    date.setDate(firstGridDate.getDate() + index);
    const iso = toDateInputValue(date);
    const entries = leads.filter((lead) => lead.followUpAt?.slice(0, 10) === iso);
    return {
      date,
      iso,
      entries,
      inMonth: date.getMonth() === month.getMonth(),
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">Follow-up Calendar</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Track scheduled callbacks and reminder workload. {dueCount} follow-ups are currently due.
            </p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-auto px-6 py-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <input
                type="month"
                value={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`}
                onChange={(e) => onMonthChange(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <div className="text-xs font-medium text-muted-foreground">
                Selected date: <span className="text-foreground">{selectedDate}</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
                <div key={label} className="py-2">{label}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {gridDates.map((cell) => {
                const isSelected = cell.iso === selectedDate;
                const isDue = cell.entries.some((lead) => {
                  if (!lead.followUpAt) return false;
                  return new Date(lead.followUpAt).getTime() <= Date.now();
                });
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => onSelectDate(cell.iso)}
                    className={`min-h-[92px] rounded-2xl border p-2 text-left transition ${
                      isSelected
                        ? "border-sky-400 bg-sky-50"
                        : "border-border bg-background hover:border-sky-200 hover:bg-accent/40"
                    } ${!cell.inMonth ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{cell.date.getDate()}</span>
                      {cell.entries.length > 0 ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDue ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {cell.entries.length}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 space-y-1">
                      {cell.entries.slice(0, 2).map((lead) => (
                        <div key={lead.id} className="truncate rounded-lg bg-muted/60 px-2 py-1 text-[11px] text-foreground">
                          {lead.name}
                        </div>
                      ))}
                      {cell.entries.length > 2 ? (
                        <div className="text-[10px] font-medium text-muted-foreground">
                          +{cell.entries.length - 2} more
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="border-t border-border bg-muted/20 px-6 py-5 lg:border-l lg:border-t-0">
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground">Scheduled Follow-ups</p>
              <p className="text-xs text-muted-foreground">Open a lead directly from the selected date.</p>
            </div>
            <div className="overflow-auto rounded-2xl border border-border bg-background">
              {selectedEntries.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No follow-ups scheduled for this date.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-border text-left text-sm">
                  <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Lead</th>
                      <th className="px-4 py-3 font-semibold">Company</th>
                      <th className="px-4 py-3 font-semibold">Follow-up</th>
                      <th className="px-4 py-3 font-semibold">Stage</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedEntries.map((lead) => (
                      <tr key={lead.id} className="transition hover:bg-sky-50/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <PriorityDot priority={lead.priority} />
                            <div>
                              <p className="font-semibold text-foreground">{lead.name}</p>
                              <p className="text-xs text-muted-foreground">{lead.phone || lead.email || "-"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{lead.company || "-"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatFollowUpAt(lead.followUpAt)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{LEAD_STATUS_LABELS[lead.status]}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => onOpenLead(lead)}
                            className="rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                          >
                            Open Lead
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ImportLeadsDialog({
  open,
  file,
  onFileChange,
  onClose,
  onImport,
  isLoading,
  result,
  errorMessage,
}: {
  open: boolean;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onClose: () => void;
  onImport: () => void;
  isLoading?: boolean;
  result?: LeadImportResult | null;
  errorMessage?: string | null;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h3 className="text-base font-semibold">Import Leads</h3>
        <p className="mt-1 text-xs text-muted-foreground">Upload CSV or XLSX.</p>
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          className="mt-4 w-full text-sm"
        />
        {errorMessage && <p className="mt-2 text-xs font-medium text-red-600">{errorMessage}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">Cancel</button>
          <button onClick={onImport} disabled={isLoading || !file} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50">
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Import
          </button>
        </div>
        {result && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            Imported {result.created} new leads.
          </div>
        )}
      </div>
    </div>
  );
}
export default function LeadsPage() {
  const { data: currentUser } = useCurrentUser();
  const navigate = useNavigate();
  const { id: routeLeadId } = useParams<{ id?: string }>();
  const isDetailView = Boolean(routeLeadId);

  const [filter, setFilter] = useState<LeadFilter>({
    search: "",
    status: "ALL",
    source: "ALL",
    assignedTo: "",
    priority: "ALL",
    questionnaireStatus: "ALL",
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [quickView, setQuickView] = useState<"ALL" | "MY_QUEUE" | "UNASSIGNED" | "NEEDS_CONTACT" | "FOLLOW_UP" | "CUSTOM">("ALL");
  const [formState, setFormState] = useState<{ mode: LeadDialogMode; lead: Lead | null } | null>(null);
  const [stageUpdateTarget, setStageUpdateTarget] = useState<{
    lead: Lead;
    status: LeadStatus;
    allowedStatuses: LeadStatus[];
  } | null>(null);
  const [stageRemark, setStageRemark] = useState("");
  const [stageFollowUpAt, setStageFollowUpAt] = useState("");
  const [stageUpdateError, setStageUpdateError] = useState<string | null>(null);
  const [isStageUpdating, setIsStageUpdating] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [deleteLeadTarget, setDeleteLeadTarget] = useState<Lead | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(toDateInputValue(new Date()));
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<LeadImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [uiToast, setUiToast] = useState<{
    tone: "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);

  const pushToast = useCallback((toast: {
    tone: "success" | "error" | "info";
    title: string;
    message: string;
  }) => {
    setUiToast(toast);
    window.setTimeout(() => setUiToast(null), 5000);
  }, []);

  const assigneesQuery = useLeadAssignees();
  const assignees = assigneesQuery.data ?? [];
  const { data, isLoading, isError, error } = useLeads(filter, { refetchInterval: 15_000 });
  const notificationsQuery = useLeadNotifications({ enabled: calendarOpen, refetchInterval: 15_000 });
  const followUpCalendarQuery = useLeads(
    {
      search: "",
      status: "ALL",
      source: "ALL",
      assignedTo: "",
      priority: "ALL",
      questionnaireStatus: "ALL",
      page: 1,
      pageSize: 500,
    },
    { enabled: calendarOpen }
  );
  const leadDetail = useLeadDetail(isDetailView ? routeLeadId ?? null : null);
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const updateLeadPriority = useUpdateLeadPriority();
  const assignLead = useAssignLead();
  const createLeadRemark = useCreateLeadRemark();
  const editLeadRemark = useEditLeadRemark();
  const deleteLead = useDeleteLead();
  const importLeads = useImportLeads();

  const formSeed = useMemo(
    () =>
      formState?.mode === "edit" && formState.lead
        ? leadToFormData(formState.lead)
        : null,
    [formState?.mode, formState?.lead?.id]
  );
  const formKey = formState ? `${formState.mode}-${formState.lead?.id ?? "new"}` : "lead-form";

  const myQueueValue = currentUser?.name ?? currentUser?.id ?? "";
  const isSalesRep = currentUser?.roles?.includes("ROLE_SALES_REP") ?? false;

  const updateFilter = useCallback((p: Partial<LeadFilter>, opts?: { keepQuickView?: boolean }) => {
    setFilter((prev) => {
      const next = { ...prev, ...p, page: 1 };
      if (isSalesRep && myQueueValue) {
        next.assignedTo = myQueueValue;
      }
      return next;
    });
    if (!opts?.keepQuickView) {
      setQuickView("CUSTOM");
    }
  }, [isSalesRep, myQueueValue]);

  function applyQuickView(view: "ALL" | "MY_QUEUE" | "UNASSIGNED" | "NEEDS_CONTACT" | "FOLLOW_UP" | "CUSTOM") {
    setQuickView(view);
    switch (view) {
      case "MY_QUEUE":
        updateFilter({ assignedTo: myQueueValue, status: "ALL" }, { keepQuickView: true });
        return;
      case "UNASSIGNED":
        updateFilter({ assignedTo: "UNASSIGNED", status: "ALL" }, { keepQuickView: true });
        return;
      case "NEEDS_CONTACT":
        updateFilter({ status: LeadStatus.NEW }, { keepQuickView: true });
        return;
      case "FOLLOW_UP":
        updateFilter({ status: LeadStatus.FOLLOW_UP }, { keepQuickView: true });
        return;
      case "ALL":
      default:
        updateFilter({ status: "ALL", assignedTo: "" }, { keepQuickView: true });
    }
  }

  const leads = data?.data ?? [];
  const selectedLead = leadDetail.data ?? null;
  const summary = data?.summary ?? {
    totalPipelineValue: 0,
    newCount: 0,
    qualifiedCount: 0,
    convertedCount: 0,
    statusCounts: {},
  };

  function resetMutations() {
    createLead.reset();
    updateLead.reset();
    assignLead.reset();
    createLeadRemark.reset();
    editLeadRemark.reset();
    deleteLead.reset();
  }

  function openCreateDialog() {
    resetMutations();
    setFormState({ mode: "create", lead: null });
  }

  function openEditDialog(lead: Lead) {
    resetMutations();
    setFormState({ mode: "edit", lead });
  }

  function closeFormDialog() {
    setFormState(null);
  }

  function openStageUpdateDialog(lead: Lead, status: LeadStatus, allowedStatuses: LeadStatus[] = [status]) {
    resetMutations();
    setStageUpdateError(null);
    setStageRemark("");
    setStageFollowUpAt(toDateTimeLocalValue(status === LeadStatus.FOLLOW_UP ? lead.followUpAt : null));
    setStageUpdateTarget({ lead, status, allowedStatuses });
  }

  function closeStageUpdateDialog() {
    setStageUpdateTarget(null);
    setStageUpdateError(null);
    setStageRemark("");
    setStageFollowUpAt("");
  }

  async function handleConfirmStageUpdate() {
    if (!stageUpdateTarget) return;
    const remark = stageRemark.trim();
    if (!remark) {
      setStageUpdateError("Please add a remark for this stage update.");
      return;
    }
    if (stageUpdateTarget.status === LeadStatus.FOLLOW_UP && !stageFollowUpAt) {
      setStageUpdateError("Please choose a follow-up date.");
      return;
    }
    setStageUpdateError(null);
    setIsStageUpdating(true);
    try {
      const { lead, status } = stageUpdateTarget;
      const updateData: LeadUpdateData = { status, statusRemark: remark };
      if (status === LeadStatus.FOLLOW_UP) {
        updateData.followUpAt = fromDateTimeLocalValue(stageFollowUpAt);
      }
      if (status === LeadStatus.CONVERTED) {
        updateData.convertedAt = new Date().toISOString();
      }
      await updateLead.mutateAsync({ id: lead.id, data: updateData });
      closeStageUpdateDialog();
    } catch (err) {
      setStageUpdateError(err instanceof Error ? err.message : "Failed to update lead stage.");
    } finally {
      setIsStageUpdating(false);
    }
  }

  function handleStageTargetChange(status: LeadStatus) {
    setStageUpdateTarget((previous) => {
      if (!previous) return previous;
      if (status !== LeadStatus.FOLLOW_UP) {
        setStageFollowUpAt("");
      } else if (!stageFollowUpAt) {
        setStageFollowUpAt(toDateTimeLocalValue(previous.lead.followUpAt));
      }
      return {
        ...previous,
        status,
      };
    });
    setStageUpdateError(null);
  }

  function openDeleteLeadDialog(lead: Lead) {
    resetMutations();
    setDeleteError(null);
    setDeleteLeadTarget(lead);
  }

  function closeDeleteLeadDialog() {
    setDeleteLeadTarget(null);
  }

  function handleSaveLead(formData: LeadFormData) {
    if (formState?.mode === "edit" && formState.lead) {
      updateLead.mutate(
        { id: formState.lead.id, data: formData },
        { onSuccess: () => closeFormDialog() }
      );
      return;
    }
    createLead.mutate(formData, { onSuccess: () => closeFormDialog() });
  }

  function handleStatusChange(lead: Lead, status: LeadStatus) {
    if (status === LeadStatus.CONVERTED) {
      openStageUpdateDialog(lead, LeadStatus.CONVERTED);
      return;
    }
    openStageUpdateDialog(lead, status);
  }

  function handleLogStageEntry(lead: Lead) {
    const nextStatuses = getLeadStatusTransitions(lead.status);
    const allowedStatuses = [lead.status, ...LEAD_STATUS_ORDER.filter((status) => nextStatuses.includes(status))];
    openStageUpdateDialog(lead, lead.status, allowedStatuses);
  }

  function handleAssignLead(id: string, assignee: AssigneeOption) {
    assignLead.mutate(
      {
        id,
        input: {
          assignedTo: assignee.name,
          assignedToUserId: assignee.id,
        },
      },
      {
        onSuccess: (updatedLead) => {
          const log = updatedLead.whatsappAssignment ?? null;
          pushToast({
            tone: log?.sent ? "success" : "info",
            title: "Assignment updated",
            message: log?.sent
              ? `WhatsApp sent to ${assignee.name} for ${updatedLead.name}.`
              : `${updatedLead.name} was assigned to ${assignee.name}.`,
          });
        },
        onError: (error) => {
          pushToast({
            tone: "error",
            title: "Assignment failed",
            message: error instanceof Error ? error.message : "Unable to assign this lead right now.",
          });
        },
      }
    );
  }

  function handleAddRemark(id: string, content: string) {
    createLeadRemark.mutate({ id, input: { content } });
  }

  function handlePriorityChange(id: string, priority: LeadPriority) {
    updateLeadPriority.mutate({ id, priority });
  }

  function handleEditRemark(id: string, remarkId: string, content: string) {
    editLeadRemark.mutate({ id, remarkId, input: { content } });
  }

  async function handleUpdateProjectLocation(
    id: string,
    projectLocation: string,
    projectState: string | null
  ) {
    try {
      await updateLead.mutateAsync({
        id,
        data: {
          projectLocation,
          projectState,
        },
      });
      pushToast({
        tone: "success",
        title: "Location updated",
        message: "Project location was updated successfully.",
      });
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Location update failed",
        message: error instanceof Error ? error.message : "Unable to save the mapped location.",
      });
      throw error;
    }
  }

  function handleLeadRowClick(lead: Lead) {
    navigate(`/crm/leads/${lead.id}`);
  }

  function openImportDialog() {
    setImportError(null);
    setImportResult(null);
    setImportFile(null);
    setImportOpen(true);
  }

  function handleCalendarMonthChange(value: string) {
    if (!value) return;
    const nextMonth = parseDateInputValue(`${value}-01`);
    setCalendarMonth(nextMonth);
    setCalendarSelectedDate(toDateInputValue(nextMonth));
  }

  function closeImportDialog() {
    setImportOpen(false);
  }

  function resetFilters() {
    setQuickView("ALL");
    setFilter({
      search: "",
      status: "ALL",
      source: "ALL",
      assignedTo: isSalesRep && myQueueValue ? myQueueValue : "",
      priority: "ALL",
      questionnaireStatus: "ALL",
      page: 1,
      pageSize: PAGE_SIZE,
    });
  }

  async function handleImportLeads() {
    if (!importFile) {
      setImportError("Please choose a CSV or XLSX file.");
      return;
    }
    setImportError(null);
    setImportResult(null);
    try {
      const result = await importLeads.mutateAsync(importFile);
      setImportResult(result);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to import leads.");
    }
  }

  async function handleConfirmDeleteLead() {
    if (!deleteLeadTarget) return;
    setDeleteError(null);
    setDeletingLeadId(deleteLeadTarget.id);
    try {
      await deleteLead.mutateAsync(deleteLeadTarget.id);
      if (formState?.lead?.id === deleteLeadTarget.id) {
        setFormState(null);
      }
      setDeleteLeadTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete lead.");
    } finally {
      setDeletingLeadId(null);
    }
  }

  const formError =
    formState?.mode === "edit"
      ? updateLead.error instanceof Error ? updateLead.error.message : null
      : createLead.error instanceof Error ? createLead.error.message : null;
  const remarkError = createLeadRemark.error instanceof Error
    ? createLeadRemark.error.message
    : editLeadRemark.error instanceof Error
      ? editLeadRemark.error.message
      : null;
  const showDetailPanel = Boolean(isDetailView && selectedLead);
  return (
    <>
      {uiToast ? (
        <div
          className={`fixed bottom-6 right-6 z-50 w-[340px] rounded-2xl border px-4 py-3 shadow-xl ${
            uiToast.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : uiToast.tone === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-sky-200 bg-sky-50 text-sky-800"
          }`}
        >
          <p className="text-sm font-semibold">{uiToast.title}</p>
          <p className="mt-1 text-xs">{uiToast.message}</p>
        </div>
      ) : null}

      <LeadsLayout actionButton={(
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={openImportDialog} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground">
            <FileText className="mr-2 inline h-3.5 w-3.5" />
            Import
          </button>
          <button onClick={() => setCalendarOpen(true)} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground">
            <CalendarDays className="mr-2 inline h-3.5 w-3.5" />
            Follow-up Calendar
          </button>
          <button onClick={openCreateDialog} className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700">
            <Plus className="mr-2 inline h-3.5 w-3.5" />
            Create Lead
          </button>
        </div>
      )}>
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Total Leads" value={data?.total ?? "-"} sub="All statuses" icon={<Users className="h-5 w-5 text-sky-600" />} accent="bg-sky-50 dark:bg-sky-950" />
              <StatCard label="Pipeline Value" value={fmt(summary.totalPipelineValue)} sub={`${summary.qualifiedCount} qualified`} icon={<TrendingUp className="h-5 w-5 text-violet-600" />} accent="bg-violet-50 dark:bg-violet-950" />
              <StatCard label="New Leads" value={summary.newCount} sub="Uncontacted" icon={<Sparkles className="h-5 w-5 text-amber-600" />} accent="bg-amber-50 dark:bg-amber-950" />
              <StatCard label="Converted" value={summary.convertedCount} sub="This period" icon={<Zap className="h-5 w-5 text-emerald-600" />} accent="bg-emerald-50 dark:bg-emerald-950" />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {LEAD_STATUS_ORDER.map((status) => {
                const active = filter.status === status;
                const count = summary.statusCounts?.[status] ?? 0;
                return (
                  <button
                    key={status}
                    onClick={() => updateFilter({ status })}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                        : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {LEAD_STATUS_LABELS[status]}
                    <span className="rounded-full bg-muted/40 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Views</span>
              {([
                { key: "ALL", label: "All" },
                { key: "MY_QUEUE", label: "My Queue" },
                { key: "UNASSIGNED", label: "Unassigned" },
                { key: "NEEDS_CONTACT", label: "Needs Contact" },
                { key: "FOLLOW_UP", label: "Follow Up" },
              ] as const).map((view) => {
                const isActive = quickView === view.key;
                const isDisabled = view.key === "MY_QUEUE" && !myQueueValue;
                return (
                  <button
                    key={view.key}
                    onClick={() => applyQuickView(view.key)}
                    disabled={isDisabled}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive
                        ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                        : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                    } ${isDisabled ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    {view.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[220px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    placeholder="Search name, company or email..."
                    value={filter.search}
                    onChange={(e) => updateFilter({ search: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-4 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                  />
                </div>

                <select
                  value={filter.assignedTo}
                  onChange={(e) => updateFilter({ assignedTo: e.target.value })}
                  disabled={isSalesRep}
                  className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSalesRep ? (
                    <option value={myQueueValue}>Assigned to me</option>
                  ) : (
                    <>
                      <option value="">All Reps</option>
                      {assignees.map((assignee) => (
                        <option key={assignee.id} value={assignee.name}>
                          {assignee.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>

                <button
                  onClick={() => setShowFilters((v) => !v)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                    showFilters ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Search className="h-3.5 w-3.5" /> Filters
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                </button>
              </div>

              {showFilters && (
                <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-muted/30 p-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Source</label>
                    <select value={filter.source} onChange={(e) => updateFilter({ source: e.target.value as LeadFilter["source"] })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-sky-500">
                      <option value="ALL">All Sources</option>
                      {Object.entries(LEAD_SOURCE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Priority</label>
                    <select value={filter.priority} onChange={(e) => updateFilter({ priority: e.target.value as LeadFilter["priority"] })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-sky-500">
                      <option value="ALL">All Priorities</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">WhatsApp Questionnaire</label>
                    <select
                      value={filter.questionnaireStatus ?? "ALL"}
                      onChange={(e) => updateFilter({ questionnaireStatus: e.target.value as LeadFilter["questionnaireStatus"] })}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-sky-500"
                    >
                      <option value="ALL">All Leads</option>
                      <option value="ANSWERED">Answered</option>
                      <option value="NO_RESPONSE">No Response</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button onClick={resetFilters} className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
                      Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-border bg-card shadow-sm">
              {deleteError ? (
                <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">
                  {deleteError}
                </div>
              ) : null}

              <div className="hidden lg:grid grid-cols-[minmax(220px,1.6fr)_minmax(160px,1fr)_minmax(160px,1fr)_110px_90px_minmax(140px,1fr)_120px_40px] gap-4 border-b border-border bg-muted/50 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Lead</span>
                <span>Company</span>
                <span>Contact</span>
                <span>Status</span>
                <span>Priority</span>
                <span>Assigned To</span>
                <span>Captured Date</span>
                <span />
              </div>

              <div className="divide-y divide-border">
                {isLoading ? (
                  <div className="py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-500" />
                    <p className="mt-3 text-sm text-muted-foreground">Loading leads...</p>
                  </div>
                ) : isError ? (
                  <div className="py-16 text-center">
                    <AlertCircle className="mx-auto h-8 w-8 text-red-500/50" />
                    <p className="mt-3 text-sm font-medium text-red-600">
                      {error instanceof Error ? error.message : "Failed to load leads."}
                    </p>
                  </div>
                ) : leads.length === 0 ? (
                  <div className="py-16 text-center">
                    <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/30" />
                    <p className="mt-3 text-sm text-muted-foreground">No leads match your filters</p>
                  </div>
                ) : (
                  leads.map((lead) => (
                    <div key={lead.id} onClick={() => handleLeadRowClick(lead)} className="cursor-pointer px-5 py-4 transition hover:bg-muted/40">
                      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(220px,1.6fr)_minmax(160px,1fr)_minmax(160px,1fr)_110px_90px_minmax(140px,1fr)_120px_40px] lg:items-center lg:gap-4">
                        <div className="flex items-start justify-between gap-3 lg:block">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${REP_COLORS[lead.assignedTo] ?? "bg-slate-100 text-slate-700"}`}>
                              {getInitials(lead.name)}
                            </div>
                            <div>
                              <p className="font-semibold">{lead.name}</p>
                              <p className="text-[11px] text-muted-foreground">{LEAD_SOURCE_LABELS[lead.source]}</p>
                            </div>
                          </div>
                          <div className="lg:hidden" onClick={(e) => e.stopPropagation()}>
                            <RowActions
                              lead={lead}
                              onView={() => navigate(`/crm/leads/${lead.id}`)}
                              onEdit={() => openEditDialog(lead)}
                              onStatusChange={(s) => handleStatusChange(lead, s)}
                              onAssign={(assignee) => handleAssignLead(lead.id, assignee)}
                              onDelete={() => openDeleteLeadDialog(lead)}
                              assignees={assignees}
                              isAssigning={assignLead.isPending}
                              isDeleting={deleteLead.isPending && deletingLeadId === lead.id}
                            />
                          </div>
                        </div>

                        <div className="hidden lg:flex items-center gap-1.5 text-muted-foreground">
                          {lead.company}
                        </div>
                        <div className="hidden lg:block">
                          <div className="space-y-0.5">
                            {lead.email && <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{lead.email}</p>}
                            {lead.phone && <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{lead.phone}</p>}
                          </div>
                        </div>
                        <div className="hidden lg:block"><StatusBadge status={lead.status} /></div>
                        <div className="hidden lg:block"><PriorityDot priority={lead.priority} /></div>
                        <div className="hidden lg:flex items-center gap-2">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${REP_COLORS[lead.assignedTo] ?? "bg-slate-100 text-slate-700"}`}>
                            {getInitials(lead.assignedTo || "U")}
                          </div>
                          <span className="text-sm">{lead.assignedTo || "Unassigned"}</span>
                        </div>
                        <div className="hidden lg:block text-sm font-medium text-slate-600">
                          {fmtDate(lead.createdAt)}
                        </div>
                        <div className="hidden lg:flex justify-end" onClick={(e) => e.stopPropagation()}>
                          <RowActions
                            lead={lead}
                            onView={() => navigate(`/crm/leads/${lead.id}`)}
                            onEdit={() => openEditDialog(lead)}
                            onStatusChange={(s) => handleStatusChange(lead, s)}
                            onAssign={(assignee) => handleAssignLead(lead.id, assignee)}
                            onDelete={() => openDeleteLeadDialog(lead)}
                            assignees={assignees}
                            isAssigning={assignLead.isPending}
                            isDeleting={deleteLead.isPending && deletingLeadId === lead.id}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-5 py-3.5">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {(data.page - 1) * data.pageSize + 1}-{Math.min(data.page * data.pageSize, data.total)}
                    </span>{" "}
                    of {data.total} leads
                  </p>
                  <div className="flex items-center gap-1">
                    <button disabled={filter.page === 1} onClick={() => setFilter((p) => ({ ...p, page: p.page - 1 }))} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => i + 1).map((pg) => (
                      <button key={pg} onClick={() => setFilter((p) => ({ ...p, page: pg }))} className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-colors ${pg === filter.page ? "bg-sky-600 text-white" : "text-muted-foreground hover:bg-accent"}`}>
                        {pg}
                      </button>
                    ))}
                    <button disabled={filter.page === data.totalPages} onClick={() => setFilter((p) => ({ ...p, page: p.page + 1 }))} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </LeadsLayout>

      {showDetailPanel && selectedLead ? (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={() => navigate("/crm/leads")} />
          <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-border bg-background shadow-2xl sm:w-[85vw] lg:w-[60vw] lg:max-w-[980px]">
            <LeadDetailPanel
              lead={selectedLead}
              assignees={assignees}
              onClose={() => navigate("/crm/leads")}
              onStatusChange={(s) => handleStatusChange(selectedLead, s)}
              onLogStageEntry={() => handleLogStageEntry(selectedLead)}
              onPriorityChange={(priority) => handlePriorityChange(selectedLead.id, priority)}
              onConvert={() => openStageUpdateDialog(selectedLead, LeadStatus.CONVERTED)}
              onAssignLead={(assignee) => handleAssignLead(selectedLead.id, assignee)}
              onAddRemark={(content) => handleAddRemark(selectedLead.id, content)}
              onEditRemark={(remarkId, content) => handleEditRemark(selectedLead.id, remarkId, content)}
              onUpdateProjectLocation={(projectLocation, projectState) =>
                handleUpdateProjectLocation(selectedLead.id, projectLocation, projectState)
              }
              onBuildQuote={() =>
                navigate("/sales", {
                  state: {
                    openBuilder: true,
                    leadId: selectedLead.status === LeadStatus.QUALIFIED ? selectedLead.id : null,
                  },
                })
              }
              onAssignmentBlocked={(message) => {
                pushToast({
                  tone: "error",
                  title: "Assignment blocked",
                  message,
                });
              }}
              isUpdating={updateLead.isPending || updateLeadPriority.isPending}
              isAssigning={assignLead.isPending}
              isCreatingRemark={createLeadRemark.isPending}
              editingRemarkId={editLeadRemark.variables?.remarkId ?? null}
              isRefreshing={leadDetail.isFetching}
              remarkError={remarkError}
            />
          </div>
        </div>
      ) : null}

      {formState && (
        <CreateLeadDialog
          key={formKey}
          mode={formState.mode}
          assignees={assignees}
          initialData={formSeed}
          onClose={closeFormDialog}
          onSave={handleSaveLead}
          isLoading={formState.mode === "edit" ? updateLead.isPending : createLead.isPending}
          errorMessage={formError}
        />
      )}

      <StageUpdateDialog
        open={Boolean(stageUpdateTarget)}
        lead={stageUpdateTarget?.lead ?? null}
        targetStatus={stageUpdateTarget?.status ?? null}
        allowedStatuses={stageUpdateTarget?.allowedStatuses ?? []}
        remark={stageRemark}
        followUpAt={stageFollowUpAt}
        onTargetStatusChange={handleStageTargetChange}
        onRemarkChange={setStageRemark}
        onFollowUpAtChange={setStageFollowUpAt}
        onClose={closeStageUpdateDialog}
        onConfirm={handleConfirmStageUpdate}
        isLoading={isStageUpdating}
        errorMessage={stageUpdateError}
      />

      <FollowUpCalendarDialog
        open={calendarOpen}
        leads={(followUpCalendarQuery.data?.data ?? []).filter((lead) => Boolean(lead.followUpAt))}
        dueCount={notificationsQuery.data?.followUpDueCount ?? 0}
        month={calendarMonth}
        selectedDate={calendarSelectedDate}
        onMonthChange={handleCalendarMonthChange}
        onSelectDate={setCalendarSelectedDate}
        onClose={() => setCalendarOpen(false)}
        onOpenLead={(lead) => {
          setCalendarOpen(false);
          navigate(`/crm/leads/${lead.id}`);
        }}
      />

      <DeleteLeadDialog
        open={Boolean(deleteLeadTarget)}
        lead={deleteLeadTarget}
        onClose={closeDeleteLeadDialog}
        onConfirm={handleConfirmDeleteLead}
        isLoading={deleteLead.isPending && deletingLeadId === deleteLeadTarget?.id}
        errorMessage={deleteError}
      />

      <ImportLeadsDialog
        open={importOpen}
        file={importFile}
        onFileChange={setImportFile}
        onClose={closeImportDialog}
        onImport={handleImportLeads}
        isLoading={importLeads.isPending}
        result={importResult}
        errorMessage={importError}
      />
    </>
  );
}

