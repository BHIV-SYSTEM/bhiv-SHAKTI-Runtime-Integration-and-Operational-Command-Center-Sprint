import { useScopedQuery } from "@/hooks/useAuthQueryScope";
import {
  fetchTantraHealth,
  fetchTantraTelemetry,
  fetchTantraTelemetrySummary,
} from "@/api/tantraEndpoints";

export const useTantraHealth = () =>
  useScopedQuery({
    queryKey: ["tantra-health"],
    queryFn: fetchTantraHealth,
    refetchInterval: 10_000, // 10s health polling
    retry: 1,
  });

export const useTantraTelemetry = () =>
  useScopedQuery({
    queryKey: ["tantra-telemetry"],
    queryFn: fetchTantraTelemetry,
    refetchInterval: 10_000, // 10s telemetry polling
    retry: 1,
  });

export const useTantraTelemetrySummary = () =>
  useScopedQuery({
    queryKey: ["tantra-telemetry-summary"],
    queryFn: fetchTantraTelemetrySummary,
    refetchInterval: 10_000, // 10s telemetry summary polling
    retry: 1,
  });
