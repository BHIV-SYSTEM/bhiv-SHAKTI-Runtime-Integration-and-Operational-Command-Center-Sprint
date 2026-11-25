import { useScopedQuery } from "@/hooks/useAuthQueryScope";
import {
  fetchPranaHealth,
  fetchPranaSystemHealth,
  fetchPranaPropagationLog,
} from "@/api/pranaEndpoints";

export const usePranaHealth = () =>
  useScopedQuery({
    queryKey: ["prana-health"],
    queryFn: fetchPranaHealth,
    refetchInterval: 10_000,
  });

export const usePranaSystemHealth = () =>
  useScopedQuery({
    queryKey: ["prana-system-health"],
    queryFn: fetchPranaSystemHealth,
    refetchInterval: 10_000,
  });

export const usePranaPropagationLog = (limit = 50) =>
  useScopedQuery({
    queryKey: ["prana-propagation-log", limit],
    queryFn: () => fetchPranaPropagationLog(limit),
    refetchInterval: 5_000,
  });
