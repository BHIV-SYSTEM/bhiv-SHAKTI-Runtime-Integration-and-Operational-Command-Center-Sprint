import { memo, useState, useMemo } from "react";
import {
  Activity,
  Clock,
  Zap,
  Database,
  Layers,
  FileText,
  ShieldCheck,
  Search,
  Eye,
  Server,
  Shield,
  FileCheck,
} from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { EvidenceCard } from "@/components/dashboard/primitives/EvidenceCard";
import { TraceFlowStepper, type FlowStep } from "@/components/dashboard/primitives/TraceFlowStepper";
import { SetuObservationView } from "@/components/dashboard/primitives/SetuObservationView";
import { NiyantranHistoryView } from "@/components/dashboard/primitives/NiyantranHistoryView";
import { PravahEvidenceView } from "@/components/dashboard/primitives/PravahEvidenceView";

import { useTelemetryDashboard } from "@/hooks/useQueries";
import { useBucketArtifacts, useAuditRecent } from "@/hooks/useBucketQueries";
import { usePranaPropagationLog } from "@/hooks/usePranaQueries";
import { useSanskarTrace } from "@/hooks/useSanskarQueries";
import { useKarmaLatestHash } from "@/hooks/useKarmaQueries";
import { useSetuDashboard } from "@/hooks/useSetuQueries";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { usePravahTraceRegistry } from "@/hooks/usePravahQueries";
import { useSovereignTraces } from "@/hooks/useRajyaQueries";

import { formatTime, formatRelativeTime } from "@/utils/format";

