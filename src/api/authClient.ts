import axios, { AxiosError } from "axios";
import { logger } from "@/utils/logger";
import {
  BhivAuthError,
  CANONICAL_APP_SLUG,
  type AuthUser,
  type BhivLogoutResponse,
  type BhivRawSessionUser,
  type BhivSsoSessionResponse,
  type ResolvedAuthSession,
} from "@/types/auth";

export interface ResolvedAuthEndpoints {
  authServerUrl: string;
  authUiUrl: string;
  expectedPopupOrigin: string | null;
}

/**
 * Extracts exact scheme + host + port origin from an HTTP(S) URL or relative path.
 * Never returns wildcards.
 */
export function extractExactOrigin(urlStr: string): string | null {
  const trimmed = urlStr.trim();
  if (!trimmed) return null;

  try {
    const parsed =
      trimmed.startsWith("/") && typeof window !== "undefined"
        ? new URL(trimmed, window.location.origin)
        : new URL(trimmed);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Resolves BHIV Core Auth API and Login Popup UI URLs from Vite environment variables.
 * Keeps VITE_AUTH_SERVER_URL and VITE_AUTH_UI_URL independently configurable.
 */
export function resolveAuthEndpoints(envOverride?: {
  VITE_AUTH_SERVER_URL?: string;
  VITE_AUTH_UI_URL?: string;
}): ResolvedAuthEndpoints {
  const rawServer = (
    envOverride?.VITE_AUTH_SERVER_URL ??
    import.meta.env.VITE_AUTH_SERVER_URL ??
    ""
  )
    .trim()
    .replace(/\/+$/, "");

  const rawUi = (
    envOverride?.VITE_AUTH_UI_URL ??
    import.meta.env.VITE_AUTH_UI_URL ??
    ""
  )
    .trim()
    .replace(/\/+$/, "");

  const authUiUrl = rawUi || rawServer;

  return {
    authServerUrl: rawServer,
    authUiUrl,
    expectedPopupOrigin: extractExactOrigin(authUiUrl),
  };
}

/**
 * Builds the source-verified BHIV Core embedded popup login URL (`GUEST_MODE.md` / `LoginPage.jsx`).
 */
export function buildBhivPopupLoginUrl(
  authUiUrl: string,
  appSlug: string = CANONICAL_APP_SLUG
): string | null {
  const normalizedUi = authUiUrl.trim().replace(/\/+$/, "");
  if (!normalizedUi) return null;
  return `${normalizedUi}/login?embed=1&app=${encodeURIComponent(appSlug)}`;
}

/**
 * Dedicated Axios client for BHIV Core centralized SSO.
 * Does NOT replace or modify the existing Control Plane `apiClient` in `src/api/client.ts`.
 * Always sends HttpOnly cookies via `withCredentials: true` (`credentials: "include"`).
 */
export const authClient = axios.create({
  timeout: 10000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Classifies HTTP/transport errors from BHIV Auth or protected APIs distinctly:
 * - 401 -> unauthenticated
 * - 403 + code="signin_required" -> signin_required
 * - 403 (other) -> app_access_denied
 * - Network / timeout / 5xx -> unavailable
 */
export function classifyAuthError(error: unknown): BhivAuthError {
  if (error instanceof BhivAuthError) {
    return error;
  }

  const axiosErr = error as AxiosError<{
    error?: unknown;
    message?: unknown;
    code?: unknown;
  }>;

  const status = axiosErr?.response?.status ?? null;
  const data = axiosErr?.response?.data;
  const serverCode =
    data && typeof data === "object" && typeof data.code === "string"
      ? data.code
      : null;
  const serverMessage =
    data && typeof data === "object"
      ? typeof data.error === "string"
        ? data.error
        : typeof data.message === "string"
          ? data.message
          : null
      : null;

  if (status === 401) {
    return new BhivAuthError(serverMessage || "Session is not authenticated", {
      kind: "unauthenticated",
      statusCode: 401,
      code: serverCode,
    });
  }

  if (status === 403 && serverCode === "signin_required") {
    return new BhivAuthError(serverMessage || "Sign in to continue", {
      kind: "signin_required",
      statusCode: 403,
      code: "signin_required",
    });
  }

  if (status === 403) {
    return new BhivAuthError(
      serverMessage ||
        `Access denied to requested application: ${CANONICAL_APP_SLUG}`,
      {
        kind: "app_access_denied",
        statusCode: 403,
        code: serverCode ?? "app_access_denied",
      }
    );
  }

  if (
    status === null ||
    status >= 500 ||
    axiosErr?.code === "ECONNABORTED" ||
    axiosErr?.code === "ETIMEDOUT" ||
    axiosErr?.code === "ERR_NETWORK"
  ) {
    return new BhivAuthError(
      serverMessage ||
        (error instanceof Error
          ? error.message
          : "BHIV Auth service is currently unavailable"),
      {
        kind: "unavailable",
        statusCode: status,
        code: serverCode ?? axiosErr?.code ?? null,
      }
    );
  }

  return new BhivAuthError(
    serverMessage ||
      (error instanceof Error ? error.message : "Authentication request failed"),
    {
      kind: "unknown",
      statusCode: status,
      code: serverCode,
    }
  );
}

/**
 * Checks whether an API error specifically represents the BHIV Guest Mode `signin_required` gate.
 * Unrelated 404/500/network errors return false so login popups are never opened spuriously.
 */
export function isSigninRequiredError(error: unknown): boolean {
  return classifyAuthError(error).kind === "signin_required";
}

function parseGuestUser(rawUser?: BhivRawSessionUser | null): AuthUser {
  const rawId =
    rawUser && typeof rawUser.user_id === "string" && rawUser.user_id.trim().length > 0
      ? rawUser.user_id.trim()
      : "guest_anonymous";

  return {
    user_id: rawId,
    email: null,
    tenant_id: null,
    roles: [],
    permissions: [],
    allowedApps: sanitizeStringArray(rawUser?.allowedApps),
    isGuest: true,
  };
}

/**
 * Normalizes a raw `GET /api/auth/sso/session?app=niyantran` payload into an explicit session state.
 * Fails closed on any incomplete, malformed, or contradictory session claims.
 */
export function normalizeSsoSessionPayload(
  payload: unknown,
  appSlug: string = CANONICAL_APP_SLUG
): ResolvedAuthSession {
  if (!payload || typeof payload !== "object") {
    return {
      status: "unauthenticated",
      user: null,
      isAccessDenied: false,
      deniedEmail: null,
      error: new BhivAuthError("Malformed SSO session response", {
        kind: "unauthenticated",
      }),
    };
  }

  const data = payload as BhivSsoSessionResponse;

  if (data.authenticated !== true) {
    return {
      status: "unauthenticated",
      user: null,
      isAccessDenied: false,
      deniedEmail: null,
      error: data.error
        ? new BhivAuthError(data.error, { kind: "unauthenticated" })
        : null,
    };
  }

  const rawUser = data.user;
  if (!rawUser || typeof rawUser !== "object") {
    return {
      status: "unauthenticated",
      user: null,
      isAccessDenied: false,
      deniedEmail: null,
      error: new BhivAuthError("Missing user object in SSO session response", {
        kind: "unauthenticated",
      }),
    };
  }

  const rawUserId =
    typeof rawUser.user_id === "string" ? rawUser.user_id.trim() : "";
  if (rawUserId.length === 0) {
    return {
      status: "unauthenticated",
      user: null,
      isAccessDenied: false,
      deniedEmail: null,
      error: new BhivAuthError("Missing valid user_id in SSO session response", {
        kind: "unauthenticated",
      }),
    };
  }

  // Reject contradictory or implicit guest flags (top-level `guest` and `user.isGuest` must explicitly agree)
  const isExplicitGuest = data.guest === true && rawUser.isGuest === true;
  const isExplicitRealUser = data.guest === false && rawUser.isGuest === false;

  if (!isExplicitGuest && !isExplicitRealUser) {
    return {
      status: "unauthenticated",
      user: null,
      isAccessDenied: false,
      deniedEmail: null,
      error: new BhivAuthError(
        "Incomplete or contradictory guest claims in SSO session response",
        { kind: "unauthenticated" }
      ),
    };
  }

  if (isExplicitGuest) {
    return {
      status: "guest",
      user: parseGuestUser(rawUser),
      isAccessDenied: false,
      deniedEmail: null,
      error: null,
    };
  }

  // Real authenticated user requires explicit array claims for roles, permissions, and allowedApps
  if (
    !Array.isArray(rawUser.roles) ||
    !Array.isArray(rawUser.permissions) ||
    !Array.isArray(rawUser.allowedApps)
  ) {
    return {
      status: "unauthenticated",
      user: null,
      isAccessDenied: false,
      deniedEmail: null,
      error: new BhivAuthError(
        "Incomplete authorization claims in SSO session response",
        { kind: "unauthenticated" }
      ),
    };
  }

  const email =
    typeof rawUser.email === "string" && rawUser.email.trim().length > 0
      ? rawUser.email.trim()
      : null;
  const tenantId =
    typeof rawUser.tenant_id === "string" && rawUser.tenant_id.trim().length > 0
      ? rawUser.tenant_id.trim()
      : null;
  const roles = sanitizeStringArray(rawUser.roles);
  const permissions = sanitizeStringArray(rawUser.permissions);
  const allowedApps = sanitizeStringArray(rawUser.allowedApps);

  const normalizedSlug = appSlug.toLowerCase();
  const hasAppAccess = allowedApps.some(
    (allowed) => allowed.toLowerCase() === normalizedSlug
  );

  if (!hasAppAccess) {
    return {
      status: "unauthenticated",
      user: null,
      isAccessDenied: true,
      deniedEmail: email,
      error: new BhivAuthError(
        `Access denied: your account is not authorized for ${appSlug}.`,
        {
          kind: "app_access_denied",
          statusCode: 403,
          code: "app_access_denied",
        }
      ),
    };
  }

  const verifiedUser: AuthUser = {
    user_id: rawUserId,
    email,
    tenant_id: tenantId,
    roles,
    permissions,
    allowedApps,
    isGuest: false,
  };

  return {
    status: "authenticated",
    user: verifiedUser,
    isAccessDenied: false,
    deniedEmail: null,
    error: null,
  };
}

/**
 * Verifies the current browser session with BHIV Core Auth (`GET /api/auth/sso/session?app=niyantran`)
 * using `credentials: "include"` (`withCredentials: true`).
 */
export async function fetchBhivSsoSession(
  appSlug: string = CANONICAL_APP_SLUG
): Promise<ResolvedAuthSession> {
  const { authServerUrl } = resolveAuthEndpoints();

  if (!authServerUrl) {
    const err = new BhivAuthError(
      "VITE_AUTH_SERVER_URL is not configured",
      { kind: "unavailable" }
    );
    logger.warn("BHIV Auth configuration missing: VITE_AUTH_SERVER_URL");
    return {
      status: "error",
      user: null,
      isAccessDenied: false,
      deniedEmail: null,
      error: err,
    };
  }

  try {
    const response = await authClient.get<BhivSsoSessionResponse>(
      `${authServerUrl}/api/auth/sso/session`,
      {
        params: { app: appSlug },
        withCredentials: true,
        fetchOptions: { credentials: "include" },
      }
    );

    return normalizeSsoSessionPayload(response.data, appSlug);
  } catch (err) {
    const authErr = classifyAuthError(err);

    if (authErr.kind === "unauthenticated" || authErr.kind === "signin_required") {
      return {
        status: "unauthenticated",
        user: null,
        isAccessDenied: false,
        deniedEmail: null,
        error: authErr,
      };
    }

    if (authErr.kind === "app_access_denied") {
      return {
        status: "unauthenticated",
        user: null,
        isAccessDenied: true,
        deniedEmail: null,
        error: authErr,
      };
    }

    logger.warn("BHIV Auth session check failed", {
      kind: authErr.kind,
      statusCode: authErr.statusCode,
      message: authErr.message,
    });

    return {
      status: "error",
      user: null,
      isAccessDenied: false,
      deniedEmail: null,
      error: authErr,
    };
  }
}

/**
 * Terminates the central BHIV SSO session (`POST /api/auth/logout`) with credentials included.
 */
export async function logoutBhivSession(): Promise<void> {
  const { authServerUrl } = resolveAuthEndpoints();
  if (!authServerUrl) {
    return;
  }

  await authClient.post<BhivLogoutResponse>(
    `${authServerUrl}/api/auth/logout`,
    {},
    {
      withCredentials: true,
      fetchOptions: { credentials: "include" },
    }
  );
}
