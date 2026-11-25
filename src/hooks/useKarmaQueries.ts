import { useScopedQuery } from "@/hooks/useAuthQueryScope";
import {
  fetchKarmaHealth,
  fetchKarmaLatestHash,
  fetchKarmaLineage,
  fetchKarmaAncestry,
  fetchKarmaConfidence,
  fetchKarmaReasoning,
  fetchKarmaLiveMetrics,
  fetchKarmaTrends,
  fetchKarmaDharmaSevaFlow,
  fetchKarmaPaapPunyaRatio,
  type KarmaConfidenceParams,
  type KarmaReasoningParams,
} from "@/api/karmaEndpoints";

export const useKarmaHealth = () =>
  useScopedQuery({
    queryKey: ["karma-health"],
    queryFn: fetchKarmaHealth,
    refetchInterval: 10_000,
    retry: 1,
  });

export const useKarmaLatestHash = () =>
  useScopedQuery({
    queryKey: ["karma-latest-hash"],
    queryFn: fetchKarmaLatestHash,
    refetchInterval: 10_000,
    retry: 1,
  });

export const useKarmaLineage = () =>
  useScopedQuery({
    queryKey: ["karma-lineage"],
    queryFn: fetchKarmaLineage,
    refetchInterval: 10_000,
    retry: 1,
  });

export const useKarmaAncestry = (eventId?: string) =>
  useScopedQuery({
    queryKey: ["karma-ancestry", eventId],
    queryFn: () => fetchKarmaAncestry(eventId!),
    enabled: !!eventId,
    preservePreviousData: false,
    retry: 1,
  });

export const useKarmaConfidence = (
  trajectoryId?: string,
  params?: KarmaConfidenceParams
) =>
  useScopedQuery({
    queryKey: ["karma-confidence", trajectoryId, params],
    queryFn: () => fetchKarmaConfidence(trajectoryId!, params),
    enabled: !!trajectoryId,
    preservePreviousData: false,
    retry: 1,
  });

export const useKarmaReasoning = (
  trajectoryId?: string,
  params?: KarmaReasoningParams
) =>
  useScopedQuery({
    queryKey: ["karma-reasoning", trajectoryId, params],
    queryFn: () => fetchKarmaReasoning(trajectoryId!, params),
    enabled: !!trajectoryId,
    preservePreviousData: false,
    retry: 1,
  });

export const useKarmaLiveMetrics = () =>
  useScopedQuery({
    queryKey: ["karma-live-metrics"],
    queryFn: fetchKarmaLiveMetrics,
    refetchInterval: 10_000,
    retry: 1,
  });

export const useKarmaTrends = () =>
  useScopedQuery({
    queryKey: ["karma-trends"],
    queryFn: fetchKarmaTrends,
    refetchInterval: 10_000,
    retry: 1,
  });

export const useKarmaDharmaSevaFlow = () =>
  useScopedQuery({
    queryKey: ["karma-dharma-seva-flow"],
    queryFn: fetchKarmaDharmaSevaFlow,
    refetchInterval: 10_000,
    retry: 1,
  });

export const useKarmaPaapPunyaRatio = () =>
  useScopedQuery({
    queryKey: ["karma-paap-punya-ratio"],
    queryFn: fetchKarmaPaapPunyaRatio,
    refetchInterval: 10_000,
    retry: 1,
  });
