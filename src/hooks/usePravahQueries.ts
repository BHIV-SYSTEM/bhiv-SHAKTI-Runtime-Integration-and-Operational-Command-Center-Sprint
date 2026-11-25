import { useScopedQuery } from "@/hooks/useAuthQueryScope";
import {
  getPravahTraceRegistry,
  getPravahEvidence,
} from "@/api/pravahEndpoints";

export const usePravahTraceRegistry = (traceId?: string) =>
  useScopedQuery({
    queryKey: ["pravah-trace-registry", traceId],
    queryFn: () => getPravahTraceRegistry(traceId!),
    enabled: Boolean(traceId),
    refetchInterval: 15_000,
    retry: 1,
  });

export const usePravahEvidence = (evidenceRef?: string) =>
  useScopedQuery({
    queryKey: ["pravah-evidence", evidenceRef],
    queryFn: () => getPravahEvidence(evidenceRef!),
    enabled: Boolean(evidenceRef),
    refetchInterval: 30_000,
    retry: 1,
  });
