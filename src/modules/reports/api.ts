import { api, ensureApiSession, getApiErrorMessage } from "@/services/api-client";
import type { OverviewResponse } from "./types";

function rethrowApiError(error: unknown, fallback: string): never {
  throw new Error(getApiErrorMessage(error, fallback));
}

export async function fetchOverview(params?: { start?: string; end?: string }): Promise<OverviewResponse> {
  try {
    await ensureApiSession();
    const response = await api.get<OverviewResponse>("/reports/overview", {
      params,
    });
    return response.data;
  } catch (error) {
    rethrowApiError(error, "Failed to load reports.");
  }
}
