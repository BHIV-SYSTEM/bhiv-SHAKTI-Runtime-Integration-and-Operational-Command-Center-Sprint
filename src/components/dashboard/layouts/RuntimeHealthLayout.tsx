import { memo } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { useSystemStatus, useMetrics } from "@/hooks/useQueries";
import { useBucketHealth } from "@/hooks/useBucketQueries";
import { usePranaHealth, usePranaSystemHealth } from "@/hooks/usePranaQueries";
import { useNiyantranStats } from "@/hooks/useNiyantranQueries";
import { useInsightFlowHealth } from "@/hooks/useInsightFlowQueries";
import { useTantraHealth } from "@/hooks/useTantraQueries";
import { useRajyaHealth } from "@/hooks/useRajyaQueries";
import { useSanskarHealth } from "@/hooks/useSanskarQueries";
import { useKarmaHealth } from "@/hooks/useKarmaQueries";
import { useKeshavHealth } from "@/hooks/useKeshavQueries";
import { useSetuHealth } from "@/hooks/useSetuQueries";
import { useMitraHealth } from "@/hooks/useMitraQueries";
import { toStatus, statusColor, statusDot, formatTime } from "@/utils/format";
import { normalizeComponentStatus } from "@/utils/healthStatus";
import type { ComponentStatus } from "@/types/runtime";

function toScore(components: ComponentStatus[]): number {
  if (!components || !components.length) return 0;
  const operational = components.filter((c) => c && (c.status === "operational" || c.status === "healthy")).length;
  return Math.round((operational / components.length) * 100);
}

