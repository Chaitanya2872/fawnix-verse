"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { CalendarDays, CheckCircle2, CircleDashed, FolderKanban, Loader2, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/modules/auth/hooks";
import type { CurrentUser } from "@/modules/auth/types";
import {
  connectTaskStream,
  spaceKeys,
  taskKeys,
  useTaskDashboard,
  useTaskSpaces,
  useTaskTree,
} from "./hooks";
import {
  TaskInboxPanel,
  TaskWorkspaceSidebar,
  type TaskInboxItem,
  type TaskWorkspaceSection,
} from "./components";
import type { TaskFilter, TaskSummary } from "./types";

const workspaceFilter: TaskFilter = {
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
  spaceId: "",
};

function formatLongDate(value?: string | null) {
  if (!value) return "No due date";
  return format(parseISO(value), "dd MMM yyyy");
}

function formatRelativeDate(value?: string | null) {
  if (!value) return "No date";
  return formatDistanceToNowStrict(parseISO(value), { addSuffix: true });
}

function toLabel(value: string) {
  return value.toLowerCase().replace(/_/g, " ");
}

function collectTasks(tasks: TaskSummary[]) {
  const collector: TaskSummary[] = [];
  const walk = (items: TaskSummary[]) => {
    for (const task of items) {
      collector.push(task);
      if (task.subtasks.length) {
        walk(task.subtasks);
      }
    }
  };
  walk(tasks);
  return collector;
}

function canViewTaskOnClient(user: CurrentUser | null | undefined, task: TaskSummary) {
  if (!user) return false;
  if (task.visibility === "PRIVATE") {
    if (task.canEdit || task.canManageExecution) return true;
    if (task.assignedToId === user.id) return true;
    return task.activeAssignees?.some((assignee) => assignee.assignedToId === user.id) ?? false;
  }
  return true;
}

function isTaskAssignedToUser(task: TaskSummary, user: CurrentUser | null | undefined) {
  if (!user) return false;
  if (task.assignedToId === user.id) return true;
  return task.activeAssignees?.some((assignee) => assignee.assignedToId === user.id) ?? false;
}

function buildInboxItems(dashboard: ReturnType<typeof useTaskDashboard>["data"], dueTasks: TaskSummary[]) {
  const activityItems: TaskInboxItem[] = (dashboard?.recentActivity ?? []).slice(0, 8).map((activity, index) => ({
    id: `activity-${activity.id}`,
    kind: "message",
    title: activity.actorName ? `${activity.actorName} posted an update` : "Task update",
    body: activity.message,
    timestamp: formatRelativeDate(activity.createdAt),
    source: "Activity",
    unread: index < 2,
    tone: "sky",
  }));

  const dashboardDeadlineItems: TaskInboxItem[] = (dashboard?.upcomingDeadlines ?? []).slice(0, 8).map((deadline, index) => ({
    id: `deadline-${deadline.id}`,
    kind: "notification",
    title: deadline.title,
    body: `${deadline.assignedToName ?? "Unassigned"} - due ${formatLongDate(deadline.dueDate)}`,
    timestamp: formatRelativeDate(deadline.dueDate),
    source: deadline.taskCode ?? "Deadline",
    unread: index < 3 || deadline.priority === "HIGH" || deadline.priority === "CRITICAL",
    tone: deadline.priority === "CRITICAL" ? "rose" : deadline.priority === "HIGH" ? "amber" : "slate",
    taskId: deadline.id,
    actionLabel: "View tasks",
  }));

  const taskDeadlineItems: TaskInboxItem[] = dashboardDeadlineItems.length
    ? []
    : dueTasks.slice(0, 8).map((task, index) => ({
        id: `task-deadline-${task.id}`,
        kind: "notification",
        title: task.title,
        body: `${task.assignedToName ?? "Unassigned"} - due ${formatLongDate(task.dueDate)}`,
        timestamp: formatRelativeDate(task.dueDate),
        source: task.projectRef || task.spaceName || "Deadline",
        unread: task.overdue || index < 3,
        tone: task.overdue ? "rose" : task.priority === "HIGH" || task.priority === "CRITICAL" ? "amber" : "slate",
        taskId: task.id,
        actionLabel: "View tasks",
      }));

  return [...activityItems, ...dashboardDeadlineItems, ...taskDeadlineItems];
}

