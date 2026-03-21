import { api, ensureApiSession, getApiErrorMessage } from "@/services/api-client";
import type { Deal, DealFormData, PaginatedDeals } from "./types";

function rethrow(error: unknown, fallback: string): never {
  throw new Error(getApiErrorMessage(error, fallback));
}

export async function fetchDeals(params: {
  search?: string;
  stage?: string;
  ownerUserId?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedDeals> {
  try {
    await ensureApiSession();
    const response = await api.get<PaginatedDeals>("/deals", { params });
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load deals.");
  }
}

export async function fetchDeal(id: string): Promise<Deal> {
  try {
    await ensureApiSession();
    const response = await api.get<Deal>(`/deals/${id}`);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load deal.");
  }
}

export async function createDeal(data: DealFormData): Promise<Deal> {
  try {
    await ensureApiSession();
    const response = await api.post<Deal>("/deals", data);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to create deal.");
  }
}

export async function updateDeal(id: string, data: DealFormData): Promise<Deal> {
  try {
    await ensureApiSession();
    const response = await api.patch<Deal>(`/deals/${id}`, data);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to update deal.");
  }
}

export async function updateDealStage(id: string, stage: string): Promise<Deal> {
  try {
    await ensureApiSession();
    const response = await api.patch<Deal>(`/deals/${id}/stage`, { stage });
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to update deal stage.");
  }
}

export async function deleteDeal(id: string): Promise<void> {
  try {
    await ensureApiSession();
    await api.delete(`/deals/${id}`);
  } catch (error) {
    rethrow(error, "Failed to delete deal.");
  }
}
