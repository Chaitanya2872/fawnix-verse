import React, { useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Mail,
  Phone,
  XCircle,
} from "lucide-react";
import {
  type AssigneeOption,
  type Lead,
  LeadStatus,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_ORDER,
} from "../types";
import {
  fmt,
  fmtDate,
  fmtDateTime,
  getDrawerStageTargets,
  getInitials,
  PipelineProgress,
  PriorityDot,
  RepAvatar,
  REP_COLORS,
  StatusBadge,
} from "../lead-ui";

export function LeadDetailPanel({
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
  const draftAssigneeValue = draftAssignee?.leadId === lead.id ? draftAssignee.value : lead.assignedTo;
  const [remarkInput, setRemarkInput] = useState("");
  const tabs = [
    { id: "contact", label: "Contact Details" },
    { id: "remarks", label: "Remarks" },
    { id: "other", label: "Other Details" },
  ] as const;
  type LeadTab = (typeof tabs)[number]["id"];
  const [activeTab, setActiveTab] = useState<LeadTab>("contact");

  function handleAddRemark() {
    const nextRemark = remarkInput.trim();
    if (!nextRemark) return;
    onAddRemark(nextRemark);
    setRemarkInput("");
  }

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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-6">
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

              {activeTab === "remarks" && (
                <div className="space-y-4">
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

                  <div className="space-y-3">
                    {lead.remarks.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                        No remarks yet. Add the first remark to start the audit trail.
                      </div>
                    ) : (
                      lead.remarks.map((remark) => (
                        <div key={remark.id} className="rounded-xl border border-border bg-card p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">{remark.createdBy}</p>
                              <p className="text-[11px] text-muted-foreground">Added {fmtDateTime(remark.createdAt)}</p>
                            </div>
                            <button
                              onClick={() => onEditRemark(remark.id, remark.versions[remark.versions.length - 1]?.content ?? "")}
                              disabled={isCreatingRemark || editingRemarkId === remark.id}
                              className="text-xs font-medium text-sky-600 hover:underline disabled:opacity-50"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ))
                    )}
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
                            onChange={(e) => setDraftAssignee({ leadId: lead.id, value: e.target.value })}
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
                              const assignee = assignees.find((a) => a.name === draftAssigneeValue);
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
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all hover:scale-105 disabled:opacity-50 ${REP_COLORS[lead.assignedTo] ? "border-border" : ""}`}
                            >
                              {LEAD_STATUS_LABELS[s]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <aside className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/10 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead Snapshot</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Owner</span>
                    <span className="text-sm font-semibold">{assignedLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <StatusBadge status={lead.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Priority</span>
                    <PriorityDot priority={lead.priority} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Source</span>
                    <span className="text-sm font-semibold">{LEAD_SOURCE_LABELS[lead.source]}</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
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