export default function TaskWorkspacePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<TaskWorkspaceSection>("inbox");
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [readInboxItemIds, setReadInboxItemIds] = useState<Set<string>>(new Set());

  const { data: currentUser } = useCurrentUser();
  const dashboardQuery = useTaskDashboard();
  const spacesQuery = useTaskSpaces();
  const treeQuery = useTaskTree(workspaceFilter);

  const dashboard = dashboardQuery.data;
  const spaces = spacesQuery.data ?? [];
  const taskTree = useMemo(() => treeQuery.data?.data ?? [], [treeQuery.data?.data]);
  const allTasks = useMemo(
    () => collectTasks(taskTree).filter((task) => canViewTaskOnClient(currentUser, task)),
    [currentUser, taskTree]
  );
  const myTasks = useMemo(
    () => allTasks.filter((task) => isTaskAssignedToUser(task, currentUser)),
    [allTasks, currentUser]
  );
  const dueTasks = useMemo(
    () =>
      [...allTasks]
        .filter((task) => task.dueDate)
        .sort((left, right) => (left.dueDate || "").localeCompare(right.dueDate || "")),
    [allTasks]
  );
  const inboxItems = useMemo(() => buildInboxItems(dashboard, dueTasks), [dashboard, dueTasks]);
  const inboxUnreadCount = useMemo(
    () => inboxItems.filter((item) => item.unread && !readInboxItemIds.has(item.id)).length,
    [inboxItems, readInboxItemIds]
  );

  useEffect(() => {
    const cleanup = connectTaskStream((event) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
      if (event.spaceId) {
        queryClient.invalidateQueries({ queryKey: spaceKeys.detail(event.spaceId) });
      }
    });
    return cleanup;
  }, [queryClient]);

  function handleReadItem(itemId: string) {
    setReadInboxItemIds((prev) => {
      if (prev.has(itemId)) return prev;
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
  }

  function handleMarkAllRead() {
    setReadInboxItemIds(new Set(inboxItems.map((item) => item.id)));
  }

  const loading = dashboardQuery.isLoading || spacesQuery.isLoading || treeQuery.isLoading;

  return (
    <div className="min-h-[calc(100vh-9rem)] overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
      <div className="grid min-h-[calc(100vh-9rem)] xl:grid-cols-[280px_minmax(0,1fr)]">
        <TaskWorkspaceSidebar
          activeSection={activeSection}
          inboxUnreadCount={inboxUnreadCount}
          myTaskCount={myTasks.length}
          scheduleCount={dueTasks.length}
          teamSpaceCount={spaces.length}
          spaces={spaces}
          selectedSpaceId={selectedSpaceId}
          onSectionChange={setActiveSection}
          onSpaceSelect={setSelectedSpaceId}
        />

        <main className="min-w-0 space-y-5 bg-[#f8f9fc] px-5 py-5 sm:px-7">
          <section>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Task Workspace</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Inbox and team workbench</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Messages, notifications, assigned work, and spaces live here, separate from the task execution views.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/tasks")}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Open Tasks
              </button>
            </div>
          </section>

          {loading ? (
            <WorkspaceState icon={<Loader2 className="h-5 w-5 animate-spin" />} title="Loading workspace" body="Syncing task activity and spaces." />
          ) : activeSection === "inbox" ? (
            <TaskInboxPanel
              items={inboxItems}
              readItemIds={readInboxItemIds}
              onReadItem={handleReadItem}
              onMarkAllRead={handleMarkAllRead}
              onOpenTask={() => navigate("/tasks")}
            />
          ) : activeSection === "my-tasks" ? (
            <MyTasksPanel tasks={myTasks} onOpenTasks={() => navigate("/tasks")} />
          ) : activeSection === "schedule" ? (
            <SchedulePanel tasks={dueTasks} onOpenTasks={() => navigate("/tasks")} />
          ) : (
            <TeamSpacesPanel
              spaces={spaces}
              selectedSpaceId={selectedSpaceId}
              onSelectSpace={setSelectedSpaceId}
              onOpenTasks={() => navigate("/tasks")}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function SchedulePanel({ tasks, onOpenTasks }: { tasks: TaskSummary[]; onOpenTasks: () => void }) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-slate-950">Schedule</p>
            <p className="mt-1 text-sm text-slate-500">Upcoming due dates across accessible tasks.</p>
          </div>
          <button type="button" onClick={onOpenTasks} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            Open calendar
          </button>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {tasks.slice(0, 14).map((task) => (
          <button key={task.id} type="button" onClick={onOpenTasks} className="grid w-full gap-3 px-5 py-4 text-left transition hover:bg-slate-50 md:grid-cols-[150px_minmax(0,1fr)_120px] md:items-center">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              {formatLongDate(task.dueDate)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-950">{task.title}</span>
              <span className="mt-1 block truncate text-sm text-slate-500">{task.projectRef || "General"} - {task.moduleRef || "Unsorted"}</span>
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-center text-xs font-semibold ${task.overdue ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
              {task.overdue ? "Overdue" : toLabel(task.status)}
            </span>
          </button>
        ))}
        {!tasks.length ? (
          <WorkspaceState icon={<CalendarDays className="h-5 w-5" />} title="Nothing scheduled" body="Tasks with due dates will appear here." compact />
        ) : null}
      </div>
    </section>
  );
}

function MyTasksPanel({ tasks, onOpenTasks }: { tasks: TaskSummary[]; onOpenTasks: () => void }) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-slate-950">My Tasks</p>
            <p className="mt-1 text-sm text-slate-500">Assigned work that needs your attention.</p>
          </div>
          <button type="button" onClick={onOpenTasks} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            Open full list
          </button>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {tasks.slice(0, 12).map((task) => (
          <button key={task.id} type="button" onClick={onOpenTasks} className="flex w-full flex-col gap-3 px-5 py-4 text-left transition hover:bg-slate-50 lg:flex-row lg:items-center">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-950">{task.title}</span>
              <span className="mt-1 block text-sm text-slate-500">{task.projectRef || "General"} - {task.moduleRef || "Unsorted"}</span>
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">{toLabel(task.status)}</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatLongDate(task.dueDate)}
            </span>
          </button>
        ))}
        {!tasks.length ? (
          <WorkspaceState icon={<CheckCircle2 className="h-5 w-5" />} title="No assigned tasks" body="Assigned tasks will appear here." compact />
        ) : null}
      </div>
    </section>
  );
}

function TeamSpacesPanel({
  spaces,
  selectedSpaceId,
  onSelectSpace,
  onOpenTasks,
}: {
  spaces: Array<{ id: string; name: string; description: string | null; memberCount: number; pendingCount: number; inProgressCount: number; completedCount: number; overdueCount: number }>;
  selectedSpaceId: string;
  onSelectSpace: (spaceId: string) => void;
  onOpenTasks: () => void;
}) {
  return (
    <section className="space-y-3">
      {spaces.map((space) => {
        const active = selectedSpaceId === space.id;
        return (
          <button
            key={space.id}
            type="button"
            onClick={() => onSelectSpace(space.id)}
            className={`w-full rounded-[28px] border bg-white p-5 text-left shadow-sm transition hover:border-slate-300 ${active ? "border-slate-400 ring-2 ring-slate-200" : "border-slate-200"}`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <FolderKanban className="h-3.5 w-3.5" />
                  Team Space
                </div>
                <p className="mt-2 text-lg font-semibold text-slate-950">{space.name}</p>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{space.description || "No description added."}</p>
              </div>
              <div className="grid min-w-[260px] grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <SpaceMetric label="Pending" value={space.pendingCount} />
                <SpaceMetric label="Active" value={space.inProgressCount} />
                <SpaceMetric label="Done" value={space.completedCount} />
                <SpaceMetric label="Overdue" value={space.overdueCount} />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                <UsersRound className="h-4 w-4" />
                {space.memberCount} members
              </span>
              <span onClick={onOpenTasks} className="text-sm font-semibold text-slate-900">
                Open tasks
              </span>
            </div>
          </button>
        );
      })}
      {!spaces.length ? (
        <WorkspaceState icon={<CircleDashed className="h-5 w-5" />} title="No team spaces" body="Team spaces will appear here once created." />
      ) : null}
    </section>
  );
}

function SpaceMetric({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <span className="mt-1 block text-base font-semibold text-slate-950">{value}</span>
    </span>
  );
}

function WorkspaceState({
  icon,
  title,
  body,
  compact = false,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center justify-center ${compact ? "px-4 py-12" : "min-h-[360px] rounded-[28px] border border-slate-200 bg-white px-4 py-12 shadow-sm"}`}>
      <div className="max-w-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">{icon}</div>
        <p className="mt-3 text-sm font-semibold text-slate-950">{title}</p>
        <p className="mt-1 text-sm leading-5 text-slate-500">{body}</p>
      </div>
    </div>
  );
}
