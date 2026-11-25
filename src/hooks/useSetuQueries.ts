import { useScopedQuery } from "@/hooks/useAuthQueryScope";
import {
  getHealth,
  getProjects,
  getProject,
  getProjectMilestones,
  getTask,
  getTaskAssignments,
  getSetuDashboard,
  getSetuTimeline,
  getSetuCandidateState,
  getSetuSignals,
  getSetuTelemetry,
} from "@/api/setuEndpoints";

// ─── SETU PMC / Project Queries ──────────────────────────────────────────────

export const useSetuHealth = () =>
  useScopedQuery({
    queryKey: ["setu-health"],
    queryFn: getHealth,
    refetchInterval: 10_000,
    retry: 1,
  });

export const useSetuProjects = () =>
  useScopedQuery({
    queryKey: ["setu-projects"],
    queryFn: getProjects,
    refetchInterval: 10_000,
    retry: 1,
  });

export const useSetuProject = (projectId: string) =>
  useScopedQuery({
    queryKey: ["setu-project", projectId],
    queryFn: () => getProject(projectId),
    refetchInterval: 10_000,
    enabled: !!projectId,
    retry: 1,
  });

export const useSetuProjectMilestones = (projectId: string) =>
  useScopedQuery({
    queryKey: ["setu-project-milestones", projectId],
    queryFn: () => getProjectMilestones(projectId),
    refetchInterval: 10_000,
    enabled: !!projectId,
    retry: 1,
  });

export const useSetuTask = (taskId: string) =>
  useScopedQuery({
    queryKey: ["setu-task", taskId],
    queryFn: () => getTask(taskId),
    refetchInterval: 10_000,
    enabled: !!taskId,
    retry: 1,
  });

export const useSetuTaskAssignments = (taskId: string) =>
  useScopedQuery({
    queryKey: ["setu-task-assignments", taskId],
    queryFn: () => getTaskAssignments(taskId),
    refetchInterval: 10_000,
    enabled: !!taskId,
    retry: 1,
  });

// ─── SETU Runtime Observation Queries (Strictly Read-Only) ───────────────────

export const useSetuDashboard = (traceId?: string, tenantId?: string) =>
  useScopedQuery({
    queryKey: ["setu-dashboard", traceId, tenantId],
    queryFn: () => getSetuDashboard(traceId!, tenantId),
    enabled: Boolean(traceId),
    refetchInterval: 10_000,
    retry: 1,
  });

export const useSetuTimeline = (traceId?: string, tenantId?: string) =>
  useScopedQuery({
    queryKey: ["setu-timeline", traceId, tenantId],
    queryFn: () => getSetuTimeline(traceId!, tenantId),
    enabled: Boolean(traceId),
    refetchInterval: 10_000,
    retry: 1,
  });

export const useSetuCandidateState = (traceId?: string, tenantId?: string) =>
  useScopedQuery({
    queryKey: ["setu-candidate-state", traceId, tenantId],
    queryFn: () => getSetuCandidateState(traceId!, tenantId),
    enabled: Boolean(traceId),
    refetchInterval: 10_000,
    retry: 1,
  });

export const useSetuSignals = (traceId?: string, tenantId?: string) =>
  useScopedQuery({
    queryKey: ["setu-signals", traceId, tenantId],
    queryFn: () => getSetuSignals(traceId!, tenantId),
    enabled: Boolean(traceId),
    refetchInterval: 10_000,
    retry: 1,
  });

export const useSetuTelemetry = (traceId?: string, tenantId?: string) =>
  useScopedQuery({
    queryKey: ["setu-telemetry", traceId, tenantId],
    queryFn: () => getSetuTelemetry(traceId!, tenantId),
    enabled: Boolean(traceId),
    refetchInterval: 10_000,
    retry: 1,
  });

// ─── Authoritative Tenant Context Hook ───────────────────────────────────────
export { useCurrentTenant, type CurrentTenantResult, type TenantResolutionStatus } from "./useCurrentTenant";
