import { memo, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { useSetuProjects } from "@/hooks/useSetuQueries";
import { useAuthQueryScope } from "@/hooks/useAuthQueryScope";
import { getProjectMilestones } from "@/api/setuEndpoints";
import { formatTime } from "@/utils/format";

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "IN_PROGRESS":
      return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    case "PENDING":
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    case "FAILED":
      return "text-red-400 bg-red-500/10 border-red-500/20";
    case "BLOCKED":
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    default:
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  }
};

export default memo(function WorkflowLayout() {
  const scopeKey = useAuthQueryScope();
  const setuProjects = useSetuProjects();
  const rawProjects = setuProjects.data;
  const projects = useMemo<any[]>(() => {
    if (Array.isArray(rawProjects)) return rawProjects;
    if (Array.isArray((rawProjects as any)?.projects)) return (rawProjects as any).projects;
    if (Array.isArray((rawProjects as any)?.data)) return (rawProjects as any).data;
    return [];
  }, [rawProjects]);

  const milestoneQueries = useQueries({
    queries: projects.map((p: any) => ({
      queryKey: ["setu", "project-milestones", p?.id, scopeKey],
      queryFn: () => (p?.id ? getProjectMilestones(p.id) : Promise.resolve([])),
      enabled: !!p?.id,
    })),
  });

  const allMilestones = useMemo(() => {
    const list: Array<{
      projectId: string;
      projectName: string;
      milestoneId: string;
      milestoneName: string;
      status: string;
      createdTime: string;
    }> = [];

    projects.forEach((proj: any, idx: number) => {
      const q = milestoneQueries[idx];
      const rawMilestones = q?.data;
      const milestones: any[] = Array.isArray(rawMilestones)
        ? rawMilestones
        : Array.isArray((rawMilestones as any)?.milestones)
          ? (rawMilestones as any).milestones
          : Array.isArray((rawMilestones as any)?.data)
            ? (rawMilestones as any).data
            : [];

      milestones.forEach((m) => {
        if (m) {
          list.push({
            projectId: proj?.id || "",
            projectName: proj?.name || "Project",
            milestoneId: m.id || m.milestone_id || "",
            milestoneName: m.name || m.title || "Milestone",
            status: m.status || "PENDING",
            createdTime: proj?.created_at || new Date().toISOString(),
          });
        }
      });
    });
    return list;
  }, [projects, milestoneQueries]);

  const active = allMilestones.filter((m) => m.status === "IN_PROGRESS" || m.status === "PENDING" || m.status === "BLOCKED").length;

  const isLoading = setuProjects.isLoading || milestoneQueries.some((q) => q.isLoading);
  const isError = !isLoading && (setuProjects.isError || milestoneQueries.some((q) => q.isError));
  const isFetching = setuProjects.isFetching || milestoneQueries.some((q) => q.isFetching);
  const isStale = setuProjects.isStale || milestoneQueries.some((q) => q.isStale);
  const refetch = () => {
    setuProjects.refetch();
    milestoneQueries.forEach((q) => q.refetch());
  };

  const hasData = setuProjects.data !== undefined;
  const timestamp = setuProjects.data ? new Date().toISOString() : undefined;

  return (
    <DashboardCard
      title="Active Workflows"
      ariaLabel="Workflow Layout"
      isLoading={isLoading}
      isError={isError}
      hasData={hasData}
      onRetry={refetch}
      errorMessage="Failed to load workflows"
      skeletonCount={3}
      skeletonHeight="h-10"
      timestamp={timestamp}
      isFetching={isFetching}
      isStale={isStale}
      dataSource="SETU PMC"
      isEmpty={hasData && allMilestones.length === 0}
      emptyMessage="No Runtime Data Available"
      headerRight={setuProjects.data ? <span className="text-xs text-slate-500">{active} active</span> : undefined}
    >
      {hasData && allMilestones.length > 0 && (
        <div className="overflow-y-auto flex-1 min-h-0 max-h-[280px] pr-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-800 z-10">
              <tr className="border-b border-slate-700/60 text-[12px] font-semibold text-slate-400">
                <th className="py-1 pb-1.5">Project ID</th>
                <th className="py-1 pb-1.5 font-mono">Project</th>
                <th className="py-1 pb-1.5">Milestone</th>
                <th className="py-1 pb-1.5">Status</th>
                <th className="py-1 pb-1.5 text-right">Created Time</th>
              </tr>
            </thead>
            <tbody>
              {allMilestones.map((m) => (
                <tr key={m.milestoneId} className="border-b border-slate-800/30 last:border-0 hover:bg-slate-800/20 text-[13px] text-slate-200 animate-fade-in">
                  <td className="py-1 font-mono text-[11px] text-slate-400">
                    #{m.projectId.slice(0, 6)}
                  </td>
                  <td className="py-1 font-semibold text-slate-200 truncate max-w-[120px]" title={m.projectName}>
                    {m.projectName}
                  </td>
                  <td className="py-1 text-slate-350 truncate max-w-[160px]" title={m.milestoneName}>
                    {m.milestoneName}
                  </td>
                  <td className="py-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getStatusBadgeClass(m.status)}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="py-1 text-right font-mono text-[11px] text-slate-400">
                    {formatTime(m.createdTime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardCard>
  );
});

