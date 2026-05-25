/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Clock3,
  Filter,
  FolderKanban,
  GripVertical,
  LayoutList,
  Loader2,
  MessageSquareText,
  MoreHorizontal,
  PencilLine,
  Plus,
  Search,
  Settings2,
  SquareKanban,
  Timer,
  TrendingUp,
  UserPlus,
  UserRound,
  Workflow,
  X,
} from "lucide-react";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useCurrentUser } from "@/modules/auth/hooks";
import { hasPermission, PERMISSIONS } from "@/modules/auth/permissions";
import type { CurrentUser } from "@/modules/auth/types";
import {
  useAddChecklistItem,
  useAddTaskComment,
  connectTaskStream,
  spaceKeys,
  taskKeys,
  useCreateTaskSpace,
  useTaskSpace,
  useTaskSpaces,
  useDeleteTaskSpace,
  useInviteToTaskSpace,
  useCreateSubtask,
  useCreateTask,
  useDeleteTask,
  useRemoveTaskSpaceMember,
  useReorderTaskHierarchy,
  useTask,
  useTaskDashboard,
  useTaskTree,
  useTaskUsers,
  useUpdateTaskSpace,
  useUpdateTaskSpaceMember,
  useUpdateChecklistItem,
  useUpdateTask,
  useUpdateTaskStatus,
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
  type TaskSpaceDetail,
  type TaskSpaceMemberRole,
  type TaskSpacePermission,
  type TaskSpaceRequest,
  type TaskSpaceSummary,
  TASK_SPACE_MEMBER_ROLES,
  TASK_SPACE_PERMISSIONS,
  TASK_SPACE_VISIBILITIES,
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
  assignedToIds: string[];
  estimatedHours: string;
  tags: string;
  spaceId: string;
};

type SpaceFormState = {
  name: string;
  description: string;
  iconName: string;
  colorHex: string;
  visibility: "PRIVATE" | "PUBLIC";
};

type SpaceMemberDraft = {
  userId: string;
  role: TaskSpaceMemberRole;
  permissions: TaskSpacePermission[];
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
  spaceId: ""
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
  assignedToIds: [],
  estimatedHours: "",
  tags: "",
  spaceId: "",
};

const defaultSpaceForm: SpaceFormState = {
  name: "",
  description: "",
  iconName: "space",
  colorHex: "#0f172a",
  visibility: "PRIVATE",
};

function defaultPermissionsForRole(role: TaskSpaceMemberRole): TaskSpacePermission[] {
  if (role === "OWNER" || role === "ADMIN" || role === "PROJECT_MANAGER") {
    return [...TASK_SPACE_PERMISSIONS];
  }
  if (role === "MEMBER") {
    return ["CREATE_TASKS", "UPDATE_STATUS", "ADD_COMMENTS", "UPDATE_CHECKLIST", "UPLOAD_ATTACHMENTS"];
  }
  return [];
}

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

function formatTableDate(value?: string | null) {
  if (!value) return "No due date";
  return format(parseISO(value), "MMM dd, yyyy");
}

function formatRelativeDate(value?: string | null) {
  if (!value) return "No date";
  return formatDistanceToNowStrict(parseISO(value), { addSuffix: true });
}

function priorityTone(priority: TaskPriority) {
  return {
    LOW: "bg-slate-100 text-slate-700",
    MEDIUM: "bg-sky-50 text-sky-700",
    HIGH: "bg-amber-50 text-amber-700",
    CRITICAL: "bg-rose-50 text-rose-700",
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
    assignedToIds: task.activeAssignees?.length ? task.activeAssignees.map((assignee) => assignee.assignedToId) : task.assignedToId ? [task.assignedToId] : [],
    estimatedHours: String(task.estimatedHours ?? ""),
    tags: task.tags.join(", "),
    spaceId: task.spaceId ?? "",
  };
}

