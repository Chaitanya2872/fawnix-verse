"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Blocks,
  BriefcaseBusiness,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Clock3,
  Filter,
  FolderKanban,
  FolderTree,
  GripVertical,
  LayoutList,
  Loader2,
  MessageSquareText,
  PanelLeft,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  Settings2,
  Sparkles,
  SquareKanban,
  Timer,
  Workflow,
  X,
} from "lucide-react";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  useAddChecklistItem,
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
  useUpdateChecklistItem,
  useUpdateTask,
} from "./hooks";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_VISIBILITIES,
  type TaskChecklistItem,
  type TaskDetail,
  type TaskFilter,
  type TaskPriority,
  type TaskRequest,
  type TaskStatus,
  type TaskSummary,
  type TaskVisibility,
} from "./types";

type TaskView = "list" | "board" | "calendar" | "timeline";
type TaskScope = "all" | "my" | "team";
type TaskGrouping = "status" | "priority" | "project" | "module";

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

type WorkspaceModule = {
  name: string;
  count: number;
};

type WorkspaceProject = {
  name: string;
  count: number;
  modules: WorkspaceModule[];
};

type GroupSection = {
  key: string;
  label: string;
  count: number;
  tasks: TaskSummary[];
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

const PRIMARY_STATUSES: TaskStatus[] = ["PENDING", "IN_PROGRESS", "UNDER_REVIEW", "COMPLETED"];

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

function formatRelativeDate(value?: string | null) {
  if (!value) return "No date";
  return formatDistanceToNowStrict(parseISO(value), { addSuffix: true });
}

function priorityTone(priority: TaskPriority) {
  return {
    LOW: "border-slate-200 bg-slate-100 text-slate-700",
    MEDIUM: "border-sky-200 bg-sky-50 text-sky-700",
    HIGH: "border-amber-200 bg-amber-50 text-amber-700",
    CRITICAL: "border-rose-200 bg-rose-50 text-rose-700",
  }[priority];
}

function statusTone(status: TaskStatus) {
  return {
    PENDING: "border-slate-200 bg-slate-100 text-slate-700",
    ASSIGNED: "border-indigo-200 bg-indigo-50 text-indigo-700",
    IN_PROGRESS: "border-sky-200 bg-sky-50 text-sky-700",
    ON_HOLD: "border-amber-200 bg-amber-50 text-amber-700",
    BLOCKED: "border-rose-200 bg-rose-50 text-rose-700",
    UNDER_REVIEW: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CANCELLED: "border-slate-300 bg-slate-200 text-slate-600",
  }[status];
}

function statusDot(status: TaskStatus) {
  return {
    PENDING: "bg-slate-500",
    ASSIGNED: "bg-indigo-500",
    IN_PROGRESS: "bg-sky-500",
    ON_HOLD: "bg-amber-500",
    BLOCKED: "bg-rose-500",
    UNDER_REVIEW: "bg-fuchsia-500",
    COMPLETED: "bg-emerald-500",
    CANCELLED: "bg-slate-400",
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

function collectVisibleTasks(tasks: TaskSummary[], expanded: Set<string>) {
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

function summarizeWorkspace(tasks: TaskSummary[]) {
  const projectMap = new Map<string, WorkspaceProject>();
  for (const task of tasks) {
    const projectName = task.projectRef || "General";
    const moduleName = task.moduleRef || "Unsorted";
    const existingProject = projectMap.get(projectName) ?? {
      name: projectName,
      count: 0,
      modules: [],
    };
    existingProject.count += 1;
    const existingModule = existingProject.modules.find((module) => module.name === moduleName);
    if (existingModule) {
      existingModule.count += 1;
    } else {
      existingProject.modules.push({ name: moduleName, count: 1 });
    }
    projectMap.set(projectName, existingProject);
  }
  return [...projectMap.values()]
    .map((project) => ({
      ...project,
      modules: [...project.modules].sort((left, right) => right.count - left.count || left.name.localeCompare(right.name)),
    }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function groupTasks(tasks: TaskSummary[], grouping: TaskGrouping): GroupSection[] {
  const grouped = new Map<string, GroupSection>();
  const getGroup = (task: TaskSummary) => {
    if (grouping === "priority") {
      return { key: task.priority, label: toLabel(task.priority) };
    }
    if (grouping === "project") {
      return { key: task.projectRef || "general", label: task.projectRef || "General" };
    }
    if (grouping === "module") {
      return { key: task.moduleRef || "unsorted", label: task.moduleRef || "Unsorted" };
    }
    return { key: task.status, label: toLabel(task.status) };
  };

  for (const task of tasks) {
    const group = getGroup(task);
    const current = grouped.get(group.key) ?? {
      key: group.key,
      label: group.label,
      count: 0,
      tasks: [],
    };
    current.count += 1;
    current.tasks.push(task);
    grouped.set(group.key, current);
  }

  const ordered = [...grouped.values()];
  const statusOrder = new Map(TASK_STATUSES.map((status, index) => [status, index]));
  const priorityOrder = new Map(TASK_PRIORITIES.map((priority, index) => [priority, index]));

  return ordered.sort((left, right) => {
    if (grouping === "status") {
      return (statusOrder.get(left.key as TaskStatus) ?? 99) - (statusOrder.get(right.key as TaskStatus) ?? 99);
    }
    if (grouping === "priority") {
      return (priorityOrder.get(left.key as TaskPriority) ?? 99) - (priorityOrder.get(right.key as TaskPriority) ?? 99);
    }
    return left.label.localeCompare(right.label);
  });
}

function initials(name?: string | null) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TaskManagementPage() {
  const [view, setView] = useState<TaskView>("list");
  const [scope, setScope] = useState<TaskScope>("all");
  const [grouping, setGrouping] = useState<TaskGrouping>("status");
  const [filter, setFilter] = useState<TaskFilter>(defaultFilter);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [collapsedSidebarSections, setCollapsedSidebarSections] = useState<Set<string>>(new Set(["modules"]));
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskSummary | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [groupDrafts, setGroupDrafts] = useState<Record<string, string>>({});
  const [commentDraft, setCommentDraft] = useState("");
  const [checklistDraft, setChecklistDraft] = useState("");
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskFormState>(defaultForm);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(true);

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
  const addChecklistMutation = useAddChecklistItem();
  const updateChecklistMutation = useUpdateChecklistItem();

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
    setFilter((prev) => ({ ...prev, scope }));
  }, [scope]);

  const visibleTreeRows = useMemo(() => collectVisibleTasks(taskTree, expandedIds), [taskTree, expandedIds]);
  const allFlatTasks = useMemo(() => collectVisibleTasks(taskTree, new Set(taskTree.map((task) => task.id))), [taskTree]);
  const workspaceProjects = useMemo(() => summarizeWorkspace(allFlatTasks), [allFlatTasks]);
  const groupedSections = useMemo(() => groupTasks(visibleTreeRows, grouping), [grouping, visibleTreeRows]);
  const boardColumns = useMemo(
    () =>
      PRIMARY_STATUSES.map((status) => ({
        status,
        tasks: allFlatTasks.filter((task) => task.status === status),
      })),
    [allFlatTasks]
  );
  const upcomingTimeline = useMemo(
    () =>
      [...allFlatTasks]
        .filter((task) => task.startDate || task.dueDate)
        .sort((left, right) => (left.dueDate || left.startDate || "").localeCompare(right.dueDate || right.startDate || ""))
        .slice(0, 24),
    [allFlatTasks]
  );
  const dueCalendar = useMemo(
    () =>
      [...allFlatTasks]
        .filter((task) => task.dueDate)
        .sort((left, right) => (left.dueDate || "").localeCompare(right.dueDate || ""))
        .slice(0, 24),
    [allFlatTasks]
  );

  function toggleSidebarSection(section: string) {
    setCollapsedSidebarSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  function toggleGroup(groupKey: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }

  function toggleExpand(taskId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

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
        projectRef: filter.projectRef || undefined,
        moduleRef: filter.moduleRef || undefined,
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

  function handleGroupQuickCreate(section: GroupSection) {
    const title = groupDrafts[section.key]?.trim();
    if (!title) return;
    const payload: TaskRequest = {
      title,
      status: grouping === "status" ? (section.key as TaskStatus) : "PENDING",
      priority: grouping === "priority" ? (section.key as TaskPriority) : "MEDIUM",
      visibility: "TEAM",
      projectRef: grouping === "project" ? section.label : filter.projectRef || undefined,
      moduleRef: grouping === "module" ? section.label : filter.moduleRef || undefined,
    };
    createTaskMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(`Task added to ${section.label}.`);
        setGroupDrafts((prev) => ({ ...prev, [section.key]: "" }));
      },
      onError: (error) => toast.error(error.message),
    });
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
    if (!assignee) {
      handleInlineUpdate(
        task,
        { assignedToId: null, assignedToName: null, assignedToEmail: null, assignedTeamName: null },
        "Task unassigned."
      );
      return;
    }
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

  function handleAddChecklistItem() {
    if (!detailTaskId || !checklistDraft.trim()) return;
    addChecklistMutation.mutate(
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

  function handleChecklistToggle(item: TaskChecklistItem) {
    if (!detailTaskId) return;
    updateChecklistMutation.mutate(
      {
        id: detailTaskId,
        itemId: item.id,
        payload: {
          label: item.label,
          completed: !item.completed,
        },
      },
      {
        onSuccess: () => toast.success(item.completed ? "Checklist item reopened." : "Checklist item completed."),
        onError: (error) => toast.error(error.message),
      }
    );
  }

  const workspaceSidebar = (
    <aside className="flex h-full flex-col rounded-[28px] border border-slate-200/80 bg-white/90 p-3 shadow-[0_16px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex items-center justify-between rounded-2xl bg-[linear-gradient(135deg,#0f172a,#1d4ed8)] px-3 py-3 text-white">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">Workspace</p>
          <p className="mt-1 text-sm font-semibold">Execution OS</p>
        </div>
        <div className="rounded-xl bg-white/15 p-2">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <SidebarSection
          title="Spaces"
          icon={<BriefcaseBusiness className="h-4 w-4" />}
          collapsed={collapsedSidebarSections.has("spaces")}
          onToggle={() => toggleSidebarSection("spaces")}
        >
          <SidebarItem
            label="All Execution"
            count={allFlatTasks.length}
            active={!filter.projectRef && !filter.moduleRef}
            onClick={() => {
              setFilter((prev) => ({ ...prev, projectRef: "", moduleRef: "" }));
              setSidebarOpen(false);
            }}
          />
          {workspaceProjects.map((project) => (
            <div key={project.name} className="space-y-1">
              <SidebarItem
                label={project.name}
                count={project.count}
                active={filter.projectRef === project.name && !filter.moduleRef}
                depth={0}
                onClick={() => {
                  setFilter((prev) => ({ ...prev, projectRef: project.name, moduleRef: "" }));
                  setSidebarOpen(false);
                }}
              />
              {project.modules.map((module) => (
                <SidebarItem
                  key={`${project.name}-${module.name}`}
                  label={module.name}
                  count={module.count}
                  active={filter.projectRef === project.name && filter.moduleRef === module.name}
                  depth={1}
                  onClick={() => {
                    setFilter((prev) => ({ ...prev, projectRef: project.name, moduleRef: module.name }));
                    setSidebarOpen(false);
                  }}
                />
              ))}
            </div>
          ))}
        </SidebarSection>

        <SidebarSection
          title="Modules"
          icon={<Blocks className="h-4 w-4" />}
          collapsed={collapsedSidebarSections.has("modules")}
          onToggle={() => toggleSidebarSection("modules")}
        >
          {workspaceProjects.flatMap((project) =>
            project.modules.slice(0, 5).map((module) => (
              <SidebarItem
                key={`${project.name}-summary-${module.name}`}
                label={`${project.name} / ${module.name}`}
                count={module.count}
                active={filter.projectRef === project.name && filter.moduleRef === module.name}
                onClick={() => {
                  setFilter((prev) => ({ ...prev, projectRef: project.name, moduleRef: module.name }));
                  setSidebarOpen(false);
                }}
              />
            ))
          )}
        </SidebarSection>

        <SidebarSection
          title="Task Groups"
          icon={<FolderTree className="h-4 w-4" />}
          collapsed={collapsedSidebarSections.has("groups")}
          onToggle={() => toggleSidebarSection("groups")}
        >
          {PRIMARY_STATUSES.map((status) => (
            <SidebarItem
              key={status}
              label={toLabel(status)}
              count={allFlatTasks.filter((task) => task.status === status).length}
              active={filter.status === status}
              icon={<span className={`h-2.5 w-2.5 rounded-full ${statusDot(status)}`} />}
              onClick={() => {
                setFilter((prev) => ({ ...prev, status: prev.status === status ? "" : status }));
                setSidebarOpen(false);
              }}
            />
          ))}
        </SidebarSection>
      </div>

      <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          <MessageSquareText className="h-3.5 w-3.5" />
          Team Pulse
        </div>
        <p className="mt-2 text-sm font-semibold text-slate-900">{dashboard?.recentActivity.length ?? 0} fresh activity items</p>
        <p className="mt-1 text-xs text-slate-500">Comments, approvals, and status transitions stay attached to the work stream.</p>
      </div>
    </aside>
  );

  return (
    <>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.15),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
        <div className="mx-auto max-w-[1760px] px-3 py-3 sm:px-4 lg:px-5">
          <div className="flex h-full min-h-[calc(100vh-24px)] flex-col gap-3 xl:grid xl:grid-cols-[280px,minmax(0,1fr)] xl:gap-4 2xl:grid-cols-[280px,minmax(0,1fr),400px]">
            <div className="hidden xl:block">{workspaceSidebar}</div>

            <main className="flex min-h-0 flex-col rounded-[30px] border border-slate-200/80 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="border-b border-slate-200/80 px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => setSidebarOpen(true)}
                        className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 xl:hidden"
                      >
                        <PanelLeft className="h-4 w-4" />
                      </button>
                      <div>
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">
                          <FolderKanban className="h-3.5 w-3.5" />
                          Task Workspace
                        </div>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
                          Collaborative execution, not dashboard clutter
                        </h1>
                        <p className="mt-1 max-w-3xl text-sm text-slate-500">
                          Workspaces, grouped task streams, inline execution controls, and a persistent task context panel for shipping work faster.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ViewSwitch value={view} onChange={setView} />
                      <button
                        type="button"
                        onClick={() => setShowDetailPanel((prev) => !prev)}
                        className="hidden rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 2xl:inline-flex 2xl:items-center 2xl:gap-2"
                      >
                        {showDetailPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                        {showDetailPanel ? "Hide Context" : "Show Context"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditor(null)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                      >
                        <Plus className="h-4 w-4" />
                        New Task
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                    <MetricStrip
                      label="Total"
                      value={dashboard?.kpis.totalTasks ?? 0}
                      hint="Visible work items"
                      tone="slate"
                    />
                    <MetricStrip
                      label="In Progress"
                      value={dashboard?.kpis.inProgress ?? 0}
                      hint="Execution active"
                      tone="sky"
                    />
                    <MetricStrip
                      label="Review"
                      value={dashboard?.statusDistribution.UNDER_REVIEW ?? 0}
                      hint="Awaiting decisions"
                      tone="fuchsia"
                    />
                    <MetricStrip
                      label="Completed"
                      value={dashboard?.kpis.completed ?? 0}
                      hint="Closed this cycle"
                      tone="emerald"
                    />
                    <MetricStrip
                      label="Overdue"
                      value={dashboard?.kpis.overdue ?? 0}
                      hint="Needs recovery"
                      tone="rose"
                    />
                  </div>

                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <label className="relative min-w-[240px] flex-1 xl:max-w-md">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={filter.search}
                          onChange={(event) => setFilter((prev) => ({ ...prev, search: event.target.value }))}
                          placeholder="Search title, code, assignee, project, module"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-400"
                        />
                      </label>
                      <select
                        value={filter.status}
                        onChange={(event) => setFilter((prev) => ({ ...prev, status: event.target.value }))}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
                      >
                        <option value="">All statuses</option>
                        {TASK_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {toLabel(status)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={filter.priority}
                        onChange={(event) => setFilter((prev) => ({ ...prev, priority: event.target.value }))}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
                      >
                        <option value="">All priorities</option>
                        {TASK_PRIORITIES.map((priority) => (
                          <option key={priority} value={priority}>
                            {toLabel(priority)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          setFilter({
                            ...defaultFilter,
                            scope,
                            search: filter.search,
                          })
                        }
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600"
                      >
                        <Filter className="h-4 w-4" />
                        Reset
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                        {(["all", "my", "team"] as TaskScope[]).map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setScope(item)}
                            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                              scope === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                            }`}
                          >
                            {item === "all" ? "All work" : item === "my" ? "My queue" : "Team lane"}
                          </button>
                        ))}
                      </div>
                      <select
                        value={grouping}
                        onChange={(event) => setGrouping(event.target.value as TaskGrouping)}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
                      >
                        <option value="status">Group by status</option>
                        <option value="priority">Group by priority</option>
                        <option value="project">Group by project</option>
                        <option value="module">Group by module</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-center gap-2 text-sm text-slate-500">
                      <Settings2 className="h-4 w-4 text-slate-400" />
                      Quick capture keeps the work stream moving without leaving the workspace.
                    </div>
                    <div className="flex flex-1 gap-2">
                      <input
                        value={quickTitle}
                        onChange={(event) => setQuickTitle(event.target.value)}
                        onKeyDown={(event) => event.key === "Enter" && handleQuickCreate()}
                        placeholder="Quick create a task in the current space"
                        className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleQuickCreate}
                        className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 px-3 py-3 sm:px-4">
                {treeQuery.isLoading ? (
                  <PanelState icon={<Loader2 className="h-5 w-5 animate-spin" />} title="Loading workspace" body="Syncing task streams, activity, and workspace structure." />
                ) : treeQuery.error ? (
                  <PanelState
                    icon={<AlertTriangle className="h-5 w-5 text-rose-500" />}
                    title="Task hierarchy unavailable"
                    body={treeQuery.error instanceof Error ? treeQuery.error.message : "Could not load tasks."}
                  />
                ) : !taskTree.length ? (
                  <PanelState icon={<CircleDashed className="h-5 w-5 text-slate-400" />} title="No tasks yet" body="Start a new work stream, define a module, and build the execution stack from here." />
                ) : view === "list" ? (
                  <div className="space-y-3">
                    {groupedSections.map((section) => (
                      <section key={section.key} className="overflow-hidden rounded-[26px] border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() => toggleGroup(section.key)}
                          className="flex w-full items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3 text-left"
                        >
                          <div className="flex items-center gap-3">
                            {collapsedGroups.has(section.key) ? (
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            )}
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{section.label}</p>
                              <p className="text-xs text-slate-500">{section.count} active rows in this group</p>
                            </div>
                          </div>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {section.count}
                          </span>
                        </button>

                        {!collapsedGroups.has(section.key) ? (
                          <div className="space-y-2 px-3 py-3">
                            <div className="flex gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5">
                              <input
                                value={groupDrafts[section.key] ?? ""}
                                onChange={(event) => setGroupDrafts((prev) => ({ ...prev, [section.key]: event.target.value }))}
                                onKeyDown={(event) => event.key === "Enter" && handleGroupQuickCreate(section)}
                                placeholder={`Add directly to ${section.label}`}
                                className="flex-1 bg-transparent text-sm outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleGroupQuickCreate(section)}
                                className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                Create
                              </button>
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-slate-200">
                              <div className="hidden grid-cols-[minmax(0,2.6fr)_140px_150px_130px_130px_120px_110px] items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 lg:grid">
                                <span>Task</span>
                                <span>Status</span>
                                <span>Assignee</span>
                                <span>Due</span>
                                <span>Priority</span>
                                <span>Project</span>
                                <span>Progress</span>
                              </div>
                              <div className="divide-y divide-slate-100">
                                {section.tasks.map((task) => (
                                  <TaskRow
                                    key={task.id}
                                    task={task}
                                    users={users}
                                    expandedIds={expandedIds}
                                    dragTaskId={dragTaskId}
                                    active={detailTaskId === task.id}
                                    onOpen={() => setDetailTaskId(task.id)}
                                    onToggleExpand={toggleExpand}
                                    onAssign={handleAssign}
                                    onInlineUpdate={handleInlineUpdate}
                                    onPromote={handlePromote}
                                    onDelete={handleDelete}
                                    onEdit={openEditor}
                                    onDropOnTask={handleDropOnTask}
                                    onDragStart={setDragTaskId}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </section>
                    ))}
                  </div>
                ) : view === "board" ? (
                  <div className="grid gap-3 xl:grid-cols-4">
                    {boardColumns.map((column) => (
                      <section key={column.status} className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${statusDot(column.status)}`} />
                            <p className="text-sm font-semibold text-slate-900">{toLabel(column.status)}</p>
                          </div>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-500">
                            {column.tasks.length}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {column.tasks.map((task) => (
                            <button
                              key={task.id}
                              type="button"
                              onClick={() => setDetailTaskId(task.id)}
                              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {task.taskCode} · {task.projectRef || "General"} · {task.moduleRef || "Unsorted"}
                                  </p>
                                </div>
                                <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${priorityTone(task.priority)}`}>
                                  {toLabel(task.priority)}
                                </span>
                              </div>
                              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                                <span>{task.assignedToName || "Unassigned"}</span>
                                <span>{formatDate(task.dueDate)}</span>
                              </div>
                              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-sky-500" style={{ width: `${task.progressPercent}%` }} />
                              </div>
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : view === "calendar" ? (
                  <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {dueCalendar.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => setDetailTaskId(task.id)}
                        className="rounded-[26px] border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Due {formatLongDate(task.dueDate)}
                          </p>
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${statusTone(task.status)}`}>
                            {toLabel(task.status)}
                          </span>
                        </div>
                        <p className="mt-3 text-base font-semibold text-slate-900">{task.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {task.projectRef || "General"} · {task.moduleRef || "Unsorted"}
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                          <Avatar name={task.assignedToName} />
                          {task.assignedToName || "Unassigned"}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingTimeline.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => setDetailTaskId(task.id)}
                        className="flex w-full flex-col gap-3 rounded-[26px] border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 lg:flex-row lg:items-center"
                      >
                        <div className="lg:w-64">
                          <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {task.taskCode} · {task.projectRef || "General"} · {task.moduleRef || "Unsorted"}
                          </p>
                        </div>
                        <div className="grid flex-1 gap-3 md:grid-cols-3">
                          <InfoCard label="Start" value={formatLongDate(task.startDate)} />
                          <InfoCard label="Due" value={formatLongDate(task.dueDate)} />
                          <InfoCard label="Window" value={`${formatRelativeDate(task.dueDate || task.startDate)}`} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </main>

            <div className={`hidden 2xl:block ${showDetailPanel ? "" : "pointer-events-none opacity-0"}`}>
              <aside className="sticky top-3 h-[calc(100vh-24px)] overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/90 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
                {detailTaskId ? (
                  <DetailPanel
                    detail={detail}
                    loading={detailQuery.isLoading}
                    users={users}
                    commentDraft={commentDraft}
                    checklistDraft={checklistDraft}
                    setCommentDraft={setCommentDraft}
                    setChecklistDraft={setChecklistDraft}
                    onAddComment={handleAddComment}
                    onAddChecklistItem={handleAddChecklistItem}
                    onChecklistToggle={handleChecklistToggle}
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
                    onAssign={handleAssign}
                    onInlineUpdate={handleInlineUpdate}
                    onClose={() => setDetailTaskId(null)}
                  />
                ) : (
                  <PanelState
                    icon={<PanelRightOpen className="h-5 w-5 text-slate-400" />}
                    title="Select a task"
                    body="Keep the workspace open in the center while reviewing the execution context, checklist, and comments here."
                    padded
                  />
                )}
              </aside>
            </div>
          </div>
        </div>
      </div>

      <Drawer open={sidebarOpen} title="Workspace" onClose={() => setSidebarOpen(false)} maxWidth="max-w-sm">
        {workspaceSidebar}
      </Drawer>

      <Drawer open={editorOpen} title={editingTask ? "Edit Task" : "Create Task"} onClose={() => setEditorOpen(false)} maxWidth="max-w-xl">
        <TaskEditor form={form} setForm={setForm} users={users} onSubmit={handleSaveTask} onClose={() => setEditorOpen(false)} />
      </Drawer>

      <Drawer open={Boolean(detailTaskId)} title={detail?.task.title ?? "Task"} onClose={() => setDetailTaskId(null)} maxWidth="max-w-xl" desktopHidden>
        <DetailPanel
          detail={detail}
          loading={detailQuery.isLoading}
          users={users}
          commentDraft={commentDraft}
          checklistDraft={checklistDraft}
          setCommentDraft={setCommentDraft}
          setChecklistDraft={setChecklistDraft}
          onAddComment={handleAddComment}
          onAddChecklistItem={handleAddChecklistItem}
          onChecklistToggle={handleChecklistToggle}
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
          onAssign={handleAssign}
          onInlineUpdate={handleInlineUpdate}
          onClose={() => setDetailTaskId(null)}
        />
      </Drawer>
    </>
  );
}

function Drawer({
  open,
  title,
  onClose,
  children,
  maxWidth = "max-w-2xl",
  desktopHidden = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  desktopHidden?: boolean;
}) {
  if (!open) return null;
  return (
    <div className={`fixed inset-0 z-50 flex justify-end ${desktopHidden ? "2xl:hidden" : ""}`}>
      <button type="button" className="flex-1 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`h-full w-full ${maxWidth} overflow-y-auto border-l border-slate-200 bg-white shadow-2xl`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
      </div>
    </div>
  );
}

function SidebarSection({
  title,
  icon,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/80">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-3 py-2.5 text-left">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {icon}
          {title}
        </span>
        {collapsed ? <ChevronRight className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {!collapsed ? <div className="space-y-1 px-2 pb-2">{children}</div> : null}
    </section>
  );
}

function SidebarItem({
  label,
  count,
  active,
  onClick,
  depth = 0,
  icon,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  depth?: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
        active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-white hover:text-slate-900"
      }`}
      style={{ paddingLeft: `${12 + depth * 18}px` }}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? "bg-white/15 text-white" : "bg-slate-200 text-slate-600"}`}>
        {count}
      </span>
    </button>
  );
}

function ViewSwitch({
  value,
  onChange,
}: {
  value: TaskView;
  onChange: (value: TaskView) => void;
}) {
  const options: Array<{ id: TaskView; label: string; icon: React.ReactNode }> = [
    { id: "list", label: "List", icon: <LayoutList className="h-4 w-4" /> },
    { id: "board", label: "Board", icon: <SquareKanban className="h-4 w-4" /> },
    { id: "calendar", label: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
    { id: "timeline", label: "Timeline", icon: <Workflow className="h-4 w-4" /> },
  ];
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
            value === option.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function MetricStrip({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "slate" | "sky" | "fuchsia" | "emerald" | "rose";
}) {
  const accents = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    fuchsia: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  }[tone];
  return (
    <div className={`rounded-2xl border px-3 py-3 ${accents}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-right text-xs opacity-80">{hint}</p>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  users,
  expandedIds,
  dragTaskId,
  active,
  onOpen,
  onToggleExpand,
  onAssign,
  onInlineUpdate,
  onPromote,
  onDelete,
  onEdit,
  onDropOnTask,
  onDragStart,
}: {
  task: TaskSummary;
  users: Array<{ id: string; name: string; email: string }>;
  expandedIds: Set<string>;
  dragTaskId: string | null;
  active: boolean;
  onOpen: () => void;
  onToggleExpand: (taskId: string) => void;
  onAssign: (task: TaskSummary, userId: string) => void;
  onInlineUpdate: (task: TaskSummary, patch: Partial<TaskRequest>, message: string) => void;
  onPromote: (task: TaskSummary) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: TaskSummary) => void;
  onDropOnTask: (task: TaskSummary) => void;
  onDragStart: (taskId: string | null) => void;
}) {
  const expanded = expandedIds.has(task.id);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task.id)}
      onDragEnd={() => onDragStart(null)}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={() => onDropOnTask(task)}
      className={`group px-3 py-2 transition sm:px-4 ${active ? "bg-sky-50/80" : "hover:bg-slate-50/80"} ${
        dragTaskId === task.id ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,2.6fr)_140px_150px_130px_130px_120px_110px] lg:items-center lg:gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <button type="button" className="mt-0.5 cursor-grab rounded-lg p-1 text-slate-300 transition group-hover:text-slate-500">
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => (task.childCount ? onToggleExpand(task.id) : onOpen())}
            className="mt-0.5 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            {task.childCount ? expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onOpen}
            className="min-w-0 flex-1 text-left"
            style={{ paddingLeft: `${task.hierarchyLevel * 14}px` }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${statusDot(task.status)}`} />
              <span className="truncate text-sm font-semibold text-slate-900">{task.title}</span>
              {task.overdue ? (
                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                  Overdue
                </span>
              ) : null}
              {task.childCount ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {task.childCount} subtasks
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{task.taskCode}</span>
              <span>·</span>
              <span>{task.projectRef || "General"}</span>
              <span>·</span>
              <span>{task.moduleRef || "Unsorted"}</span>
              <span>·</span>
              <span>{task.tags.length ? task.tags.join(", ") : "No tags"}</span>
            </div>
          </button>
        </div>

        <select
          value={task.status}
          onChange={(event) => onInlineUpdate(task, { status: event.target.value as TaskStatus }, "Status updated.")}
          className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700"
        >
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {toLabel(status)}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <Avatar name={task.assignedToName} />
          <select
            value={task.assignedToId ?? ""}
            onChange={(event) => onAssign(task, event.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700"
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <input
          type="date"
          value={task.dueDate ?? ""}
          onChange={(event) => onInlineUpdate(task, { dueDate: event.target.value || null }, "Due date updated.")}
          className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700"
        />

        <select
          value={task.priority}
          onChange={(event) => onInlineUpdate(task, { priority: event.target.value as TaskPriority }, "Priority updated.")}
          className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700"
        >
          {TASK_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {toLabel(priority)}
            </option>
          ))}
        </select>

        <div className="text-xs text-slate-500">
          <p className="font-medium text-slate-700">{task.projectRef || "General"}</p>
          <p className="mt-0.5">{task.moduleRef || "Unsorted"}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-sky-500" style={{ width: `${task.progressPercent}%` }} />
          </div>
          <span className="text-xs font-medium text-slate-600">{task.progressPercent}%</span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-11">
        <div className="flex flex-wrap gap-1">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone(task.status)}`}>{toLabel(task.status)}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityTone(task.priority)}`}>{toLabel(task.priority)}</span>
          {task.checklistTotal ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {task.checklistCompleted}/{task.checklistTotal} checklist
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
          <button type="button" onClick={() => onEdit(task)} className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
            Edit
          </button>
          {task.parentTaskId ? (
            <button type="button" onClick={() => onPromote(task)} className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
              Promote
            </button>
          ) : null}
          <button type="button" onClick={() => onDelete(task.id)} className="rounded-xl border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailPanel({
  detail,
  loading,
  users,
  commentDraft,
  checklistDraft,
  setCommentDraft,
  setChecklistDraft,
  onAddComment,
  onAddChecklistItem,
  onChecklistToggle,
  onQuickSubtask,
  onPromote,
  onOpenEdit,
  onAssign,
  onInlineUpdate,
  onClose,
}: {
  detail: TaskDetail | null;
  loading: boolean;
  users: Array<{ id: string; name: string; email: string }>;
  commentDraft: string;
  checklistDraft: string;
  setCommentDraft: React.Dispatch<React.SetStateAction<string>>;
  setChecklistDraft: React.Dispatch<React.SetStateAction<string>>;
  onAddComment: () => void;
  onAddChecklistItem: () => void;
  onChecklistToggle: (item: TaskChecklistItem) => void;
  onQuickSubtask: (task: TaskSummary, title: string) => void;
  onPromote: (task: TaskSummary) => void;
  onOpenEdit: (task: TaskSummary) => void;
  onAssign: (task: TaskSummary, userId: string) => void;
  onInlineUpdate: (task: TaskSummary, patch: Partial<TaskRequest>, message: string) => void;
  onClose: () => void;
}) {
  const [nestedDraft, setNestedDraft] = useState("");

  if (loading) {
    return <PanelState icon={<Loader2 className="h-5 w-5 animate-spin" />} title="Loading task context" body="Pulling task details, dependencies, and activity." padded />;
  }

  if (!detail) {
    return <PanelState icon={<AlertTriangle className="h-5 w-5 text-rose-500" />} title="Task unavailable" body="The selected task could not be loaded." padded />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{detail.task.taskCode}</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{detail.task.title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {detail.task.projectRef || "General"} · {detail.task.moduleRef || "Unsorted"} · Updated {formatRelativeDate(detail.task.updatedAt)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityTone(detail.task.priority)}`}>{toLabel(detail.task.priority)}</span>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(detail.task.status)}`}>{toLabel(detail.task.status)}</span>
          {detail.task.parentTaskId ? (
            <button type="button" onClick={() => onPromote(detail.task)} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
              Promote
            </button>
          ) : null}
          <button type="button" onClick={() => onOpenEdit(detail.task)} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
            Edit task
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <section className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <InfoCard label="Assignee" value={detail.task.assignedToName || "Unassigned"} />
            <InfoCard label="Due date" value={formatLongDate(detail.task.dueDate)} />
            <InfoCard label="Progress" value={`${detail.task.progressPercent}%`} />
            <InfoCard label="Estimate" value={`${detail.task.estimatedHours.toFixed(2)}h`} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Status">
              <select
                value={detail.task.status}
                onChange={(event) => onInlineUpdate(detail.task, { status: event.target.value as TaskStatus }, "Status updated.")}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm"
              >
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {toLabel(status)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assignee">
              <select
                value={detail.task.assignedToId ?? ""}
                onChange={(event) => onAssign(detail.task, event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm"
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {detail.task.description ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">
              {detail.task.description}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500">
              No description yet. Use edit task to add scope, outcomes, and constraints.
            </div>
          )}
        </section>

        <DetailSection title="Checklist" icon={<CheckCheck className="h-4 w-4 text-slate-500" />}>
          <div className="space-y-2">
            {detail.checklistItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChecklistToggle(item)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm ${
                  item.completed ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <span className={`h-4 w-4 rounded-full border ${item.completed ? "border-emerald-500 bg-emerald-500" : "border-slate-300"}`} />
                <span className={item.completed ? "line-through opacity-80" : ""}>{item.label}</span>
              </button>
            ))}
            <div className="flex gap-2">
              <input
                value={checklistDraft}
                onChange={(event) => setChecklistDraft(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && onAddChecklistItem()}
                placeholder="Add checklist item"
                className="flex-1 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <button type="button" onClick={onAddChecklistItem} className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
                Add
              </button>
            </div>
          </div>
        </DetailSection>

        <DetailSection title="Subtasks" icon={<Workflow className="h-4 w-4 text-slate-500" />}>
          <div className="space-y-2">
            {detail.subtasks.map((task) => (
              <button key={task.id} type="button" className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-left">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Level {task.hierarchyLevel} · {task.taskCode} · {task.progressPercent}%
                    </p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${statusTone(task.status)}`}>{toLabel(task.status)}</span>
                </div>
              </button>
            ))}
            <div className="flex gap-2">
              <input
                value={nestedDraft}
                onChange={(event) => setNestedDraft(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && onQuickSubtask(detail.task, nestedDraft)}
                placeholder="Create nested subtask"
                className="flex-1 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  onQuickSubtask(detail.task, nestedDraft);
                  setNestedDraft("");
                }}
                className="rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Add
              </button>
            </div>
          </div>
        </DetailSection>

        <DetailSection title="Comments" icon={<MessageSquareText className="h-4 w-4 text-slate-500" />}>
          <div className="space-y-3">
            {detail.comments.map((comment) => (
              <div key={comment.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-center gap-2">
                  <Avatar name={comment.authorName} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{comment.authorName}</p>
                    <p className="text-xs text-slate-500">{formatLongDate(comment.createdAt)}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{comment.message}</p>
              </div>
            ))}
            <textarea
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              rows={3}
              placeholder="Add progress notes, blockers, or decision context"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <div className="flex justify-end">
              <button type="button" onClick={onAddComment} className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
                Post Comment
              </button>
            </div>
          </div>
        </DetailSection>

        <DetailSection title="Activity" icon={<Timer className="h-4 w-4 text-slate-500" />}>
          <div className="space-y-3">
            {detail.activity.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-500" />
                <div className="min-w-0">
                  <p className="text-sm text-slate-800">{activity.message}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {activity.actorName || "System"} · {formatLongDate(activity.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DetailSection>

        <DetailSection title="Attachments & Time" icon={<Clock3 className="h-4 w-4 text-slate-500" />}>
          <div className="grid gap-3 md:grid-cols-2">
            <InfoCard label="Attachments" value={String(detail.attachments.length)} />
            <InfoCard label="Time logs" value={String(detail.timeLogs.length)} />
            <InfoCard label="Dependencies" value={String(detail.dependencies.length)} />
            <InfoCard label="Approval" value={toLabel(detail.task.approvalStatus)} />
          </div>
        </DetailSection>
      </div>
    </div>
  );
}

function DetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-slate-200 pt-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function TaskEditor({
  form,
  setForm,
  users,
  onSubmit,
  onClose,
}: {
  form: TaskFormState;
  setForm: React.Dispatch<React.SetStateAction<TaskFormState>>;
  users: Array<{ id: string; name: string; email: string }>;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Title">
        <input
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm"
          required
        />
      </Field>
      <Field label="Description">
        <textarea
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          rows={4}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm"
        />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <SelectField label="Status" value={form.status} onChange={(value) => setForm((prev) => ({ ...prev, status: value as TaskStatus }))} options={TASK_STATUSES} />
        <SelectField label="Priority" value={form.priority} onChange={(value) => setForm((prev) => ({ ...prev, priority: value as TaskPriority }))} options={TASK_PRIORITIES} />
        <SelectField label="Visibility" value={form.visibility} onChange={(value) => setForm((prev) => ({ ...prev, visibility: value as TaskVisibility }))} options={TASK_VISIBILITIES} />
        <Field label="Assignee">
          <select
            value={form.assignedToId}
            onChange={(event) => setForm((prev) => ({ ...prev, assignedToId: event.target.value }))}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Start date">
          <input type="date" value={form.startDate} onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" />
        </Field>
        <Field label="Due date">
          <input type="date" value={form.dueDate} onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" />
        </Field>
        <Field label="Project">
          <input value={form.projectRef} onChange={(event) => setForm((prev) => ({ ...prev, projectRef: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" />
        </Field>
        <Field label="Module">
          <input value={form.moduleRef} onChange={(event) => setForm((prev) => ({ ...prev, moduleRef: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" />
        </Field>
        <Field label="Workflow">
          <input value={form.workflowName} onChange={(event) => setForm((prev) => ({ ...prev, workflowName: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" />
        </Field>
        <Field label="Estimate hours">
          <input type="number" min={0} step="0.25" value={form.estimatedHours} onChange={(event) => setForm((prev) => ({ ...prev, estimatedHours: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" />
        </Field>
      </div>
      <Field label="Tags">
        <input value={form.tags} onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))} placeholder="ops, release, customer" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" />
      </Field>
      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
          Cancel
        </button>
        <button type="submit" className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          Save Task
        </button>
      </div>
    </form>
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
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm">
        {options.map((option) => (
          <option key={option} value={option}>
            {toLabel(option)}
          </option>
        ))}
      </select>
    </Field>
  );
}

function PanelState({
  icon,
  title,
  body,
  padded = false,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  padded?: boolean;
}) {
  return (
    <div className={`flex h-full min-h-[320px] items-center justify-center ${padded ? "p-4" : ""}`}>
      <div className="max-w-md rounded-[26px] border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">{icon}</div>
        <p className="mt-4 text-lg font-semibold text-slate-900">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Avatar({ name }: { name?: string | null }) {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
      {initials(name)}
    </span>
  );
}
