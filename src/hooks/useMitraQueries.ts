import { useScopedQuery } from "@/hooks/useAuthQueryScope";
import { fetchMitraHealth } from "@/api/mitraEndpoints";

export const useMitraHealth = () =>
  useScopedQuery({
    queryKey: ["mitra-health"],
    queryFn: fetchMitraHealth,
    refetchInterval: 10_000,
    retry: 1,
  });