export default memo(function EvidenceLayout() {
  const telemetry = useTelemetryDashboard();
  const bucket = useBucketArtifacts();
  const audit = useAuditRecent(20);
  const pranaLog = usePranaPropagationLog(20);
  const karmaLatestHash = useKarmaLatestHash();

  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [selectedArtifactTab, setSelectedArtifactTab] = useState<string>("trace_flow");
  const [flowStep, setFlowStep] = useState<FlowStep>("setu");
  const [customTraceInput, setCustomTraceInput] = useState<string>("");
  const [customTraceId, setCustomTraceId] = useState<string>("");

  const bucketArtifacts = bucket.data?.artifacts ?? [];
  const auditOperations = audit.data?.operations ?? [];
  const pranaLogs = pranaLog.data?.logs ?? [];
  const telemetryItems = telemetry.data?.recent_telemetry ?? [];

  // Active artifact selection
  const activeArtifact = useMemo(() => {
    if (selectedArtifactId) {
      const bArt = bucketArtifacts.find(a => a.artifact_id === selectedArtifactId || a.trace_id === selectedArtifactId);
      if (bArt) return { type: "bucket" as const, bucket: bArt, trace_id: bArt.trace_id };
      const pLog = pranaLogs.find(l => l.trace_id === selectedArtifactId);
      if (pLog) return { type: "prana" as const, prana: pLog, trace_id: pLog.trace_id };
      const aOp = auditOperations.find(o => o._id === selectedArtifactId || o.artifact_id === selectedArtifactId);
      if (aOp) return { type: "audit" as const, audit: aOp, trace_id: aOp.data_after?.artifact?.trace_id || aOp._id };
      const tArt = telemetryItems.find(t => t.trace_id === selectedArtifactId);
      if (tArt) return { type: "telemetry" as const, telemetry: tArt, trace_id: tArt.trace_id };
    }
    if (bucketArtifacts.length > 0) {
      return { type: "bucket" as const, bucket: bucketArtifacts[0], trace_id: bucketArtifacts[0].trace_id };
    }
    if (pranaLogs.length > 0) {
      return { type: "prana" as const, prana: pranaLogs[0], trace_id: pranaLogs[0].trace_id };
    }
    if (auditOperations.length > 0) {
      const aOp = auditOperations[0];
      return { type: "audit" as const, audit: aOp, trace_id: aOp.data_after?.artifact?.trace_id || aOp._id };
    }
    if (telemetryItems.length > 0) {
      return { type: "telemetry" as const, telemetry: telemetryItems[0], trace_id: telemetryItems[0].trace_id };
    }
    return null;
  }, [bucketArtifacts, pranaLogs, auditOperations, telemetryItems, selectedArtifactId]);

  // Effective Trace ID: custom filter takes precedence, otherwise active artifact trace
  const effectiveTraceId = useMemo(() => {
    if (customTraceId.trim().length > 0) return customTraceId.trim();
    return activeArtifact?.trace_id || "";
  }, [customTraceId, activeArtifact?.trace_id]);

  // Authoritative tenant provider query (GET /api/auth/me)
  const currentTenant = useCurrentTenant();
  const authoritativeTenantId = currentTenant.tenantId || "";

  // Read-only ecosystem queries for trace correlation
  const setuDashboard = useSetuDashboard(
    effectiveTraceId || undefined,
    authoritativeTenantId || undefined
  );
  const pravahRegistry = usePravahTraceRegistry(effectiveTraceId || undefined);
  const sovereignTraces = useSovereignTraces();

  // Authoritative Sovereign Core trace matching current trace or first active
  const activeSovereignTrace = useMemo(() => {
    if (!sovereignTraces.data || sovereignTraces.data.length === 0) return null;
    if (effectiveTraceId) {
      const match = sovereignTraces.data.find(
        (t) => t.trace_hash === effectiveTraceId
      );
      if (match) return match;
    }
    return sovereignTraces.data[0];
  }, [sovereignTraces.data, effectiveTraceId]);

  // Authoritative execution ID (never invented) - Sovereign Core trace takes precedence
  const effectiveExecutionId = useMemo(() => {
    return (
      activeSovereignTrace?.execution_id ||
      setuDashboard.data?.execution_id ||
      pravahRegistry.data?.execution_records?.[0]?.execution_id ||
      pravahRegistry.data?.evidence_bundles?.[0]?.execution_id ||
      ""
    );
  }, [activeSovereignTrace?.execution_id, setuDashboard.data?.execution_id, pravahRegistry.data]);

  // Authoritative tenant ID: sourced from authoritative tenant provider (BHIV Core / /api/auth/me)
  // or non-authenticated SETU dashboard observation. Never substitutes SETU dashboard data when
  // authoritative resolution returns `missing_tenant` or authenticated lacks a tenant claim.
  const effectiveTenantId = useMemo(() => {
    if (authoritativeTenantId) {
      return authoritativeTenantId;
    }
    if (currentTenant.status === "missing_tenant" || currentTenant.isAuthenticated) {
      return "";
    }
    return setuDashboard.data?.tenant_id || "";
  }, [
    authoritativeTenantId,
    currentTenant.isAuthenticated,
    currentTenant.status,
    setuDashboard.data?.tenant_id,
  ]);

  const hasEvidenceRef = useMemo(() => {
    return Boolean(
      pravahRegistry.data?.evidence_bundles && pravahRegistry.data.evidence_bundles.length > 0
    );
  }, [pravahRegistry.data?.evidence_bundles]);

  const sanskarTrace = useSanskarTrace(effectiveTraceId || undefined);

  const isLoading = bucket.isLoading && audit.isLoading && telemetry.isLoading && pranaLog.isLoading && karmaLatestHash.isLoading;
  const isError = !isLoading && bucket.isError && audit.isError && telemetry.isError && pranaLog.isError && karmaLatestHash.isError;
  const hasData = bucketArtifacts.length > 0 || pranaLogs.length > 0 || auditOperations.length > 0 || telemetryItems.length > 0 || Boolean(effectiveTraceId);

  const timestamp = pranaLogs.length > 0 ? pranaLogs[0].logged_at : audit.data ? new Date().toISOString() : bucket.data ? new Date().toISOString() : telemetry.data?.timestamp;

  const artifactTabs = [
    { id: "trace_flow", label: "Ecosystem Flow", icon: FileCheck },
    { id: "setu", label: "SETU", icon: Eye },
    { id: "niyantran", label: "Niyantran", icon: Server },
    { id: "pravah", label: "Pravah", icon: Shield },
    { id: "instruction", label: "A1 Instruction", icon: FileText },
    { id: "blueprint", label: "A2 Blueprint", icon: Database },
    { id: "execution", label: "A3 Execution", icon: Layers },
  ];

  return (
    <DashboardCard
      title="Evidence & Intelligence"
      isLoading={isLoading}
      isError={isError}
      hasData={hasData}
      onRetry={() => {
        currentTenant.refetch();
        bucket.refetch();
        audit.refetch();
        telemetry.refetch();
        karmaLatestHash.refetch();
        sovereignTraces.refetch();
        if (effectiveTraceId) {
          sanskarTrace.refetch();
          setuDashboard.refetch();
          pravahRegistry.refetch();
        }
      }}
      errorMessage="Failed to load evidence"
      skeletonCount={4}
      skeletonHeight="h-10"
      isEmpty={!isLoading && !hasData}
      emptyMessage="No Runtime Data Available"
      timestamp={timestamp}
      isFetching={bucket.isFetching || audit.isFetching || telemetry.isFetching || sanskarTrace.isFetching || karmaLatestHash.isFetching || setuDashboard.isFetching || pravahRegistry.isFetching}
      isStale={bucket.isStale || audit.isStale || telemetry.isStale || sanskarTrace.isStale || karmaLatestHash.isStale}
      traceId={effectiveTraceId || undefined}
      dataSource="SETU, Niyantran, Pravah & Bucket"
      headerRight={timestamp ? <span className="text-xs text-slate-500">{formatTime(timestamp)}</span> : undefined}
    >
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full min-h-0 flex-1">
          {/* Column 1: Bucket Evidence (Artifacts / Audit list) + Trace Search */}
          <div className="lg:col-span-5 flex flex-col min-h-0 border-r border-slate-700/30 pr-2">
            {/* Trace Search Input */}
            <div className="mb-2 space-y-1">
              <div className="flex items-center gap-1.5 p-1 bg-slate-900/60 rounded border border-slate-800">
                <Search size={12} className="text-slate-500 shrink-0 ml-1" />
                <input
                  type="text"
                  value={customTraceInput}
                  onChange={(e) => setCustomTraceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setCustomTraceId(customTraceInput.trim());
                    }
                  }}
                  placeholder="Inspect Trace ID..."
                  className="bg-transparent border-none text-[11px] font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none flex-1 min-w-0"
                />
                {customTraceId && (
                  <button
                    onClick={() => {
                      setCustomTraceId("");
                      setCustomTraceInput("");
                    }}
                    className="text-[9px] font-mono text-slate-500 hover:text-slate-300 px-1"
                    title="Clear filter"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setCustomTraceId(customTraceInput.trim())}
                  className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[9px] font-semibold transition-colors"
                >
                  Inspect
                </button>
              </div>

              {customTraceId && (
                <div className="flex items-center justify-between px-2 py-0.5 bg-indigo-950/30 border border-indigo-500/30 rounded text-[9px] font-mono">
                  <span className="text-indigo-300 truncate">Filter: {customTraceId}</span>
                  <span className="text-slate-500">Active</span>
                </div>
              )}
            </div>

            <h3 className="text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
              <span>Recent Evidence</span>
              <span className="text-[10px] font-mono text-slate-500">
                {bucketArtifacts.length > 0 ? `${bucketArtifacts.length} artifacts` : `${auditOperations.length} audit records`}
              </span>
            </h3>

            <div className="space-y-1 overflow-y-auto flex-1 max-h-[300px] pr-1">
              {bucketArtifacts.length > 0 ? (
                bucketArtifacts.map((art) => {
                  const isSelected = activeArtifact?.type === "bucket" && activeArtifact.bucket.artifact_id === art.artifact_id && !customTraceId;
                  return (
                    <div
                      key={art.artifact_id}
                      onClick={() => {
                        setSelectedArtifactId(art.artifact_id);
                        setCustomTraceId("");
                        setCustomTraceInput("");
                      }}
                      className={`cursor-pointer rounded p-1 transition-colors ${isSelected ? 'bg-slate-700/40 border border-slate-600/50' : 'hover:bg-slate-800/30 border border-transparent'}`}
                    >
                      <EvidenceCard
                        source={art.source_module_id || "Bucket Module"}
                        description={`Type: ${art.artifact_type} | Schema: ${art.schema_version}`}
                        confidence={99.9}
                        icon={Database}
                        iconColor="text-cyan-400"
                        secondaryText={`ID: ${(art.artifact_id || "").slice(0, 8)}... | Trace: ${(art.trace_id || "").slice(0, 8)}...`}
                        noBorder
                      />
                    </div>
                  );
                })
              ) : pranaLogs.length > 0 ? (
                pranaLogs.map((log) => {
                  const isSelected = activeArtifact?.type === "prana" && activeArtifact.prana.trace_id === log.trace_id && !customTraceId;
                  return (
                    <div
                      key={log.trace_id}
                      onClick={() => {
                        setSelectedArtifactId(log.trace_id);
                        setCustomTraceId("");
                        setCustomTraceInput("");
                      }}
                      className={`cursor-pointer rounded p-1 transition-colors ${isSelected ? 'bg-slate-700/40 border border-slate-600/50' : 'hover:bg-slate-800/30 border border-transparent'}`}
                    >
                      <EvidenceCard
                        source={log.destination || "PRANA Forwarder"}
                        description={`Propagation: ${log.status} | Code: ${log.http_status ?? 'N/A'}`}
                        confidence={log.status === "success" ? 99.8 : 50.0}
                        icon={Zap}
                        iconColor={log.status === "success" ? "text-cyan-400" : "text-amber-400"}
                        secondaryText={`Trace: ${(log.trace_id || "").slice(0, 10)}... | Attempt: ${log.attempt ?? 1}`}
                        noBorder
                      />
                    </div>
                  );
                })
              ) : auditOperations.length > 0 ? (
                auditOperations.map((op) => {
                  const isSelected = activeArtifact?.type === "audit" && activeArtifact.audit._id === op._id && !customTraceId;
                  const artInfo = op.data_after?.artifact;
                  const itemTitle = artInfo ? `Artifact ${artInfo.artifact_type}` : `Audit Op: ${op.operation_type}`;
                  const artId = op.artifact_id || artInfo?.artifact_id || op._id;

                  return (
                    <div
                      key={op._id}
                      onClick={() => {
                        setSelectedArtifactId(op._id);
                        setCustomTraceId("");
                        setCustomTraceInput("");
                      }}
                      className={`cursor-pointer rounded p-1 transition-colors ${isSelected ? 'bg-slate-700/40 border border-slate-600/50' : 'hover:bg-slate-800/30 border border-transparent'}`}
                    >
                      <EvidenceCard
                        source={op.requester_id || op.integration_id || "bucket_audit"}
                        description={`${itemTitle} (${op.status})`}
                        confidence={op.status === "success" ? 99.5 : 45.0}
                        icon={ShieldCheck}
                        iconColor={op.status === "success" ? "text-emerald-400" : "text-amber-400"}
                        secondaryText={`ID: ${(artId || "").slice(0, 8)}... | ${formatRelativeTime(op.timestamp)}`}
                        noBorder
                      />
                    </div>
                  );
                })
              ) : (
                telemetryItems.map((item) => {
                  const isSelected = activeArtifact?.type === "telemetry" && activeArtifact.telemetry.trace_id === item.trace_id && !customTraceId;
                  const classification = item.signal?.classification || "nominal";
                  const confidence = classification === "critical" ? 95.8 : classification === "warning" ? 78.4 : 99.2;
                  const iconColor = classification === "critical" ? "text-red-400" : classification === "warning" ? "text-yellow-400" : "text-emerald-400";
                  const icon = classification === "critical" ? Zap : classification === "warning" ? Clock : Activity;

                  return (
                    <div
                      key={item.trace_id}
                      onClick={() => {
                        setSelectedArtifactId(item.trace_id);
                        setCustomTraceId("");
                        setCustomTraceInput("");
                      }}
                      className={`cursor-pointer rounded p-1 transition-colors ${isSelected ? 'bg-slate-700/40 border border-slate-600/50' : 'hover:bg-slate-800/30 border border-transparent'}`}
                    >
                      <EvidenceCard
                        source={item.telemetry?.source_id || "System Source"}
                        description={item.signal?.prompt || item.telemetry?.metric || "Telemetry data point"}
                        confidence={confidence}
                        icon={icon}
                        iconColor={iconColor}
                        secondaryText={`Trace: ${(item.trace_id || "").slice(0, 10)}...`}
                        noBorder
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: Ecosystem Trace Flow & Artifact Viewer */}
          <div className="lg:col-span-7 flex flex-col min-h-0">
            <div className="flex flex-col h-full min-h-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-slate-400">Trace Observation & Artifact Details</h3>
                <div className="flex items-center gap-1.5">
                  {effectiveTenantId ? (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700" title="Authoritative Tenant Context">
                      Tenant: {effectiveTenantId}
                    </span>
                  ) : currentTenant.isLoading ? (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-500 border border-slate-800">
                      Resolving Tenant...
                    </span>
                  ) : null}
                  {effectiveTraceId && (
                    <span className="text-[10px] font-mono text-slate-500 truncate max-w-[180px]" title={effectiveTraceId}>
                      Trace: {effectiveTraceId}
                    </span>
                  )}
                </div>
              </div>

              {/* Chain Steps horizontal navigation */}
              <div className="flex items-center gap-1 p-1 bg-slate-900/40 rounded border border-slate-800/80 mb-2 overflow-x-auto">
                {artifactTabs.map((step) => {
                  const StepIcon = step.icon;
                  const isStepSelected = selectedArtifactTab === step.id;
                  return (
                    <button
                      key={step.id}
                      onClick={() => setSelectedArtifactTab(step.id)}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded text-[10px] font-semibold transition-colors shrink-0 ${
                        isStepSelected
                          ? 'bg-indigo-600 text-white'
                          : 'hover:bg-slate-850 text-slate-400'
                      }`}
                    >
                      <StepIcon size={10} />
                      <span>{step.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Artifact Details & Ecosystem Flow Viewer */}
              <div className="flex-1 overflow-y-auto bg-slate-900/20 rounded border border-slate-800/50 p-2 text-[11px] max-h-[300px]">
                {/* 1. Ecosystem Flow Stepper View */}
                {selectedArtifactTab === "trace_flow" && (
                  <div className="space-y-2">
                    <TraceFlowStepper
                      activeStep={flowStep}
                      onSelectStep={setFlowStep}
                      hasTraceId={Boolean(effectiveTraceId)}
                      hasExecutionId={Boolean(effectiveExecutionId)}
                      hasEvidenceRef={hasEvidenceRef}
                      hasTenantId={Boolean(effectiveTenantId)}
                    />

                    {flowStep === "setu" && (
                      <SetuObservationView
                        traceId={effectiveTraceId}
                        tenantId={effectiveTenantId || undefined}
                      />
                    )}

                    {flowStep === "niyantran" && (
                      <NiyantranHistoryView
                        executionId={effectiveExecutionId || undefined}
                        tenantId={effectiveTenantId || undefined}
                        sovereignTrace={activeSovereignTrace}
                      />
                    )}

                    {(flowStep === "pravah_registry" || flowStep === "pravah_evidence") && (
                      <PravahEvidenceView traceId={effectiveTraceId || undefined} />
                    )}
                  </div>
                )}

                {/* 2. Direct SETU Observation View */}
                {selectedArtifactTab === "setu" && (
                  <SetuObservationView
                    traceId={effectiveTraceId}
                    tenantId={effectiveTenantId || undefined}
                  />
                )}

                {/* 3. Direct Niyantran History View */}
                {selectedArtifactTab === "niyantran" && (
                  <NiyantranHistoryView
                    executionId={effectiveExecutionId || undefined}
                    tenantId={effectiveTenantId || undefined}
                    sovereignTrace={activeSovereignTrace}
                  />
                )}

                {/* 4. Direct Pravah Evidence View */}
                {selectedArtifactTab === "pravah" && (
                  <PravahEvidenceView traceId={effectiveTraceId || undefined} />
                )}

                {/* 5. A1 Instruction (Original) */}
                {selectedArtifactTab === "instruction" && (
                  activeArtifact ? (
                    activeArtifact.type === "bucket" ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between"><span className="text-slate-500">Artifact ID:</span> <span className="text-cyan-400 font-mono font-bold truncate max-w-[140px]">{activeArtifact.bucket.artifact_id}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Artifact Type:</span> <span className="text-slate-200 font-mono font-semibold">{activeArtifact.bucket.artifact_type}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Source Module:</span> <span className="text-slate-300 font-mono">{activeArtifact.bucket.source_module_id}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Timestamp:</span> <span className="text-slate-400 font-mono">{formatRelativeTime(activeArtifact.bucket.timestamp_utc)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Trace ID:</span> <span className="text-slate-350 font-mono truncate max-w-[140px]">{activeArtifact.bucket.trace_id}</span></div>
                      </div>
                    ) : activeArtifact.type === "prana" ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between"><span className="text-slate-500">PRANA Log Trace:</span> <span className="text-cyan-400 font-mono font-bold truncate max-w-[140px]">{activeArtifact.prana.trace_id}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Destination:</span> <span className="text-slate-200 font-mono font-semibold">{activeArtifact.prana.destination}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Status:</span> <span className="text-emerald-400 font-mono uppercase font-bold">{activeArtifact.prana.status}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">HTTP Code:</span> <span className="text-slate-300 font-mono">{activeArtifact.prana.http_status ?? 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Attempt:</span> <span className="text-slate-400 font-mono">{activeArtifact.prana.attempt ?? 1}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Time:</span> <span className="text-slate-400 font-mono">{formatRelativeTime(activeArtifact.prana.logged_at)}</span></div>
                      </div>
                    ) : activeArtifact.type === "audit" ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between"><span className="text-slate-500">Audit Record ID:</span> <span className="text-cyan-400 font-mono font-bold truncate max-w-[140px]">{activeArtifact.audit._id}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Operation:</span> <span className="text-slate-200 font-mono font-semibold">{activeArtifact.audit.operation_type}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Requester:</span> <span className="text-slate-300 font-mono">{activeArtifact.audit.requester_id || activeArtifact.audit.integration_id || "bucket_storage"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Status:</span> <span className="text-emerald-400 font-mono uppercase font-bold">{activeArtifact.audit.status}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Time:</span> <span className="text-slate-400 font-mono">{formatRelativeTime(activeArtifact.audit.timestamp)}</span></div>
                      </div>
                    ) : activeArtifact.telemetry?.telemetry ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between"><span className="text-slate-500">Source:</span> <span className="text-slate-300 font-mono">{activeArtifact.telemetry.telemetry.source_id}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Metric:</span> <span className="text-slate-300 font-mono">{activeArtifact.telemetry.telemetry.metric}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Value:</span> <span className="text-emerald-400 font-bold font-mono">{activeArtifact.telemetry.telemetry.value} {activeArtifact.telemetry.telemetry.unit}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Status:</span> <span className="text-slate-300 font-mono capitalize">{activeArtifact.telemetry.telemetry.status}</span></div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-4">No instruction details available.</p>
                    )
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-4">No artifact selected.</p>
                  )
                )}

                {/* 6. A2 Blueprint (Original) */}
                {selectedArtifactTab === "blueprint" && (
                  activeArtifact ? (
                    activeArtifact.type === "bucket" ? (
                      <div className="space-y-1.5">
                        {activeArtifact.bucket.parent_hash && (
                          <div className="flex justify-between"><span className="text-slate-500">Parent Hash:</span> <span className="text-slate-400 font-mono truncate max-w-[140px]">{activeArtifact.bucket.parent_hash}</span></div>
                        )}
                        {activeArtifact.bucket.hash && (
                          <div className="flex justify-between"><span className="text-slate-500">Hash:</span> <span className="text-emerald-400 font-mono truncate max-w-[140px]">{activeArtifact.bucket.hash}</span></div>
                        )}
                      </div>
                    ) : activeArtifact.type === "telemetry" && activeArtifact.telemetry.signal ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between"><span className="text-slate-500">Signal ID:</span> <span className="text-slate-350 font-mono">{(activeArtifact.telemetry.signal.signal_id || "").slice(0, 12)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Classification:</span> <span className="text-yellow-400 font-semibold uppercase">{activeArtifact.telemetry.signal.classification}</span></div>
                        <div className="mt-1 pt-1.5 border-t border-slate-800/80">
                          <span className="text-slate-500 block mb-1">Instruction prompt:</span>
                          <div className="bg-slate-900/60 p-1.5 rounded text-slate-300 leading-normal font-sans border border-slate-850">
                            {activeArtifact.telemetry.signal.prompt}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-4">No blueprint details available.</p>
                    )
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-4">No artifact selected.</p>
                  )
                )}

                {/* 7. A3 Execution (Original) */}
                {selectedArtifactTab === "execution" && (
                  activeArtifact ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between"><span className="text-slate-500">Status:</span> <span className="text-emerald-400 font-bold uppercase">COMPLETED</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Storage:</span> <span className="text-cyan-400 font-mono font-semibold">Bucket Append-Only Log</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Trace ID:</span> <span className="text-slate-300 font-mono truncate max-w-[140px]" title={activeArtifact.trace_id}>{activeArtifact.trace_id}</span></div>
                      {sanskarTrace.data && (
                        <div className="mt-2 pt-2 border-t border-slate-800 space-y-1.5 bg-slate-900/20 p-1.5 rounded text-[10px]">
                          <h5 className="font-semibold text-slate-300 uppercase tracking-wider text-[8px] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            SANSKAR Intelligence Enrichment
                          </h5>
                          {sanskarTrace.data.pipeline_status && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Pipeline:</span> 
                              <span className={`font-bold font-mono text-[9px] ${sanskarTrace.data.pipeline_status === "SUCCESS" ? "text-emerald-400" : "text-red-400"}`}>
                                {sanskarTrace.data.pipeline_status}
                              </span>
                            </div>
                          )}
                          {sanskarTrace.data.core_decision?.selected_entity && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Target Region:</span> 
                              <span className="text-cyan-300 font-mono font-semibold">
                                {sanskarTrace.data.core_decision.selected_entity} (Score: {sanskarTrace.data.core_decision.selected_score})
                              </span>
                            </div>
                          )}
                          {sanskarTrace.data.truth?.pipeline_hash && (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-slate-500">Chain Hash:</span> 
                              <span className="text-[9px] font-mono text-slate-400 break-all select-all leading-normal bg-slate-950 p-1 rounded border border-slate-900">
                                {sanskarTrace.data.truth.pipeline_hash}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-4">No artifact selected.</p>
                  )
                )}
              </div>

              {/* KARMA Deterministic Hash Enrichment */}
              {karmaLatestHash.data && (
                <div className="mt-2 p-2 bg-slate-900/40 border border-slate-800 rounded text-[11px] space-y-1">
                  <h5 className="font-semibold text-indigo-400 uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    KARMA Ledger Verification
                  </h5>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hash Type:</span>
                    <span className="text-slate-300 font-mono">{karmaLatestHash.data.hash_type || "SHA-256"}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-500">Latest Hash:</span>
                    <span className="text-[9px] font-mono text-emerald-400 break-all select-all leading-normal bg-slate-950 p-1 rounded border border-slate-900">
                      {karmaLatestHash.data.latest_hash}
                    </span>
                  </div>
                  {karmaLatestHash.data.timestamp && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Timestamp:</span>
                      <span className="text-slate-400 font-mono">{formatTime(karmaLatestHash.data.timestamp)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardCard>
  );
});
