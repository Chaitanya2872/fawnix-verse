import { useQuery } from "@tanstack/react-query";
import { fetchPreSalesOverview } from "./api";

export const presalesKeys = {
  all: ["crm", "presales"] as const,
  overview: () => [...presalesKeys.all, "overview"] as const,
};

export function usePreSalesOverview() {
  return useQuery({
    queryKey: presalesKeys.overview(),
    queryFn: fetchPreSalesOverview,
    staleTime: 30_000,
  });
}
