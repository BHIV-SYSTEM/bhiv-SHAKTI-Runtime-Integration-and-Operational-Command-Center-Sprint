import { CANONICAL_APP_SLUG, type AuthSessionStatus, type AuthUser } from "@/types/auth";

export type Role = "admin" | "operator" | "candidate" | "viewer";

export type KnownCapability =
  | "dashboard:view"
  | "view_dashboard"
  | "telemetry:read"
  | "evidence:read"
  | "replay:read"
  | "health:read"
  | "operator:console_access"
  | "audit:inspect_protected"
  | "execute_workflow"
  | "workflow:execute"
  | "replay:trigger"
  | "alerts:acknowledge"
  | "intelligence:write"
  | "configure_system"
  | "system:configure";

export interface CapabilityPolicy {
  /** Whether read-only guest sessions may perform this capability */
  allowGuest: boolean;
  /** Whether this capability performs a state-changing backend operation */
  isMutation: boolean;
  /** Verified backend roles that grant this capability */
  allowedRoles: readonly Role[];
  /** Verified backend permission strings that grant this capability */
  allowedPermissions: readonly string[];
  /**
   * Whether the upstream microservice independently validates `blackhole_token` + RBAC
   * for state-mutating requests. When `isMutation: true` and `backendMutationVerified: false`,
   * ALL UI/hook paths (`hasPermission`, `canExecuteMutation`, `guardAction`,
   * `executeProtectedAction`, and post-login queued retries) block the operation.
   */
  backendMutationVerified: boolean;
}

/**
 * Explicit Authorization & Capability Matrix for NIYANTRAN KENDRA.
 *
 * Security Rules:
 * 1. Read-only observational capabilities (`isMutation: false, allowGuest: true`) are permitted
 *    for `guest` and `authenticated` sessions.
 * 2. Protected observational/UI capabilities (`isMutation: false, allowGuest: false`) require a
 *    verified non-guest session with `"niyantran"` in `allowedApps` AND an explicit matching role/permission.
 * 3. State-changing backend capabilities (`isMutation: true`) additionally require
 *    `backendMutationVerified: true`. While upstream runtime services lack independent
 *    `blackhole_token` mutation enforcement, `backendMutationVerified` is `false`, blocking
 *    all UI paths (`hasPermission`, `canExecuteMutation`, `guardAction`, `executeProtectedAction`).
 * 4. Any capability not present in this table is DENIED BY DEFAULT (`false`).
 */
export const CAPABILITY_POLICY_MATRIX: Readonly<Record<KnownCapability, CapabilityPolicy>> = {
  "dashboard:view": {
    allowGuest: true,
    isMutation: false,
    allowedRoles: ["admin", "operator", "candidate", "viewer"],
    allowedPermissions: [
      "all",
      "admin",
      "read",
      "learning:read",
      "tasks:read",
      "intelligence:view",
      "intelligence:read",
    ],
    backendMutationVerified: true,
  },
  view_dashboard: {
    allowGuest: true,
    isMutation: false,
    allowedRoles: ["admin", "operator", "candidate", "viewer"],
    allowedPermissions: [
      "all",
      "admin",
      "read",
      "learning:read",
      "tasks:read",
      "intelligence:view",
      "intelligence:read",
    ],
    backendMutationVerified: true,
  },
  "telemetry:read": {
    allowGuest: true,
    isMutation: false,
    allowedRoles: ["admin", "operator", "candidate", "viewer"],
    allowedPermissions: ["all", "admin", "read", "intelligence:view", "intelligence:read"],
    backendMutationVerified: true,
  },
  "evidence:read": {
    allowGuest: true,
    isMutation: false,
    allowedRoles: ["admin", "operator", "candidate", "viewer"],
    allowedPermissions: ["all", "admin", "read", "intelligence:view", "intelligence:read"],
    backendMutationVerified: true,
  },
  "replay:read": {
    allowGuest: true,
    isMutation: false,
    allowedRoles: ["admin", "operator", "candidate", "viewer"],
    allowedPermissions: ["all", "admin", "read", "intelligence:view", "intelligence:read"],
    backendMutationVerified: true,
  },
  "health:read": {
    allowGuest: true,
    isMutation: false,
    allowedRoles: ["admin", "operator", "candidate", "viewer"],
    allowedPermissions: ["all", "admin", "read", "intelligence:view", "intelligence:read"],
    backendMutationVerified: true,
  },
  "operator:console_access": {
    allowGuest: false,
    isMutation: false,
    allowedRoles: ["admin", "operator"],
    allowedPermissions: [
      "admin",
      "niyantran:operator",
      "niyantran:admin",
      "operator:console_access",
    ],
    backendMutationVerified: true,
  },
  "audit:inspect_protected": {
    allowGuest: false,
    isMutation: false,
    allowedRoles: ["admin", "operator"],
    allowedPermissions: [
      "admin",
      "intelligence:admin",
      "intelligence:*",
      "niyantran:audit",
      "niyantran:admin",
      "audit:inspect_protected",
    ],
    backendMutationVerified: true,
  },
  execute_workflow: {
    allowGuest: false,
    isMutation: true,
    allowedRoles: ["admin", "operator"],
    allowedPermissions: [
      "admin",
      "niyantran:execute",
      "niyantran:admin",
      "workflow:execute",
    ],
    backendMutationVerified: false,
  },
  "workflow:execute": {
    allowGuest: false,
    isMutation: true,
    allowedRoles: ["admin", "operator"],
    allowedPermissions: [
      "admin",
      "niyantran:execute",
      "niyantran:admin",
      "workflow:execute",
    ],
    backendMutationVerified: false,
  },
  "replay:trigger": {
    allowGuest: false,
    isMutation: true,
    allowedRoles: ["admin", "operator"],
    allowedPermissions: [
      "admin",
      "niyantran:execute",
      "niyantran:admin",
      "replay:trigger",
    ],
    backendMutationVerified: false,
  },
  "alerts:acknowledge": {
    allowGuest: false,
    isMutation: true,
    allowedRoles: ["admin", "operator"],
    allowedPermissions: [
      "admin",
      "niyantran:write",
      "niyantran:admin",
      "alerts:acknowledge",
    ],
    backendMutationVerified: false,
  },
  "intelligence:write": {
    allowGuest: false,
    isMutation: true,
    allowedRoles: ["admin"],
    allowedPermissions: [
      "admin",
      "intelligence:write",
      "intelligence:admin",
      "intelligence:*",
    ],
    backendMutationVerified: false,
  },
  configure_system: {
    allowGuest: false,
    isMutation: true,
    allowedRoles: ["admin"],
    allowedPermissions: [
      "admin",
      "niyantran:admin",
      "intelligence:admin",
      "intelligence:*",
      "system:configure",
    ],
    backendMutationVerified: false,
  },
  "system:configure": {
    allowGuest: false,
    isMutation: true,
    allowedRoles: ["admin"],
    allowedPermissions: [
      "admin",
      "niyantran:admin",
      "intelligence:admin",
      "intelligence:*",
      "system:configure",
    ],
    backendMutationVerified: false,
  },
};

