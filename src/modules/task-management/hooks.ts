import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addChecklistItem,
  addTaskComment,
  approveTask,
  assignTask,
  connectTaskStream,
  createTask,
  createTaskSpace,
  createSubtask,
  deleteTask,
  deleteTaskSpace,
  fetchTask,
  fetchTaskCompletionReport,
  fetchTaskDashboard,
  fetchTaskSpace,
  fetchTaskSpaces,
  fetchTaskTree,
  importTasksFromNotes,
  fetchMyTaskInvitations,
  fetchTasks,
  fetchTaskUsers,
  inviteTaskSpaceMember,
  rejectTask,
  reorderTaskHierarchy,
  removeTaskSpaceMember,
  respondToTaskInvitation,
  startTaskTimer,
  stopTaskTimer,
  updateChecklistItem,
  updateTask,
  updateTaskSpace,
  updateTaskSpaceMember,
  updateTaskStatus,
  updateTaskStatusWithPayload,
} from "./api";
import type {
  TaskFilter,
  TaskReportFilters,
  TaskNotesImportRequest,
  TaskRequest,
  TaskSpaceInvitationRequest,
  TaskSpaceInvitationStatus,
  TaskSpaceMemberRole,
  TaskSpaceRequest,
  TaskStatus,
} from "./types";

export const taskKeys = {
  all: ["tasks"] as const,
  dashboard: () => [...taskKeys.all, "dashboard"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (filter: TaskFilter) => [...taskKeys.lists(), filter] as const,
  tree: (filter: TaskFilter) => [...taskKeys.all, "tree", filter] as const,
  detail: (id: string) => [...taskKeys.all, "detail", id] as const,
  users: () => [...taskKeys.all, "users"] as const,
};

export const spaceKeys = {
  all: ["task-spaces"] as const,
  lists: () => [...spaceKeys.all, "list"] as const,
  list: () => [...spaceKeys.lists()] as const,
  detail: (spaceId: string) => [...spaceKeys.all, "detail", spaceId] as const,
  invitations: () => [...spaceKeys.all, "invitations"] as const,
};

export function useTaskDashboard() {
  return useQuery({
    queryKey: taskKeys.dashboard(),
    queryFn: fetchTaskDashboard,
    staleTime: 30_000,
  });
}

export function useTaskCompletionReport(filters: TaskReportFilters, enabled = true) {
  return useQuery({
    queryKey: [...taskKeys.all, "report", filters] as const,
    queryFn: () => fetchTaskCompletionReport(filters),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useTasks(filter: TaskFilter) {
  return useQuery({
    queryKey: taskKeys.list(filter),
    queryFn: () => fetchTasks(filter),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useTaskTree(filter: TaskFilter) {
  return useQuery({
    queryKey: taskKeys.tree(filter),
    queryFn: () => fetchTaskTree(filter),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useTask(id: string | null) {
  return useQuery({
    queryKey: taskKeys.detail(id ?? "unknown"),
    queryFn: () => fetchTask(id as string),
    enabled: Boolean(id),
  });
}

export function useTaskUsers() {
  return useQuery({
    queryKey: taskKeys.users(),
    queryFn: fetchTaskUsers,
    staleTime: 5 * 60_000,
  });
}

function invalidateTasks(queryClient: ReturnType<typeof useQueryClient>, taskId?: string) {
  queryClient.invalidateQueries({ queryKey: taskKeys.dashboard() });
  queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  queryClient.invalidateQueries({ queryKey: taskKeys.all });
  queryClient.invalidateQueries({ queryKey: spaceKeys.all });
  if (taskId) {
    queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
  }
}

export function useTaskSpaces() {
  return useQuery({
    queryKey: spaceKeys.list(),
    queryFn: fetchTaskSpaces,
    staleTime: 15_000,
  });
}

export function useTaskSpace(spaceId: string | null) {
  return useQuery({
    queryKey: spaceKeys.detail(spaceId ?? "unknown"),
    queryFn: () => fetchTaskSpace(spaceId as string),
    enabled: Boolean(spaceId),
    staleTime: 10_000,
  });
}

export function useTaskInvitations() {
  return useQuery({
    queryKey: spaceKeys.invitations(),
    queryFn: fetchMyTaskInvitations,
    staleTime: 10_000,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TaskRequest) => createTask(payload),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useImportTasksFromNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, file }: { payload: TaskNotesImportRequest; file?: File | null }) =>
      importTasksFromNotes(payload, file),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useCreateTaskSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TaskSpaceRequest) => createTaskSpace(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useUpdateTaskSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      spaceId,
      payload,
    }: {
      spaceId: string;
      payload: Partial<TaskSpaceRequest> & { archived?: boolean };
    }) => updateTaskSpace(spaceId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
      queryClient.invalidateQueries({ queryKey: spaceKeys.detail(variables.spaceId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useDeleteTaskSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (spaceId: string) => deleteTaskSpace(spaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useInviteToTaskSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spaceId, payload }: { spaceId: string; payload: TaskSpaceInvitationRequest }) =>
      inviteTaskSpaceMember(spaceId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.invitations() });
      queryClient.invalidateQueries({ queryKey: spaceKeys.detail(variables.spaceId) });
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
    },
  });
}

export function useRespondToTaskInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      invitationId,
      status,
    }: {
      invitationId: string;
      status: TaskSpaceInvitationStatus;
    }) => respondToTaskInvitation(invitationId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.invitations() });
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useUpdateTaskSpaceMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      spaceId,
      memberId,
      role,
    }: {
      spaceId: string;
      memberId: string;
      role: TaskSpaceMemberRole;
    }) => updateTaskSpaceMember(spaceId, memberId, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.detail(variables.spaceId) });
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
    },
  });
}

export function useRemoveTaskSpaceMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spaceId, memberId }: { spaceId: string; memberId: string }) =>
      removeTaskSpaceMember(spaceId, memberId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.detail(variables.spaceId) });
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TaskRequest }) => updateTask(id, payload),
    onSuccess: (_, variables) => invalidateTasks(queryClient, variables.id),
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      parentTaskId,
      orderIndex,
    }: {
      id: string;
      status: TaskStatus;
      parentTaskId?: string | null;
      orderIndex?: number | null;
    }) => updateTaskStatusWithPayload(id, { status, parentTaskId, orderIndex }),
    onSuccess: (_, variables) => invalidateTasks(queryClient, variables.id),
  });
}

export function useCreateSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ parentId, payload }: { parentId: string; payload: TaskRequest }) => createSubtask(parentId, payload),
    onSuccess: (_, variables) => invalidateTasks(queryClient, variables.parentId),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useReorderTaskHierarchy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { parentTaskId?: string | null; orderIndex?: number | null } }) =>
      reorderTaskHierarchy(id, payload),
    onSuccess: (_, variables) => invalidateTasks(queryClient, variables.id),
  });
}

export function useAddTaskComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) => addTaskComment(id, message),
    onSuccess: (_, variables) => invalidateTasks(queryClient, variables.id),
  });
}

export function useAddChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) => addChecklistItem(id, label),
    onSuccess: (_, variables) => invalidateTasks(queryClient, variables.id),
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, itemId, payload }: { id: string; itemId: string; payload: { label: string; completed: boolean } }) =>
      updateChecklistItem(id, itemId, payload),
    onSuccess: (_, variables) => invalidateTasks(queryClient, variables.id),
  });
}

export function useAssignTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
      reassign,
    }: {
      id: string;
      payload: {
        assignedToId: string;
        assignedToName: string;
        assignedToEmail?: string | null;
        assignedTeamName?: string | null;
        preventDuplicateActiveAssignments?: boolean;
      };
      reassign?: boolean;
    }) => assignTask(id, payload, reassign),
    onSuccess: (_, variables) => invalidateTasks(queryClient, variables.id),
  });
}

export function useApproveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reworkRequested }: { id: string; reworkRequested?: boolean }) => approveTask(id, reworkRequested),
    onSuccess: (_, variables) => invalidateTasks(queryClient, variables.id),
  });
}

export function useRejectTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rejectTask(id),
    onSuccess: (_, id) => invalidateTasks(queryClient, id),
  });
}

export function useStartTaskTimer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => startTaskTimer(id),
    onSuccess: (_, id) => invalidateTasks(queryClient, id),
  });
}

export function useStopTaskTimer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: { startedAt?: string; endedAt?: string; note?: string } }) =>
      stopTaskTimer(id, payload),
    onSuccess: (_, variables) => invalidateTasks(queryClient, variables.id),
  });
}

export { connectTaskStream };
