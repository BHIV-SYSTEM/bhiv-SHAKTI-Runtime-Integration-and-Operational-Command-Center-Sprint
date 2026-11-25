import { useScopedQuery } from "@/hooks/useAuthQueryScope";
import {
  fetchHealth,
  fetchSystemStatus,
  fetchMetrics,
  fetchExecutiveDashboard,
  fetchOperationsDashboard,
  fetchAlertsDashboard,
  fetchRuntimeDashboard,
  fetchTelemetryDashboard,
  fetchRepositoryRegistry,
  fetchBuildRegistry,
  fetchMigrationQueue,
  fetchReviewQueue,
  fetchCapabilityRegistry,
  fetchDeliveryIntelligence,
} from "@/api/endpoints";
import {
  fetchEmployeeExecution,
  fetchEngineeringCapacity,
} from "@/api/niyantranEndpoints";

// GET /health — lightweight liveness probe
export const useHealth = () =>
  useScopedQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 10_000,
    retry: 1,
  });

// GET /system/status → SystemHealth zone
export const useSystemStatus = () =>
  useScopedQuery({
    queryKey: ["system-status"],
    queryFn: fetchSystemStatus,
    refetchInterval: 10_000,
    retry: 1,
  });

// GET /metrics → Live KPIs zone
export const useMetrics = () =>
  useScopedQuery({
    queryKey: ["metrics"],
    queryFn: fetchMetrics,
    refetchInterval: 10_000,
    retry: 1,
  });

// GET /dashboard/executive → Executive Summary zone
export const useExecutiveDashboard = () =>
  useScopedQuery({
    queryKey: ["dashboard-executive"],
    queryFn: fetchExecutiveDashboard,
    refetchInterval: 15_000,
    retry: 1,
  });

// GET /dashboard/operations → Operations / Incident Queue zone
export const useOperationsDashboard = () =>
  useScopedQuery({
    queryKey: ["dashboard-operations"],
    queryFn: fetchOperationsDashboard,
    refetchInterval: 10_000,
    retry: 1,
  });

// GET /dashboard/alerts → Live Alert Queue zone
export const useAlertsDashboard = () =>
  useScopedQuery({
    queryKey: ["dashboard-alerts"],
    queryFn: fetchAlertsDashboard,
    refetchInterval: 10_000,
    retry: 1,
  });

// GET /dashboard/runtime → Replay Status zone
export const useRuntimeDashboard = () =>
  useScopedQuery({
    queryKey: ["dashboard-runtime"],
    queryFn: fetchRuntimeDashboard,
    refetchInterval: 10_000,
    retry: 1,
  });

// GET /dashboard/telemetry → Forecast / Telemetry zone
export const useTelemetryDashboard = () =>
  useScopedQuery({
    queryKey: ["dashboard-telemetry"],
    queryFn: fetchTelemetryDashboard,
    refetchInterval: 10_000,
    retry: 1,
  });

// BHEX Repository Registry
// - Current implementation: Placeholder interface returning fallback/empty data.
// - Future implementation: Canonical BHEX Registry service.
// - Layouts: require zero changes.
export const useRepositoryRegistry = () =>
  useScopedQuery({
    queryKey: ["registry-repositories"],
    queryFn: fetchRepositoryRegistry,
    refetchInterval: 10_000,
    retry: 1,
  });

// BHEX Build Registry
// - Current implementation: Placeholder interface returning fallback/empty data.
// - Future implementation: Canonical BHEX Registry service.
// - Layouts: require zero changes.
export const useBuildRegistry = () =>
  useScopedQuery({
    queryKey: ["registry-builds"],
    queryFn: fetchBuildRegistry,
    refetchInterval: 10_000,
    retry: 1,
  });

// BHEX Migration Queue
// - Current implementation: Placeholder interface returning fallback/empty data.
// - Future implementation: Canonical BHEX Registry service.
// - Layouts: require zero changes.
export const useMigrationQueue = () =>
  useScopedQuery({
    queryKey: ["queue-migration"],
    queryFn: fetchMigrationQueue,
    refetchInterval: 10_000,
    retry: 1,
  });

// BHEX Review Queue
// - Current implementation: Placeholder interface returning fallback/empty data.
// - Future implementation: Canonical BHEX Registry service.
// - Layouts: require zero changes.
export const useReviewQueue = () =>
  useScopedQuery({
    queryKey: ["queue-review"],
    queryFn: fetchReviewQueue,
    refetchInterval: 10_000,
    retry: 1,
  });

// BHEX Capability Registry
// - Current implementation: Placeholder interface returning fallback/empty data.
// - Future implementation: Canonical BHEX Registry service.
// - Layouts: require zero changes.
export const useCapabilityRegistry = () =>
  useScopedQuery({
    queryKey: ["registry-capabilities"],
    queryFn: fetchCapabilityRegistry,
    refetchInterval: 10_000,
    retry: 1,
  });

// GET /operations/employee-execution → Employee Execution Operational View
export const useEmployeeExecution = () =>
  useScopedQuery({
    queryKey: ["operations-employee-execution"],
    queryFn: fetchEmployeeExecution,
    refetchInterval: 10_000,
    retry: 1,
  });

// GET /operations/engineering-capacity → Engineering Capacity Operational View
export const useEngineeringCapacity = () =>
  useScopedQuery({
    queryKey: ["operations-engineering-capacity"],
    queryFn: fetchEngineeringCapacity,
    refetchInterval: 10_000,
    retry: 1,
  });

// GET /operations/delivery-intelligence → Delivery Intelligence Operational View
export const useDeliveryIntelligence = () =>
  useScopedQuery({
    queryKey: ["operations-delivery-intelligence"],
    queryFn: fetchDeliveryIntelligence,
    refetchInterval: 10_000,
    retry: 1,
  });
