import { useScopedQuery } from "@/hooks/useAuthQueryScope";
import {
  fetchInsightFlowHealth,
  fetchInsightFlowStageMetrics,
  fetchInsightFlowBucketStatus,
} from "@/api/insightflowEndpoints";

export const useInsightFlowHealth = () =>
  useScopedQuery({
    queryKey: ["insightflow-health"],
    queryFn: fetchInsightFlowHealth,
    refetchInterval: 10_000,
  });

export const useInsightFlowStageMetrics = () =>
  useScopedQuery({
    queryKey: ["insightflow-stage-metrics"],
    queryFn: fetchInsightFlowStageMetrics,
    refetchInterval: 10_000,
  });

export const useInsightFlowBucketStatus = () =>
  useScopedQuery({
    queryKey: ["insightflow-bucket-status"],
    queryFn: fetchInsightFlowBucketStatus,
    refetchInterval: 15_000,
  });
