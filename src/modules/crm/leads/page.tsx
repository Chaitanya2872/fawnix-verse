"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Trash2,
  User,
  Users,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import {
  type AssigneeOption,
  type Lead,
  type LeadActivity,
  type LeadFilter,
  type LeadFormData,
  type LeadImportResult,
  type LeadRemark,
  type LeadSchedule,
  type LeadUpdateData,
  type CreateLeadScheduleInput,
  type UpdateLeadScheduleInput,
  LeadPriority,
  LeadSource,
  LeadStatus,
  LeadScheduleMode,
  LeadScheduleStatus,
  LeadScheduleType,
  getLeadStatusTransitions,
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
  useLeadQuestionnaire,
  useLeadSchedules,
  useCreateLeadSchedule,
  useUpdateLeadSchedule,
  useLeads,
  useImportLeads,
  useUpdateLead,
} from "./hooks";
import { LeadsLayout } from "./layout";
import { useCurrentUser } from "@/modules/auth/hooks";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(v);

const fmtBytes = (value: number) => {
  if (!Number.isFinite(value)) return "-";
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = value;
  let index = -1;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  const digits = size >= 10 || index === 0 ? 1 : 2;
  return `${size.toFixed(digits)} ${units[index]}`;
};

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getRemarkContent(remark: LeadRemark) {
  return remark.versions[remark.versions.length - 1]?.content ?? "";
}

