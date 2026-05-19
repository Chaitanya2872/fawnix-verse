"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  GripVertical,
  LayoutList,
  Loader2,
  Plus,
  Search,
  SquareKanban,
  Timer,
  User2,
  Workflow,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  useAddTaskComment,
  useAssignTask,
  useCreateSubtask,
  useCreateTask,
  useDeleteTask,
  useReorderTaskHierarchy,
  useTask,
  useTaskDashboard,
  useTaskTree,
  useTaskUsers,
  useUpdateTask,
} from "./hooks";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_VISIBILITIES,
  type TaskDetail,
  type TaskFilter,
  type TaskPriority,
  type TaskRequest,
  type TaskStatus,
  type TaskSummary,
  type TaskVisibility,
} from "./types";

type TaskView = "list" | "board" | "calendar" | "timeline" | "my" | "team";

type TaskFormState = {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  visibility: TaskVisibility;
  startDate: string;
  dueDate: string;
  projectRef: string;
  moduleRef: string;
  workflowName: string;
  assignedToId: string;
  estimatedHours: string;
  tags: string;
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
  pageSize: 200,
};

const defaultForm: TaskFormState = {
  title: "",
  description: "",
  priority: "MEDIUM",
  status: "PENDING",
  visibility: "TEAM",
  startDate: "",
  dueDate: "",
  projectRef: "",
  moduleRef: "",
  workflowName: "",
  assignedToId: "",
  estimatedHours: "",
  tags: "",
};

function toLabel(value: string) {
  return value.toLowerCase().replace(/_/g, " ");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return format(parseISO(value), "dd MMM");
}

function formatLongDate(value?: string | null) {
  if (!value) return "-";
  return format(parseISO(value), "dd MMM yyyy");
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

function taskToForm(task: TaskSummary | null): TaskFormState {
  if (!task) return defaultForm;
  return {
    title: task.title,
    description: task.description ?? "",
    priority: task.priority,
    status: task.status,
    visibility: task.visibility,
    startDate: task.startDate ?? "",
    dueDate: task.dueDate ?? "",
    projectRef: task.projectRef ?? "",
    moduleRef: task.moduleRef ?? "",
    workflowName: "",
    assignedToId: task.assignedToId ?? "",
    estimatedHours: String(task.estimatedHours ?? ""),
    tags: task.tags.join(", "),
  };
}

function buildPayload(
  form: TaskFormState,
  users: Array<{ id: string; name: string; email: string }>,
  parentTaskId?: string | null,
  orderIndex?: number | null
): TaskRequest {
  const assignee = users.find((user) => user.id === form.assignedToId);
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    priority: form.priority,
    status: form.status,
    visibility: form.visibility,
    startDate: form.startDate || null,
    dueDate: form.dueDate || null,
    projectRef: form.projectRef.trim() || null,
    moduleRef: form.moduleRef.trim() || null,
    workflowName: form.workflowName.trim() || null,
    assignedToId: assignee?.id ?? null,
    assignedToName: assignee?.name ?? null,
    assignedToEmail: assignee?.email ?? null,
    estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : 0,
    parentTaskId: parentTaskId ?? undefined,
    orderIndex: orderIndex ?? undefined,
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((name) => ({ name })),
  };
}

function Kpi({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="flex-1 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <p className="text-base font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{body}</p>
    </div>
  );
}

function collectVisibleTasks(tasks: TaskSummary[], expanded: Set<string>): TaskSummary[] {
  const collector: TaskSummary[] = [];
  const walk = (items: TaskSummary[]) => {
    for (const task of items) {
      collector.push(task);
      if (task.subtasks.length && expanded.has(task.id)) {
        walk(task.subtasks);
      }
    }
  };
  walk(tasks);
  return collector;
}

