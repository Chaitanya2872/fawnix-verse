import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  ArrowDownRight,
  GitBranch,
  Loader2,
  Mail,
  Phone,
  Tag,
  X,
  XCircle,
} from "lucide-react";
import {
  type AssigneeOption,
  type Lead,
  LeadPriority,
  LeadStatus,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
} from "../types";
import {
  fmt,
  fmtDate,
  fmtDateTime,
  getActivityTone,
  getDrawerStageTargets,
  getInitials,
  PipelineProgress,
  PriorityDot,
  RepAvatar,
  REP_COLORS,
  StatusBadge,
} from "../lead-ui";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "history", label: "History" },
  { id: "notes", label: "Notes & Remarks" },
  { id: "activity", label: "Activity" },
] as const;

type LeadTab = (typeof TABS)[number]["id"];

export function LeadDetailPanel({
  lead,
  assignees,
  onClose,
  onStatusChange,
  onLogStageEntry,
  onPriorityChange,
  onConvert,
  onAssignLead,
  onAddRemark,
  onEditRemark,
  onBuildQuote,
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
  onLogStageEntry: () => void;
  onPriorityChange: (priority: LeadPriority) => void;
  onConvert: () => void;
  onAssignLead: (assignee: AssigneeOption) => void;
  onAddRemark: (content: string) => void;
  onEditRemark: (remarkId: string, content: string) => void;
  onBuildQuote?: () => void;
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
  const canBuildQuote = Boolean(onBuildQuote);
  const stageTargets = getDrawerStageTargets(lead.status);
  const assignedLabel = lead.assignedTo?.trim() ? lead.assignedTo : "Unassigned";

  const [activeTab, setActiveTab] = useState<LeadTab>("overview");
  const [draftAssignee, setDraftAssignee] = useState<{ leadId: string; value: string } | null>(null);
  const [remarkInput, setRemarkInput] = useState("");
  const [editingRemark, setEditingRemark] = useState<{ id: string; value: string } | null>(null);

  const draftAssigneeValue = draftAssignee?.leadId === lead.id ? draftAssignee.value : lead.assignedTo;

  const latestRemarks = useMemo(
    () =>
      lead.remarks.map((remark) => ({
        ...remark,
        latest: remark.versions[remark.versions.length - 1]?.content ?? "",
      })),
    [lead.remarks]
  );

  const historyStages = useMemo(() => {
    const grouped = new Map<
      LeadStatus,
      {
        status: LeadStatus;
        entries: Lead["statusHistory"];
        firstChangedAt: string;
      }
    >();

    lead.statusHistory.forEach((entry) => {
      const existing = grouped.get(entry.toStatus);
      if (existing) {
        existing.entries.push(entry);
        return;
      }
      grouped.set(entry.toStatus, {
        status: entry.toStatus,
        entries: [entry],
        firstChangedAt: entry.changedAt,
      });
    });

    return Array.from(grouped.values()).sort(
      (left, right) =>
        new Date(left.firstChangedAt).getTime() - new Date(right.firstChangedAt).getTime()
    );
  }, [lead.statusHistory]);

  function handleAddRemark() {
    const nextRemark = remarkInput.trim();
    if (!nextRemark) return;
    onAddRemark(nextRemark);
    setRemarkInput("");
  }

  function startEditRemark(remarkId: string, content: string) {
    setEditingRemark({ id: remarkId, value: content });
  }

  function cancelEditRemark() {
    setEditingRemark(null);
  }

  function saveEditRemark() {
    if (!editingRemark) return;
    const nextContent = editingRemark.value.trim();
    if (!nextContent) return;
    onEditRemark(editingRemark.id, nextContent);
    setEditingRemark(null);
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${REP_COLORS[lead.assignedTo] ?? "bg-slate-100 text-slate-700"}`}>
            {getInitials(lead.name)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">{lead.name}</h3>
              <StatusBadge status={lead.status} />
              <PriorityDot priority={lead.priority} />
            </div>
            <p className="text-sm text-muted-foreground">{lead.company}</p>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {LEAD_SOURCE_LABELS[lead.source]}
              </span>
              {isRefreshing && <span>Syncing...</span>}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
          Close
        </button>
      </div>

      <div className="border-b border-border px-6">
        <div className="flex flex-wrap gap-2 py-3">
          {TABS.map((tab) => {
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

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {activeTab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-6">
              <div className="grid gap-4 lg:grid-cols-2">
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
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project</p>
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
                    <div className="rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Community</p>
                      <p className="text-sm font-medium">{lead.community ?? "-"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Location</p>
                      <p className="text-sm font-medium">{lead.projectLocation ?? "-"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/10 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source & Campaign</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Meta Lead Id</p>
                    <p className="text-sm font-medium">{lead.metaLeadId ?? "-"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Meta Form Id</p>
                    <p className="text-sm font-medium">{lead.metaFormId ?? "-"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Meta Ad Id</p>
                    <p className="text-sm font-medium">{lead.metaAdId ?? "-"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Ad Set</p>
                    <p className="text-sm font-medium">{lead.adSetName ?? "-"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Campaign</p>
                    <p className="text-sm font-medium">{lead.campaignName ?? "-"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Captured</p>
                    <p className="text-sm font-medium">{lead.sourceCreatedAt ? fmtDateTime(lead.sourceCreatedAt) : "-"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/10 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes & Follow-up</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Follow Up At</p>
                    <p className="text-sm font-medium">{lead.followUpAt ? fmtDateTime(lead.followUpAt) : "-"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Last Contacted</p>
                    <p className="text-sm font-medium">{lead.lastContactedAt ? fmtDateTime(lead.lastContactedAt) : "-"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2 sm:col-span-2">
                    <p className="text-[11px] text-muted-foreground">Lead Notes</p>
                    <p className="text-sm font-medium">{lead.notes || "-"}</p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/10 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assignment</p>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Owner</p>
                    <div className="mt-1 flex items-center gap-2">
                      <RepAvatar name={assignedLabel} />
                      <p className="text-sm font-medium">{assignedLabel}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  <select
                    value={draftAssigneeValue}
                    onChange={(e) => setDraftAssignee({ leadId: lead.id, value: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-sky-500"
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
                      const assignee = assignees.find((a) => a.name === draftAssigneeValue);
                      if (assignee) {
                        onAssignLead(assignee);
                      }
                    }}
                    disabled={isAssigning || !draftAssigneeValue || draftAssigneeValue === lead.assignedTo}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAssigning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save Assignment
                  </button>
                  {assignError && <p className="text-xs font-medium text-red-600">{assignError}</p>}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/10 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pipeline</p>
                <PipelineProgress status={lead.status} />
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="rounded-lg border border-border bg-background px-2 py-2">
                    <p className="text-[11px] text-muted-foreground">Est. Value</p>
                    <p className="text-sm font-semibold text-emerald-600">{fmt(lead.estimatedValue)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-2 py-2">
                    <p className="text-[11px] text-muted-foreground">Created</p>
                    <p className="text-sm font-semibold">{fmtDate(lead.createdAt)}</p>
                  </div>
                </div>
                {!isConverted && !isLost && (
                  <div className="mt-3">
                    <p className="mb-2 text-[11px] text-muted-foreground">Move to Stage</p>
                    <div className="flex flex-wrap gap-2">
                      {stageTargets.map((s) => (
                        <button
                          key={s}
                          onClick={() => onStatusChange(s)}
                          disabled={isUpdating}
                          className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                        >
                          {LEAD_STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-muted/10 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</p>
                <div className="flex items-center justify-between gap-3">
                  <PriorityDot priority={lead.priority} />
                  {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-sky-600" />}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onPriorityChange(LeadPriority.HIGH)}
                    disabled={isUpdating || lead.priority === LeadPriority.HIGH}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-background px-2 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    High
                  </button>
                  <button
                    onClick={() => onPriorityChange(LeadPriority.MEDIUM)}
                    disabled={isUpdating || lead.priority === LeadPriority.MEDIUM}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-background px-2 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => onPriorityChange(LeadPriority.LOW)}
                    disabled={isUpdating || lead.priority === LeadPriority.LOW}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-background px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ArrowDownRight className="h-3.5 w-3.5" />
                    Low
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/10 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Build Quotation</p>
                <p className="text-xs text-muted-foreground">
                  Create a quote for this lead and keep deals moving.
                </p>
                <button
                  onClick={onBuildQuote}
                  disabled={!canBuildQuote}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Build Quotation
                </button>
              </div>

              <div className="rounded-xl border border-border bg-muted/10 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags</p>
                {lead.tags.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No tags yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {lead.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs">
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={onLogStageEntry}
                disabled={isUpdating}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Add Stage Entry
              </button>
            </div>
            {historyStages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                No stage history yet for this lead.
              </div>
            ) : (
              historyStages.map((stage, index) => (
                <div key={stage.status} className="relative pl-10">
                  {index < historyStages.length - 1 ? (
                    <div className="absolute left-[17px] top-10 h-[calc(100%+1rem)] w-px bg-border" />
                  ) : null}
                  <div className="absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-700">
                    <GitBranch className="h-4 w-4" />
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {LEAD_STATUS_LABELS[stage.status]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {stage.entries.length} {stage.entries.length === 1 ? "entry" : "entries"}
                        </p>
                      </div>
                      <span className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                        First reached {fmtDateTime(stage.entries[0]?.changedAt)}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {stage.entries.map((entry, entryIndex) => (
                        <div key={entry.id} className="rounded-xl border border-border bg-muted/10 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {entry.fromStatus
                                  ? `${LEAD_STATUS_LABELS[entry.fromStatus]} -> ${LEAD_STATUS_LABELS[entry.toStatus]}`
                                  : `Entered ${LEAD_STATUS_LABELS[entry.toStatus]}`}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {entry.changedByName ?? "System"} on {fmtDateTime(entry.changedAt)}
                              </p>
                            </div>
                            <span className="rounded-full bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground">
                              Entry {entryIndex + 1}
                            </span>
                          </div>
                          {entry.note ? (
                            <p className="mt-3 rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2 text-sm text-slate-700">
                              {entry.note}
                            </p>
                          ) : (
                            <p className="mt-3 text-xs text-muted-foreground">
                              No transition note was captured for this move.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "notes" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add Remark</p>
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

            <div className="space-y-3">
              {latestRemarks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                  No remarks yet. Add the first remark to start the audit trail.
                </div>
              ) : (
                latestRemarks.map((remark) => {
                  const isEditing = editingRemark?.id === remark.id;
                  return (
                    <div key={remark.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{remark.createdBy}</p>
                          <p className="text-[11px] text-muted-foreground">Added {fmtDateTime(remark.createdAt)}</p>
                        </div>
                        {!isEditing ? (
                          <button
                            onClick={() => startEditRemark(remark.id, remark.latest)}
                            disabled={isCreatingRemark || editingRemarkId === remark.id}
                            className="text-xs font-medium text-sky-600 hover:underline disabled:opacity-50"
                          >
                            Edit
                          </button>
                        ) : null}
                      </div>
                      {isEditing ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            rows={3}
                            value={editingRemark.value}
                            onChange={(e) => setEditingRemark((prev) => (prev ? { ...prev, value: e.target.value } : prev))}
                            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-sky-500"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={cancelEditRemark}
                              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveEditRemark}
                              disabled={editingRemarkId === remark.id}
                              className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-foreground">{remark.latest || "-"}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="space-y-4">
            {lead.activities.length === 0 && lead.contactRecordings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                No activity yet for this lead.
              </div>
            ) : null}

            {lead.activities.length > 0 && (
              <div className="space-y-3">
                {lead.activities.map((activity) => (
                  <div key={activity.id} className={`rounded-xl border p-3 text-sm ${getActivityTone(activity)}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{activity.createdBy}</p>
                        <p className="text-xs opacity-80">{fmtDateTime(activity.createdAt)}</p>
                      </div>
                      <span className="text-[11px] uppercase tracking-wider opacity-70">{activity.type.replace(/_/g, " ")}</span>
                    </div>
                    <p className="mt-2 text-sm">{activity.content}</p>
                  </div>
                ))}
              </div>
            )}

            {lead.contactRecordings.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/10 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact Recordings</p>
                <div className="space-y-3">
                  {lead.contactRecordings.map((recording) => (
                    <div key={recording.id} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{recording.createdBy}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {fmtDateTime(recording.contactedAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium">{recording.remarksSummary || "No summary"}</p>
                      {recording.conversationSummary && (
                        <p className="mt-1 text-xs text-muted-foreground">{recording.conversationSummary}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border px-6 py-4">
        {!isConverted && !isLost && (
          <button
            onClick={onConvert}
            disabled={isUpdating || !canConvert}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow"
          >
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
            Convert to Opportunity
          </button>
        )}
        {isConverted && (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Converted to Opportunity
          </div>
        )}
        {isLost && (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700">
            <XCircle className="h-4 w-4" />
            Lead Marked as Lost
          </div>
        )}
      </div>
    </div>
  );
}

