import { useScopedQuery } from "@/hooks/useAuthQueryScope";
import {
  fetchRajyaHealth,
  fetchSovereignTraces,
  fetchSovereignBucketEntries,
} from "@/api/rajyaEndpoints";

export const useRajyaHealth = () =>
  useScopedQuery({
    queryKey: ["rajya-health"],
    queryFn: fetchRajyaHealth,
    refetchInterval: 10_000,
    retry: 1,
  });

export const useSovereignTraces = () =>
  useScopedQuery({
    queryKey: ["sovereign-traces"],
    queryFn: fetchSovereignTraces,
    refetchInterval: 3_000,
    retry: 1,
  });

export const useSovereignBucketEntries = () =>
  useScopedQuery({
    queryKey: ["sovereign-bucket-entries"],
    queryFn: fetchSovereignBucketEntries,
    refetchInterval: 10_000,
    retry: 1,
  });
