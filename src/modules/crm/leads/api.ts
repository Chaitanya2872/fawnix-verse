import { api, ensureApiSession, getApiErrorMessage } from "@/services/api-client";
import {
  type AssignLeadInput,
  type AssigneeOption,
  type ContactLeadRecordingInput,
  type CreateLeadRemarkInput,
  type EditLeadRemarkInput,
  type Lead,
  type LeadFilter,
  type LeadFormData,
  type LeadUpdateData,
  type LeadsSummary,
  type PaginatedLeads,
  getLeadStatusTransitions,
  LeadStatus,
} from "./types";

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
    notes: lead.notes ?? "",
    tags: lead.tags ?? [],
    remarks: lead.remarks ?? [],
    contactRecordings: lead.contactRecordings ?? [],
    activities: lead.activities ?? [],
    lastContactedAt: lead.lastContactedAt ?? null,
    convertedAt: lead.convertedAt ?? null,
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

export function getQuickStatusTargets(status: LeadStatus) {
  return getLeadStatusTransitions(status);
}
