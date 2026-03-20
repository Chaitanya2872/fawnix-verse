import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  assignLead,
  contactLeadWithRecording,
  createLead,
  createLeadSchedule,
  createLeadRemark,
  deleteLead,
  editLeadRemark,
  fetchLeadSchedules,
  fetchLeadNotifications,
  fetchLeadAssignees,
  fetchLeadById,
  fetchLeadQuestionnaire,
  fetchLeads,
  importLeads,
  updateLeadPriority,
  updateLead,
  updateLeadSchedule,
} from "./api";
import {
  type AssignLeadInput,
  type AssigneeOption,
  type ContactLeadRecordingInput,
  type CreateLeadRemarkInput,
  type CreateLeadScheduleInput,
  type EditLeadRemarkInput,
  type LeadImportResult,
  type LeadFilter,
  type LeadFormData,
  type LeadSchedule,
  type LeadNotifications,
  type UpdateLeadScheduleInput,
  type LeadUpdateData,
} from "./types";

export const leadsKeys = {
  all: ["crm", "leads"] as const,
  lists: () => [...leadsKeys.all, "list"] as const,
  list: (filter: LeadFilter) => [...leadsKeys.lists(), filter] as const,
  details: () => [...leadsKeys.all, "detail"] as const,
  detail: (id: string) => [...leadsKeys.details(), id] as const,
  questionnaires: () => [...leadsKeys.all, "questionnaire"] as const,
  questionnaire: (id: string) => [...leadsKeys.questionnaires(), id] as const,
  schedules: () => [...leadsKeys.all, "schedules"] as const,
  schedule: (leadId: string) => [...leadsKeys.schedules(), leadId] as const,
  assignees: () => [...leadsKeys.all, "assignees"] as const,
  notifications: () => [...leadsKeys.all, "notifications"] as const,
};

export function useLeads(
  filter: LeadFilter,
  options?: { refetchInterval?: number; enabled?: boolean }
) {
  return useQuery({
    queryKey: leadsKeys.list(filter),
    queryFn: () => fetchLeads(filter),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval,
    enabled: options?.enabled ?? true,
  });
}

export function useLeadDetail(id: string | null) {
  return useQuery({
    queryKey: leadsKeys.detail(id ?? ""),
    queryFn: () => fetchLeadById(id ?? ""),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useLeadQuestionnaire(id: string | null) {
  return useQuery({
    queryKey: leadsKeys.questionnaire(id ?? ""),
    queryFn: () => fetchLeadQuestionnaire(id ?? ""),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useLeadSchedules(leadId: string | null) {
  return useQuery({
    queryKey: leadsKeys.schedule(leadId ?? ""),
    queryFn: () => fetchLeadSchedules(leadId ?? ""),
    enabled: Boolean(leadId),
    staleTime: 30_000,
  });
}

export function useLeadNotifications(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  return useQuery<LeadNotifications>({
    queryKey: leadsKeys.notifications(),
    queryFn: fetchLeadNotifications,
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? 15_000,
    staleTime: 10_000,
  });
}

export function useLeadAssignees() {
  return useQuery<AssigneeOption[]>({
    queryKey: leadsKeys.assignees(),
    queryFn: fetchLeadAssignees,
    staleTime: 5 * 60_000,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LeadFormData) => createLead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.lists() });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LeadUpdateData }) =>
      updateLead(id, data),
    onSuccess: (updatedLead) => {
      queryClient.setQueryData(leadsKeys.detail(updatedLead.id), updatedLead);
      queryClient.invalidateQueries({ queryKey: leadsKeys.lists() });
    },
  });
}

export function useAssignLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AssignLeadInput }) =>
      assignLead(id, input),
    onSuccess: (updatedLead) => {
      queryClient.setQueryData(leadsKeys.detail(updatedLead.id), updatedLead);
      queryClient.invalidateQueries({ queryKey: leadsKeys.lists() });
    },
  });
}

export function useUpdateLeadPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: LeadFormData["priority"] }) =>
      updateLeadPriority(id, priority),
    onSuccess: (updatedLead) => {
      queryClient.setQueryData(leadsKeys.detail(updatedLead.id), updatedLead);
      queryClient.invalidateQueries({ queryKey: leadsKeys.lists() });
    },
  });
}

export function useCreateLeadRemark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: CreateLeadRemarkInput;
    }) => createLeadRemark(id, input),
    onSuccess: (updatedLead) => {
      queryClient.setQueryData(leadsKeys.detail(updatedLead.id), updatedLead);
      queryClient.invalidateQueries({ queryKey: leadsKeys.lists() });
    },
  });
}

export function useContactLeadRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: ContactLeadRecordingInput;
    }) => contactLeadWithRecording(id, input),
    onSuccess: (updatedLead) => {
      queryClient.setQueryData(leadsKeys.detail(updatedLead.id), updatedLead);
      queryClient.invalidateQueries({ queryKey: leadsKeys.lists() });
    },
  });
}

export function useEditLeadRemark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      remarkId,
      input,
    }: {
      id: string;
      remarkId: string;
      input: EditLeadRemarkInput;
    }) => editLeadRemark(id, remarkId, input),
    onSuccess: (updatedLead) => {
      queryClient.setQueryData(leadsKeys.detail(updatedLead.id), updatedLead);
      queryClient.invalidateQueries({ queryKey: leadsKeys.lists() });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadsKeys.details() });
    },
  });
}

export function useImportLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => importLeads(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.lists() });
    },
  });
}

export function useCreateLeadSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      input,
    }: {
      leadId: string;
      input: CreateLeadScheduleInput;
    }) => createLeadSchedule(leadId, input),
    onSuccess: (schedule) => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.schedule(schedule.leadId) });
      queryClient.invalidateQueries({ queryKey: leadsKeys.details() });
    },
  });
}

export function useUpdateLeadSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      scheduleId,
      input,
    }: {
      leadId: string;
      scheduleId: string;
      input: UpdateLeadScheduleInput;
    }) => updateLeadSchedule(leadId, scheduleId, input),
    onSuccess: (schedule) => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.schedule(schedule.leadId) });
      queryClient.invalidateQueries({ queryKey: leadsKeys.details() });
    },
  });
}
