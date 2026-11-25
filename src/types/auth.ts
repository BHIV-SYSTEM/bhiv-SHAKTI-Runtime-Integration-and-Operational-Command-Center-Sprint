export const CANONICAL_APP_SLUG = "niyantran" as const;

export type AuthSessionStatus =
  | "loading"
  | "guest"
  | "authenticated"
  | "unauthenticated"
  | "error";

export type AuthErrorKind =
  | "unauthenticated"
  | "signin_required"
  | "app_access_denied"
  | "unavailable"
  | "unknown";

export class BhivAuthError extends Error {
  readonly kind: AuthErrorKind;
  readonly statusCode: number | null;
  readonly code: string | null;

  constructor(
    message: string,
    options: {
      kind: AuthErrorKind;
      statusCode?: number | null;
      code?: string | null;
    }
  ) {
    super(message);
    this.name = "BhivAuthError";
    this.kind = options.kind;
    this.statusCode = options.statusCode ?? null;
    this.code = options.code ?? null;
  }
}

/**
 * Verified BHIV Core SSO identity claims.
 * Sourced exclusively from the central auth server response — never from browser storage or client input.
 */
export interface AuthUser {
  user_id: string;
  email: string | null;
  tenant_id: string | null;
  roles: string[];
  permissions: string[];
  allowedApps: string[];
  isGuest: boolean;
}

export interface BhivRawSessionUser {
  user_id?: unknown;
  email?: unknown;
  tenant_id?: unknown;
  roles?: unknown;
  permissions?: unknown;
  allowedApps?: unknown;
  isGuest?: unknown;
}

export interface BhivSsoSessionResponse {
  authenticated?: boolean;
  guest?: boolean;
  user?: BhivRawSessionUser | null;
  error?: string;
  code?: string;
  app?: string;
}

export interface BhivLogoutResponse {
  success?: boolean;
}

export interface ResolvedAuthSession {
  status: Exclude<AuthSessionStatus, "loading">;
  user: AuthUser | null;
  isAccessDenied: boolean;
  deniedEmail: string | null;
  error: BhivAuthError | null;
}

export type ProtectedActionBlockReason =
  | "loading"
  | "signin_prompted"
  | "forbidden"
  | "backend_unverified"
  | "error";

export interface ProtectedActionResult {
  executed: boolean;
  reason?: ProtectedActionBlockReason;
}

export interface ExecuteProtectedActionOptions {
  /** Explicit UI/domain capability required to run this action (must exist in CAPABILITY_POLICY_MATRIX) */
  requiredPermission: string;
}

export interface AuthContextValue {
  status: AuthSessionStatus;
  user: AuthUser | null;
  isLoading: boolean;
  isGuest: boolean;
  isAuthenticated: boolean;
  isAccessDenied: boolean;
  deniedEmail: string | null;
  error: BhivAuthError | null;
  appSlug: typeof CANONICAL_APP_SLUG;
  authServerUrl: string;
  authUiUrl: string;
  /**
   * Opens the approved BHIV sign-in popup for `app=niyantran`.
   * Accepts no raw callbacks so protected action checks cannot be bypassed;
   * use `executeProtectedAction` / `useAuthorization().guardAction` to queue retryable actions.
   */
  login: () => Window | null;
  /** Calls central POST /api/auth/logout with credentials and refreshes session */
  logout: () => Promise<void>;
  /** Re-fetches GET /api/auth/sso/session?app=niyantran and returns resolved state */
  refreshSession: () => Promise<ResolvedAuthSession>;
  /**
   * Handles mid-session auth expiration (`401`) or guest gate (`403 signin_required`)
   * without opening popups for unrelated runtime API errors.
   */
  handleAuthError: (err: unknown) => Promise<void>;
  /**
   * Guards a protected UI/operator action:
   * - Blocks while session is still loading.
   * - Unconditionally blocks any mutating capability with `backendMutationVerified: false`.
   * - Opens BHIV sign-in popup for guests on non-mutating protected actions and retries
   *   only after verified session revalidation + RBAC check.
   * - Rejects unauthorized roles/permissions and unknown capabilities (default-deny).
   */
  executeProtectedAction: (
    action: () => void | Promise<void>,
    options: ExecuteProtectedActionOptions
  ) => Promise<ProtectedActionResult>;
}
