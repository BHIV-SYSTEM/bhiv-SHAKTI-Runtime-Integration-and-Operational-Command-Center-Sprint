// ─── NIYANTRAN KENDRA Default Configuration ───────────────────────────────────
// Canonical product configuration for NIYANTRAN KENDRA (slug: "niyantran").
// It serves as the reference implementation for all system integrations.
//
// To create a custom view config, pass partial overrides to DashboardProvider;
// DashboardProvider deep-merges your overrides with these defaults.

import { Zap } from "lucide-react";
import type { DashboardConfig } from "@/types/dashboard.types";

export const defaultDashboardConfig: DashboardConfig = {
  branding: {
    systemName: "NIYANTRAN KENDRA",
    subtitle: "Runtime Integration & Operational Command Center",
    appSlug: "niyantran",
    productionUrl: "https://niyantran.blackholeinfiverse.com",
    logoIcon: Zap,
    operatorLabel: "Guest",
    roleLabel: "Read-Only",
    operatorInitials: "GU",
  },

  zones: {
    executiveSummary: {
      visible: true,
      label: "Executive Layout",
      colSpan: "col-span-12",
    },
    operationsGrid: {
      visible: true,
      label: "Operations Layout",
      colSpan: "col-span-12 lg:col-span-7",
    },
    liveAlerts: {
      visible: true,
      label: "Integration Layout",
      colSpan: "col-span-12 lg:col-span-5",
    },
    riskHeatmap: {
      visible: true,
      label: "Decision Intelligence Layout",
      colSpan: "col-span-12 md:col-span-6 lg:col-span-4",
    },
    telemetry: {
      visible: true,
      label: "Observability Layout",
      colSpan: "col-span-12 md:col-span-6 lg:col-span-8",
    },
    incidentQueue: {
      visible: true,
      label: "Workflow Layout",
      colSpan: "col-span-12 lg:col-span-7",
    },
    operationalTimeline: {
      visible: true,
      label: "Operator Console Layout",
      colSpan: "col-span-12 lg:col-span-5",
    },
    systemHealth: {
      visible: true,
      label: "Runtime Health Layout",
      colSpan: "col-span-12 md:col-span-7",
    },
    runtimeSessions: {
      visible: true,
      label: "Replay Layout",
      colSpan: "col-span-12 md:col-span-5",
    },
    evidencePanel: {
      visible: true,
      label: "Evidence Layout",
      colSpan: "col-span-12",
    },
    repositoryRegistry: {
      visible: true,
      label: "Repository Registry Layout",
      colSpan: "col-span-12 lg:col-span-6",
    },
    buildRegistry: {
      visible: true,
      label: "Build Registry Layout",
      colSpan: "col-span-12 lg:col-span-6",
    },
    migrationQueue: {
      visible: true,
      label: "Migration Queue Layout",
      colSpan: "col-span-12 lg:col-span-6",
    },
    reviewQueue: {
      visible: true,
      label: "Review Queue Layout",
      colSpan: "col-span-12 lg:col-span-6",
    },
    capabilityRegistry: {
      visible: true,
      label: "Capability Registry Layout",
      colSpan: "col-span-12",
    },
    employeeExecution: {
      visible: true,
      label: "Employee Execution Layout",
      colSpan: "col-span-12",
    },
    engineeringCapacity: {
      visible: true,
      label: "Engineering Capacity Layout",
      colSpan: "col-span-12 lg:col-span-6",
    },
    deliveryIntelligence: {
      visible: true,
      label: "Delivery Intelligence Layout",
      colSpan: "col-span-12 lg:col-span-6",
    },
    capabilityDependencyGraph: {
      visible: true,
      label: "Capability Dependency Graph Layout",
      colSpan: "col-span-12",
    },
  },

  features: {
    notifications: true,
    liveBadge: true,
    userMenu: true,
    clock: true,
  },
};
