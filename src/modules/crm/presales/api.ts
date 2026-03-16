import { api, ensureApiSession, getApiErrorMessage } from "@/services/api-client";
import type { PreSalesOverview } from "./types";

function rethrowApiError(error: unknown, fallback: string): never {
  throw new Error(getApiErrorMessage(error, fallback));
}

export async function fetchPreSalesOverview(): Promise<PreSalesOverview> {
  try {
    await ensureApiSession();
    const response = await api.get<PreSalesOverview>("/reports/presales");
    return response.data;
  } catch (error) {
    rethrowApiError(error, "Failed to load pre-sales overview.");
  }
}
