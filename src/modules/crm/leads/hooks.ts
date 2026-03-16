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
  createLeadRemark,
  deleteLead,
  editLeadRemark,
  fetchLeadAssignees,
  fetchLeadById,
  fetchLeads,
  updateLeadPriority,
  updateLead,
} from "./api";
import {
  type AssignLeadInput,
  type AssigneeOption,
  type ContactLeadRecordingInput,
  type CreateLeadRemarkInput,
  type EditLeadRemarkInput,
  type LeadFilter,
  type LeadFormData,
  type LeadUpdateData,
} from "./types";

export const leadsKeys = {
  all: ["crm", "leads"] as const,
  lists: () => [...leadsKeys.all, "list"] as const,
  list: (filter: LeadFilter) => [...leadsKeys.lists(), filter] as const,
  details: () => [...leadsKeys.all, "detail"] as const,
  detail: (id: string) => [...leadsKeys.details(), id] as const,
  assignees: () => [...leadsKeys.all, "assignees"] as const,
};

export function useLeads(filter: LeadFilter) {
  return useQuery({
    queryKey: leadsKeys.list(filter),
    queryFn: () => fetchLeads(filter),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
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
