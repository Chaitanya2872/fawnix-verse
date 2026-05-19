"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Columns3,
  FileText,
  Flag,
  LayoutGrid,
  ListChecks,
  Loader2,
  MessageSquare,
  PauseCircle,
  Plus,
  Search,
  SquareKanban,
  Timer,
  Trash2,
  User2,
  Workflow,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { useCurrentUser } from "@/modules/auth/hooks";
import {
  useAddChecklistItem,
  useAddTaskComment,
  useApproveTask,
  useAssignTask,
  useCreateTask,
  useDeleteTask,
  useRejectTask,
  useStartTaskTimer,
  useStopTaskTimer,
  useTask,
  useTaskDashboard,
  useTasks,
  useTaskUsers,
  useUpdateChecklistItem,
  useUpdateTask,
} from "./hooks";
import type {
  TaskApprovalStatus,
  TaskDetail,
  TaskFilter,
  TaskPriority,
  TaskRequest,
  TaskStatus,
  TaskSummary,
  TaskVisibility,
} from "./types";
import {
  TASK_APPROVAL_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_VISIBILITIES,
} from "./types";

type TaskView = "table" | "kanban" | "calendar" | "timeline" | "my" | "team";

type TaskFormState = {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate: string;
  dueDate: string;
  projectRef: string;
  moduleRef: string;
  estimatedHours: string;
  approvalRequired: boolean;
  approvalStatus: TaskApprovalStatus;
  visibility: TaskVisibility;
  reminderMinutesBefore: string;
  workflowName: string;
  assignedToId: string;
  approverId: string;
  tags: string;
  checklist: string;
  attachments: string;
};

const defaultFilter: TaskFilter = {
  search: "",
  status: "",
  priority: "",
  scope: "all",
  assigneeId: "",
  projectRef: "",
  moduleRef: "",
  approvalStatus: "",
  overdue: false,
  dueToday: false,
  page: 1,
  pageSize: 12,
};

const defaultForm: TaskFormState = {
  title: "",
  description: "",
  priority: "MEDIUM",
  status: "PENDING",
  startDate: "",
  dueDate: "",
  projectRef: "",
  moduleRef: "",
  estimatedHours: "",
  approvalRequired: false,
  approvalStatus: "NOT_REQUIRED",
  visibility: "TEAM",
  reminderMinutesBefore: "",
  workflowName: "",
  assignedToId: "",
  approverId: "",
  tags: "",
  checklist: "",
  attachments: "",
};

function toDisplay(value: string) {
  return value.toLowerCase().replace(/_/g, " ");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return format(parseISO(value), "dd MMM yyyy");
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return format(parseISO(value), "dd MMM yyyy, hh:mm a");
}

function formatHours(value?: number | null) {
  return `${Number(value ?? 0).toFixed(2)}h`;
}

function priorityTone(priority: TaskPriority) {
  return {
    LOW: "bg-slate-100 text-slate-700",
    MEDIUM: "bg-blue-50 text-blue-700",
    HIGH: "bg-amber-50 text-amber-700",
    CRITICAL: "bg-rose-50 text-rose-700",
  }[priority];
}

function statusTone(status: TaskStatus) {
  return {
    PENDING: "bg-slate-100 text-slate-700",
    ASSIGNED: "bg-indigo-50 text-indigo-700",
    IN_PROGRESS: "bg-blue-50 text-blue-700",
    ON_HOLD: "bg-amber-50 text-amber-700",
    BLOCKED: "bg-rose-50 text-rose-700",
    UNDER_REVIEW: "bg-violet-50 text-violet-700",
    COMPLETED: "bg-emerald-50 text-emerald-700",
    CANCELLED: "bg-slate-200 text-slate-600",
  }[status];
}

function getTodayValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function buildTaskRequest(
  form: TaskFormState,
  users: Array<{ id: string; name: string; email: string }>
): TaskRequest {
  const assignee = users.find((user) => user.id === form.assignedToId);
  const approver = users.find((user) => user.id === form.approverId);

  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    priority: form.priority,
    status: form.status,
    startDate: form.startDate || null,
    dueDate: form.dueDate || null,
    projectRef: form.projectRef.trim() || null,
    moduleRef: form.moduleRef.trim() || null,
    estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : 0,
    approvalRequired: form.approvalRequired,
    approvalStatus: form.approvalRequired ? form.approvalStatus : "NOT_REQUIRED",
    visibility: form.visibility,
    reminderMinutesBefore: form.reminderMinutesBefore ? Number(form.reminderMinutesBefore) : null,
    workflowName: form.workflowName.trim() || null,
    assignedToId: assignee?.id ?? null,
    assignedToName: assignee?.name ?? null,
    assignedToEmail: assignee?.email ?? null,
    assignedTeamName: null,
    approverId: approver?.id ?? null,
    approverName: approver?.name ?? null,
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((name) => ({ name })),
    checklistItems: form.checklist
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((label) => ({ label })),
    attachments: form.attachments
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [fileName, fileUrl] = line.split("|").map((part) => part.trim());
        return { fileName: fileName || fileUrl, fileUrl };
      })
      .filter((attachment) => attachment.fileName && attachment.fileUrl),
  };
}

