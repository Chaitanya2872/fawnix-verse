import {
  api,
  ensureApiSession,
  getAccessToken,
  getApiErrorMessage,
} from "@/services/api-client";
import {
  type AssignLeadInput,
  type AssigneeOption,
  type ContactLeadRecordingInput,
  type CreateLeadRemarkInput,
  type EditLeadRemarkInput,
  type Lead,
  type LeadImportResult,
  type LeadFilter,
  type LeadFormData,
  type LeadSchedule,
  type CreateLeadScheduleInput,
  type UpdateLeadScheduleInput,
  type LeadUpdateData,
  type LeadWhatsappQuestionnaire,
  type LeadNotifications,
  type LeadNotificationEvent,
  type LeadsSummary,
  type PaginatedLeads,
  getLeadStatusTransitions,
  LeadStatus,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

function normalizeSummary(summary?: Partial<LeadsSummary>): LeadsSummary {
  return {
    totalPipelineValue: summary?.totalPipelineValue ?? 0,
    newCount: summary?.newCount ?? 0,
    qualifiedCount: summary?.qualifiedCount ?? 0,
    convertedCount: summary?.convertedCount ?? 0,
    statusCounts: summary?.statusCounts ?? {},
  };
}

function normalizeLead(lead: Lead): Lead {
  return {
    ...lead,
    assignedTo: lead.assignedTo ?? "",
    assignedToUserId: lead.assignedToUserId ?? null,
    assignedBy: lead.assignedBy ?? "",
    notes: lead.notes ?? "",
    tags: lead.tags ?? [],
    remarks: lead.remarks ?? [],
    contactRecordings: lead.contactRecordings ?? [],
    activities: lead.activities ?? [],
    statusHistory: lead.statusHistory ?? [],
    lastContactedAt: lead.lastContactedAt ?? null,
    followUpAt: lead.followUpAt ?? null,
    convertedAt: lead.convertedAt ?? null,
    externalLeadId: lead.externalLeadId ?? null,
    sourceMonth: lead.sourceMonth ?? null,
    sourceDate: lead.sourceDate ?? null,
    alternativePhone: lead.alternativePhone ?? null,
    projectStage: lead.projectStage ?? null,
    expectedTimeline: lead.expectedTimeline ?? null,
    propertyType: lead.propertyType ?? null,
    sqft: lead.sqft ?? null,
    community: lead.community ?? null,
    projectLocation: lead.projectLocation ?? null,
    projectState: lead.projectState ?? null,
    presalesResponse: lead.presalesResponse ?? null,
    demoVisit: lead.demoVisit ?? null,
    presalesRemarks: lead.presalesRemarks ?? null,
    adSetName: lead.adSetName ?? null,
    campaignName: lead.campaignName ?? null,
    metaLeadId: lead.metaLeadId ?? null,
    metaFormId: lead.metaFormId ?? null,
    metaAdId: lead.metaAdId ?? null,
    sourceCreatedAt: lead.sourceCreatedAt ?? null,
    whatsappAssignment: lead.whatsappAssignment ?? null,
  };
}

function normalizePage(page: PaginatedLeads): PaginatedLeads {
  return {
    ...page,
    data: (page.data ?? []).map(normalizeLead),
    summary: normalizeSummary(page.summary),
  };
}

function rethrowApiError(error: unknown, fallback: string): never {
  throw new Error(getApiErrorMessage(error, fallback));
}

export async function fetchLeads(filter: LeadFilter): Promise<PaginatedLeads> {
  try {
    await ensureApiSession();
    const response = await api.get<PaginatedLeads>("/leads", {
      params: filter,
    });
    return normalizePage(response.data);
  } catch (error) {
    rethrowApiError(error, "Failed to load leads.");
  }
}

export async function fetchLeadById(id: string): Promise<Lead> {
  try {
    await ensureApiSession();
    const response = await api.get<Lead>(`/leads/${id}`);
    return normalizeLead(response.data);
  } catch (error) {
    rethrowApiError(error, "Failed to load lead details.");
  }
}

export async function fetchLeadQuestionnaire(
  id: string
): Promise<LeadWhatsappQuestionnaire | null> {
  try {
    await ensureApiSession();
    const response = await api.get<LeadWhatsappQuestionnaire | null>(
      `/leads/${id}/questionnaire`,
      {
        validateStatus: (status) => status === 200 || status === 204,
      }
    );
    if (response.status === 204) {
      return null;
    }
    if (!response.data) {
      return null;
    }
    return {
      ...response.data,
      interestAreas: response.data.interestAreas ?? [],
    };
  } catch (error) {
    rethrowApiError(error, "Failed to load lead questionnaire.");
  }
}

export async function fetchLeadAssignees(): Promise<AssigneeOption[]> {
  try {
    await ensureApiSession();
    const response = await api.get<AssigneeOption[]>("/users/assignees");
    return response.data ?? [];
  } catch (error) {
    rethrowApiError(error, "Failed to load assignees.");
  }
}

export async function createLead(data: LeadFormData): Promise<Lead> {
  try {
    await ensureApiSession();
    const response = await api.post<Lead>("/leads", data);
    return normalizeLead(response.data);
  } catch (error) {
    rethrowApiError(error, "Failed to create lead.");
  }
}

export async function updateLead(id: string, data: LeadUpdateData): Promise<Lead> {
  try {
    await ensureApiSession();
    const response = await api.patch<Lead>(`/leads/${id}`, data);
    return normalizeLead(response.data);
  } catch (error) {
    rethrowApiError(error, "Failed to update lead.");
  }
}

export async function assignLead(id: string, input: AssignLeadInput): Promise<Lead> {
  try {
    await ensureApiSession();
    const response = await api.patch<Lead>(`/leads/${id}/assign`, input);
    return normalizeLead(response.data);
  } catch (error) {
    rethrowApiError(error, "Failed to assign lead.");
  }
}

export async function updateLeadPriority(
  id: string,
  priority: Lead["priority"]
): Promise<Lead> {
  try {
    await ensureApiSession();
    const response = await api.patch<Lead>(`/leads/${id}/priority`, { priority });
    return normalizeLead(response.data);
  } catch (error) {
    rethrowApiError(error, "Failed to update lead priority.");
  }
}

export async function createLeadRemark(
  id: string,
  input: CreateLeadRemarkInput
): Promise<Lead> {
  try {
    await ensureApiSession();
    const response = await api.post<Lead>(`/leads/${id}/remarks`, input);
    return normalizeLead(response.data);
  } catch (error) {
    rethrowApiError(error, "Failed to add remark.");
  }
}

export async function editLeadRemark(
  id: string,
  remarkId: string,
  input: EditLeadRemarkInput
): Promise<Lead> {
  try {
    await ensureApiSession();
    const response = await api.patch<Lead>(`/leads/${id}/remarks/${remarkId}`, input);
    return normalizeLead(response.data);
  } catch (error) {
    rethrowApiError(error, "Failed to update remark.");
  }
}

export async function contactLeadWithRecording(
  id: string,
  input: ContactLeadRecordingInput
): Promise<Lead> {
  try {
    await ensureApiSession();
    const formData = new FormData();
    formData.append("audio", input.audioFile);
    if (input.contactedAt) {
      formData.append("contactedAt", input.contactedAt);
    }
    const response = await api.post<Lead>(`/leads/${id}/contact-recordings`, formData);
    return normalizeLead(response.data);
  } catch (error) {
    rethrowApiError(error, "Failed to process the contact recording.");
  }
}

export async function deleteLead(id: string): Promise<void> {
  try {
    await ensureApiSession();
    await api.delete(`/leads/${id}`);
  } catch (error) {
    rethrowApiError(error, "Failed to delete lead.");
  }
}

export async function importLeads(file: File): Promise<LeadImportResult> {
  try {
    await ensureApiSession();
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<LeadImportResult>("/leads/import", formData);
    return response.data;
  } catch (error) {
    rethrowApiError(error, "Failed to import leads.");
  }
}

export async function fetchLeadSchedules(leadId: string): Promise<LeadSchedule[]> {
  try {
    await ensureApiSession();
    const response = await api.get<LeadSchedule[]>(`/leads/${leadId}/schedules`);
    return response.data ?? [];
  } catch (error) {
    rethrowApiError(error, "Failed to load schedules.");
  }
}

export async function fetchLeadNotifications(): Promise<LeadNotifications> {
  try {
    await ensureApiSession();
    const response = await api.get<LeadNotifications>("/leads/notifications");
    return (
      response.data ?? {
        newLeadCount: 0,
        followUpDueCount: 0,
        updatedAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    rethrowApiError(error, "Failed to load lead notifications.");
  }
}

export function connectLeadNotificationsStream(
  onEvent: (event: LeadNotificationEvent) => void,
  onError?: (error: unknown) => void
) {
  const controller = new AbortController();
  let retryTimer: number | null = null;

  const scheduleReconnect = () => {
    if (controller.signal.aborted || retryTimer !== null) {
      return;
    }
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

      const response = await fetch(`${API_BASE_URL}/leads/notifications/stream`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        onError?.(new Error("Unable to open notifications stream."));
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
        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, "\n");
        let index = buffer.indexOf("\n\n");
        while (index !== -1) {
          const rawEvent = buffer.slice(0, index).trim();
          buffer = buffer.slice(index + 2);
          if (rawEvent) {
            let eventType = "message";
            let dataString = "";
            rawEvent.split("\n").forEach((line) => {
              if (line.startsWith("event:")) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                dataString += line.slice(5).trim();
              }
            });

            if (dataString) {
              try {
                const parsed = JSON.parse(dataString) as LeadNotificationEvent;
                onEvent({
                  ...parsed,
                  type: parsed.type ?? eventType,
                });
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

export async function createLeadSchedule(
  leadId: string,
  input: CreateLeadScheduleInput
): Promise<LeadSchedule> {
  try {
    await ensureApiSession();
    const response = await api.post<LeadSchedule>(
      `/leads/${leadId}/schedules`,
      input
    );
    return response.data;
  } catch (error) {
    rethrowApiError(error, "Failed to create schedule.");
  }
}

export async function updateLeadSchedule(
  leadId: string,
  scheduleId: string,
  input: UpdateLeadScheduleInput
): Promise<LeadSchedule> {
  try {
    await ensureApiSession();
    const response = await api.patch<LeadSchedule>(
      `/leads/${leadId}/schedules/${scheduleId}`,
      input
    );
    return response.data;
  } catch (error) {
    rethrowApiError(error, "Failed to update schedule.");
  }
}

export function getQuickStatusTargets(status: LeadStatus) {
  return getLeadStatusTransitions(status);
}
