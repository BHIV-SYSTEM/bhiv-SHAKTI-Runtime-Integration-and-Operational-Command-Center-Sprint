import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { deriveAuthQueryScopeKey, scopedKeepPreviousData } from "@/utils/queryScope";

/**
 * Returns the active session/tenant isolation scope key for React Query keys.
 */
export function useAuthQueryScope(): string {
  const { status, user, isAccessDenied } = useAuth();
  return deriveAuthQueryScopeKey({ status, user, isAccessDenied });
}

/**
 * Session-and-tenant-scoped wrapper around `useQuery`.
 * - Appends `useAuthQueryScope()` to `queryKey` so Tenant A / Tenant B / Guest / missing_tenant caches stay disjoint.
 * - Defers execution while auth bootstrap is `"loading"` or when `isAccessDenied` is active.
 * - Limits `placeholderData` retention strictly to identical auth/tenant scopes.
 */
export function useScopedQuery<TQueryFnData = unknown, TError = Error, TData = TQueryFnData>(
  options: Omit<
    UseQueryOptions<TQueryFnData, TError, TData, readonly unknown[]>,
    "placeholderData"
  > & {
    preservePreviousData?: boolean;
  }
): UseQueryResult<TData, TError> {
  const { status, user, isAccessDenied } = useAuth();
  const scopeKey = deriveAuthQueryScopeKey({ status, user, isAccessDenied });
  const { queryKey, preservePreviousData = true, enabled = true, ...rest } = options;

  const isSessionReady = status !== "loading" && !isAccessDenied;
  const resolvedEnabled =
    typeof enabled === "function"
      ? (query: Parameters<typeof enabled>[0]) => isSessionReady && enabled(query)
      : Boolean(enabled) && isSessionReady;

  return useQuery({
    ...rest,
    queryKey: [...queryKey, scopeKey],
    enabled: resolvedEnabled,
    placeholderData: preservePreviousData
      ? (scopedKeepPreviousData(scopeKey) as UseQueryOptions<
          TQueryFnData,
          TError,
          TData,
          readonly unknown[]
        >["placeholderData"])
      : undefined,
  });
}
