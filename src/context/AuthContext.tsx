import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  buildBhivPopupLoginUrl,
  classifyAuthError,
  fetchBhivSsoSession,
  logoutBhivSession,
  resolveAuthEndpoints,
} from "@/api/authClient";
import { AuthContext } from "@/context/authContextValue";
import {
  evaluateUserPermission,
  isBlockedUnverifiedMutation,
  isKnownCapability,
} from "@/utils/authorization";
import { logger } from "@/utils/logger";
import {
  CANONICAL_APP_SLUG,
  type AuthContextValue,
  type AuthSessionStatus,
  type AuthUser,
  type BhivAuthError,
  type ExecuteProtectedActionOptions,
  type ProtectedActionResult,
  type ResolvedAuthSession,
} from "@/types/auth";

interface PendingProtectedAction {
  callback: () => void | Promise<void>;
  requiredPermission: string;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthSessionStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAccessDenied, setIsAccessDenied] = useState<boolean>(false);
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);
  const [error, setError] = useState<BhivAuthError | null>(null);

  const mountedRef = useRef<boolean>(true);
  const popupWindowRef = useRef<Window | null>(null);
  const pendingActionRef = useRef<PendingProtectedAction | null>(null);

  const applyResolvedSession = useCallback((resolved: ResolvedAuthSession) => {
    if (!mountedRef.current) return;
    setStatus(resolved.status);
    setUser(resolved.user);
    setIsAccessDenied(resolved.isAccessDenied);
    setDeniedEmail(resolved.deniedEmail);
    setError(resolved.error);
  }, []);

  const refreshSession = useCallback(async (): Promise<ResolvedAuthSession> => {
    const resolved = await fetchBhivSsoSession(CANONICAL_APP_SLUG);
    applyResolvedSession(resolved);
    return resolved;
  }, [applyResolvedSession]);

  // Initial session bootstrap on mount — never forces login if central auth returns a guest session
  useEffect(() => {
    mountedRef.current = true;
    void refreshSession();
    return () => {
      mountedRef.current = false;
    };
  }, [refreshSession]);

  // Revalidate active authenticated session when tab regains visibility to detect session timeout/expiry
  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && status === "authenticated") {
        void refreshSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshSession, status]);

  const login = useCallback((): Window | null => {
    const { authUiUrl } = resolveAuthEndpoints();
    const popupUrl = buildBhivPopupLoginUrl(authUiUrl, CANONICAL_APP_SLUG);

    if (!popupUrl) {
      logger.error(
        "Cannot open BHIV sign-in popup: VITE_AUTH_SERVER_URL / VITE_AUTH_UI_URL is not configured"
      );
      return null;
    }

    if (typeof window === "undefined" || typeof window.open !== "function") {
      return null;
    }

    const opened = window.open(
      popupUrl,
      "bhiv-signin",
      "width=420,height=520"
    );
    popupWindowRef.current = opened;
    return opened;
  }, []);

  // Listen strictly for verified postMessage `{ type: "blackhole-auth-success" }` from exact approved auth origin
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleMessage = (event: MessageEvent) => {
      const { expectedPopupOrigin } = resolveAuthEndpoints();
      if (!expectedPopupOrigin || event.origin !== expectedPopupOrigin) {
        if (
          event.data &&
          typeof event.data === "object" &&
          (event.data as { type?: unknown }).type === "blackhole-auth-success"
        ) {
          logger.warn("Rejected BHIV auth postMessage from untrusted origin", {
            origin: event.origin,
            expectedPopupOrigin,
          });
        }
        return;
      }

      if (
        !event.data ||
        typeof event.data !== "object" ||
        (event.data as { type?: unknown }).type !== "blackhole-auth-success"
      ) {
        return;
      }

      if (!popupWindowRef.current || event.source !== popupWindowRef.current) {
        logger.warn(
          "Rejected BHIV auth postMessage: missing or mismatched popup window source"
        );
        return;
      }

      popupWindowRef.current = null;

      void (async () => {
        const queued = pendingActionRef.current;
        pendingActionRef.current = null;

        const refreshed = await refreshSession();

        if (!queued) return;

        // Re-check every security invariant on the freshly revalidated session
        if (
          refreshed.status !== "authenticated" ||
          refreshed.isAccessDenied ||
          !refreshed.user ||
          refreshed.user.isGuest
        ) {
          return;
        }

        if (isBlockedUnverifiedMutation(queued.requiredPermission)) {
          logger.warn(
            `Blocked queued mutation '${queued.requiredPermission}': upstream backend lacks verified BHIV SSO enforcement`
          );
          return;
        }

        if (
          !evaluateUserPermission(
            refreshed.status,
            refreshed.user,
            queued.requiredPermission,
            refreshed.isAccessDenied
          )
        ) {
          return;
        }

        await queued.callback();
      })();
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [refreshSession]);

  const logout = useCallback(async (): Promise<void> => {
    pendingActionRef.current = null;
    try {
      await logoutBhivSession();
    } catch (err) {
      logger.error("Central BHIV logout request failed", err);
    } finally {
      await refreshSession();
    }
  }, [refreshSession]);

  const handleAuthError = useCallback(
    async (err: unknown): Promise<void> => {
      const classified = classifyAuthError(err);
      if (classified.kind === "signin_required") {
        await refreshSession();
        login();
        return;
      }
      if (classified.kind === "unauthenticated" || classified.kind === "app_access_denied") {
        await refreshSession();
      }
      // Unrelated API errors (`unavailable` / `unknown` / 404 / 500) never trigger popups or wipe valid SSO state
    },
    [login, refreshSession]
  );

  const executeProtectedAction = useCallback(
    async (
      action: () => void | Promise<void>,
      options: ExecuteProtectedActionOptions
    ): Promise<ProtectedActionResult> => {
      const { requiredPermission } = options;

      // Default-deny unknown capabilities immediately across all states
      if (!requiredPermission || !isKnownCapability(requiredPermission)) {
        return { executed: false, reason: "forbidden" };
      }

      // Never allow protected actions before initial session resolution completes
      if (status === "loading") {
        return { executed: false, reason: "loading" };
      }

      if (isAccessDenied) {
        return { executed: false, reason: "forbidden" };
      }

      // Unconditionally block backend mutations lacking verified independent upstream SSO enforcement
      // BEFORE opening popups or executing callbacks — zero bypass paths for guests, operators, or admins
      if (isBlockedUnverifiedMutation(requiredPermission)) {
        logger.warn(
          `Blocked mutation '${requiredPermission}': upstream backend lacks verified BHIV SSO enforcement`
        );
        return { executed: false, reason: "backend_unverified" };
      }

      // Guest or signed-out user triggering a valid non-mutating protected action -> prompt sign-in & queue retry
      if (status === "guest" || status === "unauthenticated") {
        pendingActionRef.current = {
          callback: action,
          requiredPermission,
        };
        const popup = login();
        if (!popup && !resolveAuthEndpoints().authUiUrl) {
          pendingActionRef.current = null;
          return { executed: false, reason: "error" };
        }
        return { executed: false, reason: "signin_prompted" };
      }

      if (status === "error") {
        return { executed: false, reason: "error" };
      }

      const permitted = evaluateUserPermission(
        status,
        user,
        requiredPermission,
        isAccessDenied
      );
      if (!permitted) {
        return { executed: false, reason: "forbidden" };
      }

      await action();
      return { executed: true };
    },
    [isAccessDenied, login, status, user]
  );

  const { authServerUrl, authUiUrl } = resolveAuthEndpoints();

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isLoading: status === "loading",
      isGuest: status === "guest" && Boolean(user?.isGuest),
      isAuthenticated:
        status === "authenticated" && Boolean(user && !user.isGuest) && !isAccessDenied,
      isAccessDenied,
      deniedEmail,
      error,
      appSlug: CANONICAL_APP_SLUG,
      authServerUrl,
      authUiUrl,
      login,
      logout,
      refreshSession,
      handleAuthError,
      executeProtectedAction,
    }),
    [
      authServerUrl,
      authUiUrl,
      deniedEmail,
      error,
      executeProtectedAction,
      handleAuthError,
      isAccessDenied,
      login,
      logout,
      refreshSession,
      status,
      user,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
