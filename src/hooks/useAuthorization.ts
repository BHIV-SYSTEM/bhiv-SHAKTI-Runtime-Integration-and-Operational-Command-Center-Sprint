import { useCallback } from "react";
import { useAuth } from "./useAuth";
import {
  evaluateUserPermission,
  evaluateUserRole,
  isBackendMutationAllowed,
  type KnownCapability,
  type Role,
} from "@/utils/authorization";
import type { ProtectedActionResult } from "@/types/auth";

export type { Role, KnownCapability };

/**
 * Claim-Backed Authorization Hook (RBAC + Explicit Capability Policy).
 *
 * Security guarantees:
 * - Sourced exclusively from verified BHIV Core SSO claims (`useAuth()`).
 * - Blocks all sensitive capabilities during `loading`, `guest`, `unauthenticated`, `error`, and `isAccessDenied`.
 * - Enforces strict default-deny (`false`) for any unknown or unmapped action.
 * - Unconditionally blocks all capabilities with `isMutation: true` and `backendMutationVerified: false`
 *   across `hasPermission`, `canExecuteMutation`, and `guardAction`.
 */
export function useAuthorization() {
  const { status, user, isAccessDenied, executeProtectedAction } = useAuth();

  const hasRole = useCallback(
    (role: Role): boolean => {
      if (isAccessDenied) return false;
      return evaluateUserRole(status, user, role);
    },
    [isAccessDenied, status, user]
  );

  const hasPermission = useCallback(
    (action: string): boolean => {
      return evaluateUserPermission(status, user, action, isAccessDenied);
    },
    [isAccessDenied, status, user]
  );

  const canExecuteMutation = useCallback(
    (action: string): boolean => {
      return isBackendMutationAllowed(status, user, action, isAccessDenied);
    },
    [isAccessDenied, status, user]
  );

  const guardAction = useCallback(
    (
      actionName: string,
      callback: () => void | Promise<void>
    ): Promise<ProtectedActionResult> => {
      return executeProtectedAction(callback, {
        requiredPermission: actionName,
      });
    },
    [executeProtectedAction]
  );

  return {
    hasRole,
    hasPermission,
    canExecuteMutation,
    guardAction,
  };
}
