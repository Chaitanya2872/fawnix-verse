import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addChecklistItem,
  addTaskComment,
  approveTask,
  assignTask,
  createTask,
  createSubtask,
  deleteTask,
  fetchTask,
  fetchTaskDashboard,
  fetchTaskTree,
  fetchTasks,
  fetchTaskUsers,
  rejectTask,
  reorderTaskHierarchy,
  startTaskTimer,
  stopTaskTimer,
  updateChecklistItem,
  updateTask,
  updateTaskStatus,
} from "./api";
import type { TaskFilter, TaskRequest } from "./types";

export const taskKeys = {
  all: ["tasks"] as const,
  dashboard: () => [...taskKeys.all, "dashboard"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (filter: TaskFilter) => [...taskKeys.lists(), filter] as const,
  tree: (filter: TaskFilter) => [...taskKeys.all, "tree", filter] as const,
  detail: (id: string) => [...taskKeys.all, "detail", id] as const,
  users: () => [...taskKeys.all, "users"] as const,
};

export function useTaskDashboard() {
  return useQuery({
    queryKey: taskKeys.dashboard(),
    queryFn: fetchTaskDashboard,
    staleTime: 30_000,
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
  if (taskId) {
    queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
  }
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TaskRequest) => createTask(payload),
    onSuccess: () => invalidateTasks(queryClient),
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
    mutationFn: ({ id, status }: { id: string; status: string }) => updateTaskStatus(id, status),
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