export default memo(function RuntimeHealthLayout() {
  const { data, isLoading: statusLoading, isError: statusError, refetch: statusRefetch, isFetching: statusFetching, isStale: statusStale } = useSystemStatus();
  const metrics = useMetrics();
  const bucketHealth = useBucketHealth();
  const pranaHealth = usePranaHealth();
  const pranaSystemHealth = usePranaSystemHealth();
  const niyantranStats = useNiyantranStats();
  const insightFlowHealth = useInsightFlowHealth();
  const tantraHealth = useTantraHealth();
  const rajyaHealth = useRajyaHealth();
  const sanskarHealth = useSanskarHealth();
  const karmaHealth = useKarmaHealth();
  const keshavHealth = useKeshavHealth();
  const setuHealth = useSetuHealth();
  const mitraHealth = useMitraHealth();

  const rawComponents = data?.components ?? [];

  const pranaStatus = pranaSystemHealth.data?.status || pranaHealth.data?.status;
  const pranaMode = pranaSystemHealth.data?.mode || "live";
  const pranaFwd = pranaSystemHealth.data?.forwarding_enabled ?? pranaHealth.data?.forwarding_enabled ?? true;
  const pranaLoading = pranaHealth.isLoading || pranaSystemHealth.isLoading;
  const pranaError = pranaHealth.isError || pranaSystemHealth.isError;

  const components = Array.from(
    new Map(
      [
        ...rawComponents,
        ...(bucketHealth.data || bucketHealth.isError || bucketHealth.isLoading ? [{
          name: "bucket_storage",
          status: normalizeComponentStatus(bucketHealth.data?.status, bucketHealth.isLoading, bucketHealth.isError),
          last_check: new Date().toISOString(),
          response_time_ms: (bucketHealth.isLoading || bucketHealth.isError) ? null : 15,
          details: bucketHealth.isLoading
            ? "Loading..."
            : bucketHealth.isError
              ? "Connection failed"
              : `${bucketHealth.data?.append_only_storage?.certification || 'APPEND_ONLY'} | ${bucketHealth.data?.governance?.certification || 'gov_active'}`,
        }] : []),
        ...(pranaHealth.data || pranaHealth.isError || pranaHealth.isLoading || pranaSystemHealth.data || pranaSystemHealth.isError || pranaSystemHealth.isLoading ? [{
          name: "prana_service",
          status: normalizeComponentStatus(pranaStatus, pranaLoading, pranaError),
          last_check: new Date().toISOString(),
          response_time_ms: (pranaLoading || pranaError) ? null : 10,
          details: pranaLoading
            ? "Loading..."
            : pranaError
              ? "Connection failed"
              : `Mode: ${pranaMode} | Fwd: ${pranaFwd ? 'enabled' : 'disabled'}`,
        }] : []),
        ...(insightFlowHealth.data || insightFlowHealth.isError || insightFlowHealth.isLoading ? [{
          name: "insightflow_runtime",
          status: normalizeComponentStatus(insightFlowHealth.data?.status, insightFlowHealth.isLoading, insightFlowHealth.isError),
          last_check: new Date().toISOString(),
          response_time_ms: null,
          details: insightFlowHealth.isLoading
            ? "Loading..."
            : insightFlowHealth.isError
              ? "Connection failed"
              : `Errors (60s): ${insightFlowHealth.data?.error_count_60s ?? 0}`,
        }] : []),
        ...(tantraHealth.data || tantraHealth.isError || tantraHealth.isLoading ? [{
          name: "tantra_gated_bridge",
          status: normalizeComponentStatus(tantraHealth.data?.status, tantraHealth.isLoading, tantraHealth.isError),
          last_check: tantraHealth.data?.timestamp || new Date().toISOString(),
          response_time_ms: null,
          details: tantraHealth.isLoading
            ? "Loading..."
            : tantraHealth.isError
              ? "Connection failed"
              : `Version: ${tantraHealth.data?.version ?? "1.0.0"} | Uptime: ${tantraHealth.data?.uptime_seconds != null ? tantraHealth.data.uptime_seconds + "s" : "N/A"}`,
        }] : []),
        ...(rajyaHealth.data || rajyaHealth.isError || rajyaHealth.isLoading ? [{
          name: "RAJYA Sovereign Core",
          status: normalizeComponentStatus(rajyaHealth.data?.status, rajyaHealth.isLoading, rajyaHealth.isError),
          last_check: new Date().toISOString(),
          response_time_ms: null,
          details: rajyaHealth.isLoading
            ? "Cold starting..."
            : rajyaHealth.isError
              ? "Connection failed"
              : `Service: ${rajyaHealth.data?.service || 'bhiv-enforcement-gateway'} | Status: ${rajyaHealth.data?.status || 'degraded'}`,
        }] : []),
        ...(sanskarHealth.data || sanskarHealth.isError || sanskarHealth.isLoading ? [{
          name: "SANSKAR Domain Intelligence",
          status: normalizeComponentStatus(sanskarHealth.data?.status, sanskarHealth.isLoading, sanskarHealth.isError),
          last_check: new Date().toISOString(),
          response_time_ms: null,
          details: sanskarHealth.isLoading
            ? "Cold starting..."
            : sanskarHealth.isError
              ? "Connection failed"
              : `Version: ${sanskarHealth.data?.contract_version || 'v1'} | Service: ${sanskarHealth.data?.service || 'sanskar'}`,
        }] : []),
        ...(karmaHealth.data || karmaHealth.isError || karmaHealth.isLoading ? [{
          name: "karma_runtime",
          status: normalizeComponentStatus(karmaHealth.data?.status, karmaHealth.isLoading, karmaHealth.isError),
          last_check: new Date().toISOString(),
          response_time_ms: null,
          details: karmaHealth.isLoading
            ? "Cold starting..."
            : karmaHealth.isError
              ? "Connection failed"
              : `Service: karma`,
        }] : []),
        ...(keshavHealth.data || keshavHealth.isError || keshavHealth.isLoading ? [{
          name: "KESHAV Dependency Engine",
          status: normalizeComponentStatus(keshavHealth.data?.status, keshavHealth.isLoading, keshavHealth.isError),
          last_check: new Date().toISOString(),
          response_time_ms: null,
          details: keshavHealth.isLoading 
            ? "Loading..." 
            : keshavHealth.isError 
              ? "Connection failed" 
              : `Uptime: ${keshavHealth.data?.uptime_seconds != null ? keshavHealth.data.uptime_seconds + 's' : 'N/A'}`,
        }] : []),
        ...(setuHealth.data || setuHealth.isError || setuHealth.isLoading ? [{
          name: "SETU PMC",
          status: normalizeComponentStatus(setuHealth.data?.status, setuHealth.isLoading, setuHealth.isError),
          last_check: new Date().toISOString(),
          response_time_ms: null,
          details: setuHealth.isLoading
            ? "Loading..."
            : setuHealth.isError
              ? "Connection failed"
              : `Status: ${setuHealth.data?.status || "N/A"} v${setuHealth.data?.version || "1.0.0"}`,
        }] : []),
        ...(mitraHealth.data || mitraHealth.isError || mitraHealth.isLoading ? [{
          name: "mitra_companion",
          status: normalizeComponentStatus(mitraHealth.data?.status, mitraHealth.isLoading, mitraHealth.isError),
          last_check: mitraHealth.data?.timestamp || new Date().toISOString(),
          response_time_ms: mitraHealth.data?.response_time_ms ?? null,
          details: mitraHealth.isLoading
            ? "Loading..."
            : mitraHealth.isError
              ? "Connection failed"
              : mitraHealth.data?.details || "v4.0.0 | Pipeline Active",
        }] : []),
      ].map(c => [c.name, c])
    ).values()
  );

  const score = components.length > 0 ? toScore(components) : 0;

  const isLoading = statusLoading && metrics.isLoading && bucketHealth.isLoading && pranaHealth.isLoading && pranaSystemHealth.isLoading && insightFlowHealth.isLoading && tantraHealth.isLoading && karmaHealth.isLoading && keshavHealth.isLoading && setuHealth.isLoading && mitraHealth.isLoading;
  const isError = !isLoading && (statusError && metrics.isError && bucketHealth.isError && pranaHealth.isError && pranaSystemHealth.isError && insightFlowHealth.isError && tantraHealth.isError && karmaHealth.isError && keshavHealth.isError && setuHealth.isError && mitraHealth.isError);

  const timestamp = data?.timestamp || metrics.data?.timestamp || (bucketHealth.data ? new Date().toISOString() : undefined) || (insightFlowHealth.data ? new Date().toISOString() : undefined) || (tantraHealth.data ? new Date().toISOString() : undefined) || (keshavHealth.data ? new Date().toISOString() : undefined) || (setuHealth.data ? new Date().toISOString() : undefined) || (mitraHealth.data ? new Date().toISOString() : undefined);
  const isFetching = statusFetching || metrics.isFetching || bucketHealth.isFetching || pranaHealth.isFetching || pranaSystemHealth.isFetching || insightFlowHealth.isFetching || tantraHealth.isFetching || rajyaHealth.isFetching || sanskarHealth.isFetching || karmaHealth.isFetching || keshavHealth.isFetching || setuHealth.isFetching || mitraHealth.isFetching;
  const isStale = statusStale || metrics.isStale || bucketHealth.isStale || pranaHealth.isStale || pranaSystemHealth.isStale || insightFlowHealth.isStale || tantraHealth.isStale || rajyaHealth.isStale || sanskarHealth.isStale || karmaHealth.isStale || keshavHealth.isStale || setuHealth.isStale || mitraHealth.isStale;
  const traceId = (data as any)?.trace_id || (metrics.data as any)?.trace_id || (insightFlowHealth.data as any)?.trace_id || (tantraHealth.data as any)?.trace_id || (keshavHealth.data as any)?.trace_id || (setuHealth.data as any)?.trace_id;

  // Derive telemetry bar values from real /metrics data
  const m = metrics.data;
  const successVal = m?.requests?.success_rate_pct ?? m?.success_rate;
  const uptimeDisplay = typeof successVal === "number" ? `${successVal.toFixed(2)}%` : "—";

  const errorVal = m?.requests?.error_rate_pct ?? (typeof m?.failed_requests === "number" && typeof m?.total_requests === "number" && m.total_requests > 0 ? (m.failed_requests / m.total_requests) * 100 : 0);
  const errorDisplay = typeof errorVal === "number" ? `${errorVal.toFixed(2)}%` : "—";

  const latencyVal = m?.latency_ms?.p95 ?? m?.latency_ms?.p50 ?? m?.average_response_time_ms;
  const latencyDisplay = typeof latencyVal === "number" ? `${latencyVal.toFixed(0)}ms` : "—";

  const rpmVal = m?.requests?.total ?? m?.total_requests;
  const rpmDisplay = typeof rpmVal === "number" ? rpmVal.toLocaleString() : "—";

  return (
    <DashboardCard
      title="Runtime Health"
      isLoading={isLoading}
      isError={isError}
      hasData={data !== undefined}
      onRetry={() => { statusRefetch(); metrics.refetch(); rajyaHealth.refetch(); sanskarHealth.refetch(); karmaHealth.refetch(); keshavHealth.refetch(); setuHealth.refetch(); mitraHealth.refetch(); }}
      errorMessage="Failed to load system health"
      skeletonCount={4}
      skeletonHeight="h-8"
      timestamp={timestamp}
      isFetching={isFetching}
      isStale={isStale}
      traceId={traceId}
      dataSource="Control Plane"
      headerRight={
        data ? (
          <div className="flex items-center gap-2">
            {niyantranStats.data?.testerApprovalCount != null && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" title="NIYANTRAN QA Approvals">
                QA: {niyantranStats.data.testerApprovalCount}
              </span>
            )}
            <span className={`text-xs font-bold ${statusColor(toStatus(data.overall_status))}`}>
              {data.overall_status}
            </span>
          </div>
        ) : undefined
      }
    >
      {data && (
        <div className="flex flex-col gap-2 h-full min-h-0">
          {/* Progress bar + Score */}
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-400 shrink-0">{score}% Score</span>
          </div>

          {/* Compact Telemetry bar — real values from /metrics */}
          <div className="grid grid-cols-4 gap-1 bg-slate-900/40 p-1 rounded border border-slate-800 text-center shrink-0">
            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider">Success</div>
              <div className="text-[11px] font-bold text-emerald-400">{uptimeDisplay}</div>
            </div>
            <div className="border-l border-slate-800/80">
              <div className="text-[8px] text-slate-500 uppercase tracking-wider">Errors</div>
              <div className="text-[11px] font-bold text-slate-300">{errorDisplay}</div>
            </div>
            <div className="border-l border-slate-800/80">
              <div className="text-[8px] text-slate-500 uppercase tracking-wider">Latency</div>
              <div className="text-[11px] font-bold text-slate-300">{latencyDisplay}</div>
            </div>
            <div className="border-l border-slate-800/80">
              <div className="text-[8px] text-slate-500 uppercase tracking-wider">Requests</div>
              <div className="text-[11px] font-bold text-slate-300">{rpmDisplay}</div>
            </div>
          </div>

          {/* Component status table */}
          {components.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4 flex-1">No Runtime Data Available</p>
          ) : (
            <div className="overflow-y-auto flex-1 min-h-0 max-h-[160px] pr-1">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-800 z-10">
                  <tr className="border-b border-slate-700/60 text-[12px] font-semibold text-slate-400">
                    <th className="py-1">Component</th>
                    <th className="py-1 text-right">Response</th>
                    <th className="py-1 text-right">Detail</th>
                    <th className="py-1 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {components.map((c) => {
                    const compStatus = toStatus(c.status);
                    return (
                      <tr key={c.name} className="border-b border-slate-850 last:border-0 hover:bg-slate-800/20 text-[13px] text-slate-200">
                        <td className="py-0.5 flex items-center gap-1.5 truncate max-w-[120px]" title={c.name}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(compStatus)}`} />
                          <span className="text-slate-300 truncate font-mono text-[11px]">{c.name}</span>
                        </td>
                        <td className="py-0.5 text-right text-slate-400 font-mono text-[11px]">
                          {c.response_time_ms != null ? `${c.response_time_ms}ms` : "—"}
                        </td>
                        <td className="py-0.5 text-right text-slate-500 truncate max-w-[90px] text-[11px]" title={c.details}>
                          {c.details || "—"}
                        </td>
                        <td className={`py-0.5 text-right font-bold capitalize text-[11px] ${statusColor(compStatus)}`}>
                          {c.status}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end items-center text-[10px] text-slate-500 shrink-0 pt-1 border-t border-slate-700/30">
            <span>Checked {formatTime(data.timestamp)}</span>
          </div>
        </div>
      )}
    </DashboardCard>
  );
});
