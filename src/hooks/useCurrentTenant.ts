import { useQuery } from "@tanstack/react-query";
import { getSetuAuthMe } from "@/api/setuEndpoints";
import { useAuth } from "@/hooks/useAuth";
import { deriveAuthQueryScopeKey } from "@/utils/queryScope";
import type { SetuAuthUser } from "@/types/setu";

export type TenantResolutionStatus =
  | "loading"
  | "authenticated"
  | "missing_tenant"
  | "unauthenticated"
  | "error";

export interface CurrentTenantResult {
  tenantId: string | null;
  authoritativeTenantId: string | null;
  user: SetuAuthUser | null;
  status: TenantResolutionStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  isError: boolean;
  errorMessage: string | null;
  refetch: () => void;
}

interface SetuErrorShape {
  message?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
}

/**
 * useCurrentTenant
 * Authoritative tenant provider hook for NIYANTRAN KENDRA.
 *
 * Resolution Priority:
 * 1. Verified BHIV Core SSO session (`useAuth()`):
 *    - When a real non-guest user is authenticated for `niyantran` and carries a verified `tenant_id`,
 *      BHIV Auth is authoritative and takes strict precedence over any downstream token.
 *    - Guest sessions (`isGuest: true`) never expose a placeholder tenant as an operator tenant.
 *    - App-access-denied sessions reject tenant resolution immediately.
 * 2. Preserved SETU `/api/auth/me` fallback (`getSetuAuthMe`):
 *    - Used when no real BHIV Auth operator `tenant_id` is active (e.g. guest mode with legacy SETU
 *      token, standalone SETU environments, or unit tests outside `<AuthProvider>`).
 *
 * STRICT RULES:
 * - Never fabricates or defaults a `tenant_id`.
 * - Never uses `trace_id`, `execution_id`, or `request_id` as `tenant_id`.
 */
export function useCurrentTenant(): CurrentTenantResult {
  const auth = useAuth();

  const bhivVerifiedUser =
    auth.isAuthenticated && auth.user && !auth.user.isGuest ? auth.user : null;

  const bhivTenantId =
    bhivVerifiedUser &&
    typeof bhivVerifiedUser.tenant_id === "string" &&
    bhivVerifiedUser.tenant_id.trim().length > 0
      ? bhivVerifiedUser.tenant_id.trim()
      : null;

  const scopeKey = deriveAuthQueryScopeKey({
    status: auth.status,
    user: auth.user,
    isAccessDenied: auth.isAccessDenied,
  });

  const shouldQuerySetuFallback =
    !auth.isLoading && !auth.isAccessDenied && !bhivVerifiedUser;

  const query = useQuery({
    queryKey: ["auth-me-tenant", scopeKey],
    queryFn: getSetuAuthMe,
    staleTime: 60_000,
    refetchInterval: 30_000,
    retry: 1,
    enabled: shouldQuerySetuFallback,
  });

  const combinedRefetch = () => {
    void auth.refreshSession();
    if (typeof query?.refetch === "function") {
      void query.refetch();
    }
  };

  // 1. Initial BHIV SSO session bootstrap in progress
  if (auth.isLoading) {
    return {
      tenantId: null,
      authoritativeTenantId: null,
      user: null,
      status: "loading",
      isLoading: true,
      isAuthenticated: false,
      isError: false,
      errorMessage: null,
      refetch: combinedRefetch,
    };
  }

  // 2. Real BHIV user explicitly denied access to `niyantran`
  if (auth.isAccessDenied) {
    return {
      tenantId: null,
      authoritativeTenantId: null,
      user: null,
      status: "unauthenticated",
      isLoading: false,
      isAuthenticated: false,
      isError: true,
      errorMessage:
        auth.error?.message || "Access denied to application: niyantran",
      refetch: combinedRefetch,
    };
  }

  // 3. Authoritative BHIV Core SSO verified tenant claim takes strict precedence;
  // if BHIV authenticated a real user without a tenant_id, fail closed as missing_tenant
  // rather than substituting a tenant from an unrelated legacy SETU token.
  if (bhivVerifiedUser) {
    const mappedUser: SetuAuthUser = {
      _id: bhivVerifiedUser.user_id,
      id: bhivVerifiedUser.user_id,
      name: bhivVerifiedUser.email ?? bhivVerifiedUser.user_id,
      email: bhivVerifiedUser.email ?? undefined,
      role: bhivVerifiedUser.roles[0],
      ...(bhivTenantId ? { tenant_id: bhivTenantId } : {}),
      isActive: true,
    };

    if (!bhivTenantId) {
      return {
        tenantId: null,
        authoritativeTenantId: null,
        user: mappedUser,
        status: "missing_tenant",
        isLoading: false,
        isAuthenticated: true,
        isError: false,
        errorMessage: "Authenticated user lacks authoritative tenant_id",
        refetch: combinedRefetch,
      };
    }

    return {
      tenantId: bhivTenantId,
      authoritativeTenantId: bhivTenantId,
      user: mappedUser,
      status: "authenticated",
      isLoading: false,
      isAuthenticated: true,
      isError: false,
      errorMessage: null,
      refetch: combinedRefetch,
    };
  }

  // 4. Preserved SETU `/api/auth/me` fallback
  const { data, isLoading, isError, error } = query;

  if (isLoading) {
    return {
      tenantId: null,
      authoritativeTenantId: null,
      user: null,
      status: "loading",
      isLoading: true,
      isAuthenticated: false,
      isError: false,
      errorMessage: null,
      refetch: combinedRefetch,
    };
  }

  if (isError) {
    const typedError = error as SetuErrorShape | null;
    const status = typedError?.response?.status;
    const errorMsg =
      typedError?.response?.data?.message ||
      typedError?.message ||
      "Failed to authenticate with SETU";

    return {
      tenantId: null,
      authoritativeTenantId: null,
      user: null,
      status: status === 401 || status === 403 ? "unauthenticated" : "error",
      isLoading: false,
      isAuthenticated: false,
      isError: true,
      errorMessage: errorMsg,
      refetch: combinedRefetch,
    };
  }

  const user = data?.data?.user ?? null;
  const rawTenantId = user?.tenant_id;
  const trimmedTenantId =
    typeof rawTenantId === "string" && rawTenantId.trim().length > 0
      ? rawTenantId.trim()
      : null;

  if (!user) {
    return {
      tenantId: null,
      authoritativeTenantId: null,
      user: null,
      status: "unauthenticated",
      isLoading: false,
      isAuthenticated: false,
      isError: false,
      errorMessage: "No user object returned from /api/auth/me",
      refetch: combinedRefetch,
    };
  }

  if (!trimmedTenantId) {
    return {
      tenantId: null,
      authoritativeTenantId: null,
      user,
      status: "missing_tenant",
      isLoading: false,
      isAuthenticated: true,
      isError: false,
      errorMessage: "Authenticated user lacks authoritative tenant_id",
      refetch: combinedRefetch,
    };
  }

  return {
    tenantId: trimmedTenantId,
    authoritativeTenantId: trimmedTenantId,
    user,
    status: "authenticated",
    isLoading: false,
    isAuthenticated: true,
    isError: false,
    errorMessage: null,
    refetch: combinedRefetch,
  };
}