function buildPayload(
  form: TaskFormState,
  users: Array<{ id: string; name: string; email: string }>,
  fallbackSpaceId?: string | null,
  parentTaskId?: string | null,
  orderIndex?: number | null
): TaskRequest {
  const assignees = form.assignedToIds
    .map((userId) => users.find((user) => user.id === userId))
    .filter((user): user is { id: string; name: string; email: string } => Boolean(user))
    .map((user) => ({
      assignedToId: user.id,
      assignedToName: user.name,
      assignedToEmail: user.email,
      assignedTeamName: null,
    }));
  const primaryAssignee = assignees[0];
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
    spaceId: form.spaceId || fallbackSpaceId || null,
    assignedToId: primaryAssignee?.assignedToId ?? null,
    assignedToName: primaryAssignee?.assignedToName ?? null,
    assignedToEmail: primaryAssignee?.assignedToEmail ?? null,
    assignees,
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

function buildAssigneeOptions(
  users: Array<{ id: string; name: string; email: string }>,
  currentTask?: Pick<TaskSummary, "assignedToId" | "assignedToName"> | null
) {
  const options: AssigneeOption[] = [
    { value: "", label: "Unassigned", email: null },
    ...users.map((user) => ({ value: user.id, label: user.name, email: user.email })),
  ];
  const currentAssignee = resolveAssigneeIdentity(currentTask?.assignedToId, currentTask?.assignedToName, users);
  if (currentAssignee.id && currentAssignee.name && !options.some((option) => option.value === currentAssignee.id)) {
    options.push({ value: currentAssignee.id, label: currentAssignee.name, email: currentAssignee.email });
  }
  return options;
}

function canOpenFullTaskEditor(user: CurrentUser | null | undefined, task: TaskSummary) {
  if (!user) return false;
  if (typeof task.canEdit === "boolean") return task.canEdit;
  return false;
}

function canManageExecution(user: CurrentUser | null | undefined, task: TaskSummary) {
  if (!user) return false;
  if (typeof task.canManageExecution === "boolean") return task.canManageExecution;
  if (user.id === task.assignedToId) return true;
  if (task.activeAssignees?.some((assignee) => assignee.assignedToId === user.id)) return true;
  return hasPermission(user, PERMISSIONS.PAGE_TASKS) || hasPermission(user, PERMISSIONS.MODULE_TASKS);
}

function activeSpaceTasks(tasks: TaskSummary[], spaceId: string) {
  if (!spaceId) return tasks;
  return tasks.filter((task) => task.spaceId === spaceId);
}

function canManageSpace(user: CurrentUser | null | undefined, space: TaskSpaceSummary | null) {
  if (!user || !space) return false;
  if (hasPermission(user, PERMISSIONS.PAGE_TASKS) || hasPermission(user, PERMISSIONS.MODULE_TASKS)) return true;
  return space.currentUserRole === "OWNER" || space.currentUserRole === "ADMIN" || space.currentUserRole === "PROJECT_MANAGER";
}

function roleBadge(role: TaskSpaceMemberRole) {
  return {
    OWNER: "border-slate-300 bg-slate-950 text-white",
    ADMIN: "border-slate-300 bg-slate-100 text-slate-800",
    PROJECT_MANAGER: "border-amber-200 bg-amber-50 text-amber-700",
    MEMBER: "border-emerald-200 bg-emerald-50 text-emerald-700",
    VIEWER: "border-slate-200 bg-slate-50 text-slate-600",
  }[role];
}

function toSpaceForm(space: TaskSpaceSummary | null): SpaceFormState {
  if (!space) return defaultSpaceForm;
  return {
    name: space.name,
    description: space.description ?? "",
    iconName: space.iconName ?? "space",
    colorHex: space.colorHex ?? "#0f172a",
    visibility: space.visibility,
  };
}

export default function TaskManagementPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<TaskView>("list");
  const [scope, setScope] = useState<TaskScope>("all");
  const [grouping, setGrouping] = useState<TaskGrouping>("status");
  const [filter, setFilter] = useState<TaskFilter>(defaultFilter);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskSummary | null>(null);
  const [spaceEditorOpen, setSpaceEditorOpen] = useState(false);
  const [memberPanelOpen, setMemberPanelOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<TaskSpaceSummary | null>(null);
  const [spaceForm, setSpaceForm] = useState<SpaceFormState>(defaultSpaceForm);
  const [spaceMembersDraft, setSpaceMembersDraft] = useState<SpaceMemberDraft[]>([]);
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteRole, setInviteRole] = useState<TaskSpaceMemberRole>("MEMBER");
  const [inviteMessage, setInviteMessage] = useState("");
  const [quickTitle, setQuickTitle] = useState("");
  const [groupDrafts, setGroupDrafts] = useState<Record<string, string>>({});
  const [commentDraft, setCommentDraft] = useState("");
  const [checklistDraft, setChecklistDraft] = useState("");
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskFormState>(defaultForm);

  const { data: currentUser } = useCurrentUser();
  const dashboardQuery = useTaskDashboard();
  const spacesQuery = useTaskSpaces();
  const spaceDetailQuery = useTaskSpace(selectedSpaceId || null);
  const treeQuery = useTaskTree(filter);
  const detailQuery = useTask(detailTaskId);
  const usersQuery = useTaskUsers();

  const createTaskMutation = useCreateTask();
  const createSpaceMutation = useCreateTaskSpace();
  const createSubtaskMutation = useCreateSubtask();
  const deleteSpaceMutation = useDeleteTaskSpace();
  const inviteSpaceMutation = useInviteToTaskSpace();
  const removeMemberMutation = useRemoveTaskSpaceMember();
  const updateTaskMutation = useUpdateTask();
  const updateSpaceMutation = useUpdateTaskSpace();
  const updateSpaceMemberMutation = useUpdateTaskSpaceMember();
  const updateTaskStatusMutation = useUpdateTaskStatus();
  const deleteTaskMutation = useDeleteTask();
  const reorderMutation = useReorderTaskHierarchy();
  const commentMutation = useAddTaskComment();
  const addChecklistMutation = useAddChecklistItem();
  const updateChecklistMutation = useUpdateChecklistItem();

  const dashboard = dashboardQuery.data;
  const spaces = spacesQuery.data ?? [];
  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId) ?? null;
  const selectedSpaceDetail = spaceDetailQuery.data ?? null;
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
    if (!selectedSpaceId) return;
    if (spaces.some((space) => space.id === selectedSpaceId)) return;
    setSelectedSpaceId("");
  }, [selectedSpaceId, spaces]);

  useEffect(() => {
    if (taskTree.length && expandedIds.size === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedIds(new Set(taskTree.map((task) => task.id)));
    }
  }, [taskTree, expandedIds.size]);

  useEffect(() => {
    if (editingTask) {
      // Defer setting state to avoid synchronous setState within effect which can
      // trigger cascading renders. Use a microtask to update after the current
      // render commit.
      Promise.resolve().then(() => setForm(taskToForm(editingTask)));
    }
  }, [editingTask]);

  useEffect(() => {
    // Defer updating filter state to avoid synchronous setState in an effect
    // which can trigger cascading renders.
    Promise.resolve().then(() => {
      setFilter((prev) => ({ ...prev, scope, spaceId: selectedSpaceId }));
    });
  }, [scope, selectedSpaceId]);

  useEffect(() => {
    const cleanup = connectTaskStream((event) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
      queryClient.invalidateQueries({ queryKey: spaceKeys.invitations() });
      if (event.spaceId) {
        queryClient.invalidateQueries({ queryKey: spaceKeys.detail(event.spaceId) });
      }
    });
    return cleanup;
  }, [queryClient]);

  const visibleTreeRows = useMemo(() => collectVisibleTasks(taskTree, expandedIds), [taskTree, expandedIds]);
  const allFlatTasks = useMemo(() => collectVisibleTasks(taskTree, new Set(taskTree.map((task) => task.id))), [taskTree]);
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
  const selectedScopedTasks = useMemo(() => activeSpaceTasks(allFlatTasks, selectedSpaceId), [allFlatTasks, selectedSpaceId]);
  const selectedSpaceCounts = useMemo(
    () => ({
      total: selectedScopedTasks.length,
      inProgress: selectedScopedTasks.filter((task) => task.status === "IN_PROGRESS").length,
      review: selectedScopedTasks.filter((task) => task.status === "UNDER_REVIEW").length,
      completed: selectedScopedTasks.filter((task) => task.status === "COMPLETED").length,
      overdue: selectedScopedTasks.filter((task) => task.overdue).length,
    }),
    [selectedScopedTasks]
  );
  const manageableSpace = canManageSpace(currentUser, selectedSpace);
  const heroMembers = (selectedSpaceDetail?.members ?? []).slice(0, 4);
  const spaceOptions = useMemo(
    () => [
      { value: "", label: "All Spaces" },
      ...spaces.map((space) => ({
        value: space.id,
        label: space.name,
      })),
      { value: "__add_space__", label: "+ Add Space" },
    ],
    [spaces]
  );

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
    setForm({
      ...taskToForm(task ?? null),
      spaceId: task?.spaceId ?? selectedSpaceId,
    });
    setEditorOpen(true);
  }

  function openSpaceEditor(space?: TaskSpaceSummary | null) {
    setEditingSpace(space ?? null);
    setSpaceForm(toSpaceForm(space ?? null));
    setSpaceMembersDraft([]);
    setSpaceEditorOpen(true);
  }

  function handleSpaceSelect(value: string) {
    if (value === "__add_space__") {
      openSpaceEditor(null);
      return;
    }
    setSelectedSpaceId(value);
  }

  function addSpaceMemberDraft() {
    setSpaceMembersDraft((prev) => [...prev, { userId: "", role: "MEMBER", permissions: defaultPermissionsForRole("MEMBER") }]);
  }

  function updateSpaceMemberDraft(index: number, patch: Partial<SpaceMemberDraft>) {
    setSpaceMembersDraft((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const nextRole = (patch.role ?? item.role) as TaskSpaceMemberRole;
        const nextPermissions = patch.permissions ?? item.permissions;
        return {
          ...item,
          ...patch,
          role: nextRole,
          permissions: nextPermissions,
        };
      })
    );
  }

  function updateSpaceMemberRole(index: number, role: TaskSpaceMemberRole) {
    updateSpaceMemberDraft(index, { role, permissions: defaultPermissionsForRole(role) });
  }

  function toggleSpaceMemberPermission(index: number, permission: TaskSpacePermission) {
    setSpaceMembersDraft((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const nextPermissions = item.permissions.includes(permission)
          ? item.permissions.filter((itemPermission) => itemPermission !== permission)
          : [...item.permissions, permission];
        return { ...item, permissions: nextPermissions };
      })
    );
  }

  function removeSpaceMemberDraft(index: number) {
    setSpaceMembersDraft((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function handleQuickCreate() {
    if (!quickTitle.trim()) return;
    createTaskMutation.mutate(
      {
        title: quickTitle.trim(),
        priority: "MEDIUM",
        status: "PENDING",
        visibility: "TEAM",
        spaceId: selectedSpaceId || undefined,
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
    const payload = buildPayload(form, users, selectedSpaceId, editingTask?.parentTaskId, editingTask?.orderIndex);
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
      spaceId: selectedSpaceId || undefined,
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
    const resolvedAssignee = resolveAssigneeIdentity(task.assignedToId, task.assignedToName, users);
    const activeAssignees = getActiveAssignees(task, users);
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
          spaceId: task.spaceId,
          assignedToId: task.assignedToId,
          assignedToName: resolvedAssignee.name || null,
          assignedToEmail: resolvedAssignee.email,
          assignees: activeAssignees,
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

  function handleStatusUpdate(task: TaskSummary, status: TaskStatus, message: string) {
    updateTaskStatusMutation.mutate(
      { id: task.id, status },
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

  function handleAssign(task: TaskSummary, userIds: string[]) {
    const selectedUsers = userIds
      .map((userId) => users.find((user) => user.id === userId))
      .filter((user): user is { id: string; name: string; email: string } => Boolean(user));
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
          spaceId: task.spaceId,
          assignedToId: selectedUsers[0]?.id ?? null,
          assignedToName: selectedUsers[0]?.name ?? null,
          assignedToEmail: selectedUsers[0]?.email ?? null,
          assignees: selectedUsers.map((user) => ({
            assignedToId: user.id,
            assignedToName: user.name,
            assignedToEmail: user.email,
            assignedTeamName: null,
          })),
          parentTaskId: task.parentTaskId,
          orderIndex: task.orderIndex,
          tags: task.tags.map((name) => ({ name })),
        },
      },
      {
        onSuccess: () => toast.success(selectedUsers.length ? "Assignees updated." : "Task unassigned."),
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

  function handleSaveSpace(event: React.FormEvent) {
    event.preventDefault();
    const payload: TaskSpaceRequest = {
      name: spaceForm.name.trim(),
      description: spaceForm.description.trim() || null,
      iconName: spaceForm.iconName || null,
      colorHex: spaceForm.colorHex || null,
      visibility: spaceForm.visibility,
      members: editingSpace
        ? undefined
        : spaceMembersDraft
            .map((member) => {
              const user = users.find((candidate) => candidate.id === member.userId);
              if (!user) return null;
              return {
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                role: member.role,
                permissions: member.permissions,
              };
            })
            .filter((member): member is NonNullable<typeof member> => Boolean(member)),
    };
    if (!payload.name) {
      toast.error("Space name is required.");
      return;
    }
    if (editingSpace) {
      updateSpaceMutation.mutate(
        { spaceId: editingSpace.id, payload },
        {
          onSuccess: () => {
            toast.success("Space updated.");
            setSpaceEditorOpen(false);
          },
          onError: (error) => toast.error(error.message),
        }
      );
      return;
    }
    createSpaceMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Space created.");
        setSpaceEditorOpen(false);
      },
      onError: (error) => toast.error(error.message),
    });
  }

  function handleDeleteSpace(space: TaskSpaceSummary) {
    deleteSpaceMutation.mutate(space.id, {
      onSuccess: () => {
        toast.success("Space deleted.");
        setSpaceEditorOpen(false);
      },
      onError: (error) => toast.error(error.message),
    });
  }

  function handleInviteMember() {
    if (!selectedSpaceId || !inviteUserId) return;
    const user = users.find((candidate) => candidate.id === inviteUserId);
    if (!user) {
      toast.error("Select a user to invite.");
      return;
    }
    inviteSpaceMutation.mutate(
      {
        spaceId: selectedSpaceId,
        payload: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          role: inviteRole,
          message: inviteMessage.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Invitation sent.");
          setInviteUserId("");
          setInviteRole("MEMBER");
          setInviteMessage("");
        },
        onError: (error) => toast.error(error.message),
      }
    );
  }

  function handleMemberRoleUpdate(memberId: string, role: TaskSpaceMemberRole) {
    if (!selectedSpaceId) return;
    updateSpaceMemberMutation.mutate(
      { spaceId: selectedSpaceId, memberId, role },
      {
        onSuccess: () => toast.success("Member role updated."),
        onError: (error) => toast.error(error.message),
      }
    );
  }

  function handleRemoveMember(memberId: string) {
    if (!selectedSpaceId) return;
    removeMemberMutation.mutate(
      { spaceId: selectedSpaceId, memberId },
      {
        onSuccess: () => toast.success("Member removed."),
        onError: (error) => toast.error(error.message),
      }
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#f6f7fb]">
        <div className="mx-auto max-w-[1700px] px-4 py-5 sm:px-6">
          <main className="flex min-h-0 flex-col gap-5">
            <section className="rounded-[32px] border border-slate-200/80 bg-white px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                  <span>Team spaces</span>
                  <span>/</span>
                  <span>{selectedSpace?.name || filter.projectRef || detail?.task.projectRef || "All execution"}</span>
                  <span>/</span>
                  <span>{filter.moduleRef || detail?.task.moduleRef || "Tasks"}</span>
                </div>

                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      <FolderKanban className="h-3.5 w-3.5" />
                      Space
                    </div>
                    <div className="mt-2 w-full max-w-[320px]">
                      <FloatingSelect
                        value={selectedSpaceId}
                        onChange={handleSpaceSelect}
                        options={spaceOptions}
                        triggerClassName="rounded-2xl border-slate-200 bg-white text-base font-semibold text-slate-950"
                      />
                    </div>
                    <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">Tasks</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                      Pending, in progress, completed, and overdue work stays scoped inside the selected space while the task stream remains visible and compact.
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-4 xl:items-end">
                    {heroMembers.length ? (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {heroMembers.map((member) => (
                            <span
                              key={member.id}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-[11px] font-semibold text-white"
                              title={member.userName}
                            >
                              {initials(member.userName)}
                            </span>
                          ))}
                        </div>
                        {selectedSpaceDetail && selectedSpaceDetail.members.length > heroMembers.length ? (
                          <span className="text-sm font-medium text-slate-500">+{selectedSpaceDetail.members.length - heroMembers.length}</span>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2">
                      {selectedSpace && manageableSpace ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setMemberPanelOpen(true)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                          >
                            <UserPlus className="h-4 w-4" />
                            Members
                          </button>
                          <button
                            type="button"
                            onClick={() => openSpaceEditor(selectedSpace)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            Edit Space
                          </button>
                        </>
                      ) : null}
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
                </div>

                <div className="flex flex-col gap-4 border-t border-slate-200 pt-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <ViewSwitch value={view} onChange={setView} />
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                        {(["all", "my", "team"] as TaskScope[]).map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setScope(item)}
                            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                              scope === item ? "bg-white text-slate-900" : "text-slate-500"
                            }`}
                          >
                            {item === "all" ? "All work" : item === "my" ? "My queue" : "Team lane"}
                          </button>
                        ))}
                      </div>
                      <FloatingSelect
                        value={grouping}
                        onChange={(value) => setGrouping(value as TaskGrouping)}
                        options={[
                          { value: "status", label: "Group by status" },
                          { value: "priority", label: "Group by priority" },
                          { value: "project", label: "Group by project" },
                          { value: "module", label: "Group by module" },
                        ]}
                        className="min-w-[210px]"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <MetricStrip
                      label="Total"
                      value={selectedSpace ? selectedSpaceCounts.total : dashboard?.kpis.totalTasks ?? 0}
                      hint="Visible work items"
                      tone="slate"
                    />
                    <MetricStrip
                      label="In Progress"
                      value={selectedSpace ? selectedSpaceCounts.inProgress : dashboard?.kpis.inProgress ?? 0}
                      hint="Execution active"
                      tone="sky"
                    />
                    <MetricStrip
                      label="Review"
                      value={selectedSpace ? selectedSpaceCounts.review : dashboard?.statusDistribution.UNDER_REVIEW ?? 0}
                      hint="Awaiting decisions"
                      tone="fuchsia"
                    />
                    <MetricStrip
                      label="Completed"
                      value={selectedSpace ? selectedSpaceCounts.completed : dashboard?.kpis.completed ?? 0}
                      hint="Closed this cycle"
                      tone="emerald"
                    />
                    <MetricStrip
                      label="Overdue"
                      value={selectedSpace ? selectedSpaceCounts.overdue : dashboard?.kpis.overdue ?? 0}
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
                          className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-300"
                        />
                      </label>
                      <FloatingSelect
                        value={filter.status}
                        onChange={(value) => setFilter((prev) => ({ ...prev, status: value }))}
                        options={[
                          { value: "", label: "All statuses" },
                          ...TASK_STATUSES.map((status) => ({ value: status, label: toLabel(status) })),
                        ]}
                        className="min-w-[180px]"
                      />
                      <FloatingSelect
                        value={filter.priority}
                        onChange={(value) => setFilter((prev) => ({ ...prev, priority: value }))}
                        options={[
                          { value: "", label: "All priorities" },
                          ...TASK_PRIORITIES.map((priority) => ({ value: priority, label: toLabel(priority) })),
                        ]}
                        className="min-w-[180px]"
                      />
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

                    <p className="text-sm text-slate-500">Switch between views and filters without leaving the current workspace.</p>
                  </div>

                  <div className="flex flex-col gap-2 rounded-[24px] border border-slate-200 bg-slate-50 px-3.5 py-3 sm:flex-row sm:items-center">
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
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="min-h-0 flex-1 px-1 py-1 sm:px-0">
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
                      <section key={section.key} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
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

                            <div className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white">
                              <div className="hidden grid-cols-[minmax(0,2.8fr)_118px_180px_138px_108px_118px_110px] items-center gap-4 border-b border-slate-100 bg-slate-50/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 lg:grid">
                                <span>Task</span>
                                <span>Status</span>
                                <span>Assignee</span>
                                <span>Due</span>
                                <span>Priority</span>
                                <span>Project</span>
                                <span>Progress</span>
                              </div>
                              <div className="divide-y divide-slate-100/80">
                                {section.tasks.map((task) => (
                                  <TaskRow
                                    key={task.id}
                                    task={task}
                                    currentUser={currentUser}
                                    users={users}
                                    expandedIds={expandedIds}
                                    dragTaskId={dragTaskId}
                                    active={detailTaskId === task.id}
                                    onOpen={() => setDetailTaskId(task.id)}
                                    onToggleExpand={toggleExpand}
                                    onAssign={handleAssign}
                                    onStatusUpdate={handleStatusUpdate}
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
                  <div className="grid gap-4 xl:grid-cols-4">
                    {boardColumns.map((column) => (
                      <section key={column.status} className="rounded-[30px] border border-slate-200 bg-[#f8f9fc] p-3.5">
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
                              className="w-full rounded-[24px] border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${statusTone(task.status)}`}>
                                    {toLabel(task.status)}
                                  </span>
                                  <p className="mt-3 text-[15px] font-semibold leading-6 text-slate-900">{task.title}</p>
                                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                    {task.description || "Execution notes and delivery context will appear here for the selected task."}
                                  </p>
                                </div>
                                <MoreHorizontal className="h-4 w-4 text-slate-400" />
                              </div>
                              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                                <span className="inline-flex items-center gap-2">
                                  <Avatar name={getActiveAssignees(task, users)[0]?.assignedToName} />
                                  <span>{getActiveAssignees(task, users).length ? getActiveAssignees(task, users).map((assignee) => assignee.assignedToName).join(", ") : "Unassigned"}</span>
                                </span>
                                <span className={`rounded-full border px-2 py-1 font-semibold ${priorityTone(task.priority)}`}>{toLabel(task.priority)}</span>
                              </div>
                              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                                <span>{formatDate(task.dueDate)}</span>
                                <span>{task.checklistCompleted}/{task.checklistTotal || 0} checklist</span>
                                <span>{task.progressPercent}%</span>
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
                          {task.projectRef || "General"} • {task.moduleRef || "Unsorted"}
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                          <Avatar name={getActiveAssignees(task, users)[0]?.assignedToName} />
                          {getActiveAssignees(task, users).length ? getActiveAssignees(task, users).map((assignee) => assignee.assignedToName).join(", ") : "Unassigned"}
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
                            {task.taskCode} • {task.projectRef || "General"} • {task.moduleRef || "Unsorted"}
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
        </div>
      </div>

      <Drawer open={editorOpen} title={editingTask ? "Edit Task" : "Create Task"} onClose={() => setEditorOpen(false)} maxWidth="max-w-xl">
        <TaskEditor form={form} setForm={setForm} users={users} spaces={spaces} onSubmit={handleSaveTask} onClose={() => setEditorOpen(false)} />
      </Drawer>

      <Drawer open={spaceEditorOpen} title={editingSpace ? "Edit Space" : "Create Space"} onClose={() => setSpaceEditorOpen(false)} maxWidth="max-w-lg">
        <SpaceEditor
          form={spaceForm}
          setForm={setSpaceForm}
          users={users}
          memberDrafts={spaceMembersDraft}
          onAddMember={addSpaceMemberDraft}
          onUpdateMember={updateSpaceMemberDraft}
          onUpdateMemberRole={updateSpaceMemberRole}
          onTogglePermission={toggleSpaceMemberPermission}
          onRemoveMember={removeSpaceMemberDraft}
          onSubmit={handleSaveSpace}
          editingSpace={editingSpace}
          onDelete={() => editingSpace && handleDeleteSpace(editingSpace)}
          onClose={() => setSpaceEditorOpen(false)}
        />
      </Drawer>

      {selectedSpace && (
        <Drawer open={memberPanelOpen} title={`${selectedSpace.name} Members`} onClose={() => setMemberPanelOpen(false)} maxWidth="max-w-xl">
          <SpaceMembersPanel
            detail={selectedSpaceDetail}
            users={users}
            inviteUserId={inviteUserId}
            inviteRole={inviteRole}
            inviteMessage={inviteMessage}
            setInviteUserId={setInviteUserId}
            setInviteRole={setInviteRole}
            setInviteMessage={setInviteMessage}
            onInvite={handleInviteMember}
            onRoleChange={handleMemberRoleUpdate}
            onRemoveMember={handleRemoveMember}
            canManage={manageableSpace}
          />
        </Drawer>
      )}

      <Drawer open={Boolean(detailTaskId)} title={detail?.task.title ?? "Task"} onClose={() => setDetailTaskId(null)} maxWidth="max-w-full md:max-w-[72vw] xl:max-w-[42vw]">
        <DetailPanel
          detail={detail}
          loading={detailQuery.isLoading}
          users={users}
          currentUser={currentUser}
          commentDraft={commentDraft}
          checklistDraft={checklistDraft}
          setCommentDraft={setCommentDraft}
          setChecklistDraft={setChecklistDraft}
          onAddComment={handleAddComment}
          onAddChecklistItem={handleAddChecklistItem}
          onChecklistToggle={handleChecklistToggle}
          onQuickSubtask={(task, title) => {
            const payload = buildPayload({ ...defaultForm, title, spaceId: task.spaceId ?? selectedSpaceId }, users, task.spaceId, task.id, null);
            createSubtaskMutation.mutate(
              { parentId: task.id, payload },
              {
                onSuccess: () => toast.success("Nested subtask created."),
                onError: (error) => toast.error(error.message),
              }
            );
          }}
          onQuickCompleteSubtask={(task) =>
            handleInlineUpdate(
              task,
              { status: task.status === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED" },
              task.status === "COMPLETED" ? "Subtask reopened." : "Subtask completed."
            )
          }
          onPromote={handlePromote}
          onOpenEdit={openEditor}
          onAssign={handleAssign}
          onStatusUpdate={handleStatusUpdate}
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

type FloatingOption = {
  value: string;
  label: string;
};

type AssigneeOption = {
  value: string;
  label: string;
  email?: string | null;
};

function resolveAssigneeIdentity(
  assignedToId: string | null | undefined,
  assignedToName: string | null | undefined,
  users: Array<{ id: string; name: string; email: string }>
) {
  const matchedUser = assignedToId ? users.find((user) => user.id === assignedToId) : null;
  return {
    id: assignedToId ?? matchedUser?.id ?? "",
    name: matchedUser?.name?.trim() || assignedToName?.trim() || "",
    email: matchedUser?.email ?? null,
  };
}

function getActiveAssignees(
  task: Pick<TaskSummary, "activeAssignees" | "assignedToId" | "assignedToName" | "assignedTeamName">,
  users: Array<{ id: string; name: string; email: string }>
) {
  if (task.activeAssignees?.length) {
    return task.activeAssignees.map((assignee) => ({
      ...assignee,
      assignedToName: resolveAssigneeIdentity(assignee.assignedToId, assignee.assignedToName, users).name || assignee.assignedToName,
    }));
  }
  const resolved = resolveAssigneeIdentity(task.assignedToId, task.assignedToName, users);
  return resolved.id
    ? [
        {
          assignedToId: resolved.id,
          assignedToName: resolved.name,
          assignedToEmail: resolved.email,
          assignedTeamName: task.assignedTeamName ?? null,
        },
      ]
    : [];
}

function FloatingSelect({
  value,
  onChange,
  options,
  className = "",
  triggerClassName = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: FloatingOption[];
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const selectedOption = options[selectedIndex] ?? options[0];

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, 176);
    const left = Math.min(Math.max(16, rect.left), window.innerWidth - width - 16);
    const top = Math.min(rect.bottom + 8, window.innerHeight - 24);
    setPanelStyle({
      position: "fixed",
      top,
      left,
      width,
      zIndex: 80,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const handleViewport = () => updatePosition();
    window.addEventListener("resize", handleViewport);
    window.addEventListener("scroll", handleViewport, true);
    return () => {
      window.removeEventListener("resize", handleViewport);
      window.removeEventListener("scroll", handleViewport, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    setHighlightedIndex(selectedIndex);

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % options.length);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length);
      }
      if (event.key === "Enter" && open) {
        event.preventDefault();
        const option = options[highlightedIndex];
        if (option) {
          onChange(option.value);
          setOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [highlightedIndex, onChange, open, options, selectedIndex]);

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-700 transition hover:border-slate-300 ${triggerClassName}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{selectedOption?.label ?? ""}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              style={panelStyle}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md ring-1 ring-slate-200/70"
            >
              <div className="max-h-72 overflow-y-auto p-1.5">
                {options.map((option, index) => {
                  const selected = option.value === value;
                  const highlighted = index === highlightedIndex;
                  return (
                    <button
                      key={`${option.value}-${option.label}`}
                      type="button"
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition ${
                        selected
                          ? "bg-slate-900 text-white"
                          : highlighted
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-700 hover:bg-slate-100"
                      }`}
                      role="option"
                      aria-selected={selected}
                    >
                      <span className="truncate">{option.label}</span>
                      {selected ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function AssigneeSelect({
  value,
  onChange,
  options,
  className = "",
  triggerClassName = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: AssigneeOption[];
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const selectedOption =
    options.find((option) => option.value === value) ??
    options.find((option) => option.value === "") ??
    options[0];

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => {
      const haystack = [option.label, option.email ?? ""].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [options, query]);

  const selectedIndex = Math.max(
    0,
    filteredOptions.findIndex((option) => option.value === value)
  );

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 320), 420);
    const left = Math.min(Math.max(16, rect.left), window.innerWidth - width - 16);
    const spaceBelow = window.innerHeight - rect.bottom - 16;
    const desiredHeight = 420;
    const shouldFlip = spaceBelow < 260 && rect.top > desiredHeight;
    const top = shouldFlip ? Math.max(16, rect.top - desiredHeight - 8) : Math.min(rect.bottom + 8, window.innerHeight - desiredHeight - 16);
    setPanelStyle({
      position: "fixed",
      top,
      left,
      width,
      zIndex: 90,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const handleViewport = () => updatePosition();
    window.addEventListener("resize", handleViewport);
    window.addEventListener("scroll", handleViewport, true);
    return () => {
      window.removeEventListener("resize", handleViewport);
      window.removeEventListener("scroll", handleViewport, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlightedIndex(selectedIndex);
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedIndex((prev) => (filteredOptions.length ? (prev + 1) % filteredOptions.length : 0));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIndex((prev) => (filteredOptions.length ? (prev - 1 + filteredOptions.length) % filteredOptions.length : 0));
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const option = filteredOptions[highlightedIndex];
        if (option) {
          onChange(option.value);
          setOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [filteredOptions, highlightedIndex, onChange, open, selectedIndex]);

  const currentLabel = selectedOption?.value ? selectedOption.label : "Assign person";
  const currentSubtitle = selectedOption?.value ? selectedOption.email : "Choose a teammate";

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-slate-300 ${triggerClassName}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={selectedOption?.value ? selectedOption.label : null} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{currentLabel}</p>
            <p className="truncate text-xs text-slate-500">{currentSubtitle}</p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              style={panelStyle}
              className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)]"
            >
              <div className="border-b border-slate-100 p-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setHighlightedIndex(0);
                    }}
                    placeholder="Search people or enter email..."
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div className="max-h-[320px] overflow-y-auto px-2 py-2">
                <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Assignees
                </p>
                {filteredOptions.length ? (
                  filteredOptions.map((option, index) => {
                    const selected = option.value === value;
                    const highlighted = index === highlightedIndex;
                    return (
                      <button
                        key={`${option.value}-${option.label}`}
                        type="button"
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => {
                          onChange(option.value);
                          setOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                          selected
                            ? "bg-slate-100"
                            : highlighted
                              ? "bg-slate-50"
                              : "hover:bg-slate-50"
                        }`}
                        role="option"
                        aria-selected={selected}
                      >
                        <Avatar name={option.value ? option.label : null} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{option.label}</p>
                          <p className="truncate text-xs text-slate-500">
                            {option.value ? option.email || "No email on record" : "Leave this task without an assignee"}
                          </p>
                        </div>
                        {selected ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-slate-900" /> : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-8 text-center text-sm text-slate-500">
                    No matching people found.
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function AssigneeMultiSelect({
  values,
  onChange,
  options,
  className = "",
}: {
  values: string[];
  onChange: (values: string[]) => void;
  options: AssigneeOption[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const selectedOptions = options.filter((option) => option.value && values.includes(option.value));
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return options.filter((option) => {
      if (!option.value) return false;
      if (!normalizedQuery) return true;
      return [option.label, option.email ?? ""].join(" ").toLowerCase().includes(normalizedQuery);
    });
  }, [options, query]);

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 340), 440);
    const left = Math.min(Math.max(16, rect.left), window.innerWidth - width - 16);
    const top = Math.min(rect.bottom + 8, window.innerHeight - 460);
    setPanelStyle({
      position: "fixed",
      top,
      left,
      width,
      zIndex: 90,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const handleViewport = () => updatePosition();
    window.addEventListener("resize", handleViewport);
    window.addEventListener("scroll", handleViewport, true);
    return () => {
      window.removeEventListener("resize", handleViewport);
      window.removeEventListener("scroll", handleViewport, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-slate-300"
      >
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex -space-x-2">
              {selectedOptions.slice(0, 3).map((option) => (
                <Avatar key={option.value} name={option.label} />
              ))}
            </div>
            <span className="truncate text-sm font-medium text-slate-800">
              {selectedOptions.length ? selectedOptions.map((option) => option.label).join(", ") : "Assign teammates"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {selectedOptions.length ? `${selectedOptions.length} assignee${selectedOptions.length > 1 ? "s" : ""} selected` : "Choose one or more people"}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              style={panelStyle}
              className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)]"
            >
              <div className="border-b border-slate-100 p-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search people..."
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div className="max-h-[320px] overflow-y-auto px-2 py-2">
                <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Assignees</p>
                {filteredOptions.map((option) => {
                  const selected = values.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        onChange(
                          selected ? values.filter((value) => value !== option.value) : [...values, option.value]
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                        selected ? "bg-slate-100" : "hover:bg-slate-50"
                      }`}
                    >
                      <Avatar name={option.label} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{option.label}</p>
                        <p className="truncate text-xs text-slate-500">{option.email || "No email on record"}</p>
                      </div>
                      {selected ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-slate-900" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
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
    <div className="inline-flex items-center gap-1 border-b border-slate-200">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition ${
            value === option.id ? "border-slate-900 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-700"
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
    slate: "border-slate-200 bg-white text-slate-700",
    sky: "border-slate-200 bg-white text-slate-700",
    fuchsia: "border-slate-200 bg-white text-slate-700",
    emerald: "border-slate-200 bg-white text-slate-700",
    rose: "border-slate-200 bg-white text-slate-700",
  }[tone];
  return (
    <div className={`rounded-[24px] border px-4 py-3.5 ${accents}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-[28px] font-semibold tracking-tight text-slate-950">{value}</p>
        <p className="max-w-[110px] text-right text-xs text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  currentUser,
  users,
  expandedIds,
  dragTaskId,
  active,
  onOpen,
  onToggleExpand,
  onAssign,
  onStatusUpdate,
  onInlineUpdate,
  onPromote,
  onDelete,
  onEdit,
  onDropOnTask,
  onDragStart,
}: {
  task: TaskSummary;
  currentUser: CurrentUser | null | undefined;
  users: Array<{ id: string; name: string; email: string }>;
  expandedIds: Set<string>;
  dragTaskId: string | null;
  active: boolean;
  onOpen: () => void;
  onToggleExpand: (taskId: string) => void;
  onAssign: (task: TaskSummary, userIds: string[]) => void;
  onStatusUpdate: (task: TaskSummary, status: TaskStatus, message: string) => void;
  onInlineUpdate: (task: TaskSummary, patch: Partial<TaskRequest>, message: string) => void;
  onPromote: (task: TaskSummary) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: TaskSummary) => void;
  onDropOnTask: (task: TaskSummary) => void;
  onDragStart: (taskId: string | null) => void;
}) {
  const expanded = expandedIds.has(task.id);
  const activeAssignees = getActiveAssignees(task, users);

  return (
    <div
      draggable
      onClick={onOpen}
      onDragStart={() => onDragStart(task.id)}
      onDragEnd={() => onDragStart(null)}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={() => onDropOnTask(task)}
      className={`group cursor-pointer px-3 py-2 transition sm:px-4 ${active ? "bg-slate-100/80" : "hover:bg-slate-50/70"} ${
        dragTaskId === task.id ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-[minmax(0,2.8fr)_118px_180px_138px_108px_118px_110px] lg:items-center lg:gap-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <button
            type="button"
            onClick={(event) => event.stopPropagation()}
            className="mt-0.5 cursor-grab rounded-lg p-1 text-slate-300 transition group-hover:text-slate-500"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (task.childCount) onToggleExpand(task.id);
              else onOpen();
            }}
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
              <span className="truncate text-[13.5px] font-semibold text-slate-900">{task.title}</span>
              {task.overdue ? (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                  Overdue
                </span>
              ) : null}
              {task.childCount ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {task.childCount} subtasks
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span>{task.taskCode}</span>
              <span>•</span>
              <span>{task.projectRef || "General"}</span>
              <span>•</span>
              <span>{task.moduleRef || "Unsorted"}</span>
              <span>•</span>
              <span>{task.tags.length ? task.tags.join(", ") : "No tags"}</span>
            </div>
          </button>
        </div>

        <div className="text-xs font-medium text-slate-600">
          <span className={`inline-flex rounded-full px-2.5 py-1 ${statusTone(task.status)}`}>{toLabel(task.status)}</span>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <div className="flex -space-x-2">
            {(activeAssignees.length ? activeAssignees : [{ assignedToId: "", assignedToName: "", assignedToEmail: null, assignedTeamName: null }]).slice(0, 3).map((assignee, index) => (
              <span key={`${assignee.assignedToId || "unassigned"}-${index}`} className="ring-2 ring-white">
                <Avatar name={assignee.assignedToName} />
              </span>
            ))}
          </div>
          <span className="truncate text-xs font-medium text-slate-700">
            {activeAssignees.length
              ? activeAssignees.map((assignee) => assignee.assignedToName).join(", ")
              : "Unassigned"}
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
          <span>{formatTableDate(task.dueDate)}</span>
        </div>

        <div className="text-xs font-medium text-slate-600">
          <span className={`inline-flex rounded-full px-2.5 py-1 ${priorityTone(task.priority)}`}>
            {task.priority === "CRITICAL" ? "urgent" : toLabel(task.priority)}
          </span>
        </div>

        <div className="text-[11px] text-slate-500">
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

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-10">
        <div className="flex flex-wrap items-center gap-2">
          {task.checklistTotal ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {task.checklistCompleted}/{task.checklistTotal} checklist
            </span>
          ) : null}
          <span className="text-[11px] text-slate-500">Updated {formatRelativeDate(task.updatedAt)}</span>
        </div>
        <span className="text-[11px] font-medium text-slate-400">Open for details</span>
      </div>
    </div>
  );
}

function DetailPanel({
  detail,
  loading,
  users,
  currentUser,
  commentDraft,
  checklistDraft,
  setCommentDraft,
  setChecklistDraft,
  onAddComment,
  onAddChecklistItem,
  onChecklistToggle,
  onQuickSubtask,
  onQuickCompleteSubtask,
  onPromote,
  onOpenEdit,
  onAssign,
  onStatusUpdate,
  onInlineUpdate,
  onClose,
}: {
  detail: TaskDetail | null;
  loading: boolean;
  users: Array<{ id: string; name: string; email: string }>;
  currentUser: CurrentUser | null | undefined;
  commentDraft: string;
  checklistDraft: string;
  setCommentDraft: React.Dispatch<React.SetStateAction<string>>;
  setChecklistDraft: React.Dispatch<React.SetStateAction<string>>;
  onAddComment: () => void;
  onAddChecklistItem: () => void;
  onChecklistToggle: (item: TaskChecklistItem) => void;
  onQuickSubtask: (task: TaskSummary, title: string) => void;
  onQuickCompleteSubtask: (task: TaskSummary) => void;
  onPromote: (task: TaskSummary) => void;
  onOpenEdit: (task: TaskSummary) => void;
  onAssign: (task: TaskSummary, userIds: string[]) => void;
  onStatusUpdate: (task: TaskSummary, status: TaskStatus, message: string) => void;
  onInlineUpdate: (task: TaskSummary, patch: Partial<TaskRequest>, message: string) => void;
  onClose: () => void;
}) {
  const [nestedDraft, setNestedDraft] = useState("");
  const [metadataEditMode, setMetadataEditMode] = useState(false);
  const [detailTab, setDetailTab] = useState<"activity" | "remarks" | "checklist" | "subtasks">("activity");

  useEffect(() => {
    setMetadataEditMode(false);
    setDetailTab("activity");
  }, [detail?.task.id]);

  if (loading) {
    return <PanelState icon={<Loader2 className="h-5 w-5 animate-spin" />} title="Loading task context" body="Pulling task details, dependencies, and activity." padded />;
  }

  if (!detail) {
    return <PanelState icon={<AlertTriangle className="h-5 w-5 text-rose-500" />} title="Task unavailable" body="The selected task could not be loaded." padded />;
  }

  const canUpdateExecution = canManageExecution(currentUser, detail.task);
  const canEditTask = canOpenFullTaskEditor(currentUser, detail.task);
  const canPostRemark = canUpdateExecution || canEditTask;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-4 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{detail.task.taskCode}</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{detail.task.title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {detail.task.projectRef || "General"} • {detail.task.moduleRef || "Unsorted"} • Updated {formatRelativeDate(detail.task.updatedAt)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
          <InlineMeta
            icon={<UserRound className="h-4 w-4 text-slate-400" />}
            value={getActiveAssignees(detail.task, users).length
              ? getActiveAssignees(detail.task, users).map((assignee) => assignee.assignedToName).join(", ")
              : "Unassigned"}
          />
          <InlineMeta icon={<CalendarDays className="h-4 w-4 text-slate-400" />} value={formatLongDate(detail.task.dueDate)} />
          <InlineMeta icon={<Clock3 className="h-4 w-4 text-slate-400" />} value={`${detail.task.estimatedHours.toFixed(2)}h`} />
          <InlineMeta icon={<TrendingUp className="h-4 w-4 text-slate-400" />} value={`${detail.task.progressPercent}%`} />
          <InlineMeta
            icon={<StatusDot tone={detail.task.status} />}
            value={<span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusTone(detail.task.status)}`}>{toLabel(detail.task.status)}</span>}
          />
          <InlineMeta
            icon={<AlertTriangle className="h-4 w-4 text-slate-400" />}
            value={<span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${priorityTone(detail.task.priority)}`}>{toLabel(detail.task.priority)}</span>}
          />
          <InlineMeta icon={<Workflow className="h-4 w-4 text-slate-400" />} value={`${detail.subtasks.length} subtasks`} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {detail.task.parentTaskId ? (
            <button type="button" onClick={() => onPromote(detail.task)} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
              Promote
            </button>
          ) : null}
          {canUpdateExecution ? (
            <button
              type="button"
              onClick={() => setMetadataEditMode((prev) => !prev)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                metadataEditMode ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-700"
              }`}
            >
              <PencilLine className="h-3.5 w-3.5" />
              {metadataEditMode ? "Done editing" : "Quick edit"}
            </button>
          ) : null}
          {canEditTask ? (
            <button type="button" onClick={() => onOpenEdit(detail.task)} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
              Edit task
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <section className="space-y-3">
          {metadataEditMode ? (
            <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-2.5">
              {canEditTask ? (
                <CompactEditField label="Assignee" icon={<UserRound className="h-4 w-4 text-slate-400" />}>
                  <AssigneeMultiSelect
                    values={getActiveAssignees(detail.task, users).map((assignee) => assignee.assignedToId)}
                    onChange={(values) => onAssign(detail.task, values)}
                    options={buildAssigneeOptions(users, detail.task)}
                    className="w-full"
                  />
                </CompactEditField>
              ) : null}
              {canEditTask ? (
                <CompactEditField label="Due Date" icon={<CalendarDays className="h-4 w-4 text-slate-400" />}>
                  <input
                    type="date"
                    value={detail.task.dueDate ?? ""}
                    onChange={(event) => onInlineUpdate(detail.task, { dueDate: event.target.value || null }, "Due date updated.")}
                    className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-sm"
                  />
                </CompactEditField>
              ) : null}
              {canEditTask ? (
                <CompactEditField label="Estimate" icon={<Clock3 className="h-4 w-4 text-slate-400" />}>
                  <input
                    type="number"
                    min={0}
                    step="0.25"
                    value={detail.task.estimatedHours}
                    onChange={(event) => onInlineUpdate(detail.task, { estimatedHours: Number(event.target.value || 0) }, "Estimate updated.")}
                    className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-sm"
                  />
                </CompactEditField>
              ) : null}
              {canUpdateExecution ? (
                <CompactEditField label="Status" icon={<StatusDot tone={detail.task.status} />}>
                  <FloatingSelect
                    value={detail.task.status}
                    onChange={(value) => onStatusUpdate(detail.task, value as TaskStatus, "Status updated.")}
                    options={TASK_STATUSES.map((status) => ({ value: status, label: toLabel(status) }))}
                    className="w-full"
                  />
                </CompactEditField>
              ) : null}
            </div>
          ) : null}

          {detail.task.description ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm leading-6 text-slate-700">
              {detail.task.description}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-500">
              No description yet. Use edit task to add scope, outcomes, and constraints.
            </div>
          )}
        </section>

        <div className="flex items-center gap-1 border-b border-slate-200">
          {([
            { key: "activity", label: "Activity" },
            { key: "remarks", label: "Remarks" },
            { key: "checklist", label: "Checklist" },
            { key: "subtasks", label: "Subtasks" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setDetailTab(tab.key)}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
                detailTab === tab.key ? "border-slate-900 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {detailTab === "checklist" ? (
        <DetailSection title="Checklist" icon={<CheckCheck className="h-4 w-4 text-slate-500" />}>
          <div className="space-y-2">
            {detail.checklistItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => canEditTask && onChecklistToggle(item)}
                disabled={!canEditTask}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                  item.completed ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700"
                } ${canEditTask ? "hover:border-slate-300" : "cursor-not-allowed opacity-70"}`}
              >
                <CheckCircle2 className={`h-4 w-4 ${item.completed ? "fill-emerald-500 text-emerald-500" : "text-slate-300"}`} />
                <span className={item.completed ? "line-through opacity-80" : ""}>{item.label}</span>
              </button>
            ))}
            {canEditTask ? (
              <div className="flex gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-2 py-2">
                <input
                  value={checklistDraft}
                  onChange={(event) => setChecklistDraft(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && onAddChecklistItem()}
                  placeholder="Add checklist item"
                  className="flex-1 bg-transparent px-1 text-sm outline-none"
                />
                <button type="button" onClick={onAddChecklistItem} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                  Add
                </button>
              </div>
            ) : null}
          </div>
        </DetailSection>
        ) : null}

        {detailTab === "subtasks" ? (
        <DetailSection title="Subtasks" icon={<Workflow className="h-4 w-4 text-slate-500" />}>
          <div className="space-y-2">
            {detail.subtasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                  task.status === "COMPLETED" ? "border-emerald-200 bg-emerald-50/80" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <button
                  type="button"
                  onClick={() => canManageExecution(currentUser, task) && onQuickCompleteSubtask(task)}
                  disabled={!canManageExecution(currentUser, task)}
                  className={`mt-0.5 rounded-full p-0.5 transition ${
                    canManageExecution(currentUser, task) ? "text-emerald-500 hover:bg-emerald-100" : "cursor-not-allowed text-slate-300"
                  }`}
                  title={task.status === "COMPLETED" ? "Reopen subtask" : "Complete subtask"}
                >
                  <CheckCircle2 className={`h-5 w-5 ${task.status === "COMPLETED" ? "fill-emerald-500 text-emerald-500" : "text-current"}`} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {canOpenFullTaskEditor(currentUser, task) ? (
                        <button type="button" onClick={() => onOpenEdit(task)} className="text-left">
                          <p className={`text-sm font-semibold ${task.status === "COMPLETED" ? "text-emerald-800 line-through" : "text-slate-900"}`}>{task.title}</p>
                        </button>
                      ) : (
                        <p className={`text-sm font-semibold ${task.status === "COMPLETED" ? "text-emerald-800 line-through" : "text-slate-900"}`}>{task.title}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        {task.taskCode} • Level {task.hierarchyLevel} • {task.progressPercent}%
                      </p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone(task.status)}`}>{toLabel(task.status)}</span>
                  </div>
                </div>
              </div>
            ))}
            {canEditTask ? (
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
            ) : null}
          </div>
        </DetailSection>
        ) : null}

        {detailTab === "remarks" ? (
        <DetailSection title="Remarks" icon={<MessageSquareText className="h-4 w-4 text-slate-500" />}>
          <div className="space-y-3">
            {detail.comments.map((comment) => (
              <div key={comment.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Avatar name={comment.authorName} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{comment.authorName}</p>
                    <p className="text-xs text-slate-500">{formatLongDate(comment.createdAt)}</p>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{comment.message}</p>
              </div>
            ))}
            {canPostRemark ? (
              <>
                <textarea
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  rows={3}
                  placeholder="Add progress notes, blockers, or handoff context"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
                <div className="flex justify-end">
                  <button type="button" onClick={onAddComment} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
                    Add remark
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </DetailSection>
        ) : null}

        {detailTab === "activity" ? (
        <DetailSection title="Activity" icon={<Timer className="h-4 w-4 text-slate-500" />}>
          <div className="space-y-3">
            {detail.activity.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-500" />
                <div className="min-w-0">
                  <p className="text-sm text-slate-800">{activity.message}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {activity.actorName || "System"} • {formatLongDate(activity.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DetailSection>
        ) : null}

        <DetailSection title="Attachments & Time" icon={<Clock3 className="h-4 w-4 text-slate-500" />}>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            <InlineMeta icon={<FolderKanban className="h-4 w-4 text-slate-400" />} value={`${detail.attachments.length} attachments`} />
            <InlineMeta icon={<Timer className="h-4 w-4 text-slate-400" />} value={`${detail.timeLogs.length} time logs`} />
            <InlineMeta icon={<Workflow className="h-4 w-4 text-slate-400" />} value={`${detail.dependencies.length} dependencies`} />
            <InlineMeta icon={<CheckCheck className="h-4 w-4 text-slate-400" />} value={toLabel(detail.task.approvalStatus)} />
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
    <section className="space-y-3 border-t border-slate-200 pt-4">
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
  spaces,
  onSubmit,
  onClose,
}: {
  form: TaskFormState;
  setForm: React.Dispatch<React.SetStateAction<TaskFormState>>;
  users: Array<{ id: string; name: string; email: string }>;
  spaces: TaskSpaceSummary[];
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
        <Field label="Space">
          <FloatingSelect
            value={form.spaceId}
            onChange={(value) => setForm((prev) => ({ ...prev, spaceId: value }))}
            options={[
              { value: "", label: "No space" },
              ...spaces.map((space) => ({ value: space.id, label: space.name })),
            ]}
            className="w-full"
          />
        </Field>
        <Field label="Assignee">
          <AssigneeMultiSelect
            values={form.assignedToIds}
            onChange={(values) => setForm((prev) => ({ ...prev, assignedToIds: values }))}
            options={buildAssigneeOptions(users)}
            className="w-full"
          />
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

function SpaceEditor({
  form,
  setForm,
  users,
  memberDrafts,
  onAddMember,
  onUpdateMember,
  onUpdateMemberRole,
  onTogglePermission,
  onRemoveMember,
  onSubmit,
  editingSpace,
  onDelete,
  onClose,
}: {
  form: SpaceFormState;
  setForm: React.Dispatch<React.SetStateAction<SpaceFormState>>;
  users: Array<{ id: string; name: string; email: string }>;
  memberDrafts: SpaceMemberDraft[];
  onAddMember: () => void;
  onUpdateMember: (index: number, patch: Partial<SpaceMemberDraft>) => void;
  onUpdateMemberRole: (index: number, role: TaskSpaceMemberRole) => void;
  onTogglePermission: (index: number, permission: TaskSpacePermission) => void;
  onRemoveMember: (index: number) => void;
  onSubmit: (event: React.FormEvent) => void;
  editingSpace: TaskSpaceSummary | null;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Name">
        <input
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
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
        <Field label="Visibility">
          <FloatingSelect
            value={form.visibility}
            onChange={(value) => setForm((prev) => ({ ...prev, visibility: value as "PRIVATE" | "PUBLIC" }))}
            options={TASK_SPACE_VISIBILITIES.map((item) => ({ value: item, label: toLabel(item) }))}
            className="w-full"
          />
        </Field>
        <Field label="Color">
          <input
            type="color"
            value={form.colorHex}
            onChange={(event) => setForm((prev) => ({ ...prev, colorHex: event.target.value }))}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-2 py-2"
          />
        </Field>
      </div>
      {!editingSpace ? (
        <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Team members</p>
              <p className="mt-1 text-xs text-slate-500">Add members and define their feature-level permissions while creating the space.</p>
            </div>
            <button type="button" onClick={onAddMember} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
              Add member
            </button>
          </div>
          <div className="space-y-3">
            {memberDrafts.map((member, index) => (
              <div key={`${member.userId}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="User">
                    <FloatingSelect
                      value={member.userId}
                      onChange={(value) => onUpdateMember(index, { userId: value })}
                      options={[{ value: "", label: "Select teammate" }, ...users.map((user) => ({ value: user.id, label: user.name }))]}
                      className="w-full"
                    />
                  </Field>
                  <Field label="Role">
                    <FloatingSelect
                      value={member.role}
                      onChange={(value) => onUpdateMemberRole(index, value as TaskSpaceMemberRole)}
                      options={TASK_SPACE_MEMBER_ROLES.map((item) => ({ value: item, label: toLabel(item) }))}
                      className="w-full"
                    />
                  </Field>
                </div>
                <div className="mt-3 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Permissions</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {TASK_SPACE_PERMISSIONS.map((permission) => (
                      <label key={permission} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={member.permissions.includes(permission)}
                          onChange={() => onTogglePermission(index, permission)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span>{toLabel(permission)}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={() => onRemoveMember(index)} className="text-xs font-semibold text-rose-700">
                    Remove member
                  </button>
                </div>
              </div>
            ))}
            {!memberDrafts.length ? <p className="text-sm text-slate-500">No team members added yet.</p> : null}
          </div>
        </section>
      ) : null}
      <div className="flex justify-between gap-3 border-t border-slate-200 pt-4">
        <div>
          {editingSpace ? (
            <button type="button" onClick={onDelete} className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">
              Delete
            </button>
          ) : null}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
            Cancel
          </button>
          <button type="submit" className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            {editingSpace ? "Save Space" : "Create Space"}
          </button>
        </div>
      </div>
    </form>
  );
}

function SpaceMembersPanel({
  detail,
  users,
  inviteUserId,
  inviteRole,
  inviteMessage,
  setInviteUserId,
  setInviteRole,
  setInviteMessage,
  onInvite,
  onRoleChange,
  onRemoveMember,
  canManage,
}: {
  detail: TaskSpaceDetail | null;
  users: Array<{ id: string; name: string; email: string }>;
  inviteUserId: string;
  inviteRole: TaskSpaceMemberRole;
  inviteMessage: string;
  setInviteUserId: React.Dispatch<React.SetStateAction<string>>;
  setInviteRole: React.Dispatch<React.SetStateAction<TaskSpaceMemberRole>>;
  setInviteMessage: React.Dispatch<React.SetStateAction<string>>;
  onInvite: () => void;
  onRoleChange: (memberId: string, role: TaskSpaceMemberRole) => void;
  onRemoveMember: (memberId: string) => void;
  canManage: boolean;
}) {
  return (
    <div className="space-y-5">
      {canManage ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <UserPlus className="h-4 w-4 text-slate-500" />
            Invite user
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="User">
              <FloatingSelect
                value={inviteUserId}
                onChange={setInviteUserId}
                options={[{ value: "", label: "Select teammate" }, ...users.map((user) => ({ value: user.id, label: user.name }))]}
                className="w-full"
              />
            </Field>
            <Field label="Role">
              <FloatingSelect
                value={inviteRole}
                onChange={(value) => setInviteRole(value as TaskSpaceMemberRole)}
                options={TASK_SPACE_MEMBER_ROLES.map((item) => ({ value: item, label: toLabel(item) }))}
                className="w-full"
              />
            </Field>
          </div>
          <Field label="Message">
            <textarea
              value={inviteMessage}
              onChange={(event) => setInviteMessage(event.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </Field>
          <div className="flex justify-end">
            <button type="button" onClick={onInvite} className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              Send invite
            </button>
          </div>
        </section>
      ) : null}

      <section className="space-y-3 border-t border-slate-200 pt-4">
        <div className="text-sm font-semibold text-slate-900">Members</div>
        <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
          {detail?.members.map((member) => (
            <div key={member.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{member.userName}</p>
                  <p className="mt-1 text-xs text-slate-500">{member.userEmail || "No email"}</p>
                </div>
                {canManage ? (
                  <div className="w-[170px]">
                    <FloatingSelect
                      value={member.role}
                      onChange={(value) => onRoleChange(member.id, value as TaskSpaceMemberRole)}
                      options={TASK_SPACE_MEMBER_ROLES.map((item) => ({ value: item, label: toLabel(item) }))}
                      className="w-full"
                    />
                  </div>
                ) : (
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${roleBadge(member.role)}`}>{toLabel(member.role)}</span>
                )}
              </div>
              {canManage ? (
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={() => onRemoveMember(member.id)} className="text-xs font-semibold text-rose-700">
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          ))}
          {!detail?.members.length ? <p className="text-sm text-slate-500">No members yet.</p> : null}
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
      <FloatingSelect
        value={value}
        onChange={onChange}
        options={options.map((option) => ({ value: option, label: toLabel(option) }))}
        className="w-full"
      />
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InlineMeta({ icon, value }: { icon: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="flex-shrink-0">{icon}</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

function CompactEditField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function StatusDot({ tone }: { tone: TaskStatus }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusDot(tone)}`} />;
}

function Avatar({ name }: { name?: string | null }) {
  if (!name) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400">
        <UserRound className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
      {initials(name)}
    </span>
  );
}
