import { useScopedQuery } from "@/hooks/useAuthQueryScope";
import {
  getHealth,
  getMetricsJson,
} from "@/api/keshavEndpoints";

export const useKeshavHealth = () =>
  useScopedQuery({
    queryKey: ["keshav-health"],
    queryFn: getHealth,
    refetchInterval: 10_000,
  });

export const useKeshavMetrics = () =>
  useScopedQuery({
    queryKey: ["keshav-metrics-json"],
    queryFn: getMetricsJson,
    refetchInterval: 10_000,
  });
