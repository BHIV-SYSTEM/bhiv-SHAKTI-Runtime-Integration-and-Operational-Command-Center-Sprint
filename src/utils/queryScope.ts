import type { AuthSessionStatus, AuthUser } from "@/types/auth";

export interface AuthQueryScopeInput {
  status: AuthSessionStatus;
  user: AuthUser | null;
  isAccessDenied: boolean;
}

/**
 * Derives a canonical React Query isolation key for the active session identity and tenant.
 * Guarantees disjoint caches across users, tenants, missing_tenant, guest, and denied states.
 */
export function deriveAuthQueryScopeKey({
  status,
  user,
  isAccessDenied,
}: AuthQueryScopeInput): string {
  if (status === "loading") {
    return "session:loading";
  }
  if (isAccessDenied) {
    return "session:access-denied";
  }
  if (status === "authenticated" && user && !user.isGuest) {
    const tenantToken =
      typeof user.tenant_id === "string" && user.tenant_id.trim().length > 0
        ? user.tenant_id.trim()
        : "missing_tenant";
    return `user:${user.user_id}:tenant:${tenantToken}`;
  }
  if (status === "guest" && user?.isGuest) {
    return `guest:${user.user_id}`;
  }
  return `session:${status}`;
}

/**
 * Scope-aware `placeholderData` helper mirroring `keepPreviousData` ONLY while the trailing
 * scope key in `previousQuery.queryKey` matches the active `scopeKey`.
 * Prevents previous user/tenant data from bleeding across auth/tenant transitions.
 */
export function scopedKeepPreviousData(scopeKey: string) {
  return <T>(
    previousData: T | undefined,
    previousQuery?: { queryKey?: readonly unknown[] }
  ): T | undefined => {
    const prevKey = previousQuery?.queryKey;
    if (!Array.isArray(prevKey) || prevKey.length === 0) {
      return undefined;
    }
    return prevKey[prevKey.length - 1] === scopeKey ? previousData : undefined;
  };
}