function getActivityTone(activity: LeadActivity) {
  switch (activity.type) {
    case "call":
      return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-300";
    case "assignment_change":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300";
    case "remark_added":
    case "remark_edited":
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300";
    case "follow_up_reminder":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300";
    case "scheduled":
    case "schedule_updated":
      return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300";
    case "converted":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
    case "status_change":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300";
    default:
      return "border-border bg-muted/30 text-muted-foreground";
  }
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CFG: Record<
  LeadStatus,
  { label: string; cls: string; dot: string; icon: React.ReactNode; step: number }
> = {
  NEW:                      { label: "New",                      cls: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700", dot: "bg-slate-400", icon: <Sparkles className="h-3 w-3" />, step: 0 },
  CONTACTED:                { label: "Contacted",                cls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800", dot: "bg-sky-500", icon: <Phone className="h-3 w-3" />, step: 1 },
  FOLLOW_UP:                { label: "Follow Up",                cls: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800", dot: "bg-cyan-500", icon: <AlertCircle className="h-3 w-3" />, step: 2 },
  QUALIFIED:                { label: "Qualified",                cls: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800", dot: "bg-violet-500", icon: <Target className="h-3 w-3" />, step: 3 },
  UNQUALIFIED:              { label: "Unqualified",              cls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800", dot: "bg-rose-500", icon: <XCircle className="h-3 w-3" />, step: 4 },
  ASSIGNED_TO_SALESPERSON:  { label: "Assigned to Salesperson",  cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800", dot: "bg-blue-500", icon: <Users className="h-3 w-3" />, step: 5 },
  PROPOSAL_SENT:            { label: "Proposal Sent",            cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800", dot: "bg-amber-500", icon: <Send className="h-3 w-3" />, step: 6 },
  CONVERTED:                { label: "Converted",                cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800", dot: "bg-emerald-500", icon: <CheckCircle2 className="h-3 w-3" />, step: 7 },
  LOST:                     { label: "Lost",                     cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800", dot: "bg-red-500", icon: <XCircle className="h-3 w-3" />, step: 8 },
};

type QuickView =
  | "ALL"
  | "MY_QUEUE"
  | "UNASSIGNED"
  | "NEEDS_CONTACT"
  | "FOLLOW_UP"
  | "CUSTOM";

const PRIORITY_CFG: Record<LeadPriority, { label: string; cls: string; dot: string }> = {
  LOW:    { label: "Low",    cls: "text-slate-500",  dot: "bg-slate-400" },
  MEDIUM: { label: "Medium", cls: "text-amber-600",  dot: "bg-amber-500" },
  HIGH:   { label: "High",   cls: "text-red-600",    dot: "bg-red-500"   },
};

// Avatars - deterministic pastel per rep
const REP_COLORS: Record<string, string> = {
  "Sarah Kim":       "bg-pink-100 text-pink-700",
  "Mike Rodriguez":  "bg-blue-100 text-blue-700",
  "James Lee":       "bg-violet-100 text-violet-700",
  "Priya Singh":     "bg-amber-100 text-amber-700",
  "Alex Johnson":    "bg-teal-100 text-teal-700",
  "Emma Davis":      "bg-rose-100 text-rose-700",
};

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: LeadStatus }) {
  const { cls, icon, label } = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {icon}{label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Priority indicator
// ---------------------------------------------------------------------------

function PriorityDot({ priority }: { priority: LeadPriority }) {
  const { cls, dot, label } = PRIORITY_CFG[priority];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cls}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Rep Avatar
// ---------------------------------------------------------------------------

function RepAvatar({ name }: { name: string }) {
  const color = REP_COLORS[name] ?? "bg-slate-100 text-slate-700";
  return (
    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${color}`}>
      {getInitials(name)}
    </div>
  );
}

function getDrawerStageTargets(status: LeadStatus) {
  return getLeadStatusTransitions(status).filter((nextStatus) => nextStatus !== LeadStatus.CONVERTED);
}

function getMenuStageTargets(status: LeadStatus) {
  return getLeadStatusTransitions(status);
}

function getStageActionLabel(status: LeadStatus) {
  if (status === LeadStatus.CONVERTED) {
    return "Convert to Opportunity";
  }
  if (status === LeadStatus.LOST) {
    return "Mark as Lost";
  }
  return `Move to ${LEAD_STATUS_LABELS[status]}`;
}

// ---------------------------------------------------------------------------
// Pipeline Progress Bar
// ---------------------------------------------------------------------------

function PipelineProgress({ status }: { status: LeadStatus }) {
  const { step } = STATUS_CFG[status];
  const isLost = status === LeadStatus.LOST;
  const stages = LEAD_STATUS_ORDER.filter((s) => s !== LeadStatus.LOST);
  return (
    <div className="flex items-center gap-1">
      {stages.map((s, i) => {
        const active = !isLost && STATUS_CFG[s].step <= step;
        return (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${active ? "bg-sky-500" : "bg-border"} ${isLost && i === stages.length - 1 ? "bg-red-400" : ""}`}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({ label, value, sub, icon, accent }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; accent: string }) {
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

// ---------------------------------------------------------------------------
// Create Lead Dialog
// ---------------------------------------------------------------------------

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

type LeadDialogMode = "create" | "edit";

function findAssigneeByName(assignees: AssigneeOption[], name: string) {
  return assignees.find((assignee) => assignee.name === name) ?? null;
}

function buildDefaultForm(assignees: AssigneeOption[]) {
  return {
    ...BASE_FORM,
    assignedTo: "",
    assignedToUserId: null,
  };
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
  const [form, setForm] = useState<LeadFormData>(() => initialData ?? buildDefaultForm(assignees));
  const [tagInput, setTagInput] = useState("");

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

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) setForm((p) => ({ ...p, tags: [...p.tags, t] }));
    setTagInput("");
  }

  function removeTag(t: string) { setForm((p) => ({ ...p, tags: p.tags.filter((x) => x !== t) })); }

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-colors";
  const labelCls = "mb-1.5 block text-xs font-medium text-muted-foreground";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">{mode === "create" ? "Create New Lead" : "Edit Lead"}</h2>
            <p className="text-xs text-muted-foreground">
              {mode === "create"
                ? "Add a new lead to your CRM pipeline"
                : "Update the selected lead without changing the page layout"}
            </p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">
            {/* Contact info */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
                  <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Jordan Pierce" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Company <span className="text-red-500">*</span></label>
                  <input value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} placeholder="Nexaflow Inc." className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="jordan@nexaflow.com" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Lead details */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as LeadStatus }))} className={inputCls}>
                    {LEAD_STATUS_ORDER.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Source</label>
                  <select value={form.source} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value as LeadSource }))} className={inputCls}>
                    {Object.entries(LEAD_SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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
                <div>
                  <label className={labelCls}>Est. Value (USD)</label>
                  <input type="number" min={0} value={form.estimatedValue} onChange={(e) => setForm((p) => ({ ...p, estimatedValue: parseFloat(e.target.value) || 0 }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Follow-up At</label>
                  <input
                    type="datetime-local"
                    value={toDateTimeLocal(form.followUpAt)}
                    onChange={(e) => setForm((p) => ({ ...p, followUpAt: fromDateTimeLocal(e.target.value) }))}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className={labelCls}>Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-950 dark:border-sky-800 dark:text-sky-300">
                    {t}
                    <button onClick={() => removeTag(t)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Add tag and press Enter..."
                  className={inputCls}
                />
                <button onClick={addTag} className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Initial remark */}
            <div>
              <label className={labelCls}>{mode === "create" ? "Initial Remark" : "Latest Remark"}</label>
              <textarea rows={3} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Initial context, pain points, next steps..." className={`${inputCls} resize-none`} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-4">
          {errorMessage && <p className="mr-auto text-xs font-medium text-red-600">{errorMessage}</p>}
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">Cancel</button>
          <button
            disabled={isLoading || !form.name || !form.company}
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

// ---------------------------------------------------------------------------
// Lead Detail Full Page
// ---------------------------------------------------------------------------

function RemarkCard({
  remark,
  onEdit,
  isSaving,
}: {
  remark: LeadRemark;
  onEdit: (remarkId: string, content: string) => void;
  isSaving: boolean;
}) {
  const currentContent = getRemarkContent(remark);
  const [draft, setDraft] = useState(currentContent);
  const [showHistory, setShowHistory] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setDraft(currentContent);
  }, [currentContent]);

  function handleSave() {
    const nextContent = draft.trim();

    if (!nextContent || nextContent === currentContent) {
      setDraft(currentContent);
      setIsEditing(false);
      return;
    }

    onEdit(remark.id, nextContent);
    setIsEditing(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{remark.createdBy}</p>
          <p className="text-[11px] text-muted-foreground">
            Added {fmtDateTime(remark.createdAt)}
          </p>
          {remark.updatedAt !== remark.createdAt && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Last updated by {remark.updatedBy} on {fmtDateTime(remark.updatedAt)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDraft(currentContent);
              setIsEditing((value) => !value);
            }}
            disabled={isSaving}
            className="text-xs font-medium text-sky-600 hover:underline disabled:opacity-50"
          >
            {isEditing ? "Cancel" : "Edit"}
          </button>
          {remark.versions.length > 1 && (
            <button
              onClick={() => setShowHistory((value) => !value)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {showHistory ? "Hide History" : `History (${remark.versions.length})`}
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="mt-3 space-y-3">
          <textarea
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setDraft(currentContent);
                setIsEditing(false);
              }}
              className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !draft.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
              Save Version
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
          {currentContent}
        </p>
      )}

      {showHistory && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {remark.versions.map((version, index) => {
            const isCurrentVersion = index === remark.versions.length - 1;

            return (
              <div
                key={version.id}
                className="rounded-lg border border-border bg-muted/20 p-3"
              >
                <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                  <span>{isCurrentVersion ? "Current Version" : `Version ${index + 1}`}</span>
                  <span>{fmtDateTime(version.createdAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                  {version.content}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  by {version.createdBy}
                </p>
              </div>
            );
          })}
        </div>
      )}
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
          <span className="font-medium text-foreground">{lead.name}</span> will be permanently
          removed from your CRM. This cannot be undone.
        </p>
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {errorMessage}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-opacity hover:bg-red-700 disabled:opacity-50"
          >
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
  remark,
  onRemarkChange,
  onClose,
  onConfirm,
  isLoading,
  errorMessage,
}: {
  open: boolean;
  lead: Lead | null;
  targetStatus: LeadStatus | null;
  remark: string;
  onRemarkChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}) {
  if (!open || !lead || !targetStatus) return null;

  const actionLabel = getStageActionLabel(targetStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-card-foreground">Update Stage</h3>
            <p className="text-xs text-muted-foreground">
              Add a remark before moving the lead to the next stage.
            </p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Lead</p>
                <p className="text-sm font-semibold">{lead.name}</p>
                <p className="text-xs text-muted-foreground">{lead.company}</p>
              </div>
              <StatusBadge status={lead.status} />
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>Next stage</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-semibold text-foreground">{LEAD_STATUS_LABELS[targetStatus]}</span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Stage Remark <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={remark}
              onChange={(e) => onRemarkChange(e.target.value)}
              placeholder={`Add a remark for moving to ${LEAD_STATUS_LABELS[targetStatus]}...`}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              This remark will be stored in the lead timeline.
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading || !remark.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {actionLabel}
          </button>
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

  const hasErrors = Boolean(result?.errors?.length);
  const actionLabel = result ? "Import Again" : "Import Leads";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-card-foreground">Import Leads</h3>
            <p className="text-xs text-muted-foreground">
              Upload a CSV or XLSX file. Existing leads with the same email or phone will be updated.
            </p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Choose file</span>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
            <span className="text-[11px] text-muted-foreground">
              Required columns: name, company. Optional: email, phone, alternative number, lead id, month, date,
              project stage, expected timeline, property type, sqft, community, project location, project state,
              pre-sales, response, demo visit, pre-sales remarks, ad set name, campaign name, status, priority,
              source, estimated_value, tags, notes, follow_up_at, assigned_to, assigned_to_user_id.
            </span>
          </label>

          {file && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs">
              <div>
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-muted-foreground">{fmtBytes(file.size)}</p>
              </div>
              <button
                onClick={() => onFileChange(null)}
                className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-accent"
              >
                Remove
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">Import summary</span>
                <span>Total: {result.total}</span>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-md border border-emerald-200 bg-white/80 px-2 py-1 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Created</p>
                  <p className="text-sm font-semibold">{result.created}</p>
                </div>
                <div className="rounded-md border border-emerald-200 bg-white/80 px-2 py-1 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Updated</p>
                  <p className="text-sm font-semibold">{result.updated}</p>
                </div>
                <div className="rounded-md border border-emerald-200 bg-white/80 px-2 py-1 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Skipped</p>
                  <p className="text-sm font-semibold">{result.skipped}</p>
                </div>
              </div>
              {hasErrors && (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
                  <p className="text-xs font-semibold">Rows with errors:</p>
                  <div className="mt-2 max-h-32 space-y-1 overflow-auto text-[11px]">
                    {result.errors.map((err) => (
                      <div key={`${err.row}-${err.message}`}>
                        Row {err.row}: {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Close
          </button>
          <button
            onClick={onImport}
            disabled={isLoading || !file}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function LeadDetailPanel({
  lead,
  assignees,
  onClose,
  onStatusChange,
  onConvert,
  onAssignLead,
  onAddRemark,
  onEditRemark,
  isUpdating,
  isAssigning,
  isCreatingRemark,
  editingRemarkId,
  isRefreshing,
  assignError,
  remarkError,
}: {
  lead: Lead;
  assignees: AssigneeOption[];
  onClose: () => void;
  onStatusChange: (status: LeadStatus) => void;
  onConvert: () => void;
  onAssignLead: (assignee: AssigneeOption) => void;
  onAddRemark: (content: string) => void;
  onEditRemark: (remarkId: string, content: string) => void;
  isUpdating: boolean;
  isAssigning: boolean;
  isCreatingRemark: boolean;
  editingRemarkId: string | null;
  isRefreshing: boolean;
  assignError?: string | null;
  remarkError?: string | null;
}) {
  const isConverted = lead.status === LeadStatus.CONVERTED;
  const isLost = lead.status === LeadStatus.LOST;
  const canConvert = lead.status === LeadStatus.PROPOSAL_SENT;
  const stageTargets = getDrawerStageTargets(lead.status);
  const assignedLabel = lead.assignedTo?.trim() ? lead.assignedTo : "Unassigned";
  const [draftAssignee, setDraftAssignee] = useState<{ leadId: string; value: string } | null>(null);
  const draftAssigneeValue =
    draftAssignee?.leadId === lead.id ? draftAssignee.value : lead.assignedTo;
  const [remarkInput, setRemarkInput] = useState("");
  const questionnaireQuery = useLeadQuestionnaire(lead.id);
  const questionnaire = questionnaireQuery.data;
  const schedulesQuery = useLeadSchedules(lead.id);
  const createSchedule = useCreateLeadSchedule();
  const updateSchedule = useUpdateLeadSchedule();
  const schedules = schedulesQuery.data ?? [];
  const [scheduleDraft, setScheduleDraft] = useState<{
    type: LeadScheduleType;
    scheduledAt: string;
    location: string;
    mode: LeadScheduleMode | "";
    notes: string;
    assignedTo: string;
    assignedToUserId: string | null;
  }>({
    type: LeadScheduleType.DEMO,
    scheduledAt: "",
    location: "",
    mode: "",
    notes: "",
    assignedTo: lead.assignedTo ?? "",
    assignedToUserId: lead.assignedToUserId ?? null,
  });
  const tabs = [
    { id: "contact", label: "Contact Details" },
    { id: "location", label: "Location Map" },
    { id: "communication", label: "Communication" },
    { id: "remarks", label: "Remarks" },
    { id: "other", label: "Other Details" },
  ] as const;
  type LeadTab = (typeof tabs)[number]["id"];
  const [activeTab, setActiveTab] = useState<LeadTab>("contact");
  const mapQuery = [
    lead.projectLocation,
    lead.projectState,
    lead.community,
    lead.company,
  ]
    .filter((value) => value && value.trim())
    .join(", ");
  const mapUrl = mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
    : "";

  function handleAddRemark() {
    const nextRemark = remarkInput.trim();
    if (!nextRemark) return;

    onAddRemark(nextRemark);
    setRemarkInput("");
  }

  function handleCreateSchedule() {
    if (!scheduleDraft.scheduledAt) {
      return;
    }
    const scheduledAt = fromDateTimeLocal(scheduleDraft.scheduledAt);
    if (!scheduledAt) {
      return;
    }
    const input: CreateLeadScheduleInput = {
      type: scheduleDraft.type,
      scheduledAt,
      location: scheduleDraft.location || null,
      mode: scheduleDraft.mode ? (scheduleDraft.mode as LeadScheduleMode) : null,
      notes: scheduleDraft.notes || null,
      assignedTo: scheduleDraft.assignedTo || null,
      assignedToUserId: scheduleDraft.assignedToUserId || null,
    };
    createSchedule.mutate(
      { leadId: lead.id, input },
      {
        onSuccess: () => {
          setScheduleDraft((previous) => ({
            ...previous,
            scheduledAt: "",
            location: "",
            mode: "",
            notes: "",
          }));
        },
      }
    );
  }

  function handleUpdateScheduleStatus(scheduleId: string, status: LeadScheduleStatus) {
    updateSchedule.mutate({
      leadId: lead.id,
      scheduleId,
      input: { status },
    });
  }

  useEffect(() => {
    setScheduleDraft({
      type: LeadScheduleType.DEMO,
      scheduledAt: "",
      location: "",
      mode: "",
      notes: "",
      assignedTo: lead.assignedTo ?? "",
      assignedToUserId: lead.assignedToUserId ?? null,
    });
  }, [lead.id, lead.assignedTo, lead.assignedToUserId]);

  useEffect(() => {
    if (scheduleDraft.assignedToUserId || scheduleDraft.assignedTo || assignees.length === 0) {
      return;
    }
    setScheduleDraft((previous) => ({
      ...previous,
      assignedTo: assignees[0]?.name ?? "",
      assignedToUserId: assignees[0]?.id ?? null,
    }));
  }, [assignees, scheduleDraft.assignedToUserId, scheduleDraft.assignedTo]);

  return (
    <div className="w-full px-4 pb-10 pt-6 lg:px-6">
      <div className="w-full bg-background">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex items-start gap-3">
            <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${REP_COLORS[lead.assignedTo] ?? "bg-slate-100 text-slate-700"}`}>
              {getInitials(lead.name)}
            </div>
            <div>
              <h3 className="font-semibold">{lead.name}</h3>
              <p className="text-sm text-muted-foreground">{lead.company}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <StatusBadge status={lead.status} />
                {isRefreshing && <span className="text-[11px] text-muted-foreground">Syncing...</span>}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Leads
          </button>
        </div>

        <div className="border-b border-border px-6">
          <div className="flex flex-wrap gap-2 py-3">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "bg-sky-600 text-white shadow"
                      : "border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === "contact" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/10 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</p>
                <div className="space-y-2.5">
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 text-sm hover:text-sky-600">
                      <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      {lead.email}
                    </a>
                  )}
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="flex items-center gap-2.5 text-sm hover:text-sky-600">
                      <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      {lead.phone}
                    </a>
                  )}
                  {lead.alternativePhone && (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      {lead.alternativePhone}
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-sm">
                    <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    {lead.company}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/10 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project Details</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Project Stage</p>
                    <p className="text-sm font-medium">{lead.projectStage ?? "-"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Expected Timeline</p>
                    <p className="text-sm font-medium">{lead.expectedTimeline ?? "-"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Property Type</p>
                    <p className="text-sm font-medium">{lead.propertyType ?? "-"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">SQFT</p>
                    <p className="text-sm font-medium">{lead.sqft ?? "-"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "location" && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
              <div className="overflow-hidden rounded-xl border border-border bg-muted/10">
                {mapUrl ? (
                  <div className="aspect-[16/9] w-full">
                    <iframe
                      title="Lead location map"
                      src={mapUrl}
                      className="h-full w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                    No location data available for this lead.
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/10 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location Details</p>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Project Location</p>
                      <p className="text-sm font-medium">{lead.projectLocation ?? "-"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Project State</p>
                      <p className="text-sm font-medium">{lead.projectState ?? "-"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Community</p>
                      <p className="text-sm font-medium">{lead.community ?? "-"}</p>
                    </div>
                  </div>
                  {mapQuery && (
                    <a
                      href={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      Open in Maps
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "communication" && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="space-y-6">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">WhatsApp Questionnaire</p>
                    {questionnaire?.completedAt ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Completed
                      </span>
                    ) : questionnaire ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        In progress
                      </span>
                    ) : null}
                  </div>
                  {questionnaireQuery.isLoading ? (
                    <div className="rounded-xl border border-border bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
                      Loading questionnaire details...
                    </div>
                  ) : questionnaireQuery.isError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                      Unable to load questionnaire details.
                    </div>
                  ) : !questionnaire ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
                      No WhatsApp questionnaire data yet.
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-xl border border-border bg-muted/10 p-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-border bg-background px-3 py-2">
                          <p className="text-[11px] text-muted-foreground">Language</p>
                          <p className="text-sm font-medium">{questionnaire.language ?? "-"}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-background px-3 py-2">
                          <p className="text-[11px] text-muted-foreground">Ownership</p>
                          <p className="text-sm font-medium">{questionnaire.ownershipRole ?? "-"}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-background px-3 py-2">
                          <p className="text-[11px] text-muted-foreground">Demo Preference</p>
                          <p className="text-sm font-medium">{questionnaire.demoPreference ?? "-"}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-background px-3 py-2">
                          <p className="text-[11px] text-muted-foreground">Callback</p>
                          <p className="text-sm font-medium">
                            {questionnaire.callbackPreference ?? "-"}
                            {questionnaire.callbackTimeText ? ` - ${questionnaire.callbackTimeText}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-background px-3 py-2">
                        <p className="text-[11px] text-muted-foreground">Interest Areas</p>
                        {questionnaire.interestAreas.length === 0 ? (
                          <p className="text-sm font-medium">-</p>
                        ) : (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {questionnaire.interestAreas.map((item) => (
                              <span
                                key={item}
                                className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span>Step: {questionnaire.step}</span>
                        <span>Updated: {fmtDateTime(questionnaire.updatedAt)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</p>
                  <div className="space-y-2">
                    {lead.activities.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                        No activity captured yet.
                      </div>
                    ) : (
                      lead.activities.slice(0, 6).map((activity) => (
                        <div
                          key={activity.id}
                          className={`rounded-xl border px-3 py-2.5 ${getActivityTone(activity)}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">{activity.content}</p>
                            <span className="text-[11px] opacity-80">{fmtDateTime(activity.createdAt)}</span>
                          </div>
                          <p className="mt-1 text-[11px] opacity-80">by {activity.createdBy}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visits & Demos</p>
                  {schedulesQuery.isLoading && (
                    <span className="text-[11px] text-muted-foreground">Loading...</span>
                  )}
                </div>

                <div className="space-y-4 rounded-xl border border-border bg-muted/10 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
                      <select
                        value={scheduleDraft.type}
                        onChange={(e) =>
                          setScheduleDraft((previous) => ({
                            ...previous,
                            type: e.target.value as LeadScheduleType,
                          }))
                        }
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-sky-500"
                      >
                        <option value={LeadScheduleType.DEMO}>Demo</option>
                        <option value={LeadScheduleType.VISIT}>Visit</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Scheduled At</label>
                      <input
                        type="datetime-local"
                        value={scheduleDraft.scheduledAt}
                        onChange={(e) =>
                          setScheduleDraft((previous) => ({
                            ...previous,
                            scheduledAt: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Mode</label>
                      <select
                        value={scheduleDraft.mode}
                        onChange={(e) =>
                          setScheduleDraft((previous) => ({
                            ...previous,
                            mode: e.target.value as LeadScheduleMode,
                          }))
                        }
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-sky-500"
                      >
                        <option value="">Select</option>
                        <option value={LeadScheduleMode.ON_SITE}>On-site</option>
                        <option value={LeadScheduleMode.REMOTE}>Remote</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Location</label>
                      <input
                        value={scheduleDraft.location}
                        onChange={(e) =>
                          setScheduleDraft((previous) => ({
                            ...previous,
                            location: e.target.value,
                          }))
                        }
                        placeholder="Office / Site / Zoom"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Assigned To</label>
                      <select
                        value={scheduleDraft.assignedToUserId ?? ""}
                        onChange={(e) => {
                          const selected = assignees.find((a) => a.id === e.target.value);
                          setScheduleDraft((previous) => ({
                            ...previous,
                            assignedToUserId: selected?.id ?? null,
                            assignedTo: selected?.name ?? "",
                          }));
                        }}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-sky-500"
                      >
                        <option value="">Use lead assignee</option>
                        {assignees.map((assignee) => (
                          <option key={assignee.id} value={assignee.id}>
                            {assignee.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
                      <textarea
                        rows={2}
                        value={scheduleDraft.notes}
                        onChange={(e) =>
                          setScheduleDraft((previous) => ({
                            ...previous,
                            notes: e.target.value,
                          }))
                        }
                        placeholder="Add any special instructions..."
                        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      onClick={handleCreateSchedule}
                      disabled={createSchedule.isPending || !scheduleDraft.scheduledAt}
                      className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                    >
                      {createSchedule.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Add Schedule
                    </button>
                  </div>

                  {schedulesQuery.isError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                      Failed to load schedules.
                    </div>
                  )}

                  {schedules.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                      No visits or demos scheduled yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {schedules.map((schedule) => (
                        <div key={schedule.id} className="rounded-lg border border-border bg-background px-3 py-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">
                                {schedule.type === LeadScheduleType.DEMO ? "Demo" : "Visit"} - {fmtDateTime(schedule.scheduledAt)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {schedule.mode ? schedule.mode.replace("_", " ").toLowerCase() : "mode not set"}
                                {schedule.location ? ` - ${schedule.location}` : ""}
                              </p>
                              {schedule.notes && (
                                <p className="mt-1 text-xs text-muted-foreground">{schedule.notes}</p>
                              )}
                              {schedule.assignedTo && (
                                <p className="mt-1 text-xs text-muted-foreground">Assigned to {schedule.assignedTo}</p>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {schedule.status.replace("_", " ")}
                              </span>
                              <button
                                onClick={() => handleUpdateScheduleStatus(schedule.id, LeadScheduleStatus.COMPLETED)}
                                disabled={updateSchedule.isPending || schedule.status === LeadScheduleStatus.COMPLETED}
                                className="rounded-md border border-emerald-200 px-2 py-1 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => handleUpdateScheduleStatus(schedule.id, LeadScheduleStatus.CANCELLED)}
                                disabled={updateSchedule.isPending || schedule.status === LeadScheduleStatus.CANCELLED}
                                className="rounded-md border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "remarks" && (
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Remarks</p>
                  <span className="text-[11px] text-muted-foreground">{lead.remarks.length} total</span>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <textarea
                    rows={3}
                    value={remarkInput}
                    onChange={(e) => setRemarkInput(e.target.value)}
                    placeholder="Add a new remark for this lead..."
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={handleAddRemark}
                      disabled={isCreatingRemark || !remarkInput.trim()}
                      className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCreatingRemark && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Add Remark
                    </button>
                  </div>
                  {remarkError && <p className="mt-3 text-xs font-medium text-red-600">{remarkError}</p>}
                </div>

                <div className="mt-3 space-y-3">
                  {lead.remarks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                      No remarks yet. Add the first remark to start the audit trail.
                    </div>
                  ) : (
                    lead.remarks.map((remark) => (
                      <RemarkCard
                        key={remark.id}
                        remark={remark}
                        onEdit={onEditRemark}
                        isSaving={editingRemarkId === remark.id}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "other" && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="space-y-6">
                <div className="rounded-xl border border-border bg-muted/10 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pipeline Stage</p>
                  <PipelineProgress status={lead.status} />
                  <div className="mt-2 flex justify-between">
                    {LEAD_STATUS_ORDER.filter((s) => s !== LeadStatus.LOST).map((s) => (
                      <span key={s} className={`text-[9px] font-medium ${lead.status === s ? "text-sky-600 dark:text-sky-400" : "text-muted-foreground"}`}>
                        {LEAD_STATUS_LABELS[s]}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/10 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pre-Sales</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Response</p>
                      <p className="text-sm font-medium">{lead.presalesResponse ?? "-"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Demo Visit</p>
                      <p className="text-sm font-medium">{lead.demoVisit ?? "-"}</p>
                    </div>
                    <div className="sm:col-span-2 rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Pre-Sales Remarks</p>
                      <p className="text-sm font-medium">{lead.presalesRemarks ?? "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/10 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marketing</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Ad Set</p>
                      <p className="text-sm font-medium">{lead.adSetName ?? "-"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Campaign</p>
                      <p className="text-sm font-medium">{lead.campaignName ?? "-"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Lead ID</p>
                      <p className="text-sm font-medium">{lead.externalLeadId ?? lead.metaLeadId ?? "-"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Source Created</p>
                      <p className="text-sm font-medium">{lead.sourceCreatedAt ? fmtDateTime(lead.sourceCreatedAt) : "-"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">Est. Value</p>
                    <p className="text-lg font-bold text-emerald-600">{fmt(lead.estimatedValue)}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">Priority</p>
                    <PriorityDot priority={lead.priority} />
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">Source</p>
                    <p className="text-sm font-medium">{LEAD_SOURCE_LABELS[lead.source]}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">Stage</p>
                    <StatusBadge status={lead.status} />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Assigned To</p>
                      <div className="flex items-center gap-2">
                        <RepAvatar name={assignedLabel} />
                        <p className="text-sm font-medium">{assignedLabel}</p>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                      <select
                        value={draftAssigneeValue}
                        onChange={(e) =>
                          setDraftAssignee({ leadId: lead.id, value: e.target.value })
                        }
                        className="min-w-[180px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-sky-500"
                      >
                        <option value="">Unassigned</option>
                        {assignees.map((assignee) => (
                          <option key={assignee.id} value={assignee.name}>
                            {assignee.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          if (!draftAssigneeValue) return;
                          const assignee = findAssigneeByName(assignees, draftAssigneeValue);
                          if (assignee) {
                            onAssignLead(assignee);
                          }
                        }}
                        disabled={isAssigning || !draftAssigneeValue || draftAssigneeValue === lead.assignedTo}
                        className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isAssigning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Save Assignment
                      </button>
                    </div>
                  </div>
                  {assignError && <p className="mt-3 text-xs font-medium text-red-600">{assignError}</p>}
                </div>

                {lead.tags.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.tags.map((t) => (
                        <span key={t} className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-950 dark:border-sky-800 dark:text-sky-300">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!isConverted && !isLost && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Move to Stage</p>
                    <p className="mb-3 text-[11px] text-muted-foreground">A remark is required for every stage change.</p>
                    <div className="flex flex-wrap gap-2">
                      {stageTargets.map((s) => (
                        <button
                          key={s}
                          onClick={() => onStatusChange(s)}
                          disabled={isUpdating}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all hover:scale-105 disabled:opacity-50 ${STATUS_CFG[s].cls}`}
                        >
                          {LEAD_STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-border bg-muted/10 p-4 text-xs text-muted-foreground space-y-1">
                  <p>Created: {fmtDate(lead.createdAt)}</p>
                  {lead.lastContactedAt && <p>Last contacted: {fmtDate(lead.lastContactedAt)}</p>}
                  {lead.followUpAt && <p>Follow-up at: {fmtDateTime(lead.followUpAt)}</p>}
                  {lead.convertedAt && <p className="text-emerald-600 font-medium">Converted: {fmtDate(lead.convertedAt)}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-border px-6 py-4 flex gap-3">
          {!isConverted && !isLost && (
            <button
              onClick={onConvert}
              disabled={isUpdating || !canConvert}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow"
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
              Convert to Opportunity
            </button>
          )}
          {isConverted && (
            <div className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 py-2.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Converted to Opportunity
            </div>
          )}
          {isLost && (
            <div className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-50 border border-red-200 py-2.5 text-sm font-semibold text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300">
              <XCircle className="h-4 w-4" />
              Lead Marked as Lost
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LeadPreviewCard({
  lead,
  onOpen,
}: {
  lead: Lead;
  onOpen: () => void;
}) {
  return (
    <div className="sticky top-6 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${REP_COLORS[lead.assignedTo] ?? "bg-slate-100 text-slate-700"}`}>
            {getInitials(lead.name)}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{lead.name}</p>
            <p className="text-xs text-muted-foreground">{lead.company}</p>
          </div>
        </div>
        <StatusBadge status={lead.status} />
      </div>

      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5">
          Source: {LEAD_SOURCE_LABELS[lead.source]}
        </span>
        <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5">
          Priority: {lead.priority.toLowerCase()}
        </span>
        <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5">
          Owner: {lead.assignedTo || "Unassigned"}
        </span>
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Contact
        </p>
        <div className="mt-2 space-y-1.5 text-sm">
          {lead.email ? (
            <a className="flex items-center gap-2 text-sm hover:text-sky-600" href={`mailto:${lead.email}`}>
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              {lead.email}
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">No email captured.</p>
          )}
          {lead.phone && (
            <a className="flex items-center gap-2 text-sm hover:text-sky-600" href={`tel:${lead.phone}`}>
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              {lead.phone}
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <p className="text-[11px] text-muted-foreground">Est. Value</p>
          <p className="text-sm font-semibold text-emerald-600">{fmt(lead.estimatedValue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <p className="text-[11px] text-muted-foreground">Last Contact</p>
          <p className="text-sm font-semibold">{lead.lastContactedAt ? fmtDate(lead.lastContactedAt) : "-"}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <p className="text-[11px] text-muted-foreground">Follow-up</p>
          <p className="text-sm font-semibold">{lead.followUpAt ? fmtDateTime(lead.followUpAt) : "-"}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <p className="text-[11px] text-muted-foreground">Created</p>
          <p className="text-sm font-semibold">{fmtDate(lead.createdAt)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/10 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Notes
        </p>
        <p className="mt-2 text-sm text-foreground">
          {lead.notes?.trim() ? lead.notes : "No notes added yet."}
        </p>
      </div>

      {lead.tags.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tags
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lead.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onOpen}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
      >
        Open Full Profile
        <ArrowUpRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row Actions Dropdown
// ---------------------------------------------------------------------------

function RowActions({
  lead,
  onView,
  onEdit,
  onStatusChange,
  onAssign,
  onDelete,
  assignees,
  isAssigning,
  isDeleting,
}: {
  lead: Lead;
  onView: () => void;
  onEdit: () => void;
  onStatusChange: (s: LeadStatus) => void;
  onAssign: (assignee: AssigneeOption) => void;
  onDelete: () => void;
  assignees: AssigneeOption[];
  isAssigning: boolean;
  isDeleting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "assign">("menu");
  const ref = React.useRef<HTMLDivElement>(null);
  const stageTargets = getMenuStageTargets(lead.status);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setMode("menu");
      }
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function closeMenu() {
    setOpen(false);
    setMode("menu");
  }

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
          setMode("menu");
        }}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          {mode === "menu" ? (
            <>
              <button onClick={() => { closeMenu(); onView(); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-popover-foreground hover:bg-accent">
                <User className="h-3.5 w-3.5" />
                View Details
              </button>
              <button onClick={() => { closeMenu(); onEdit(); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-popover-foreground hover:bg-accent">
                <Check className="h-3.5 w-3.5" />
                Edit Lead
              </button>
              <button onClick={() => setMode("assign")} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-popover-foreground hover:bg-accent">
                <Users className="h-3.5 w-3.5" />
                Assign Lead
              </button>
              <div className="mx-2 border-t border-border" />
              {stageTargets.map((s) => (
                <button
                  key={s}
                  onClick={() => { closeMenu(); onStatusChange(s); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-popover-foreground hover:bg-accent"
                >
                  <span className={`h-2 w-2 rounded-full ${STATUS_CFG[s].dot}`} />
                  {getStageActionLabel(s)}
                </button>
              ))}
              <div className="mx-2 border-t border-border" />
              <button
                onClick={() => { closeMenu(); onDelete(); }}
                disabled={isDeleting}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeleting ? "Deleting..." : "Delete Lead"}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setMode("menu")} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-popover-foreground hover:bg-accent">
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to actions
              </button>
              <div className="mx-2 border-t border-border" />
              {assignees.map((assignee) => {
                const isCurrentRep = assignee.name === lead.assignedTo;

                return (
                  <button
                    key={assignee.id}
                    onClick={() => { closeMenu(); onAssign(assignee); }}
                    disabled={isAssigning || isCurrentRep}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm text-popover-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>{assignee.name}</span>
                    {isCurrentRep && <Check className="h-3.5 w-3.5 text-sky-600" />}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

export default function LeadsPage() {
  const { data: currentUser } = useCurrentUser();
  const navigate = useNavigate();
  const { id: routeLeadId } = useParams<{ id?: string }>();
  const isDetailView = Boolean(routeLeadId);

  const [filter, setFilter] = useState<LeadFilter>({
    search: "", status: "ALL", source: "ALL", assignedTo: "",
    priority: "ALL", page: 1, pageSize: PAGE_SIZE,
  });
  const [quickView, setQuickView] = useState<QuickView>("ALL");
  const [hoverPreviewLeadId, setHoverPreviewLeadId] = useState<string | null>(null);
  const [formState, setFormState] = useState<{ mode: LeadDialogMode; lead: Lead | null } | null>(null);
  const [stageUpdateTarget, setStageUpdateTarget] = useState<{ lead: Lead; status: LeadStatus } | null>(null);
  const [stageRemark, setStageRemark] = useState("");
  const [stageUpdateError, setStageUpdateError] = useState<string | null>(null);
  const [isStageUpdating, setIsStageUpdating] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [deleteLeadTarget, setDeleteLeadTarget] = useState<Lead | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<LeadImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [newLeadToast, setNewLeadToast] = useState<{ count: number } | null>(null);
  const lastTotalRef = useRef<number | null>(null);
  const lastFilterKeyRef = useRef<string>("");

  const assigneesQuery = useLeadAssignees();
  const assignees = assigneesQuery.data ?? [];
  const { data, isLoading, isError, error } = useLeads(filter, { refetchInterval: 15_000 });
  const leadDetail = useLeadDetail(isDetailView ? routeLeadId ?? null : null);
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
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

  const updateFilter = useCallback((p: Partial<LeadFilter>, opts?: { keepQuickView?: boolean }) => {
    setFilter((prev) => ({ ...prev, ...p, page: 1 }));
    if (!opts?.keepQuickView) {
      setQuickView("CUSTOM");
    }
  }, []);

  const myQueueValue = currentUser?.id ?? currentUser?.name ?? "";

  function applyQuickView(view: QuickView) {
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

  useEffect(() => {
    if (!hoverPreviewLeadId) {
      return;
    }
    if (!leads.some((lead) => lead.id === hoverPreviewLeadId)) {
      setHoverPreviewLeadId(null);
    }
  }, [leads, hoverPreviewLeadId]);

  const hoveredLead = leads.find((lead) => lead.id === hoverPreviewLeadId) ?? null;

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        search: filter.search,
        status: filter.status,
        source: filter.source,
        assignedTo: filter.assignedTo,
        priority: filter.priority,
        pageSize: filter.pageSize,
      }),
    [filter.search, filter.status, filter.source, filter.assignedTo, filter.priority, filter.pageSize]
  );

  useEffect(() => {
    if (lastFilterKeyRef.current !== filterKey) {
      lastFilterKeyRef.current = filterKey;
      lastTotalRef.current = data?.total ?? null;
      setNewLeadToast(null);
      return;
    }

    if (!data) {
      return;
    }

    const previousTotal = lastTotalRef.current;
    if (previousTotal !== null && data.total > previousTotal) {
      const diff = data.total - previousTotal;
      setNewLeadToast({ count: diff });
      if (filter.page !== 1) {
        setFilter((prev) => ({ ...prev, page: 1 }));
      }
    }
    lastTotalRef.current = data.total;
  }, [data, filterKey, filter.page]);

  const formError = formState?.mode === "edit"
    ? (updateLead.error instanceof Error ? updateLead.error.message : null)
    : (createLead.error instanceof Error ? createLead.error.message : null);
  const assignError = assignLead.error instanceof Error ? assignLead.error.message : null;
  const remarkError = createLeadRemark.error instanceof Error
    ? createLeadRemark.error.message
    : editLeadRemark.error instanceof Error
      ? editLeadRemark.error.message
      : null;

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

  function openStageUpdateDialog(lead: Lead, status: LeadStatus) {
    resetMutations();
    setStageUpdateError(null);
    setStageRemark("");
    setStageUpdateTarget({ lead, status });
  }

  function closeStageUpdateDialog() {
    setStageUpdateTarget(null);
    setStageUpdateError(null);
    setStageRemark("");
  }

  async function handleConfirmStageUpdate() {
    if (!stageUpdateTarget) return;

    const remark = stageRemark.trim();
    if (!remark) {
      setStageUpdateError("Please add a remark for this stage update.");
      return;
    }

    setStageUpdateError(null);
    setIsStageUpdating(true);
    try {
      const { lead, status } = stageUpdateTarget;
      const data: LeadUpdateData = { status };
      if (status === LeadStatus.CONVERTED) {
        data.convertedAt = new Date().toISOString();
      }
      await updateLead.mutateAsync({ id: lead.id, data });
      await createLeadRemark.mutateAsync({ id: lead.id, input: { content: remark } });
      closeStageUpdateDialog();
    } catch (error) {
      setStageUpdateError(error instanceof Error ? error.message : "Failed to update lead stage.");
    } finally {
      setIsStageUpdating(false);
    }
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
      handleConvert(lead);
      return;
    }

    openStageUpdateDialog(lead, status);
  }

  function handleConvert(lead: Lead) {
    openStageUpdateDialog(lead, LeadStatus.CONVERTED);
  }

  function handleAssignLead(id: string, assignee: AssigneeOption) {
    assignLead.mutate({
      id,
      input: {
        assignedTo: assignee.name,
        assignedToUserId: assignee.id,
      },
    });
  }

  function handleAddRemark(id: string, content: string) {
    createLeadRemark.mutate({
      id,
      input: { content },
    });
  }

  function handleEditRemark(id: string, remarkId: string, content: string) {
    editLeadRemark.mutate({
      id,
      remarkId,
      input: { content },
    });
  }

  function handleLeadRowClick(lead: Lead) {
    if (typeof window !== "undefined") {
      const isWide = window.matchMedia("(min-width: 1024px)").matches;
      if (isWide) {
        return;
      }
    }
    navigate(`/crm/leads/${lead.id}`);
  }

  function openImportDialog() {
    setImportError(null);
    setImportResult(null);
    setImportFile(null);
    setImportOpen(true);
  }

  function closeImportDialog() {
    setImportOpen(false);
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
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Failed to import leads.");
    }
  }

  async function handleConfirmDeleteLead() {
    if (!deleteLeadTarget) {
      return;
    }

    setDeleteError(null);
    setDeletingLeadId(deleteLeadTarget.id);
    try {
      await deleteLead.mutateAsync(deleteLeadTarget.id);
      if (formState?.lead?.id === deleteLeadTarget.id) {
        setFormState(null);
      }
      setDeleteLeadTarget(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Failed to delete lead.");
    } finally {
      setDeletingLeadId(null);
    }
  }

  const ActionButtons = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={openImportDialog}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
      >
        <FileText className="h-4 w-4" /> Import
      </button>
      <button
        onClick={openCreateDialog}
        className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-sky-700"
      >
        <Plus className="h-4 w-4" /> Create Lead
      </button>
    </div>
  );

  if (isDetailView) {
    if (leadDetail.isLoading) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading lead details...
          </div>
        </div>
      );
    }

    if (leadDetail.isError || !selectedLead) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
            <p>
              {leadDetail.error instanceof Error
                ? leadDetail.error.message
                : "Unable to load lead details."}
            </p>
            <button
              onClick={() => navigate("/crm/leads")}
              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
            >
              Back to Leads
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <LeadDetailPanel
          lead={selectedLead}
          assignees={assignees}
          onClose={() => navigate("/crm/leads")}
          onStatusChange={(s) => handleStatusChange(selectedLead, s)}
          onConvert={() => handleConvert(selectedLead)}
          onAssignLead={(assignee) => handleAssignLead(selectedLead.id, assignee)}
          onAddRemark={(content) => handleAddRemark(selectedLead.id, content)}
          onEditRemark={(remarkId, content) => handleEditRemark(selectedLead.id, remarkId, content)}
          isUpdating={updateLead.isPending}
          isAssigning={assignLead.isPending}
          isCreatingRemark={createLeadRemark.isPending}
          editingRemarkId={editLeadRemark.isPending ? editLeadRemark.variables?.remarkId ?? null : null}
          isRefreshing={leadDetail.isFetching}
          assignError={assignError}
          remarkError={remarkError}
        />

        <StageUpdateDialog
          open={Boolean(stageUpdateTarget)}
          lead={stageUpdateTarget?.lead ?? null}
          targetStatus={stageUpdateTarget?.status ?? null}
          remark={stageRemark}
          onRemarkChange={setStageRemark}
          onClose={closeStageUpdateDialog}
          onConfirm={handleConfirmStageUpdate}
          isLoading={isStageUpdating}
          errorMessage={stageUpdateError}
        />
      </>
    );
  }

  return (
    <>
      {newLeadToast ? (
        <div className="fixed right-6 top-6 z-50 w-[280px] rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 shadow-xl">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-semibold">New leads arrived</p>
              <p className="mt-1 text-xs text-emerald-700">
                {newLeadToast.count} new lead{newLeadToast.count === 1 ? "" : "s"} added.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => {
                    setFilter((prev) => ({ ...prev, page: 1 }));
                    setNewLeadToast(null);
                  }}
                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  View latest
                </button>
                <button
                  onClick={() => setNewLeadToast(null)}
                  className="rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <LeadsLayout actionButton={ActionButtons}>
        <div className="grid gap-6">
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Total Leads" value={data?.total ?? "-"} sub="All statuses" icon={<Users className="h-5 w-5 text-sky-600" />} accent="bg-sky-50 dark:bg-sky-950" />
              <StatCard label="Pipeline Value" value={fmt(summary.totalPipelineValue)} sub={`${summary.qualifiedCount} qualified`} icon={<TrendingUp className="h-5 w-5 text-violet-600" />} accent="bg-violet-50 dark:bg-violet-950" />
              <StatCard label="New Leads" value={summary.newCount} sub="Uncontacted" icon={<Sparkles className="h-5 w-5 text-amber-600" />} accent="bg-amber-50 dark:bg-amber-950" />
              <StatCard label="Converted" value={summary.convertedCount} sub="This period" icon={<Zap className="h-5 w-5 text-emerald-600" />} accent="bg-emerald-50 dark:bg-emerald-950" />
            </div>

            {/* Quick views */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Views
              </span>
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
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
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

            {/* Toolbar */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative min-w-[220px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    placeholder="Search name, company or email..."
                    value={filter.search}
                    onChange={(e) => updateFilter({ search: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-4 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                  />
                </div>

                {/* Assignee filter */}
                <select
                  value={filter.assignedTo}
                  onChange={(e) => updateFilter({ assignedTo: e.target.value })}
                  className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-sky-500"
                >
                  <option value="">All Reps</option>
                  {assignees.map((assignee) => (
                    <option key={assignee.id} value={assignee.name}>
                      {assignee.name}
                    </option>
                  ))}
                </select>

                {/* More filters toggle */}
                <button
                  onClick={() => setShowFilters((v) => !v)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${showFilters ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                >
                  <Search className="h-3.5 w-3.5" /> Filters
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                </button>
              </div>

              {/* Expanded filters */}
              {showFilters && (
                <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-muted/30 p-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Source</label>
                    <select value={filter.source} onChange={(e) => updateFilter({ source: e.target.value as LeadFilter["source"] })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-sky-500">
                      <option value="ALL">All Sources</option>
                      {Object.entries(LEAD_SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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
                  <div className="flex items-end">
                    <button onClick={() => setFilter({ search: "", status: "ALL", source: "ALL", assignedTo: "", priority: "ALL", page: 1, pageSize: PAGE_SIZE })} className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
                      Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Lead list */}
            <div className="relative">
              <div className="rounded-2xl border border-border bg-card">
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
                <span>Est. Value</span>
                <span />
              </div>

              <div
                className="divide-y divide-border"
                onMouseLeave={() => setHoverPreviewLeadId(null)}
              >
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
                    <button onClick={() => updateFilter({ status: "ALL", search: "" })} className="mt-2 text-xs text-sky-600 hover:underline">Clear filters</button>
                  </div>
                ) : (
                  leads.map((lead) => {
                    const isActive = hoverPreviewLeadId === lead.id;
                    return (
                      <div
                        key={lead.id}
                        onClick={() => handleLeadRowClick(lead)}
                        onMouseEnter={() => setHoverPreviewLeadId(lead.id)}
                        onMouseLeave={() => setHoverPreviewLeadId((current) => (current === lead.id ? null : current))}
                        className={`cursor-pointer px-5 py-4 transition ${isActive ? "bg-sky-50/60" : "hover:bg-muted/40"}`}
                      >
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
                            <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                            {lead.company}
                          </div>

                          <div className="hidden lg:block">
                            <div className="space-y-0.5">
                              {lead.email && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{lead.email}</p>}
                              {lead.phone && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{lead.phone}</p>}
                            </div>
                          </div>

                          <div className="hidden lg:block"><StatusBadge status={lead.status} /></div>
                          <div className="hidden lg:block"><PriorityDot priority={lead.priority} /></div>

                          <div className="hidden lg:flex items-center gap-2">
                            <RepAvatar name={lead.assignedTo} />
                            <span className="text-sm">{lead.assignedTo}</span>
                          </div>

                          <div className="hidden lg:block font-semibold tabular-nums text-emerald-600">
                            {fmt(lead.estimatedValue)}
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

                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground lg:hidden">
                            <StatusBadge status={lead.status} />
                            <PriorityDot priority={lead.priority} />
                            <span>{lead.assignedTo || "Unassigned"}</span>
                            <span className="font-semibold text-emerald-600">{fmt(lead.estimatedValue)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
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
                    {Array.from({
                      length: Math.min(5, data.totalPages),
                    }, (_, i) => {
                      const start = Math.floor((filter.page - 1) / 5) * 5 + 1;
                      return start + i;
                    })
                      .filter((pg) => pg <= data.totalPages)
                      .map((pg) => (
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

              <div
                className={`fixed right-6 top-32 z-30 hidden w-[340px] transition-opacity duration-200 lg:block ${
                  hoveredLead ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                }`}
                aria-hidden={!hoveredLead}
              >
                {hoveredLead && (
                  <LeadPreviewCard
                    lead={hoveredLead}
                    onOpen={() => navigate(`/crm/leads/${hoveredLead.id}`)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </LeadsLayout>


      {/* Portaled dialogs */}
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
        remark={stageRemark}
        onRemarkChange={setStageRemark}
        onClose={closeStageUpdateDialog}
        onConfirm={handleConfirmStageUpdate}
        isLoading={isStageUpdating}
        errorMessage={stageUpdateError}
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
