import { useScopedQuery } from "@/hooks/useAuthQueryScope";
import {
  fetchNiyantranStats,
  fetchNiyantranTasksOverview,
  fetchNiyantranDepartments,
  fetchNiyantranLeaderboard,
  fetchNiyantranAttendanceSummary,
  fetchNiyantranMergeAnalysis,
  fetchNiyantranExecutionHistory,
  fetchNiyantranAims,
  fetchNiyantranEnhancedAims,
  fetchNiyantranAlerts,
  fetchNiyantranSubmissions,
  fetchNiyantranTasks,
  fetchNiyantranLiveLocations,
} from "@/api/niyantranEndpoints";

export const useNiyantranStats = () =>
  useScopedQuery({
    queryKey: ["niyantran-stats"],
    queryFn: fetchNiyantranStats,
    refetchInterval: 10_000,
    retry: 1,
  });

export const useNiyantranTasksOverview = () =>
  useScopedQuery({
    queryKey: ["niyantran-tasks-overview"],
    queryFn: fetchNiyantranTasksOverview,
    refetchInterval: 15_000,
    retry: 1,
  });

export const useNiyantranDepartments = () =>
  useScopedQuery({
    queryKey: ["niyantran-departments"],
    queryFn: fetchNiyantranDepartments,
    refetchInterval: 30_000,
    retry: 1,
  });

export const useNiyantranLeaderboard = () =>
  useScopedQuery({
    queryKey: ["niyantran-leaderboard"],
    queryFn: fetchNiyantranLeaderboard,
    refetchInterval: 15_000,
    retry: 1,
  });

export const useNiyantranAttendanceSummary = (params?: {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  status?: string;
}) =>
  useScopedQuery({
    queryKey: ["niyantran-attendance-summary", params],
    queryFn: () => fetchNiyantranAttendanceSummary(params),
    refetchInterval: 15_000,
    retry: 1,
  });

export const useNiyantranMergeAnalysis = (params?: {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
}) =>
  useScopedQuery({
    queryKey: ["niyantran-merge-analysis", params],
    queryFn: () => fetchNiyantranMergeAnalysis(params),
    refetchInterval: 20_000,
    retry: 1,
  });

export const useNiyantranExecutionHistory = (executionId?: string, tenantId?: string) =>
  useScopedQuery({
    queryKey: ["niyantran-execution-history", executionId, tenantId],
    queryFn: () => fetchNiyantranExecutionHistory(executionId!, tenantId),
    enabled: Boolean(executionId),
    refetchInterval: 5_000,
    retry: 1,
  });

export const useNiyantranAims = () =>
  useScopedQuery({
    queryKey: ["niyantran-aims"],
    queryFn: () => fetchNiyantranAims(),
    refetchInterval: 15_000,
    retry: 1,
  });

export const useNiyantranEnhancedAims = () =>
  useScopedQuery({
    queryKey: ["niyantran-enhanced-aims"],
    queryFn: () => fetchNiyantranEnhancedAims(),
    refetchInterval: 15_000,
    retry: 1,
  });

export const useNiyantranAlerts = () =>
  useScopedQuery({
    queryKey: ["niyantran-alerts"],
    queryFn: fetchNiyantranAlerts,
    refetchInterval: 10_000,
    retry: 1,
  });

export const useNiyantranSubmissions = () =>
  useScopedQuery({
    queryKey: ["niyantran-submissions"],
    queryFn: fetchNiyantranSubmissions,
    refetchInterval: 15_000,
    retry: 1,
  });

export const useNiyantranTasks = () =>
  useScopedQuery({
    queryKey: ["niyantran-tasks"],
    queryFn: fetchNiyantranTasks,
    refetchInterval: 15_000,
    retry: 1,
  });

export const useNiyantranLiveLocations = (params?: {
  date?: string;
  department?: string;
}) =>
  useScopedQuery({
    queryKey: ["niyantran-live-locations", params],
    queryFn: () => fetchNiyantranLiveLocations(params),
    refetchInterval: 10_000,
    retry: 1,
  });