function buildInlineUpdate(task: TaskSummary, patch: Partial<TaskRequest>): TaskRequest {
  return {
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    startDate: task.startDate,
    dueDate: task.dueDate,
    projectRef: task.projectRef,
    moduleRef: task.moduleRef,
    estimatedHours: task.estimatedHours,
    approvalStatus: task.approvalStatus,
    visibility: task.visibility,
    assignedToId: task.assignedToId,
    assignedToName: task.assignedToName,
    assignedTeamName: task.assignedTeamName,
    tags: task.tags.map((name) => ({ name })),
    ...patch,
  };
}

function taskToForm(task: TaskDetail | null): TaskFormState {
  if (!task) return defaultForm;
  const summary = task.task;
  return {
    title: summary.title,
    description: summary.description ?? "",
    priority: summary.priority,
    status: summary.status,
    startDate: summary.startDate ?? "",
    dueDate: summary.dueDate ?? "",
    projectRef: summary.projectRef ?? "",
    moduleRef: summary.moduleRef ?? "",
    estimatedHours: String(summary.estimatedHours ?? ""),
    approvalRequired: summary.approvalStatus !== "NOT_REQUIRED",
    approvalStatus: summary.approvalStatus,
    visibility: summary.visibility,
    reminderMinutesBefore: "",
    workflowName: "",
    assignedToId: summary.assignedToId ?? "",
    approverId: "",
    tags: summary.tags.join(", "),
    checklist: task.checklistItems.map((item) => item.label).join("\n"),
    attachments: task.attachments.map((item) => `${item.fileName} | ${item.fileUrl}`).join("\n"),
  };
}

function KpiCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "default" | "danger" | "success" | "accent";
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50/70"
      : tone === "success"
      ? "border-emerald-200 bg-emerald-50/70"
      : tone === "accent"
      ? "border-blue-200 bg-blue-50/70"
      : "border-slate-200 bg-white";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  width = "max-w-2xl",
}: {
  open: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="flex-1 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`h-full w-full ${width} overflow-y-auto border-l border-slate-200 bg-white shadow-2xl`}>
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <p className="text-base font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{body}</p>
    </div>
  );
}