export function isKnownCapability(action: string): action is KnownCapability {
  return Object.prototype.hasOwnProperty.call(CAPABILITY_POLICY_MATRIX, action);
}

/**
 * Returns true if `action` is a state-changing mutation whose upstream backend
 * does NOT yet independently enforce `blackhole_token` authentication + authorization.
 */
export function isBlockedUnverifiedMutation(action: string): boolean {
  if (!isKnownCapability(action)) {
    return false;
  }
  const policy = CAPABILITY_POLICY_MATRIX[action];
  return policy.isMutation && !policy.backendMutationVerified;
}

function userHasNiyantranApp(user: AuthUser): boolean {
  return user.allowedApps.some(
    (app) => app.toLowerCase() === CANONICAL_APP_SLUG
  );
}

/**
 * Evaluates whether a verified non-guest user holds a given role.
 * Admin implies operator & viewer; operator implies viewer; candidate implies viewer.
 */
export function evaluateUserRole(
  status: AuthSessionStatus,
  user: AuthUser | null,
  targetRole: Role
): boolean {
  if (status !== "authenticated" || !user || user.isGuest) {
    return false;
  }
  if (!userHasNiyantranApp(user)) {
    return false;
  }

  const normalizedRoles = new Set(user.roles.map((r) => r.toLowerCase()));
  if (normalizedRoles.has("admin")) {
    return true;
  }
  if (
    normalizedRoles.has("operator") &&
    (targetRole === "operator" || targetRole === "viewer")
  ) {
    return true;
  }
  if (
    normalizedRoles.has("candidate") &&
    (targetRole === "candidate" || targetRole === "viewer")
  ) {
    return true;
  }
  return normalizedRoles.has(targetRole.toLowerCase());
}

/**
 * Evaluates whether the current session is authorized for an explicit capability.
 * - Unknown actions strictly default-deny (`false`).
 * - Capabilities with `isMutation: true` and `backendMutationVerified: false` strictly return `false`
 *   so no UI component checking `hasPermission(...)` can bypass the backend verification gate.
 */
export function evaluateUserPermission(
  status: AuthSessionStatus,
  user: AuthUser | null,
  action: string,
  isAccessDenied = false
): boolean {
  if (!action || !isKnownCapability(action)) {
    return false; // Strict default-deny for unknown or unmapped actions
  }

  if (status === "loading" || isAccessDenied) {
    return false;
  }

  const policy = CAPABILITY_POLICY_MATRIX[action];

  // Unconditionally block mutations whose upstream service lacks verified BHIV SSO enforcement
  if (policy.isMutation && !policy.backendMutationVerified) {
    return false;
  }

  if (status === "guest") {
    return Boolean(user?.isGuest && policy.allowGuest);
  }

  if (status !== "authenticated" || !user || user.isGuest) {
    return false;
  }

  if (!userHasNiyantranApp(user)) {
    return false;
  }

  if (policy.allowGuest) {
    return true;
  }

  // Enforce role eligibility for protected capabilities:
  // When a user carries explicit roles (e.g. ["candidate"] or ["viewer"]), they must
  // satisfy at least one role in `policy.allowedRoles` — preventing privilege escalation
  // via generic or misplaced permission claims.
  const hasMatchingRole = policy.allowedRoles.some((allowedRole) =>
    evaluateUserRole(status, user, allowedRole)
  );
  if (user.roles.length > 0 && !hasMatchingRole) {
    return false;
  }

  if (hasMatchingRole) {
    return true;
  }

  const normalizedPermissions = new Set(
    user.permissions.map((p) => p.toLowerCase())
  );
  for (const allowedPerm of policy.allowedPermissions) {
    if (normalizedPermissions.has(allowedPerm.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether a state-changing backend mutation is safe and authorized to execute.
 */
export function isBackendMutationAllowed(
  status: AuthSessionStatus,
  user: AuthUser | null,
  action: string,
  isAccessDenied = false
): boolean {
  if (!isKnownCapability(action)) {
    return false;
  }
  const policy = CAPABILITY_POLICY_MATRIX[action];
  if (!policy.isMutation || !policy.backendMutationVerified) {
    return false;
  }
  return evaluateUserPermission(status, user, action, isAccessDenied);
}
