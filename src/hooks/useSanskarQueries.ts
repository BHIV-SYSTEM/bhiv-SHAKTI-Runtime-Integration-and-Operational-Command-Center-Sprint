import { useScopedQuery } from "@/hooks/useAuthQueryScope";
import { getHealth, getRanking, getTrace } from "@/api/sanskarEndpoints";

export const useSanskarHealth = () =>
  useScopedQuery({
    queryKey: ["sanskar-health"],
    queryFn: getHealth,
    refetchInterval: 10_000,
    retry: 1,
  });

export const useSanskarRanking = () =>
  useScopedQuery({
    queryKey: ["sanskar-ranking"],
    queryFn: getRanking,
    refetchInterval: 10_000,
    retry: 1,
  });

export const useSanskarTrace = (traceId?: string) =>
  useScopedQuery({
    queryKey: ["sanskar-trace", traceId],
    queryFn: () => getTrace(traceId!),
    enabled: !!traceId,
    preservePreviousData: false,
    retry: 1,
  });