export default function TaskManagementPage() {
  const [view, setView] = useState<TaskView>("table");
  const [filter, setFilter] = useState<TaskFilter>(defaultFilter);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [checklistDraft, setChecklistDraft] = useState("");
  const [manualLogOpen, setManualLogOpen] = useState(false);
  const [manualStartedAt, setManualStartedAt] = useState(`${getTodayValue()}T09:00`);
  const [manualEndedAt, setManualEndedAt] = useState(`${getTodayValue()}T10:00`);
  const [manualNote, setManualNote] = useState("");
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskFormState>(defaultForm);

  const { data: currentUser } = useCurrentUser();
  const dashboardQuery = useTaskDashboard();
  const tasksQuery = useTasks(filter);
  const detailQuery = useTask(detailTaskId);
  const usersQuery = useTaskUsers();

  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();
  const commentMutation = useAddTaskComment();
  const checklistMutation = useAddChecklistItem();
  const checklistToggleMutation = useUpdateChecklistItem();
  const assignMutation = useAssignTask();
  const approveMutation = useApproveTask();
  const rejectMutation = useRejectTask();
  const startTimerMutation = useStartTaskTimer();
  const stopTimerMutation = useStopTaskTimer();

  const tasks = tasksQuery.data?.data ?? [];
  const total = tasksQuery.data?.total ?? 0;
  const dashboard = dashboardQuery.data;
  const users = useMemo(
    () =>
      (usersQuery.data ?? []).map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      })),
    [usersQuery.data]
  );
  const detail = detailQuery.data ?? null;

  useEffect(() => {
    if (editingTaskId && detail && detail.task.id === editingTaskId) {
      setForm(taskToForm(detail));
    }
  }, [detail, editingTaskId]);

  useEffect(() => {
    if (view === "my") {
      setFilter((prev) => ({ ...prev, scope: "my", page: 1 }));
    } else if (view === "team") {
      setFilter((prev) => ({ ...prev, scope: "team", page: 1 }));
    }
  }, [view]);

  const groupedKanban = useMemo(() => {
    return TASK_STATUSES.reduce<Record<string, TaskSummary[]>>((acc, status) => {
      acc[status] = tasks.filter((task) => task.status === status);
      return acc;
    }, {});
  }, [tasks]);

  const upcomingDates = useMemo(() => {
    return [...tasks]
      .filter((task) => task.dueDate)
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  }, [tasks]);

  function resetForm() {
    setForm(defaultForm);
    setEditingTaskId(null);
  }

  function openCreate() {
    resetForm();
    setFormOpen(true);
  }

  function openEdit(taskId: string) {
    setEditingTaskId(taskId);
    setDetailTaskId(taskId);
    setFormOpen(true);
  }

  function handleSubmitForm(event: React.FormEvent) {
    event.preventDefault();
    const payload = buildTaskRequest(form, users);
    if (!payload.title.trim()) {
      toast.error("Task title is required.");
      return;
    }

    const onSuccess = () => {
      toast.success(editingTaskId ? "Task updated." : "Task created.");
      setFormOpen(false);
      resetForm();
    };
    const onError = (error: Error) => toast.error(error.message);

    if (editingTaskId) {
      updateMutation.mutate({ id: editingTaskId, payload }, { onSuccess, onError });
    } else {
      createMutation.mutate(payload, { onSuccess, onError });
    }
  }

  function handleInlineUpdate(task: TaskSummary, patch: Partial<TaskRequest>, successMessage: string) {
    updateMutation.mutate(
      { id: task.id, payload: buildInlineUpdate(task, patch) },
      {
        onSuccess: () => toast.success(successMessage),
        onError: (error) => toast.error(error.message),
      }
    );
  }

  function handleBulkStatusUpdate(status: TaskStatus) {
    const targets = tasks.filter((task) => selectedIds.includes(task.id));
    if (!targets.length) return;
    Promise.all(
      targets.map(
        (task) =>
          new Promise<void>((resolve, reject) => {
            updateMutation.mutate(
              { id: task.id, payload: buildInlineUpdate(task, { status }) },
              { onSuccess: () => resolve(), onError: reject }
            );
          })
      )
    )
      .then(() => {
        toast.success(`Updated ${targets.length} tasks.`);
        setSelectedIds([]);
      })
      .catch((error: Error) => toast.error(error.message));
  }

  function handleTaskDelete(taskId: string) {
    deleteMutation.mutate(taskId, {
      onSuccess: () => {
        toast.success("Task deleted.");
        if (detailTaskId === taskId) {
          setDetailTaskId(null);
        }
      },
      onError: (error) => toast.error(error.message),
    });
  }

  function handleCommentSubmit() {
    if (!detailTaskId || !commentDraft.trim()) return;
    commentMutation.mutate(
      { id: detailTaskId, message: commentDraft.trim() },
      {
        onSuccess: () => {
          toast.success("Comment added.");
          setCommentDraft("");
        },
        onError: (error) => toast.error(error.message),
      }
    );
  }

  function handleChecklistAdd() {
    if (!detailTaskId || !checklistDraft.trim()) return;
    checklistMutation.mutate(
      { id: detailTaskId, label: checklistDraft.trim() },
      {
        onSuccess: () => {
          toast.success("Checklist item added.");
          setChecklistDraft("");
        },
        onError: (error) => toast.error(error.message),
      }
    );
  }

  function handleChecklistToggle(itemId: string, label: string, completed: boolean) {
    if (!detailTaskId) return;
    checklistToggleMutation.mutate(
      { id: detailTaskId, itemId, payload: { label, completed } },
      { onError: (error) => toast.error(error.message) }
    );
  }

  function handleAssignment(task: TaskSummary, userId: string) {
    const assignee = users.find((item) => item.id === userId);
    if (!assignee) return;
    assignMutation.mutate(
      {
        id: task.id,
        reassign: Boolean(task.assignedToId),
        payload: {
          assignedToId: assignee.id,
          assignedToName: assignee.name,
          assignedToEmail: assignee.email,
          preventDuplicateActiveAssignments: true,
        },
      },
      {
        onSuccess: () => toast.success(task.assignedToId ? "Task reassigned." : "Task assigned."),
        onError: (error) => toast.error(error.message),
      }
    );
  }

  function handleApproval(taskId: string, mode: "approve" | "reject" | "rework") {
    if (mode === "approve") {
      approveMutation.mutate(
        { id: taskId },
        { onSuccess: () => toast.success("Task approved."), onError: (error) => toast.error(error.message) }
      );
      return;
    }
    if (mode === "rework") {
      approveMutation.mutate(
        { id: taskId, reworkRequested: true },
        { onSuccess: () => toast.success("Rework requested."), onError: (error) => toast.error(error.message) }
      );
      return;
    }
    rejectMutation.mutate(taskId, {
      onSuccess: () => toast.success("Task rejected."),
      onError: (error) => toast.error(error.message),
    });
  }

  function handleStartTimer(taskId: string) {
    startTimerMutation.mutate(taskId, {
      onSuccess: () => toast.success("Timer started."),
      onError: (error) => toast.error(error.message),
    });
  }

  function handleStopTimer(taskId: string) {
    stopTimerMutation.mutate(
      { id: taskId },
      {
        onSuccess: () => toast.success("Timer stopped."),
        onError: (error) => toast.error(error.message),
      }
    );
  }

  function handleManualLogSubmit() {
    if (!detailTaskId) return;
    stopTimerMutation.mutate(
      {
        id: detailTaskId,
        payload: {
          startedAt: new Date(manualStartedAt).toISOString(),
          endedAt: new Date(manualEndedAt).toISOString(),
          note: manualNote.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Manual time entry saved.");
          setManualLogOpen(false);
          setManualNote("");
        },
        onError: (error) => toast.error(error.message),
      }
    );
  }

  const pageTitle = view === "my" ? "My Tasks" : view === "team" ? "Team Tasks" : "Task Management";

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Execution Workspace</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{pageTitle}</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-500">
                  Drive personal, team, and project-linked work with approvals, timeline tracking, and operational visibility.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFilter((prev) => ({ ...prev, dueToday: !prev.dueToday, overdue: false, page: 1 }))}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold ${filter.dueToday ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700"}`}
                >
                  Due Today
                </button>
                <button
                  type="button"
                  onClick={() => setFilter((prev) => ({ ...prev, overdue: !prev.overdue, dueToday: false, page: 1 }))}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold ${filter.overdue ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-700"}`}
                >
                  Overdue
                </button>
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  New Task
                </button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.4fr,0.6fr]">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Total Tasks" value={dashboard?.kpis.totalTasks ?? 0} hint="All visible work items" />
                <KpiCard label="In Progress" value={dashboard?.kpis.inProgress ?? 0} hint="Execution in motion" tone="accent" />
                <KpiCard label="Completed" value={dashboard?.kpis.completed ?? 0} hint="Closed successfully" tone="success" />
                <KpiCard label="Overdue" value={dashboard?.kpis.overdue ?? 0} hint="Needs intervention" tone="danger" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Assigned vs Completed</p>
                    <p className="text-xs text-slate-500">Quick throughput pulse</p>
                  </div>
                  <Workflow className="h-5 w-5 text-slate-400" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Assigned</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{dashboard?.assignmentMetrics.assigned ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{dashboard?.assignmentMetrics.completed ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
              <div className="rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-5 py-4">
                  <p className="text-sm font-semibold text-slate-900">Recent Activity Timeline</p>
                </div>
                <div className="space-y-4 px-5 py-4">
                  {dashboardQuery.isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading timeline...</div>
                  ) : dashboard?.recentActivity.length ? (
                    dashboard.recentActivity.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
                        <div className="min-w-0">
                          <p className="text-sm text-slate-800">{item.message}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {(item.actorName || "System")} • {formatDistanceToNowStrict(parseISO(item.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No recent task activity yet.</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <p className="text-sm font-semibold text-slate-900">Upcoming Deadlines</p>
                  </div>
                  <div className="space-y-3 px-5 py-4">
                    {dashboard?.upcomingDeadlines.length ? (
                      dashboard.upcomingDeadlines.slice(0, 5).map((task) => (
                        <button
                          type="button"
                          key={task.id}
                          onClick={() => setDetailTaskId(task.id)}
                          className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-left transition-colors hover:bg-slate-100"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{task.title}</p>
                            <p className="mt-1 text-xs text-slate-500">{task.taskCode} • {task.assignedToName || "Unassigned"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-slate-700">{formatDate(task.dueDate)}</p>
                            <p className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${priorityTone(task.priority)}`}>
                              {toDisplay(task.priority)}
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No upcoming deadlines.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <p className="text-sm font-semibold text-slate-900">Team Workload Overview</p>
                  </div>
                  <div className="space-y-3 px-5 py-4">
                    {dashboard?.workload.length ? (
                      dashboard.workload.slice(0, 5).map((member) => (
                        <div key={member.assigneeId} className="rounded-xl bg-slate-50 px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{member.assigneeName}</p>
                              <p className="text-xs text-slate-500">{member.assigned} assigned • {member.completed} completed</p>
                            </div>
                            <p className="text-xs font-semibold text-slate-700">{formatHours(member.loggedHours)}</p>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${Math.min(100, member.assigned ? (member.completed / member.assigned) * 100 : 0)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Workload metrics will appear once tasks are assigned.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {[
                    ["table", "Table", LayoutGrid],
                    ["kanban", "Kanban", SquareKanban],
                    ["calendar", "Calendar", Calendar],
                    ["timeline", "Timeline", Columns3],
                    ["my", "My Tasks", User2],
                    ["team", "Team Tasks", ArrowRightLeft],
                  ].map(([key, label, Icon]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setView(key as TaskView)}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                        view === key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  <label className="relative xl:col-span-2">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={filter.search}
                      onChange={(event) => setFilter((prev) => ({ ...prev, search: event.target.value, page: 1 }))}
                      placeholder="Search title, code, assignee"
                      className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-sm outline-none focus:border-blue-400"
                    />
                  </label>
                  <select
                    value={filter.status}
                    onChange={(event) => setFilter((prev) => ({ ...prev, status: event.target.value, page: 1 }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="">All Statuses</option>
                    {TASK_STATUSES.map((status) => <option key={status} value={status}>{toDisplay(status)}</option>)}
                  </select>
                  <select
                    value={filter.priority}
                    onChange={(event) => setFilter((prev) => ({ ...prev, priority: event.target.value, page: 1 }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="">All Priorities</option>
                    {TASK_PRIORITIES.map((priority) => <option key={priority} value={priority}>{toDisplay(priority)}</option>)}
                  </select>
                  <select
                    value={filter.assigneeId}
                    onChange={(event) => setFilter((prev) => ({ ...prev, assigneeId: event.target.value, page: 1 }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="">All Assignees</option>
                    {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setFilter(defaultFilter);
                      setView("table");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {selectedIds.length ? (
                <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
                  <span className="text-sm font-semibold text-slate-700">{selectedIds.length} selected</span>
                  <button type="button" onClick={() => handleBulkStatusUpdate("IN_PROGRESS")} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                    Move to In Progress
                  </button>
                  <button type="button" onClick={() => handleBulkStatusUpdate("COMPLETED")} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                    Mark Completed
                  </button>
                </div>
              ) : null}

              <div className="p-5">
                {tasksQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading tasks...</div>
                ) : tasksQuery.isError ? (
                  <EmptyState title="Tasks unavailable" body={tasksQuery.error instanceof Error ? tasksQuery.error.message : "Could not load tasks."} />
                ) : !tasks.length ? (
                  <EmptyState title="No tasks match these filters" body="Try a broader search, switch views, or create the first task in this workflow." />
                ) : view === "table" || view === "my" || view === "team" ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          {["", "Task", "Priority", "Status", "Due", "Assignee", "Hours", "Approval", "Actions"].map((heading) => (
                            <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{heading}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((task) => (
                          <tr key={task.id} className="border-b border-slate-100 align-top">
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(task.id)}
                                onChange={(event) =>
                                  setSelectedIds((prev) =>
                                    event.target.checked ? [...prev, task.id] : prev.filter((id) => id !== task.id)
                                  )
                                }
                                className="h-4 w-4 rounded border-slate-300"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <button type="button" onClick={() => setDetailTaskId(task.id)} className="text-left">
                                <p className="font-semibold text-slate-900">{task.title}</p>
                                <p className="mt-1 text-xs text-slate-500">{task.taskCode} • {task.projectRef || task.moduleRef || "General task"}</p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {task.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{tag}</span>
                                  ))}
                                </div>
                              </button>
                            </td>
                            <td className="px-4 py-4">
                              <select
                                value={task.priority}
                                onChange={(event) =>
                                  handleInlineUpdate(task, { priority: event.target.value as TaskPriority }, "Priority updated.")
                                }
                                className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${priorityTone(task.priority)}`}
                              >
                                {TASK_PRIORITIES.map((priority) => <option key={priority} value={priority}>{toDisplay(priority)}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-4">
                              <select
                                value={task.status}
                                onChange={(event) =>
                                  handleInlineUpdate(task, { status: event.target.value as TaskStatus }, "Status updated.")
                                }
                                className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${statusTone(task.status)}`}
                              >
                                {TASK_STATUSES.map((status) => <option key={status} value={status}>{toDisplay(status)}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-4">
                              <p className={`font-semibold ${task.overdue ? "text-rose-700" : "text-slate-900"}`}>{formatDate(task.dueDate)}</p>
                              <p className="mt-1 text-xs text-slate-500">{task.overdue ? "Overdue" : task.startDate ? `Starts ${formatDate(task.startDate)}` : "No start date"}</p>
                            </td>
                            <td className="px-4 py-4">
                              <select
                                value={task.assignedToId ?? ""}
                                onChange={(event) => handleAssignment(task, event.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700"
                              >
                                <option value="">Unassigned</option>
                                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-semibold text-slate-900">{formatHours(task.actualHours)}</p>
                              <p className="mt-1 text-xs text-slate-500">Est. {formatHours(task.estimatedHours)}</p>
                            </td>
                            <td className="px-4 py-4">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                {toDisplay(task.approvalStatus)}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => openEdit(task.id)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700">Edit</button>
                                <button type="button" onClick={() => handleStartTimer(task.id)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700">Start</button>
                                <button type="button" onClick={() => handleStopTimer(task.id)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700">Stop</button>
                                <button type="button" onClick={() => handleTaskDelete(task.id)} className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : view === "kanban" ? (
                  <div className="grid gap-4 xl:grid-cols-4">
                    {["PENDING", "IN_PROGRESS", "UNDER_REVIEW", "COMPLETED"].map((column) => (
                      <div
                        key={column}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          const task = tasks.find((item) => item.id === dragTaskId);
                          if (task && task.status !== column) {
                            handleInlineUpdate(task, { status: column as TaskStatus }, "Task moved.");
                          }
                          setDragTaskId(null);
                        }}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">{toDisplay(column)}</p>
                          <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500">
                            {groupedKanban[column]?.length ?? 0}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {(groupedKanban[column] ?? []).map((task) => (
                            <button
                              type="button"
                              key={task.id}
                              draggable
                              onDragStart={() => setDragTaskId(task.id)}
                              onClick={() => setDetailTaskId(task.id)}
                              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-transform hover:-translate-y-0.5"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${priorityTone(task.priority)}`}>
                                  {toDisplay(task.priority)}
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-slate-500">{task.taskCode} • {task.assignedToName || "Unassigned"}</p>
                              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                                <span>{task.checklistCompleted}/{task.checklistTotal} checklist</span>
                                <span>{formatDate(task.dueDate)}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : view === "calendar" ? (
                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {upcomingDates.map((task) => (
                      <button key={task.id} type="button" onClick={() => setDetailTaskId(task.id)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{formatDate(task.dueDate)}</p>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusTone(task.status)}`}>{toDisplay(task.status)}</span>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-900">{task.title}</p>
                        <p className="mt-2 text-xs text-slate-500">{task.assignedToName || "Unassigned"} • {task.projectRef || task.moduleRef || "General"}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingDates.map((task) => {
                      const start = task.startDate ? parseISO(task.startDate) : parseISO(task.dueDate || new Date().toISOString());
                      const end = task.dueDate ? parseISO(task.dueDate) : start;
                      const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1);
                      return (
                        <button key={task.id} type="button" onClick={() => setDetailTaskId(task.id)} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                            <div className="lg:w-72">
                              <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                              <p className="mt-1 text-xs text-slate-500">{task.taskCode} • {task.assignedToName || "Unassigned"}</p>
                            </div>
                            <div className="flex-1">
                              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, durationDays * 12)}%` }} />
                              </div>
                              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                <span>{formatDate(task.startDate)}</span>
                                <span>{formatDate(task.dueDate)}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {tasksQuery.data ? (
                <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500">
                    Showing <span className="font-semibold text-slate-900">{Math.min((filter.page - 1) * filter.pageSize + 1, total)}-{Math.min(filter.page * filter.pageSize, total)}</span> of{" "}
                    <span className="font-semibold text-slate-900">{total}</span> tasks
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={filter.page <= 1}
                      onClick={() => setFilter((prev) => ({ ...prev, page: prev.page - 1 }))}
                      className="rounded-xl border border-slate-200 p-2 text-slate-500 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-semibold text-slate-700">
                      Page {tasksQuery.data.page} of {tasksQuery.data.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={filter.page >= tasksQuery.data.totalPages}
                      onClick={() => setFilter((prev) => ({ ...prev, page: prev.page + 1 }))}
                      className="rounded-xl border border-slate-200 p-2 text-slate-500 disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Drawer
        open={formOpen}
        title={editingTaskId ? "Edit Task" : "Create Task"}
        subtitle="Use the compact drawer to manage task scope, assignment, approvals, and execution details."
        onClose={() => {
          setFormOpen(false);
          resetForm();
        }}
      >
        <form onSubmit={handleSubmitForm} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Task title</span>
              <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" required />
            </label>
            <label className="md:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Description</span>
              <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
            </label>
            <FieldSelect label="Priority" value={form.priority} onChange={(value) => setForm((prev) => ({ ...prev, priority: value as TaskPriority }))} options={TASK_PRIORITIES} />
            <FieldSelect label="Status" value={form.status} onChange={(value) => setForm((prev) => ({ ...prev, status: value as TaskStatus }))} options={TASK_STATUSES} />
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Start date</span>
              <input type="date" value={form.startDate} onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Due date</span>
              <input type="date" value={form.dueDate} onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Project</span>
              <input value={form.projectRef} onChange={(event) => setForm((prev) => ({ ...prev, projectRef: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Module</span>
              <input value={form.moduleRef} onChange={(event) => setForm((prev) => ({ ...prev, moduleRef: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Assignee</span>
              <select value={form.assignedToId} onChange={(event) => setForm((prev) => ({ ...prev, assignedToId: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400">
                <option value="">Unassigned</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Approver</span>
              <select value={form.approverId} onChange={(event) => setForm((prev) => ({ ...prev, approverId: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400">
                <option value="">No approver</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Estimated hours</span>
              <input type="number" min={0} step="0.25" value={form.estimatedHours} onChange={(event) => setForm((prev) => ({ ...prev, estimatedHours: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Reminder (minutes)</span>
              <input type="number" min={0} value={form.reminderMinutesBefore} onChange={(event) => setForm((prev) => ({ ...prev, reminderMinutesBefore: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
            </label>
            <FieldSelect label="Visibility" value={form.visibility} onChange={(value) => setForm((prev) => ({ ...prev, visibility: value as TaskVisibility }))} options={TASK_VISIBILITIES} />
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Workflow name</span>
              <input value={form.workflowName} onChange={(event) => setForm((prev) => ({ ...prev, workflowName: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
            </label>
            <label className="md:col-span-2 flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <input type="checkbox" checked={form.approvalRequired} onChange={(event) => setForm((prev) => ({ ...prev, approvalRequired: event.target.checked, approvalStatus: event.target.checked ? "PENDING_APPROVAL" : "NOT_REQUIRED" }))} />
              <div>
                <p className="text-sm font-semibold text-slate-900">Approval required</p>
                <p className="text-xs text-slate-500">Route task through a manager or admin review step.</p>
              </div>
            </label>
            {form.approvalRequired ? (
              <FieldSelect
                label="Approval status"
                value={form.approvalStatus}
                onChange={(value) => setForm((prev) => ({ ...prev, approvalStatus: value as TaskApprovalStatus }))}
                options={TASK_APPROVAL_STATUSES.filter((status) => status !== "NOT_REQUIRED")}
              />
            ) : null}
            <label className="md:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tags</span>
              <input value={form.tags} onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))} placeholder="priority, backend, customer" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
            </label>
            <label className="md:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Checklist</span>
              <textarea value={form.checklist} onChange={(event) => setForm((prev) => ({ ...prev, checklist: event.target.value }))} rows={4} placeholder="One item per line" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
            </label>
            <label className="md:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Attachments</span>
              <textarea value={form.attachments} onChange={(event) => setForm((prev) => ({ ...prev, attachments: event.target.value }))} rows={3} placeholder="Format: File Name | https://file-url" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
            </label>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={() => { setFormOpen(false); resetForm(); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingTaskId ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={Boolean(detailTaskId)}
        title={detail?.task.title ?? "Task details"}
        subtitle={detail?.task.taskCode ?? "Operational detail view"}
        onClose={() => setDetailTaskId(null)}
        width="max-w-3xl"
      >
        {detailQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading task details...</div>
        ) : detail ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityTone(detail.task.priority)}`}>{toDisplay(detail.task.priority)}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(detail.task.status)}`}>{toDisplay(detail.task.status)}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{toDisplay(detail.task.approvalStatus)}</span>
            </div>

            <Section title="Task Info" icon={FileText}>
              <div className="grid gap-4 md:grid-cols-3">
                <Info label="Assignee" value={detail.task.assignedToName || "Unassigned"} />
                <Info label="Project" value={detail.task.projectRef || "-"} />
                <Info label="Module" value={detail.task.moduleRef || "-"} />
                <Info label="Start" value={formatDate(detail.task.startDate)} />
                <Info label="Due" value={formatDate(detail.task.dueDate)} />
                <Info label="Actual" value={formatHours(detail.task.actualHours)} />
              </div>
              {detail.task.description ? <p className="mt-4 text-sm leading-6 text-slate-600">{detail.task.description}</p> : null}
            </Section>

            <Section title="Approval Actions" icon={CheckCircle2}>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => handleApproval(detail.task.id, "approve")} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Approve</button>
                <button type="button" onClick={() => handleApproval(detail.task.id, "rework")} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white">Request Rework</button>
                <button type="button" onClick={() => handleApproval(detail.task.id, "reject")} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Reject</button>
              </div>
            </Section>

            <Section title="Checklist" icon={ListChecks}>
              <div className="space-y-3">
                {detail.checklistItems.map((item) => (
                  <label key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3">
                    <input type="checkbox" checked={item.completed} onChange={(event) => handleChecklistToggle(item.id, item.label, event.target.checked)} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${item.completed ? "text-slate-400 line-through" : "text-slate-800"}`}>{item.label}</p>
                      {item.completedByName ? <p className="mt-1 text-xs text-slate-500">Completed by {item.completedByName}</p> : null}
                    </div>
                  </label>
                ))}
                <div className="flex gap-3">
                  <input value={checklistDraft} onChange={(event) => setChecklistDraft(event.target.value)} placeholder="Add checklist item" className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                  <button type="button" onClick={handleChecklistAdd} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Add</button>
                </div>
              </div>
            </Section>

            <Section title="Comments & Activity" icon={MessageSquare}>
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-3">
                  {detail.comments.map((comment) => (
                    <div key={comment.id} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-sm text-slate-800">{comment.message}</p>
                      <p className="mt-1 text-xs text-slate-500">{comment.authorName} • {formatDateTime(comment.createdAt)}</p>
                    </div>
                  ))}
                  <div className="flex flex-col gap-3">
                    <textarea value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} rows={3} placeholder="Add a comment" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                    <div className="flex justify-end">
                      <button type="button" onClick={handleCommentSubmit} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Post Comment</button>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {detail.activity.map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-800">{activity.message}</p>
                        <p className="mt-1 text-xs text-slate-500">{activity.actorName || "System"} • {formatDateTime(activity.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Attachments & Dependencies" icon={Workflow}>
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-3">
                  {detail.attachments.length ? detail.attachments.map((attachment) => (
                    <a key={attachment.id} href={attachment.fileUrl} target="_blank" rel="noreferrer" className="block rounded-xl border border-slate-200 px-3 py-3 hover:bg-slate-50">
                      <p className="text-sm font-semibold text-slate-900">{attachment.fileName}</p>
                      <p className="mt-1 text-xs text-slate-500">{attachment.fileUrl}</p>
                    </a>
                  )) : <p className="text-sm text-slate-500">No attachments.</p>}
                </div>
                <div className="space-y-3">
                  {detail.dependencies.length ? detail.dependencies.map((dependency) => (
                    <div key={dependency.id} className="rounded-xl border border-slate-200 px-3 py-3">
                      <p className="text-sm font-semibold text-slate-900">{dependency.title || dependency.taskCode || dependency.taskId}</p>
                      <p className="mt-1 text-xs text-slate-500">{dependency.taskCode || dependency.taskId}</p>
                    </div>
                  )) : <p className="text-sm text-slate-500">No dependencies linked.</p>}
                </div>
              </div>
            </Section>

            <Section title="Time Tracking" icon={Clock3}>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => handleStartTimer(detail.task.id)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Start Timer</button>
                <button type="button" onClick={() => handleStopTimer(detail.task.id)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Stop Timer</button>
                <button type="button" onClick={() => setManualLogOpen((prev) => !prev)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Manual Entry</button>
              </div>
              {manualLogOpen ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Started at</span>
                    <input type="datetime-local" value={manualStartedAt} onChange={(event) => setManualStartedAt(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Ended at</span>
                    <input type="datetime-local" value={manualEndedAt} onChange={(event) => setManualEndedAt(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                  </label>
                  <label className="md:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Note</span>
                    <input value={manualNote} onChange={(event) => setManualNote(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                  </label>
                  <div className="md:col-span-2 flex justify-end">
                    <button type="button" onClick={handleManualLogSubmit} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Save Entry</button>
                  </div>
                </div>
              ) : null}
              <div className="mt-4 space-y-3">
                {detail.timeLogs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-slate-200 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{log.userName}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDateTime(log.startedAt)} - {log.endedAt ? formatDateTime(log.endedAt) : "Running"}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{formatHours(log.durationHours)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Assignment History" icon={ArrowRightLeft}>
              <div className="space-y-3">
                {detail.assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-xl border border-slate-200 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{assignment.assignedToName}</p>
                        <p className="mt-1 text-xs text-slate-500">By {assignment.assignedByName} • {formatDateTime(assignment.assignedAt)}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${assignment.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {assignment.active ? "Active" : "Closed"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        ) : (
          <EmptyState title="Task unavailable" body="The selected task could not be loaded." />
        )}
      </Drawer>
    </>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-slate-200 pb-6 last:border-b-0">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function FieldSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400">
        {options.map((option) => <option key={option} value={option}>{toDisplay(option)}</option>)}
      </select>
    </label>
  );
}
