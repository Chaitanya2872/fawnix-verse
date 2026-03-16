import { useQuery } from "@tanstack/react-query";
import { fetchOverview } from "./api";

export const reportsKeys = {
  all: ["reports"] as const,
  overview: (start?: string, end?: string) =>
    [...reportsKeys.all, "overview", start ?? "", end ?? ""] as const,
};

export function useReportsOverview(params?: { start?: string; end?: string }) {
  return useQuery({
    queryKey: reportsKeys.overview(params?.start, params?.end),
    queryFn: () => fetchOverview(params),
    staleTime: 60_000,
  });
}
