import { useScopedQuery } from "@/hooks/useAuthQueryScope";
import {
  fetchBucketArtifacts,
  fetchBucketStorageStats,
  fetchBucketChainState,
  fetchBucketHealth,
  fetchAuditRecent,
  fetchAuditFailed,
  fetchMetricsScaleStatus,
  fetchMetricsQueryPerformance,
  fetchMetricsAlerts,
  fetchConstitutionalStatus,
} from "@/api/bucketEndpoints";

export const useBucketArtifacts = (limit = 50, offset = 0, trace_id?: string) =>
  useScopedQuery({
    queryKey: ["bucket-artifacts", limit, offset, trace_id],
    queryFn: () => fetchBucketArtifacts(limit, offset, trace_id),
    refetchInterval: 10_000,
  });

export const useBucketStorageStats = () =>
  useScopedQuery({
    queryKey: ["bucket-storage-stats"],
    queryFn: fetchBucketStorageStats,
    refetchInterval: 15_000,
  });

export const useBucketChainState = () =>
  useScopedQuery({
    queryKey: ["bucket-chain-state"],
    queryFn: fetchBucketChainState,
    refetchInterval: 10_000,
  });

export const useBucketHealth = () =>
  useScopedQuery({
    queryKey: ["bucket-health"],
    queryFn: fetchBucketHealth,
    refetchInterval: 10_000,
  });

export const useAuditRecent = (limit = 20) =>
  useScopedQuery({
    queryKey: ["audit-recent", limit],
    queryFn: () => fetchAuditRecent(limit),
    refetchInterval: 5_000,
  });

export const useAuditFailed = (limit = 20) =>
  useScopedQuery({
    queryKey: ["audit-failed", limit],
    queryFn: () => fetchAuditFailed(limit),
    refetchInterval: 5_000,
  });

export const useMetricsScaleStatus = () =>
  useScopedQuery({
    queryKey: ["metrics-scale-status"],
    queryFn: fetchMetricsScaleStatus,
    refetchInterval: 5_000,
  });

export const useMetricsQueryPerformance = () =>
  useScopedQuery({
    queryKey: ["metrics-query-performance"],
    queryFn: fetchMetricsQueryPerformance,
    refetchInterval: 10_000,
  });

export const useMetricsAlerts = () =>
  useScopedQuery({
    queryKey: ["metrics-alerts"],
    queryFn: fetchMetricsAlerts,
    refetchInterval: 5_000,
  });

export const useConstitutionalStatus = () =>
  useScopedQuery({
    queryKey: ["constitutional-status"],
    queryFn: fetchConstitutionalStatus,
    refetchInterval: 30_000,
  });
