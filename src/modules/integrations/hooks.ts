import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMetaIntegrationSettings,
  fetchLatestMetaLeads,
  fetchWhatsappIntegrationSettings,
  testMetaIntegration,
  testWhatsappIntegration,
  updateMetaIntegrationSettings,
  updateWhatsappIntegrationSettings,
} from "./api";
import type {
  MetaIntegrationSettings,
  MetaLeadFetchResult,
  WhatsappIntegrationSettings,
} from "./types";

export const integrationKeys = {
  all: ["integrations"] as const,
  meta: () => [...integrationKeys.all, "meta"] as const,
  whatsapp: () => [...integrationKeys.all, "whatsapp"] as const,
};

export function useMetaIntegrationSettings(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: integrationKeys.meta(),
    queryFn: fetchMetaIntegrationSettings,
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
}

export function useUpdateMetaIntegrationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MetaIntegrationSettings) =>
      updateMetaIntegrationSettings(input),
    onSuccess: (data) => {
      queryClient.setQueryData(integrationKeys.meta(), data);
    },
  });
}

export function useTestMetaIntegration() {
  return useMutation({
    mutationFn: () => testMetaIntegration(),
  });
}

export function useFetchLatestMetaLeads() {
  return useMutation<MetaLeadFetchResult, unknown, number | undefined>({
    mutationFn: (limit) => fetchLatestMetaLeads(limit),
  });
}

export function useWhatsappIntegrationSettings(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: integrationKeys.whatsapp(),
    queryFn: fetchWhatsappIntegrationSettings,
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
}

export function useUpdateWhatsappIntegrationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: WhatsappIntegrationSettings) =>
      updateWhatsappIntegrationSettings(input),
    onSuccess: (data) => {
      queryClient.setQueryData(integrationKeys.whatsapp(), data);
    },
  });
}

export function useTestWhatsappIntegration() {
  return useMutation({
    mutationFn: () => testWhatsappIntegration(),
  });
}
