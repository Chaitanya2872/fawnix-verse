import { api, ensureApiSession, getApiErrorMessage } from "@/services/api-client";
import { fetchUsers } from "@/modules/users/api";
import type {
  TaskDashboard,
  TaskDetail,
  TaskFilter,
  TaskListResponse,
  TaskRequest,
  TaskStatus,
  TaskComment,
  TaskChecklistItem,
  TaskTimeLog,
  TaskTreeResponse,
} from "./types";
import type { User } from "@/modules/users/types";

function rethrow(error: unknown, fallback: string): never {
  throw new Error(getApiErrorMessage(error, fallback));
}

export async function fetchTaskDashboard(): Promise<TaskDashboard> {
  try {
    await ensureApiSession();
    const response = await api.get<TaskDashboard>("/tasks/dashboard");
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load task dashboard.");
  }
}

export async function fetchTasks(filter: TaskFilter): Promise<TaskListResponse> {
  try {
    await ensureApiSession();
    const response = await api.get<TaskListResponse>("/tasks", {
      params: {
        search: filter.search || undefined,
        status: filter.status || undefined,
        priority: filter.priority || undefined,
        scope: filter.scope === "all" ? undefined : filter.scope,
        assigneeId: filter.assigneeId || undefined,
        projectRef: filter.projectRef || undefined,
        moduleRef: filter.moduleRef || undefined,
        approvalStatus: filter.approvalStatus || undefined,
        overdue: filter.overdue || undefined,
        dueToday: filter.dueToday || undefined,
        page: filter.page,
        pageSize: filter.pageSize,
      },
    });
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load tasks.");
  }
}

export async function fetchTaskTree(filter: TaskFilter): Promise<TaskTreeResponse> {
  try {
    await ensureApiSession();
    const response = await api.get<TaskTreeResponse>("/tasks/tree", {
      params: {
        search: filter.search || undefined,
        status: filter.status || undefined,
        priority: filter.priority || undefined,
        scope: filter.scope === "all" ? undefined : filter.scope,
        assigneeId: filter.assigneeId || undefined,
        projectRef: filter.projectRef || undefined,
        moduleRef: filter.moduleRef || undefined,
        approvalStatus: filter.approvalStatus || undefined,
        overdue: filter.overdue || undefined,
        dueToday: filter.dueToday || undefined,
      },
    });
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load task hierarchy.");
  }
}

export async function fetchTask(id: string): Promise<TaskDetail> {
  try {
    await ensureApiSession();
    const response = await api.get<TaskDetail>(`/tasks/${id}`);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load task details.");
  }
}

export async function createTask(payload: TaskRequest): Promise<TaskDetail> {
  try {
    await ensureApiSession();
    const response = await api.post<TaskDetail>("/tasks", payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to create task.");
  }
}

export async function createSubtask(parentId: string, payload: TaskRequest): Promise<TaskDetail> {
  try {
    await ensureApiSession();
    const response = await api.post<TaskDetail>(`/tasks/${parentId}/subtasks`, payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to create subtask.");
  }
}

export async function updateTask(id: string, payload: TaskRequest): Promise<TaskDetail> {
  try {
    await ensureApiSession();
    const response = await api.put<TaskDetail>(`/tasks/${id}`, payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to update task.");
  }
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<TaskDetail> {
  try {
    await ensureApiSession();
    const response = await api.put<TaskDetail>(`/tasks/${id}/status`, { status });
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to update task status.");
  }
}

export async function deleteTask(id: string): Promise<void> {
  try {
    await ensureApiSession();
    await api.delete(`/tasks/${id}`);
  } catch (error) {
    rethrow(error, "Failed to delete task.");
  }
}

export async function reorderTaskHierarchy(
  id: string,
  payload: { parentTaskId?: string | null; orderIndex?: number | null }
): Promise<TaskDetail> {
  try {
    await ensureApiSession();
    const response = await api.put<TaskDetail>(`/tasks/${id}/hierarchy`, payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to move task in hierarchy.");
  }
}

export async function addTaskComment(id: string, message: string): Promise<TaskComment> {
  try {
    await ensureApiSession();
    const response = await api.post<TaskComment>(`/tasks/${id}/comments`, { message });
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to add comment.");
  }
}

export async function addChecklistItem(id: string, label: string): Promise<TaskChecklistItem> {
  try {
    await ensureApiSession();
    const response = await api.post<TaskChecklistItem>(`/tasks/${id}/checklist`, { label });
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to add checklist item.");
  }
}

export async function updateChecklistItem(
  id: string,
  itemId: string,
  payload: { label: string; completed: boolean }
): Promise<TaskChecklistItem> {
  try {
    await ensureApiSession();
    const response = await api.put<TaskChecklistItem>(`/tasks/${id}/checklist/${itemId}`, payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to update checklist item.");
  }
}

export async function assignTask(
  id: string,
  payload: {
    assignedToId: string;
    assignedToName: string;
    assignedToEmail?: string | null;
    assignedTeamName?: string | null;
    preventDuplicateActiveAssignments?: boolean;
  },
  reassign = false
): Promise<TaskDetail> {
  try {
    await ensureApiSession();
    const response = await api.post<TaskDetail>(`/tasks/${id}/${reassign ? "reassign" : "assign"}`, payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to assign task.");
  }
}

export async function approveTask(id: string, reworkRequested = false): Promise<TaskDetail> {
  try {
    await ensureApiSession();
    const response = await api.post<TaskDetail>(`/tasks/${id}/${reworkRequested ? "reject" : "approve"}`, reworkRequested ? { reworkRequested: true } : {});
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to update approval.");
  }
}

export async function rejectTask(id: string): Promise<TaskDetail> {
  try {
    await ensureApiSession();
    const response = await api.post<TaskDetail>(`/tasks/${id}/reject`, {});
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to reject task.");
  }
}

export async function startTaskTimer(id: string): Promise<TaskTimeLog> {
  try {
    await ensureApiSession();
    const response = await api.post<TaskTimeLog>(`/tasks/${id}/start-timer`);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to start timer.");
  }
}

export async function stopTaskTimer(
  id: string,
  payload?: { startedAt?: string; endedAt?: string; note?: string }
): Promise<TaskTimeLog> {
  try {
    await ensureApiSession();
    const response = await api.post<TaskTimeLog>(`/tasks/${id}/stop-timer`, payload ?? {});
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to stop timer.");
  }
}

export async function fetchTaskUsers(): Promise<User[]> {
  return fetchUsers();
}
