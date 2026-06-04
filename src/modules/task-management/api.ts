import { api, ensureApiSession, getApiErrorMessage } from "@/services/api-client";
import { getAccessToken } from "@/services/api-client";
import { fetchUsers } from "@/modules/users/api";
import type {
  TaskDashboard,
  TaskDetail,
  TaskFilter,
  TaskListResponse,
  TaskReportFilters,
  TaskReportResponse,
  TaskRequest,
  TaskStatus,
  TaskComment,
  TaskChecklistItem,
  TaskTimeLog,
  TaskTreeResponse,
  TaskSpaceDetail,
  TaskSpaceInvitation,
  TaskSpaceInvitationRequest,
  TaskSpaceMemberRole,
  TaskSpaceRequest,
  TaskSpaceSummary,
  TaskStreamEvent,
  TaskSpaceInvitationStatus,
} from "./types";
import type { User } from "@/modules/users/types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

function rethrow(error: unknown, fallback: string): never {
  throw new Error(getApiErrorMessage(error, fallback));
}

export async function fetchTaskCompletionReport(filters: TaskReportFilters): Promise<TaskReportResponse> {
  try {
    await ensureApiSession();
    const response = await api.get<TaskReportResponse>("/tasks/reports/completion", {
      params: {
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        spaceId: filters.spaceId || undefined,
        projectRef: filters.projectRef || undefined,
      },
    });
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load task report.");
  }
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
        spaceId: filter.spaceId || undefined,
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
        spaceId: filter.spaceId || undefined,
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
  return updateTaskStatusWithPayload(id, { status });
}

export async function updateTaskStatusWithPayload(
  id: string,
  payload: { status: TaskStatus; parentTaskId?: string | null; orderIndex?: number | null }
): Promise<TaskDetail> {
  try {
    await ensureApiSession();
    const response = await api.put<TaskDetail>(`/tasks/${id}/status`, payload);
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

export async function fetchTaskSpaces(): Promise<TaskSpaceSummary[]> {
  try {
    await ensureApiSession();
    const response = await api.get<TaskSpaceSummary[]>("/tasks/spaces");
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load spaces.");
  }
}

export async function fetchTaskSpace(spaceId: string): Promise<TaskSpaceDetail> {
  try {
    await ensureApiSession();
    const response = await api.get<TaskSpaceDetail>(`/tasks/spaces/${spaceId}`);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load space.");
  }
}

export async function createTaskSpace(payload: TaskSpaceRequest): Promise<TaskSpaceDetail> {
  try {
    await ensureApiSession();
    const response = await api.post<TaskSpaceDetail>("/tasks/spaces", payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to create space.");
  }
}

export async function updateTaskSpace(
  spaceId: string,
  payload: Partial<TaskSpaceRequest> & { archived?: boolean }
): Promise<TaskSpaceDetail> {
  try {
    await ensureApiSession();
    const response = await api.put<TaskSpaceDetail>(`/tasks/spaces/${spaceId}`, payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to update space.");
  }
}

export async function deleteTaskSpace(spaceId: string): Promise<void> {
  try {
    await ensureApiSession();
    await api.delete(`/tasks/spaces/${spaceId}`);
  } catch (error) {
    rethrow(error, "Failed to delete space.");
  }
}

export async function inviteTaskSpaceMember(spaceId: string, payload: TaskSpaceInvitationRequest): Promise<TaskSpaceInvitation> {
  try {
    await ensureApiSession();
    const response = await api.post<TaskSpaceInvitation>(`/tasks/spaces/${spaceId}/invitations`, payload);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to invite user to space.");
  }
}

export async function fetchMyTaskInvitations(): Promise<TaskSpaceInvitation[]> {
  try {
    await ensureApiSession();
    const response = await api.get<TaskSpaceInvitation[]>("/tasks/spaces/invitations");
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load invitations.");
  }
}

export async function respondToTaskInvitation(
  invitationId: string,
  status: TaskSpaceInvitationStatus
): Promise<TaskSpaceInvitation> {
  try {
    await ensureApiSession();
    const response = await api.put<TaskSpaceInvitation>(`/tasks/spaces/invitations/${invitationId}`, { status });
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to respond to invitation.");
  }
}

export async function updateTaskSpaceMember(
  spaceId: string,
  memberId: string,
  role: TaskSpaceMemberRole
) {
  try {
    await ensureApiSession();
    const response = await api.put(`${"/tasks/spaces"}/${spaceId}/members/${memberId}`, { role });
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to update space member.");
  }
}

export async function removeTaskSpaceMember(spaceId: string, memberId: string): Promise<void> {
  try {
    await ensureApiSession();
    await api.delete(`/tasks/spaces/${spaceId}/members/${memberId}`);
  } catch (error) {
    rethrow(error, "Failed to remove space member.");
  }
}

export function connectTaskStream(
  onEvent: (event: TaskStreamEvent) => void,
  onError?: (error: unknown) => void
) {
  const controller = new AbortController();
  let retryTimer: number | null = null;

  const scheduleReconnect = () => {
    if (controller.signal.aborted || retryTimer !== null) return;
    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      void run();
    }, 3_000);
  };

  const run = async (): Promise<void> => {
    try {
      await ensureApiSession();
      const token = getAccessToken();
      if (!token) {
        scheduleReconnect();
        return;
      }

      const response = await fetch(`${API_BASE_URL}/tasks/stream`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        onError?.(new Error("Unable to open task stream."));
        scheduleReconnect();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          scheduleReconnect();
          break;
        }
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
        let index = buffer.indexOf("\n\n");
        while (index !== -1) {
          const rawEvent = buffer.slice(0, index).trim();
          buffer = buffer.slice(index + 2);
          if (rawEvent) {
            let eventType = "message";
            let dataString = "";
            rawEvent.split("\n").forEach((line) => {
              if (line.startsWith("event:")) eventType = line.slice(6).trim();
              if (line.startsWith("data:")) dataString += line.slice(5).trim();
            });
            if (dataString) {
              try {
                const parsed = JSON.parse(dataString) as TaskStreamEvent;
                onEvent({ ...parsed, type: parsed.type ?? eventType });
              } catch (parseError) {
                onError?.(parseError);
              }
            }
          }
          index = buffer.indexOf("\n\n");
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        onError?.(error);
        scheduleReconnect();
      }
    }
  };

  void run();

  return () => {
    controller.abort();
    if (retryTimer !== null) {
      window.clearTimeout(retryTimer);
    }
  };
}
