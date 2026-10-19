import { memo, useMemo, useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { TelemetryCard } from "@/components/dashboard/primitives/TelemetryCard";

import { useTelemetryDashboard } from "@/hooks/useQueries";
import { useMetricsScaleStatus, useMetricsQueryPerformance } from "@/hooks/useBucketQueries";
import { usePranaPropagationLog } from "@/hooks/usePranaQueries";

import { useInsightFlowStageMetrics } from "@/hooks/useInsightFlowQueries";
import { useTantraTelemetry } from "@/hooks/useTantraQueries";
import {
  useKarmaLiveMetrics,
  useKarmaTrends,
  useKarmaDharmaSevaFlow,
  useKarmaPaapPunyaRatio,
} from "@/hooks/useKarmaQueries";
import { useKeshavMetrics } from "@/hooks/useKeshavQueries";
import { formatTime } from "@/utils/format";

export default memo(function ObservabilityLayout() {
  const [activeTab, setActiveTab] = useState<"system" | "karma">("system");

  const telemetry = useTelemetryDashboard();
  const scaleStatus = useMetricsScaleStatus();
  const queryPerf = useMetricsQueryPerformance();
  const pranaLog = usePranaPropagationLog();

  const stageMetrics = useInsightFlowStageMetrics();
  const tantraTelemetry = useTantraTelemetry();

  const karmaLiveMetrics = useKarmaLiveMetrics();
  const karmaTrends = useKarmaTrends();
  const karmaDharmaSevaFlow = useKarmaDharmaSevaFlow();
  const karmaPaapPunyaRatio = useKarmaPaapPunyaRatio();
  const keshavMetrics = useKeshavMetrics();

  const data = telemetry.data;
  const pranaLogs = pranaLog.data?.logs ?? [];

  // Map telemetry data points, PRANA propagation logs, or scale status to chart series
  const chartData = useMemo(() => {
    if (activeTab === "karma") {
      const trendsList = karmaTrends.data?.trends ?? [];
      if (trendsList.length > 0) {
        return trendsList.map((t) => ({
          time: formatTime(t.timestamp),
          response: t.punya_count != null ? t.punya_count : (t.value ?? 0),
          rate: t.paap_count != null ? t.paap_count : 0,
        }));
      }
      return [];
    }

    if (pranaLogs.length > 0) {
      return pranaLogs.map((log) => ({
        time: formatTime(log.logged_at),
        response: log.http_status != null ? log.http_status : (log.status === "success" ? 200 : 500),
        rate: log.attempt != null ? log.attempt : 1,
      }));
    }
    if (data?.metrics?.response_times && data.metrics.response_times.length > 0) {
      return data.metrics.response_times.map((rt, i) => ({
        time: rt ? formatTime(rt.timestamp) : "",
        response: rt && rt.value != null ? +rt.value.toFixed(1) : 0,
        rate: data.metrics?.event_rates?.[i]?.value != null ? +(data.metrics.event_rates[i].value).toFixed(1) : 0,
      }));
    }
    if (Array.isArray((data as any)?.per_trace_telemetry) && (data as any).per_trace_telemetry.length > 0) {
      return (data as any).per_trace_telemetry.map((pt: any) => ({
        time: formatTime(pt.created_at || pt.telemetry?.timestamp),
        response: pt.telemetry?.value ?? 0,
        rate: 1,
      }));
    }
    const hasMeaningfulBucketTelemetry = Boolean(
      (queryPerf.data && (
        (queryPerf.data.p50_ms ?? 0) > 0 ||
        (queryPerf.data.p99_ms ?? 0) > 0 ||
        (queryPerf.data.p999_ms ?? 0) > 0 ||
        (queryPerf.data.queries_per_sec ?? 0) > 0
      )) ||
      (scaleStatus.data && (
        (scaleStatus.data.concurrent_writes?.current ?? 0) > 0 ||
        (scaleStatus.data.write_throughput?.current_writes_per_sec ?? 0) > 0
      ))
    );

    if (hasMeaningfulBucketTelemetry) {
      const now = formatTime(new Date().toISOString());
      return [
        { time: now, response: queryPerf.data?.p50_ms ?? 0, rate: scaleStatus.data?.concurrent_writes?.current ?? 0 },
        { time: now, response: queryPerf.data?.p99_ms ?? 0, rate: scaleStatus.data?.write_throughput?.current_writes_per_sec ?? 0 },
      ];
    }
    if (stageMetrics.data && stageMetrics.data.length > 0) {
      return stageMetrics.data.map((m) => ({
        time: m.stage.toUpperCase(),
        response: m.p50_latency_ms,
        rate: m.events_per_sec,
      }));
    }
    if (tantraTelemetry.data?.metrics?.response_times && tantraTelemetry.data.metrics.response_times.length > 0) {
      return tantraTelemetry.data.metrics.response_times.map((rt, i) => ({
        time: rt ? formatTime(rt.timestamp) : "",
        response: rt && rt.value != null ? +rt.value.toFixed(1) : 0,
        rate: tantraTelemetry.data?.metrics?.event_rates?.[i]?.value != null ? +(tantraTelemetry.data.metrics.event_rates[i].value).toFixed(1) : 0,
      }));
    }
    if (Array.isArray(tantraTelemetry.data) && tantraTelemetry.data.length > 0) {
      return tantraTelemetry.data.map((item: any) => ({
        time: formatTime(item.timestamp),
        response: item.payload?.statusCode ?? (item.status === "completed" ? 200 : 500),
        rate: 1,
      }));
    }
    return [];
  }, [activeTab, pranaLogs, data, scaleStatus.data, queryPerf.data, stageMetrics.data, tantraTelemetry.data, karmaTrends.data]);

  const series = useMemo(() => {
    if (activeTab === "karma") {
      return [
        { name: "Punya Score (Good Karma)", dataKey: "response", color: "#818cf8" },
        { name: "Paap Score (Negative Karma)", dataKey: "rate", color: "#f87171" },
      ];
    }
    return [
      { name: "HTTP / Response Status", dataKey: "response", color: "#6366f1" },
      { name: "Attempts / Event Rate", dataKey: "rate", color: "#10b981" },
    ];
  }, [activeTab]);

  const summaryMetrics = useMemo(() => {
    const list = [];
    if (activeTab === "karma") {
      if (karmaLiveMetrics.data) {
        list.push({ label: "Live Karma Score", value: karmaLiveMetrics.data.live_score ?? 0 });
        list.push({ label: "Total Ledger Events", value: (karmaLiveMetrics.data.total_events ?? 0).toLocaleString() });
        if (karmaLiveMetrics.data.error_rate != null) {
          list.push({ label: "Error Rate", value: (karmaLiveMetrics.data.error_rate * 100).toFixed(2), unit: "%" });
        }
      }
      if (karmaPaapPunyaRatio.data) {
        const ratio = karmaPaapPunyaRatio.data.ratio || { punya: 0, paap: 0, neutral: 0 };
        list.push({ label: "Paap / Punya Ratio", value: `${ratio.paap}/${ratio.punya}` });
        if (karmaPaapPunyaRatio.data.punya_count != null && karmaPaapPunyaRatio.data.paap_count != null) {
          list.push({ label: "Good / Bad Actions", value: `${karmaPaapPunyaRatio.data.punya_count}/${karmaPaapPunyaRatio.data.paap_count}` });
        }
      }
      if (karmaDharmaSevaFlow.data?.flow && karmaDharmaSevaFlow.data.flow.length > 0) {
        list.push({ label: "Seva Actions Flow", value: karmaDharmaSevaFlow.data.flow.length });
      }
      return list;
    }

    if (pranaLogs.length > 0) {
      const latest = pranaLogs[0];
      list.push({ label: "Propagation Events", value: pranaLogs.length });
      list.push({ label: "Latest Target", value: latest.destination });
      list.push({ label: "Log Status", value: latest.status });
      if (latest.http_status != null) {
        list.push({ label: "HTTP Code", value: latest.http_status });
      }
    } else {
      if (queryPerf.data) {
        list.push({ label: "p50 / p99 Latency", value: `${queryPerf.data.p50_ms}ms / ${queryPerf.data.p99_ms}ms` });
        list.push({ label: "p999 Latency", value: queryPerf.data.p999_ms, unit: "ms" });
        list.push({ label: "Queries / Sec", value: queryPerf.data.queries_per_sec });
      } else if (data?.summary) {
        list.push({ label: "Avg Response", value: (data.summary.avg_response_time ?? 0).toFixed(0), unit: "ms" });
        list.push({ label: "Total Events", value: (data.summary.total_events ?? 0).toLocaleString() });
        list.push({ label: "Error Rate", value: ((data.summary.error_rate ?? 0) * 100).toFixed(2), unit: "%" });
      }
      if (scaleStatus.data) {
        if (scaleStatus.data.concurrent_writes?.current != null && scaleStatus.data.concurrent_writes?.limit != null) {
          list.push({ label: "Concurrent Writes", value: `${scaleStatus.data.concurrent_writes.current}/${scaleStatus.data.concurrent_writes.limit}` });
        }
        if (scaleStatus.data.storage?.usage_percent != null) {
          list.push({ label: "Storage Used", value: `${scaleStatus.data.storage.usage_percent.toFixed(1)}%` });
        }
      }
      if (stageMetrics.data && stageMetrics.data.length > 0) {
        const activeStages = stageMetrics.data.filter(s => s.status === "live").length;
        list.push({ label: "InsightFlow Stages", value: `${activeStages}/${stageMetrics.data.length} live` });
        const totalPipelineEvents = stageMetrics.data.reduce((acc, curr) => acc + curr.total_events, 0);
        list.push({ label: "Pipeline Events", value: totalPipelineEvents.toLocaleString() });
      }
      if (tantraTelemetry.data?.summary) {
        list.push({ label: "TANTRA Avg Response", value: `${tantraTelemetry.data.summary.avg_response_time_ms}ms` });
        list.push({ label: "TANTRA Events", value: tantraTelemetry.data.summary.total_events.toLocaleString() });
        list.push({ label: "TANTRA Error Rate", value: `${(tantraTelemetry.data.summary.error_rate * 100).toFixed(2)}%` });
      }
      if (keshavMetrics.data && !keshavMetrics.isError) {
        if (keshavMetrics.data.request_count != null) {
          list.push({ label: "KESHAV Requests", value: keshavMetrics.data.request_count.toLocaleString() });
        }
        if (keshavMetrics.data.avg_latency_seconds != null) {
          list.push({ label: "KESHAV Avg Latency", value: (keshavMetrics.data.avg_latency_seconds * 1000).toFixed(0), unit: "ms" });
        }
        if (keshavMetrics.data.request_success_rate != null) {
          list.push({ label: "KESHAV Error Rate", value: ((1 - keshavMetrics.data.request_success_rate) * 100).toFixed(2), unit: "%" });
        }
        if (keshavMetrics.data.unique_traces_processed != null) {
          list.push({ label: "KESHAV Traces", value: keshavMetrics.data.unique_traces_processed.toLocaleString() });
        }
      }
    }
    return list;
  }, [activeTab, pranaLogs, data, queryPerf.data, scaleStatus.data, stageMetrics.data, tantraTelemetry.data, karmaLiveMetrics.data, karmaTrends.data, karmaDharmaSevaFlow.data, karmaPaapPunyaRatio.data, keshavMetrics.data, keshavMetrics.isError]);

  const isLoading = telemetry.isLoading && scaleStatus.isLoading && queryPerf.isLoading && pranaLog.isLoading && stageMetrics.isLoading && tantraTelemetry.isLoading && keshavMetrics.isLoading;
  const isError = !isLoading && (telemetry.isError && scaleStatus.isError && queryPerf.isError && pranaLog.isError && stageMetrics.isError && tantraTelemetry.isError && keshavMetrics.isError && (activeTab !== "karma" || (karmaTrends.isError && karmaLiveMetrics.isError)));
  const hasData = pranaLogs.length > 0 || data !== undefined || scaleStatus.data !== undefined || queryPerf.data !== undefined || (stageMetrics.data !== undefined && stageMetrics.data.length > 0) || (tantraTelemetry.data?.metrics?.response_times && tantraTelemetry.data.metrics.response_times.length > 0) || keshavMetrics.data !== undefined || (activeTab === "karma" && (karmaTrends.data !== undefined || karmaLiveMetrics.data !== undefined));

  const timestamp = activeTab === "karma" ? (new Date().toISOString()) : (pranaLogs.length > 0 ? pranaLogs[0].logged_at : (scaleStatus.data?.timestamp || data?.timestamp || (stageMetrics.data ? new Date().toISOString() : undefined) || (tantraTelemetry.data ? new Date().toISOString() : undefined) || (keshavMetrics.data ? new Date().toISOString() : undefined) || new Date().toISOString()));

  return (
    <DashboardCard
      title="Observability & Telemetry"
      ariaLabel="Observability Layout"
      isLoading={isLoading}
      isError={isError}
      hasData={hasData}
      onRetry={() => { telemetry.refetch(); scaleStatus.refetch(); queryPerf.refetch(); pranaLog.refetch(); tantraTelemetry.refetch(); karmaLiveMetrics.refetch(); karmaTrends.refetch(); karmaDharmaSevaFlow.refetch(); karmaPaapPunyaRatio.refetch(); keshavMetrics.refetch(); }}
      errorMessage="Failed to load telemetry"
      skeletonCount={1}
      skeletonHeight="h-48"
      isEmpty={!isLoading && !hasData}
      emptyMessage="No Runtime Data Available"
      timestamp={timestamp}
      isFetching={telemetry.isFetching || scaleStatus.isFetching || queryPerf.isFetching || pranaLog.isFetching || stageMetrics.isFetching || tantraTelemetry.isFetching || karmaLiveMetrics.isFetching || karmaTrends.isFetching || karmaDharmaSevaFlow.isFetching || karmaPaapPunyaRatio.isFetching || keshavMetrics.isFetching}
      isStale={telemetry.isStale || scaleStatus.isStale || queryPerf.isStale || pranaLog.isStale || stageMetrics.isStale || tantraTelemetry.isStale || karmaLiveMetrics.isStale || karmaTrends.isStale || karmaDharmaSevaFlow.isStale || karmaPaapPunyaRatio.isStale || keshavMetrics.isStale}
      traceId={pranaLogs.length > 0 ? pranaLogs[0].trace_id : ((data as any)?.trace_id || (stageMetrics.data as any)?.trace_id || (tantraTelemetry.data as any)?.trace_id || (keshavMetrics.data as any)?.trace_id)}
      dataSource={activeTab === "karma" ? "KARMA Analytics Service" : "PRANA Log & Bucket Metrics"}
      headerRight={
        activeTab === "karma" ? (
          karmaLiveMetrics.data ? (
            <span className="text-xs text-slate-500">
              Live Score: <span className="text-indigo-400 font-medium">{karmaLiveMetrics.data.live_score ?? "N/A"}</span>
            </span>
          ) : undefined
        ) : (() => {
          const items: React.ReactNode[] = [];
          
          if (pranaLogs.length > 0) {
            items.push(
              <span key="prana" className="flex items-center gap-1">
                <span className="text-slate-500">PRANA:</span>
                <span className="text-emerald-400 font-semibold">{pranaLogs.length}e</span>
              </span>
            );
          }
          if (scaleStatus.data && scaleStatus.data.storage) {
            items.push(
              <span key="storage" className="flex items-center gap-1">
                <span className="text-slate-500">Storage:</span>
                <span className="text-cyan-400 font-semibold">
                  {scaleStatus.data.storage.used_gb ?? 0}G/{scaleStatus.data.storage.total_gb ?? 0}G
                </span>
              </span>
            );
          }
          if (data) {
            items.push(
              <span key="uptime" className="flex items-center gap-1">
                <span className="text-slate-500">Uptime:</span>
                <span className="text-emerald-400 font-semibold">
                  {(data.summary?.uptime_percentage ?? 100).toFixed(1)}%
                </span>
              </span>
            );
          }
          if (keshavMetrics.data && !keshavMetrics.isError) {
            items.push(
              <span key="keshav" className="flex items-center gap-1">
                <span className="text-slate-500">KESHAV:</span>
                <span className="text-indigo-400 font-semibold">
                  {keshavMetrics.data.request_success_rate != null
                    ? `${(keshavMetrics.data.request_success_rate * 100).toFixed(1)}%`
                    : "N/A"}
                </span>
              </span>
            );
          }
          
          if (items.length === 0) return undefined;
          
          return (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono">
              {items.reduce((acc, curr, index) => {
                if (index === 0) return [curr];
                return [
                  ...(acc as React.ReactNode[]),
                  <span key={`divider-${index}`} className="text-slate-700 font-sans select-none">•</span>,
                  curr
                ];
              }, [] as React.ReactNode[])}
            </div>
          );
        })()
      }
    >
      {hasData && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Tab Selector for Observability Mode */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/40 rounded border border-slate-800/80 mb-2 max-w-xs self-start text-[10px] font-semibold shrink-0">
            <button
              onClick={() => setActiveTab("system")}
              className={`px-3 py-1 rounded transition-colors ${activeTab === "system" ? "bg-indigo-600 text-white" : "hover:bg-slate-850 text-slate-400"}`}
            >
              System Telemetry
            </button>
            <button
              onClick={() => setActiveTab("karma")}
              className={`px-3 py-1 rounded transition-colors ${activeTab === "karma" ? "bg-indigo-600 text-white" : "hover:bg-slate-850 text-slate-400"}`}
            >
              KARMA Telemetry
            </button>
          </div>
          <TelemetryCard
            data={chartData}
            xAxisKey="time"
            series={series}
            summaryMetrics={summaryMetrics}
            traceId={activeTab === "karma" ? undefined : (pranaLogs.length > 0 ? pranaLogs[0].trace_id : ((data as any)?.trace_id || (tantraTelemetry.data as any)?.trace_id))}
          />
        </div>
      )}
    </DashboardCard>
  );
});
