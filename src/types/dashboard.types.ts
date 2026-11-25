// ─── Dashboard Configuration Contract ─────────────────────────────────────────
// This type is the single source of truth for making the dashboard reusable
// across government systems. Every visual and behavioral aspect is configurable.

import type { LucideIcon } from "lucide-react";

// ─── Branding ─────────────────────────────────────────────────────────────────

export interface DashboardBranding {
  /** Primary system name displayed in the header (e.g., "NIYANTRAN KENDRA") */
  systemName: string;
  /** Subtitle shown beside the system name (e.g., "Runtime Integration & Operational Command Center") */
  subtitle: string;
  /** Canonical BHIV application slug (e.g., "niyantran") */
  appSlug?: string;
  /** Canonical production application URL */
  productionUrl?: string;
  /** Lucide icon component for the logo area */
  logoIcon?: LucideIcon;
  /** Default display label shown when session overrides are not active */
  operatorLabel: string;
  /** Default role label shown below display name */
  roleLabel: string;
  /** Default initials for the avatar badge */
  operatorInitials: string;
}

// ─── Zone Configuration ───────────────────────────────────────────────────────

export interface ZoneConfig {
  /** Whether this zone is visible on the dashboard */
  visible: boolean;
  /** Display label (used in section aria-label and headings) */
  label: string;
  /** Tailwind col-span classes — mobile, tablet, desktop */
  colSpan?: string;
}

export interface DashboardZones {
  executiveSummary: ZoneConfig;
  operationsGrid: ZoneConfig;
  liveAlerts: ZoneConfig;
  riskHeatmap: ZoneConfig;
  telemetry: ZoneConfig;
  incidentQueue: ZoneConfig;
  operationalTimeline: ZoneConfig;
  systemHealth: ZoneConfig;
  runtimeSessions: ZoneConfig;
  evidencePanel: ZoneConfig;
  repositoryRegistry?: ZoneConfig;
  buildRegistry?: ZoneConfig;
  migrationQueue?: ZoneConfig;
  reviewQueue?: ZoneConfig;
  capabilityRegistry?: ZoneConfig;
  employeeExecution?: ZoneConfig;
  engineeringCapacity?: ZoneConfig;
  deliveryIntelligence?: ZoneConfig;
  capabilityDependencyGraph?: ZoneConfig;
}

// ─── Feature Flags ────────────────────────────────────────────────────────────

export interface DashboardFeatures {
  /** Show the notification bell icon in the header */
  notifications: boolean;
  /** Show the LIVE indicator badge */
  liveBadge: boolean;
  /** Show the user/operator menu in the header */
  userMenu: boolean;
  /** Show the clock/date in the header */
  clock: boolean;
}

// ─── Top-Level Config ─────────────────────────────────────────────────────────

export interface DashboardConfig {
  /** Branding and identity */
  branding: DashboardBranding;
  /** Zone visibility and labels */
  zones: DashboardZones;
  /** Feature flags */
  features: DashboardFeatures;
}

// ─── Partial config for consumer overrides ────────────────────────────────────
// Consumers only need to specify the fields they want to change.

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DashboardConfigOverride = DeepPartial<DashboardConfig>;