export default function TaskManagementPage() {
  const [view, setView] = useState<TaskView>("list");
  const [filter, setFilter] = useState<TaskFilter>(defaultFilter);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskSummary | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<string, string>>({});
  const [commentDraft, setCommentDraft] = useState("");
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskFormState>(defaultForm);

  const dashboardQuery = useTaskDashboard();
  const treeQuery = useTaskTree(filter);
  const detailQuery = useTask(detailTaskId);
  const usersQuery = useTaskUsers();

  const createTaskMutation = useCreateTask();
  const createSubtaskMutation = useCreateSubtask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const reorderMutation = useReorderTaskHierarchy();
  const assignMutation = useAssignTask();
  const commentMutation = useAddTaskComment();

  const dashboard = dashboardQuery.data;
  const taskTree = treeQuery.data?.data ?? [];
  const detail = detailQuery.data ?? null;
  const users = useMemo(
    () =>
      (usersQuery.data ?? []).map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      })),
    [usersQuery.data]
  );

  useEffect(() => {
    if (taskTree.length && expandedIds.size === 0) {
      setExpandedIds(new Set(taskTree.map((task) => task.id)));
    }
  }, [taskTree, expandedIds.size]);

  useEffect(() => {
    if (editingTask) {
      setForm(taskToForm(editingTask));
    }
  }, [editingTask]);

  useEffect(() => {
    if (view === "my") {
      setFilter((prev) => ({ ...prev, scope: "my" }));
    } else if (view === "team") {
      setFilter((prev) => ({ ...prev, scope: "team" }));
    } else if (filter.scope !== "all") {
      setFilter((prev) => ({ ...prev, scope: "all" }));
    }
  }, [view]);

  const visibleTreeRows = useMemo(() => collectVisibleTasks(taskTree, expandedIds), [taskTree, expandedIds]);

  const boardColumns = useMemo(() => {
    const flat = collectVisibleTasks(taskTree, new Set(visibleTreeRows.map((task) => task.id)));
    return ["PENDING", "IN_PROGRESS", "UNDER_REVIEW", "COMPLETED"].map((status) => ({
      status,
      tasks: flat.filter((task) => task.status === status),
    }));
  }, [taskTree, visibleTreeRows]);

  const allFlatTasks = useMemo(() => collectVisibleTasks(taskTree, new Set(taskTree.map((task) => task.id))), [taskTree]);

  function openEditor(task?: TaskSummary | null) {
    setEditingTask(task ?? null);
    setForm(taskToForm(task ?? null));
    setEditorOpen(true);
  }

  function handleQuickCreate() {
    if (!quickTitle.trim()) return;
    createTaskMutation.mutate(
      {
        title: quickTitle.trim(),
        priority: "MEDIUM",
        status: "PENDING",
        visibility: "TEAM",
      },
      {
        onSuccess: () => {
          toast.success("Task created.");
          setQuickTitle("");
        },
        onError: (error) => toast.error(error.message),
      }
    );
  }

  function handleSaveTask(event: React.FormEvent) {
    event.preventDefault();
    const payload = buildPayload(form, users, editingTask?.parentTaskId, editingTask?.orderIndex);
    if (!payload.title?.trim()) {
      toast.error("Task title is required.");
      return;
    }
    if (editingTask) {
      updateTaskMutation.mutate(
        { id: editingTask.id, payload },
        {
          onSuccess: () => {
            toast.success("Task updated.");
            setEditorOpen(false);
          },
          onError: (error) => toast.error(error.message),
        }
      );
      return;
    }
    createTaskMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Task created.");
        setEditorOpen(false);
      },
      onError: (error) => toast.error(error.message),
    });
  }

  function handleQuickSubtask(parent: TaskSummary) {
    const title = subtaskDrafts[parent.id]?.trim();
    if (!title) return;
    const payload = buildPayload({ ...defaultForm, title }, users, parent.id, null);
    createSubtaskMutation.mutate(
      { parentId: parent.id, payload },
      {
        onSuccess: () => {
          toast.success("Subtask added.");
          setExpandedIds((prev) => new Set(prev).add(parent.id));
          setSubtaskDrafts((prev) => ({ ...prev, [parent.id]: "" }));
        },
        onError: (error) => toast.error(error.message),
      }
    );
  }

  function handleInlineUpdate(task: TaskSummary, patch: Partial<TaskRequest>, message: string) {
    updateTaskMutation.mutate(
      {
        id: task.id,
        payload: {
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          visibility: task.visibility,
          startDate: task.startDate,
          dueDate: task.dueDate,
          projectRef: task.projectRef,
          moduleRef: task.moduleRef,
          estimatedHours: task.estimatedHours,
          assignedToId: task.assignedToId,
          assignedToName: task.assignedToName,
          parentTaskId: task.parentTaskId,
          orderIndex: task.orderIndex,
          tags: task.tags.map((name) => ({ name })),
          ...patch,
        },
      },
      {
        onSuccess: () => toast.success(message),
        onError: (error) => toast.error(error.message),
      }
    );
  }

  function toggleExpand(taskId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function handleDropOnTask(target: TaskSummary) {
    if (!dragTaskId || dragTaskId === target.id) return;
    reorderMutation.mutate(
      { id: dragTaskId, payload: { parentTaskId: target.id, orderIndex: target.childCount * 1024 + 1024 } },
      {
        onSuccess: () => {
          toast.success("Moved task into hierarchy.");
          setExpandedIds((prev) => new Set(prev).add(target.id));
          setDragTaskId(null);
        },
        onError: (error) => toast.error(error.message),
      }
    );
  }

  function handlePromote(task: TaskSummary) {
    reorderMutation.mutate(
      { id: task.id, payload: { parentTaskId: null, orderIndex: Date.now() } },
      {
        onSuccess: () => toast.success("Converted to top-level task."),
        onError: (error) => toast.error(error.message),
      }
    );
  }

  function handleAssign(task: TaskSummary, userId: string) {
    const assignee = users.find((user) => user.id === userId);
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
        onSuccess: () => toast.success("Assignee updated."),
        onError: (error) => toast.error(error.message),
      }
    );
  }

  function handleDelete(taskId: string) {
    deleteTaskMutation.mutate(taskId, {
      onSuccess: () => {
        toast.success("Task deleted.");
        if (detailTaskId === taskId) setDetailTaskId(null);
      },
      onError: (error) => toast.error(error.message),
    });
  }

  function handleAddComment() {
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

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">Execution Hub</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Task Management</h1>
                <p className="mt-1 text-sm text-slate-500">Nested subtasks, compact workflows, and a denser productivity layout inspired by modern work operating systems.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ["list", "List", LayoutList],
                  ["board", "Board", SquareKanban],
                  ["calendar", "Calendar", CalendarDays],
                  ["timeline", "Timeline", Workflow],
                  ["my", "My Tasks", User2],
                  ["team", "Team Tasks", User2],
                ].map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setView(id as TaskView)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                      view === id ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
                <button type="button" onClick={() => openEditor(null)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                  New Task
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Kpi label="Total" value={dashboard?.kpis.totalTasks ?? 0} hint="All visible work" />
              <Kpi label="Pending" value={dashboard?.kpis.pendingTasks ?? 0} hint="Queued and assigned" />
              <Kpi label="In Progress" value={dashboard?.kpis.inProgress ?? 0} hint="Active execution" />
              <Kpi label="Completed" value={dashboard?.kpis.completed ?? 0} hint="Finished work" />
              <Kpi label="Overdue" value={dashboard?.kpis.overdue ?? 0} hint="Needs attention" />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-1 flex-wrap gap-3">
                  <label className="relative min-w-[260px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={filter.search}
                      onChange={(event) => setFilter((prev) => ({ ...prev, search: event.target.value }))}
                      placeholder="Search tasks, task code, project, assignee"
                      className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-sm outline-none focus:border-blue-400"
                    />
                  </label>
                  <select value={filter.status} onChange={(event) => setFilter((prev) => ({ ...prev, status: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                    <option value="">All statuses</option>
                    {TASK_STATUSES.map((status) => <option key={status} value={status}>{toLabel(status)}</option>)}
                  </select>
                  <select value={filter.priority} onChange={(event) => setFilter((prev) => ({ ...prev, priority: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                    <option value="">All priorities</option>
                    {TASK_PRIORITIES.map((priority) => <option key={priority} value={priority}>{toLabel(priority)}</option>)}
                  </select>
                </div>
                <div className="flex min-w-[280px] gap-2">
                  <input
                    value={quickTitle}
                    onChange={(event) => setQuickTitle(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && handleQuickCreate()}
                    placeholder="Quick create task"
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                  <button type="button" onClick={handleQuickCreate} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                {treeQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading task hierarchy...</div>
                ) : treeQuery.isError ? (
                  <EmptyState title="Task hierarchy unavailable" body={treeQuery.error instanceof Error ? treeQuery.error.message : "Could not load tasks."} />
                ) : !taskTree.length ? (
                  <EmptyState title="No tasks yet" body="Create a task or use quick create to start building a nested workflow." />
                ) : view === "list" || view === "my" || view === "team" ? (
                  <div className="overflow-x-auto">
                    <div className="min-w-[1220px]">
                      <div className="grid grid-cols-[3.4fr,1.2fr,1.1fr,1.2fr,1fr,1fr,1fr,1fr,1.1fr,1fr] gap-3 border-b border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <div>Task</div>
                        <div>Status</div>
                        <div>Priority</div>
                        <div>Assignee</div>
                        <div>Due Date</div>
                        <div>Estimate</div>
                        <div>Actual</div>
                        <div>Project</div>
                        <div>Progress</div>
                        <div />
                      </div>
                      <div className="divide-y divide-slate-100">
                        {visibleTreeRows.map((task) => {
                          const isExpanded = expandedIds.has(task.id);
                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={() => setDragTaskId(task.id)}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => handleDropOnTask(task)}
                              className="grid grid-cols-[3.4fr,1.2fr,1.1fr,1.2fr,1fr,1fr,1fr,1fr,1.1fr,1fr] gap-3 px-3 py-2.5 hover:bg-slate-50"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2" style={{ paddingLeft: `${task.hierarchyLevel * 22}px` }}>
                                  <GripVertical className="h-3.5 w-3.5 text-slate-300" />
                                  {task.subtasks.length ? (
                                    <button type="button" onClick={() => toggleExpand(task.id)} className="rounded p-0.5 text-slate-500 hover:bg-slate-100">
                                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                    </button>
                                  ) : (
                                    <span className="w-4" />
                                  )}
                                  <button type="button" onClick={() => setDetailTaskId(task.id)} className="truncate text-left text-sm font-medium text-slate-900 hover:text-blue-700">
                                    {task.title}
                                  </button>
                                  {task.parentTaskId ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Subtask</span> : null}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 pl-10 text-xs text-slate-500" style={{ paddingLeft: `${task.hierarchyLevel * 22 + 40}px` }}>
                                  <span>{task.taskCode}</span>
                                  {task.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5">{tag}</span>)}
                                </div>
                                <div className="mt-2 flex gap-2 pl-10" style={{ paddingLeft: `${task.hierarchyLevel * 22 + 40}px` }}>
                                  <input
                                    value={subtaskDrafts[task.id] ?? ""}
                                    onChange={(event) => setSubtaskDrafts((prev) => ({ ...prev, [task.id]: event.target.value }))}
                                    onKeyDown={(event) => event.key === "Enter" && handleQuickSubtask(task)}
                                    placeholder="Quick add subtask"
                                    className="w-full max-w-xs rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                  />
                                  <button type="button" onClick={() => handleQuickSubtask(task)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                                    Add
                                  </button>
                                </div>
                              </div>
                              <div>
                                <select value={task.status} onChange={(event) => handleInlineUpdate(task, { status: event.target.value as TaskStatus }, "Status updated.")} className={`w-full rounded-lg border px-2 py-1.5 text-xs font-semibold ${statusTone(task.status)}`}>
                                  {TASK_STATUSES.map((status) => <option key={status} value={status}>{toLabel(status)}</option>)}
                                </select>
                              </div>
                              <div>
                                <select value={task.priority} onChange={(event) => handleInlineUpdate(task, { priority: event.target.value as TaskPriority }, "Priority updated.")} className={`w-full rounded-lg border px-2 py-1.5 text-xs font-semibold ${priorityTone(task.priority)}`}>
                                  {TASK_PRIORITIES.map((priority) => <option key={priority} value={priority}>{toLabel(priority)}</option>)}
                                </select>
                              </div>
                              <div>
                                <select value={task.assignedToId ?? ""} onChange={(event) => handleAssign(task, event.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
                                  <option value="">Unassigned</option>
                                  {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                                </select>
                              </div>
                              <div>
                                <input type="date" value={task.dueDate ?? ""} onChange={(event) => handleInlineUpdate(task, { dueDate: event.target.value || null }, "Due date updated.")} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
                              </div>
                              <div className="pt-2 text-xs font-medium text-slate-700">{task.estimatedHours.toFixed(1)}h</div>
                              <div className="pt-2 text-xs font-medium text-slate-700">{task.actualHours.toFixed(1)}h</div>
                              <div className="pt-2 text-xs text-slate-600">{task.projectRef || task.moduleRef || "-"}</div>
                              <div className="pt-1">
                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${task.progressPercent}%` }} />
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">{task.progressPercent}%</p>
                              </div>
                              <div className="flex items-start justify-end gap-2 pt-1">
                                <button type="button" onClick={() => openEditor(task)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700">Edit</button>
                                {task.parentTaskId ? (
                                  <button type="button" onClick={() => handlePromote(task)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700">Promote</button>
                                ) : null}
                                <button type="button" onClick={() => handleDelete(task.id)} className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700">Delete</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : view === "board" ? (
                  <div className="grid gap-4 xl:grid-cols-4">
                    {boardColumns.map((column) => (
                      <div key={column.status} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">{toLabel(column.status)}</p>
                          <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500">{column.tasks.length}</span>
                        </div>
                        <div className="space-y-3">
                          {column.tasks.map((task) => (
                            <button key={task.id} type="button" onClick={() => setDetailTaskId(task.id)} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${priorityTone(task.priority)}`}>{toLabel(task.priority)}</span>
                              </div>
                              <p className="mt-2 text-xs text-slate-500">{task.taskCode} • {task.assignedToName || "Unassigned"}</p>
                              {task.parentTaskId ? <p className="mt-1 text-[11px] text-slate-400">Nested level {task.hierarchyLevel}</p> : null}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : view === "calendar" ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {allFlatTasks.filter((task) => task.dueDate).map((task) => (
                      <button key={task.id} type="button" onClick={() => setDetailTaskId(task.id)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{formatLongDate(task.dueDate)}</p>
                        <p className="mt-3 text-sm font-semibold text-slate-900">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{task.assignedToName || "Unassigned"} • {task.projectRef || "General"}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allFlatTasks.map((task) => (
                      <button key={task.id} type="button" onClick={() => setDetailTaskId(task.id)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                          <div className="lg:w-80">
                            <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                            <p className="mt-1 text-xs text-slate-500">{task.taskCode} • {task.parentTaskId ? "Nested task" : "Top-level task"}</p>
                          </div>
                          <div className="flex-1">
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-blue-600" style={{ width: `${task.progressPercent}%` }} />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                              <span>{formatDate(task.startDate)}</span>
                              <span>{formatDate(task.dueDate)}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Drawer open={editorOpen} title={editingTask ? "Edit Task" : "Create Task"} onClose={() => setEditorOpen(false)}>
        <form onSubmit={handleSaveTask} className="space-y-4">
          <Field label="Title">
            <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" required />
          </Field>
          <Field label="Description">
            <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField label="Status" value={form.status} onChange={(value) => setForm((prev) => ({ ...prev, status: value as TaskStatus }))} options={TASK_STATUSES} />
            <SelectField label="Priority" value={form.priority} onChange={(value) => setForm((prev) => ({ ...prev, priority: value as TaskPriority }))} options={TASK_PRIORITIES} />
            <SelectField label="Visibility" value={form.visibility} onChange={(value) => setForm((prev) => ({ ...prev, visibility: value as TaskVisibility }))} options={TASK_VISIBILITIES} />
            <Field label="Assignee">
              <select value={form.assignedToId} onChange={(event) => setForm((prev) => ({ ...prev, assignedToId: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                <option value="">Unassigned</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </Field>
            <Field label="Start date">
              <input type="date" value={form.startDate} onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </Field>
            <Field label="Due date">
              <input type="date" value={form.dueDate} onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </Field>
            <Field label="Project">
              <input value={form.projectRef} onChange={(event) => setForm((prev) => ({ ...prev, projectRef: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </Field>
            <Field label="Module">
              <input value={form.moduleRef} onChange={(event) => setForm((prev) => ({ ...prev, moduleRef: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </Field>
            <Field label="Workflow">
              <input value={form.workflowName} onChange={(event) => setForm((prev) => ({ ...prev, workflowName: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </Field>
            <Field label="Estimate hours">
              <input type="number" min={0} step="0.25" value={form.estimatedHours} onChange={(event) => setForm((prev) => ({ ...prev, estimatedHours: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </Field>
          </div>
          <Field label="Tags">
            <input value={form.tags} onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))} placeholder="ops, release, customer" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          </Field>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={() => setEditorOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
            <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Save</button>
          </div>
        </form>
      </Drawer>

      <Drawer open={Boolean(detailTaskId)} title={detail?.task.title ?? "Task"} onClose={() => setDetailTaskId(null)}>
        {detailQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading task...</div>
        ) : detail ? (
          <TaskDetailPanel
            detail={detail}
            users={users}
            commentDraft={commentDraft}
            setCommentDraft={setCommentDraft}
            onAddComment={handleAddComment}
            onQuickSubtask={(task, title) => {
              const payload = buildPayload({ ...defaultForm, title }, users, task.id, null);
              createSubtaskMutation.mutate(
                { parentId: task.id, payload },
                {
                  onSuccess: () => toast.success("Nested subtask created."),
                  onError: (error) => toast.error(error.message),
                }
              );
            }}
            onPromote={handlePromote}
            onOpenEdit={openEditor}
          />
        ) : (
          <EmptyState title="Task unavailable" body="The selected task could not be loaded." />
        )}
      </Drawer>
    </>
  );
}

function TaskDetailPanel({
  detail,
  users,
  commentDraft,
  setCommentDraft,
  onAddComment,
  onQuickSubtask,
  onPromote,
  onOpenEdit,
}: {
  detail: TaskDetail;
  users: Array<{ id: string; name: string; email: string }>;
  commentDraft: string;
  setCommentDraft: React.Dispatch<React.SetStateAction<string>>;
  onAddComment: () => void;
  onQuickSubtask: (task: TaskSummary, title: string) => void;
  onPromote: (task: TaskSummary) => void;
  onOpenEdit: (task: TaskSummary) => void;
}) {
  const [nestedDraft, setNestedDraft] = useState("");
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityTone(detail.task.priority)}`}>{toLabel(detail.task.priority)}</span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(detail.task.status)}`}>{toLabel(detail.task.status)}</span>
          {detail.task.parentTaskId ? <button type="button" onClick={() => onPromote(detail.task)} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">Promote to task</button> : null}
          <button type="button" onClick={() => onOpenEdit(detail.task)} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">Edit</button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Info label="Assignee" value={detail.task.assignedToName || "Unassigned"} />
          <Info label="Due date" value={formatLongDate(detail.task.dueDate)} />
          <Info label="Progress" value={`${detail.task.progressPercent}%`} />
        </div>
        {detail.task.description ? <p className="text-sm leading-6 text-slate-600">{detail.task.description}</p> : null}
      </section>

      <section className="space-y-3 border-t border-slate-200 pt-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Workflow className="h-4 w-4 text-slate-500" />Subtasks</div>
        <div className="space-y-2">
          {detail.subtasks.map((task) => (
            <div key={task.id} className="rounded-xl border border-slate-200 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                  <p className="mt-1 text-xs text-slate-500">Level {task.hierarchyLevel} • {task.taskCode}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusTone(task.status)}`}>{toLabel(task.status)}</span>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <input value={nestedDraft} onChange={(event) => setNestedDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onQuickSubtask(detail.task, nestedDraft)} placeholder="Add nested subtask" className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            <button type="button" onClick={() => { onQuickSubtask(detail.task, nestedDraft); setNestedDraft(""); }} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Add</button>
          </div>
        </div>
      </section>

      <section className="space-y-3 border-t border-slate-200 pt-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Clock3 className="h-4 w-4 text-slate-500" />Time Tracking</div>
        <div className="grid gap-3 md:grid-cols-3">
          <Info label="Estimate" value={`${detail.task.estimatedHours.toFixed(2)}h`} />
          <Info label="Actual" value={`${detail.task.actualHours.toFixed(2)}h`} />
          <Info label="Logs" value={String(detail.timeLogs.length)} />
        </div>
      </section>

      <section className="space-y-3 border-t border-slate-200 pt-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Timer className="h-4 w-4 text-slate-500" />Checklist</div>
        <div className="space-y-2">
          {detail.checklistItems.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
              {item.label}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 border-t border-slate-200 pt-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><User2 className="h-4 w-4 text-slate-500" />Comments</div>
        <div className="space-y-3">
          {detail.comments.map((comment) => (
            <div key={comment.id} className="rounded-xl bg-slate-50 px-3 py-3">
              <p className="text-sm text-slate-800">{comment.message}</p>
              <p className="mt-1 text-xs text-slate-500">{comment.authorName} • {formatLongDate(comment.createdAt)}</p>
            </div>
          ))}
        </div>
        <textarea value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} rows={3} placeholder="Comment or mention teammates" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
        <div className="flex justify-end">
          <button type="button" onClick={onAddComment} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Post Comment</button>
        </div>
      </section>

      <section className="space-y-3 border-t border-slate-200 pt-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Workflow className="h-4 w-4 text-slate-500" />Activity</div>
        <div className="space-y-3">
          {detail.activity.map((activity) => (
            <div key={activity.id} className="flex gap-3">
              <div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
              <div className="min-w-0">
                <p className="text-sm text-slate-800">{activity.message}</p>
                <p className="mt-1 text-xs text-slate-500">{activity.actorName || "System"} • {formatLongDate(activity.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function SelectField({
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
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
        {options.map((option) => <option key={option} value={option}>{toLabel(option)}</option>)}
      </select>
    </Field>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
