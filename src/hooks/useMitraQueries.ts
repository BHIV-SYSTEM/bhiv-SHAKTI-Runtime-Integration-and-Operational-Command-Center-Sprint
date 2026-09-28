import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchMitraHealth } from "@/api/mitraEndpoints";

export const useMitraHealth = () =>
  useQuery({
    queryKey: ["mitra-health"],
    queryFn: fetchMitraHealth,
    refetchInterval: 10_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
