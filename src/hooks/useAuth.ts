import { useContext } from "react";
import { resolveAuthEndpoints } from "@/api/authClient";
import { AuthContext } from "@/context/authContextValue";
import {
  CANONICAL_APP_SLUG,
  type AuthContextValue,
  type ResolvedAuthSession,
} from "@/types/auth";

const unconfiguredFallbackSession: ResolvedAuthSession = {
  status: "unauthenticated",
  user: null,
  isAccessDenied: false,
  deniedEmail: null,
  error: null,
};

/**
 * BHIV Core Centralized Authentication Hook.
 *
 * Returns the verified session context managed by `<AuthProvider>`.
 * If invoked outside `<AuthProvider>` (e.g. isolated component unit tests),
 * fails closed as `"unauthenticated"` — never returns a synthetic or mock operator.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context) {
    return context;
  }

  const { authServerUrl, authUiUrl } = resolveAuthEndpoints();

  return {
    status: "unauthenticated",
    user: null,
    isLoading: false,
    isGuest: false,
    isAuthenticated: false,
    isAccessDenied: false,
    deniedEmail: null,
    error: null,
    appSlug: CANONICAL_APP_SLUG,
    authServerUrl,
    authUiUrl,
    login: () => null,
    logout: async () => {},
    refreshSession: async () => unconfiguredFallbackSession,
    handleAuthError: async () => {},
    executeProtectedAction: async () => ({ executed: false, reason: "error" }),
  };
}
