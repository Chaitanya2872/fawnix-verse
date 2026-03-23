
"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
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
  useLeads,
  useImportLeads,
  useUpdateLead,
} from "./hooks";
import { LeadsLayout } from "./layout";
import { useCurrentUser } from "@/modules/auth/hooks";
import { RowActions } from "./components/RowActions";
import { LeadDetailPanel } from "./components/LeadDetailPanel";
import { fmt, PriorityDot, REP_COLORS, StatusBadge, getInitials } from "./lead-ui";

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
  icon: React.ReactNode;
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
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h3 className="text-base font-semibold">Move to {LEAD_STATUS_LABELS[targetStatus]}</h3>
        <p className="mt-1 text-xs text-muted-foreground">A remark is required to update the stage.</p>
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
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [quickView, setQuickView] = useState<"ALL" | "MY_QUEUE" | "UNASSIGNED" | "NEEDS_CONTACT" | "FOLLOW_UP" | "CUSTOM">("ALL");
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
  const [whatsappToast, setWhatsappToast] = useState<{
    sent: boolean;
    reason: string | null;
    leadName: string;
    assigneeName: string;
  } | null>(null);

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
      const updateData: LeadUpdateData = { status };
      if (status === LeadStatus.CONVERTED) {
        updateData.convertedAt = new Date().toISOString();
      }
      await updateLead.mutateAsync({ id: lead.id, data: updateData });
      await createLeadRemark.mutateAsync({ id: lead.id, input: { content: remark } });
      closeStageUpdateDialog();
    } catch (err) {
      setStageUpdateError(err instanceof Error ? err.message : "Failed to update lead stage.");
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
      openStageUpdateDialog(lead, LeadStatus.CONVERTED);
      return;
    }
    openStageUpdateDialog(lead, status);
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
          setWhatsappToast({
            sent: Boolean(log?.sent),
            reason: log?.reason ?? null,
            leadName: updatedLead.name,
            assigneeName: assignee.name,
          });
          window.setTimeout(() => setWhatsappToast(null), 6000);
        },
      }
    );
  }

  function handleAddRemark(id: string, content: string) {
    createLeadRemark.mutate({ id, input: { content } });
  }

  function handleEditRemark(id: string, remarkId: string, content: string) {
    editLeadRemark.mutate({ id, remarkId, input: { content } });
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
  const assignError = assignLead.error instanceof Error ? assignLead.error.message : null;
  const remarkError = createLeadRemark.error instanceof Error
    ? createLeadRemark.error.message
    : editLeadRemark.error instanceof Error
      ? editLeadRemark.error.message
      : null;
  return (
    <>
      {isDetailView && selectedLead ? (
        <LeadDetailPanel
          lead={selectedLead}
          assignees={assignees}
          onClose={() => navigate("/crm/leads")}
          onStatusChange={(s) => handleStatusChange(selectedLead, s)}
          onConvert={() => openStageUpdateDialog(selectedLead, LeadStatus.CONVERTED)}
          onAssignLead={(assignee) => handleAssignLead(selectedLead.id, assignee)}
          onAddRemark={(content) => handleAddRemark(selectedLead.id, content)}
          onEditRemark={(remarkId, content) => handleEditRemark(selectedLead.id, remarkId, content)}
          isUpdating={updateLead.isPending}
          isAssigning={assignLead.isPending}
          isCreatingRemark={createLeadRemark.isPending}
          editingRemarkId={editLeadRemark.variables?.remarkId ?? null}
          isRefreshing={leadDetail.isFetching}
          assignError={assignError}
          remarkError={remarkError}
        />
      ) : (
        <>
          {whatsappToast ? (
            <div className="fixed bottom-6 right-6 z-50 w-[320px] rounded-2xl border px-4 py-3 shadow-xl border-emerald-200 bg-emerald-50 text-emerald-800">
              <p className="text-sm font-semibold">WhatsApp Assignment</p>
              <p className="mt-1 text-xs">
                {whatsappToast.sent
                  ? `WhatsApp sent to ${whatsappToast.assigneeName} for ${whatsappToast.leadName}.`
                  : "WhatsApp status unavailable. Check CRM service logs."}
              </p>
            </div>
          ) : null}

          <LeadsLayout actionButton={(
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={openImportDialog} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground">
                <FileText className="mr-2 inline h-3.5 w-3.5" />
                Import
              </button>
              <button onClick={openCreateDialog} className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700">
                <Plus className="mr-2 inline h-3.5 w-3.5" />
                Create Lead
              </button>
            </div>
          )}>
            <div className="grid gap-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <StatCard label="Total Leads" value={data?.total ?? "-"} sub="All statuses" icon={<Users className="h-5 w-5 text-sky-600" />} accent="bg-sky-50 dark:bg-sky-950" />
                  <StatCard label="Pipeline Value" value={fmt(summary.totalPipelineValue)} sub={`${summary.qualifiedCount} qualified`} icon={<TrendingUp className="h-5 w-5 text-violet-600" />} accent="bg-violet-50 dark:bg-violet-950" />
                  <StatCard label="New Leads" value={summary.newCount} sub="Uncontacted" icon={<Sparkles className="h-5 w-5 text-amber-600" />} accent="bg-amber-50 dark:bg-amber-950" />
                  <StatCard label="Converted" value={summary.convertedCount} sub="This period" icon={<Zap className="h-5 w-5 text-emerald-600" />} accent="bg-emerald-50 dark:bg-emerald-950" />
                </div>

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

                <div className="flex flex-col gap-3">
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
                      <div className="flex items-end">
                        <button onClick={() => setFilter({ search: "", status: "ALL", source: "ALL", assignedTo: "", priority: "ALL", page: 1, pageSize: PAGE_SIZE })} className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
                          Clear All
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
            </div>
          </LeadsLayout>

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
      )}
    </>
  );
}
