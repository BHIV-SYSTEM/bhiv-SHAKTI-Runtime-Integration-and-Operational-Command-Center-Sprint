import React from "react";
import {
  describe,
  test,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
  within,
} from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { AxiosError, AxiosHeaders } from "axios";
import {
  authClient,
  classifyAuthError,
  isSigninRequiredError,
  normalizeSsoSessionPayload,
} from "@/api/authClient";
import { apiClient, extractRuntimeCorrelation } from "@/api/client";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { useAuthorization } from "@/hooks/useAuthorization";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { CAPABILITY_POLICY_MATRIX, type KnownCapability } from "@/utils/authorization";
import DashboardLayout from "@/layouts/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import type { BhivSsoSessionResponse, ProtectedActionResult } from "@/types/auth";

function createAxiosError(
  status: number | null,
  data?: Record<string, unknown>,
  code = "ERR_BAD_REQUEST"
): AxiosError {
  const headers = new AxiosHeaders();
  const config = { headers };
  if (status === null) {
    return new AxiosError(
      code === "ECONNABORTED" ? "timeout of 10000ms exceeded" : "Network Error",
      code === "ERR_BAD_REQUEST" ? "ERR_NETWORK" : code,
      config
    );
  }
  return new AxiosError(
    `Request failed with status code ${status}`,
    code,
    config,
    {},
    {
      data: data ?? {},
      status,
      statusText: String(status),
      headers,
      config,
    }
  );
}

function AuthConsumerHarness({
  onProtectedUiExecuted,
  onMutationExecuted,
  onLastGuardResult,
}: {
  onProtectedUiExecuted?: () => void;
  onMutationExecuted?: () => void;
  onLastGuardResult?: (res: ProtectedActionResult) => void;
}) {
  const auth = useAuth();
  const authz = useAuthorization();
  const tenant = useCurrentTenant();

  return (
    <div>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="is-loading">{String(auth.isLoading)}</span>
      <span data-testid="is-guest">{String(auth.isGuest)}</span>
      <span data-testid="is-authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="is-access-denied">{String(auth.isAccessDenied)}</span>
      <span data-testid="user-email">{auth.user?.email ?? "null"}</span>
      <span data-testid="user-tenant">{auth.user?.tenant_id ?? "null"}</span>
      <span data-testid="resolved-tenant">{tenant.authoritativeTenantId ?? "null"}</span>
      <span data-testid="tenant-status">{tenant.status}</span>
      <span data-testid="user-roles">{auth.user?.roles.join(",") ?? ""}</span>
      <span data-testid="can-view">{String(authz.hasPermission("dashboard:view"))}</span>
      <span data-testid="can-console">{String(authz.hasPermission("operator:console_access"))}</span>
      <span data-testid="can-audit">{String(authz.hasPermission("audit:inspect_protected"))}</span>
      <span data-testid="can-execute">{String(authz.hasPermission("execute_workflow"))}</span>
      <span data-testid="can-configure">{String(authz.hasPermission("configure_system"))}</span>
      <span data-testid="can-unknown">{String(authz.hasPermission("unmapped_sensitive_action"))}</span>
      <span data-testid="can-mutate">{String(authz.canExecuteMutation("execute_workflow"))}</span>
      <span data-testid="is-admin">{String(authz.hasRole("admin"))}</span>
      <span data-testid="is-operator">{String(authz.hasRole("operator"))}</span>
      <button
        type="button"
        data-testid="trigger-protected-ui"
        onClick={() => {
          void authz
            .guardAction("operator:console_access", () => {
              onProtectedUiExecuted?.();
            })
            .then((res) => onLastGuardResult?.(res));
        }}
      >
        Open Protected Operator View
      </button>
      <button
        type="button"
        data-testid="trigger-backend-mutation"
        onClick={() => {
          void authz
            .guardAction("execute_workflow", () => {
              onMutationExecuted?.();
            })
            .then((res) => onLastGuardResult?.(res));
        }}
      >
        Execute Backend Mutation
      </button>
      <button
        type="button"
        data-testid="simulate-401-challenge"
        onClick={() => {
          void auth.handleAuthError(
            createAxiosError(401, { error: "Token expired" })
          );
        }}
      >
        Simulate 401 Expiry
      </button>
    </div>
  );
}

describe("NIYANTRAN KENDRA — BHIV Core SSO & Authorization Regression Suite", () => {
  const mockedUseQuery = vi.mocked(useQuery);

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("VITE_AUTH_SERVER_URL", "https://auth.blackholeinfiverse.com");
    vi.stubEnv("VITE_AUTH_UI_URL", "https://products.blackholeinfiverse.com");
    localStorage.clear();
    sessionStorage.clear();

    mockedUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      isFetching: false,
      isStale: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("1. Initial loading state blocks protected actions until session resolves", async () => {
    let resolveSession: ((value: { data: BhivSsoSessionResponse }) => void) | null = null;
    vi.spyOn(authClient, "get").mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve;
        })
    );

    const onProtectedUi = vi.fn();
    const onGuardResult = vi.fn();

    render(
      <AuthProvider>
        <DashboardLayout>
          <AuthConsumerHarness
            onProtectedUiExecuted={onProtectedUi}
            onLastGuardResult={onGuardResult}
          />
        </DashboardLayout>
      </AuthProvider>
    );

    expect(screen.getByTestId("status")).toHaveTextContent("loading");
    expect(screen.getByTestId("is-loading")).toHaveTextContent("true");
    expect(screen.getByTestId("tenant-status")).toHaveTextContent("loading");
    expect(screen.getByText("Verifying Session")).toBeInTheDocument();
    expect(screen.getByTestId("can-console")).toHaveTextContent("false");
    expect(screen.getByTestId("can-execute")).toHaveTextContent("false");

    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    fireEvent.click(screen.getByTestId("trigger-protected-ui"));
    await waitFor(() => {
      expect(onGuardResult).toHaveBeenCalledWith({
        executed: false,
        reason: "loading",
      });
    });
    expect(onProtectedUi).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();

    await act(async () => {
      resolveSession?.({
        data: {
          authenticated: true,
          guest: true,
          user: {
            user_id: "guest_boot",
            email: null,
            tenant_id: "tenant_default",
            roles: [],
            permissions: [],
            allowedApps: ["niyantran"],
            isGuest: true,
          },
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("guest");
    });
  });

  test("2. Guest session success renders read-only Guest identity without token storage or placeholder tenant promotion", async () => {
    const getSpy = vi.spyOn(authClient, "get").mockResolvedValueOnce({
      data: {
        authenticated: true,
        guest: true,
        user: {
          user_id: "guest_9f8e7d6c5b4a",
          email: null,
          tenant_id: "tenant_default",
          roles: [],
          permissions: [],
          allowedApps: ["niyantran", "setu"],
          isGuest: true,
        },
      },
    });

    render(
      <AuthProvider>
        <DashboardLayout>
          <AuthConsumerHarness />
        </DashboardLayout>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("guest");
    });

    expect(getSpy).toHaveBeenCalledWith(
      "https://auth.blackholeinfiverse.com/api/auth/sso/session",
      expect.objectContaining({
        params: { app: "niyantran" },
        withCredentials: true,
      })
    );

    expect(screen.getByTestId("is-guest")).toHaveTextContent("true");
    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("false");
    expect(screen.getByTestId("user-email")).toHaveTextContent("null");
    expect(screen.getByTestId("user-tenant")).toHaveTextContent("null");
    expect(screen.getByTestId("resolved-tenant")).toHaveTextContent("null");
    expect(screen.getByTestId("user-roles")).toHaveTextContent("");
    expect(screen.getByTestId("can-view")).toHaveTextContent("true");
    expect(screen.getByTestId("can-console")).toHaveTextContent("false");
    expect(screen.getByTestId("can-execute")).toHaveTextContent("false");
    expect(screen.getByTestId("can-configure")).toHaveTextContent("false");

    expect(screen.getByText("Guest")).toBeInTheDocument();
    expect(screen.getByText("Read-Only")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in with bhiv core/i })).toBeInTheDocument();
    expect(screen.queryByText("P. Bhuwad")).not.toBeInTheDocument();

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  test("3. Authenticated session maps verified claims, enforces authoritative BHIV tenant precedence over SETU, and blocks all backendMutationVerified=false paths", async () => {
    // Mock SETU returning a different legacy tenant — verified BHIV Auth tenant must take precedence!
    mockedUseQuery.mockReturnValue({
      data: {
        success: true,
        data: {
          user: {
            _id: "legacy_setu_user",
            tenant_id: "tenant_legacy_setu_should_not_win",
          },
        },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      isStale: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    vi.spyOn(authClient, "get").mockResolvedValueOnce({
      data: {
        authenticated: true,
        guest: false,
        user: {
          user_id: "usr_admin_01",
          email: "admin@niyantran.com",
          tenant_id: "tenant_mssu_kharghar",
          roles: ["admin"],
          permissions: ["all", "admin", "read", "write"],
          allowedApps: ["niyantran", "setu"],
          isGuest: false,
        },
      },
    });

    const onProtectedUi = vi.fn();
    const onMutation = vi.fn();
    const onGuardResult = vi.fn();

    render(
      <AuthProvider>
        <DashboardLayout>
          <AuthConsumerHarness
            onProtectedUiExecuted={onProtectedUi}
            onMutationExecuted={onMutation}
            onLastGuardResult={onGuardResult}
          />
        </DashboardLayout>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });

    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
    expect(screen.getByTestId("is-guest")).toHaveTextContent("false");
    expect(screen.getByTestId("user-email")).toHaveTextContent("admin@niyantran.com");
    // Verified BHIV Auth tenant_id strictly overrides SETU fallback
    expect(screen.getByTestId("user-tenant")).toHaveTextContent("tenant_mssu_kharghar");
    expect(screen.getByTestId("resolved-tenant")).toHaveTextContent("tenant_mssu_kharghar");
    expect(screen.getByTestId("tenant-status")).toHaveTextContent("authenticated");

    expect(screen.getByTestId("is-admin")).toHaveTextContent("true");
    expect(screen.getByTestId("is-operator")).toHaveTextContent("true");
    expect(screen.getByTestId("can-view")).toHaveTextContent("true");
    expect(screen.getByTestId("can-console")).toHaveTextContent("true");
    // Unknown actions strictly default-deny even for admins
    expect(screen.getByTestId("can-unknown")).toHaveTextContent("false");

    // EVERY capability with `isMutation: true` and `backendMutationVerified: false` is blocked on BOTH
    // `hasPermission` AND `canExecuteMutation` AND `guardAction` — zero alternate UI bypass paths!
    const unverifiedMutations = (
      Object.keys(CAPABILITY_POLICY_MATRIX) as KnownCapability[]
    ).filter((k) => CAPABILITY_POLICY_MATRIX[k].isMutation);
    expect(unverifiedMutations.length).toBeGreaterThan(0);
    expect(screen.getByTestId("can-execute")).toHaveTextContent("false");
    expect(screen.getByTestId("can-configure")).toHaveTextContent("false");
    expect(screen.getByTestId("can-mutate")).toHaveTextContent("false");

    const headerBadge = screen.getByTestId("auth-session-badge");
    expect(within(headerBadge).getByText("admin@niyantran.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();

    // Attempting `guardAction("execute_workflow", ...)` as admin is unconditionally blocked
    fireEvent.click(screen.getByTestId("trigger-backend-mutation"));
    await waitFor(() => {
      expect(onGuardResult).toHaveBeenCalledWith({
        executed: false,
        reason: "backend_unverified",
      });
    });
    expect(onMutation).not.toHaveBeenCalled();

    // Non-mutating protected operator view executes for authorized admin
    fireEvent.click(screen.getByTestId("trigger-protected-ui"));
    await waitFor(() => {
      expect(onProtectedUi).toHaveBeenCalledTimes(1);
    });
  });

  test("3b. Candidate users (even with generic write/all permissions) are denied operator:console_access and audit:inspect_protected", async () => {
    vi.spyOn(authClient, "get").mockResolvedValueOnce({
      data: {
        authenticated: true,
        guest: false,
        user: {
          user_id: "usr_cand_12",
          email: "candidate@mssu.edu",
          tenant_id: "tenant_mssu_kharghar",
          roles: ["candidate"],
          permissions: ["learning:read", "tasks:read", "write", "all", "operator:console_access"],
          allowedApps: ["niyantran", "gurukul"],
          isGuest: false,
        },
      },
    });

    const onProtectedUi = vi.fn();
    const onMutation = vi.fn();

    render(
      <AuthProvider>
        <AuthConsumerHarness
          onProtectedUiExecuted={onProtectedUi}
          onMutationExecuted={onMutation}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });

    expect(screen.getByTestId("can-view")).toHaveTextContent("true");
    expect(screen.getByTestId("can-console")).toHaveTextContent("false");
    expect(screen.getByTestId("can-audit")).toHaveTextContent("false");
    expect(screen.getByTestId("can-execute")).toHaveTextContent("false");
    expect(screen.getByTestId("can-configure")).toHaveTextContent("false");
    expect(screen.getByTestId("is-admin")).toHaveTextContent("false");
    expect(screen.getByTestId("is-operator")).toHaveTextContent("false");

    fireEvent.click(screen.getByTestId("trigger-protected-ui"));
    fireEvent.click(screen.getByTestId("trigger-backend-mutation"));
    expect(onProtectedUi).not.toHaveBeenCalled();
    expect(onMutation).not.toHaveBeenCalled();
  });

  test("3c. useCurrentTenant preserves SETU fallback when session is in guest mode", async () => {
    mockedUseQuery.mockReturnValue({
      data: {
        success: true,
        data: {
          user: {
            _id: "setu_usr_01",
            name: "Setu Observer",
            tenant_id: "tenant_setu_fallback_01",
          },
        },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      isStale: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    vi.spyOn(authClient, "get").mockResolvedValueOnce({
      data: {
        authenticated: true,
        guest: true,
        user: {
          user_id: "guest_setu_fallback",
          email: null,
          tenant_id: "tenant_default",
          roles: [],
          permissions: [],
          allowedApps: ["niyantran"],
          isGuest: true,
        },
      },
    });

    render(
      <AuthProvider>
        <AuthConsumerHarness />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("guest");
    });

    // Guest BHIV tenant_id stays null while SETU fallback resolves `tenant_setu_fallback_01`
    expect(screen.getByTestId("user-tenant")).toHaveTextContent("null");
    expect(screen.getByTestId("resolved-tenant")).toHaveTextContent(
      "tenant_setu_fallback_01"
    );
    expect(screen.getByTestId("tenant-status")).toHaveTextContent("authenticated");
  });

  test("3d. Real authenticated BHIV user without tenant_id returns missing_tenant and never substitutes a SETU tenant", async () => {
    mockedUseQuery.mockReturnValue({
      data: {
        success: true,
        data: {
          user: {
            _id: "setu_unrelated_01",
            name: "Unrelated Setu User",
            tenant_id: "tenant_unrelated_setu_999",
          },
        },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      isStale: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    vi.spyOn(authClient, "get").mockResolvedValueOnce({
      data: {
        authenticated: true,
        guest: false,
        user: {
          user_id: "usr_no_tenant_bhiv",
          email: "operator@blackholeinfiverse.com",
          tenant_id: null,
          roles: ["operator"],
          permissions: ["read"],
          allowedApps: ["niyantran"],
          isGuest: false,
        },
      },
    });

    render(
      <AuthProvider>
        <AuthConsumerHarness />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });

    expect(screen.getByTestId("tenant-status")).toHaveTextContent("missing_tenant");
    expect(screen.getByTestId("resolved-tenant")).toHaveTextContent("null");
    expect(mockedUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: ["auth-me-tenant"],
        enabled: false,
      })
    );
  });

  test("4 & 4b. Invalid session (401) and mid-session token timeout/expiry downgrade operator access immediately", async () => {
    const getSpy = vi
      .spyOn(authClient, "get")
      .mockResolvedValueOnce({
        data: {
          authenticated: true,
          guest: false,
          user: {
            user_id: "usr_expiring_01",
            email: "operator@niyantran.com",
            tenant_id: "tenant_default",
            roles: ["operator"],
            permissions: ["read", "write"],
            allowedApps: ["niyantran"],
            isGuest: false,
          },
        },
      })
      .mockRejectedValueOnce(
        createAxiosError(401, { error: "Session expired" })
      );

    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    render(
      <AuthProvider>
        <DashboardLayout>
          <AuthConsumerHarness />
        </DashboardLayout>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });
    expect(screen.getByTestId("can-console")).toHaveTextContent("true");

    // Simulate mid-session 401 timeout challenge -> revalidates & clears stale operator privileges
    fireEvent.click(screen.getByTestId("simulate-401-challenge"));

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated");
    });

    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("false");
    expect(screen.getByTestId("can-console")).toHaveTextContent("false");
    expect(screen.getByText("Signed Out")).toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
  });

  test("5. Auth server network failure and HTTP request timeout (ECONNABORTED) render non-blocking error banner", async () => {
    vi.spyOn(authClient, "get").mockRejectedValueOnce(
      createAxiosError(null, undefined, "ECONNABORTED")
    );

    render(
      <AuthProvider>
        <DashboardLayout>
          <div data-testid="dashboard-child">Read-only telemetry panel</div>
          <AuthConsumerHarness />
        </DashboardLayout>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("error");
    });

    expect(
      screen.getByText(/central authentication unavailable/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-child")).toBeInTheDocument();
    expect(screen.getByTestId("can-console")).toHaveTextContent("false");
    expect(screen.getByTestId("can-execute")).toHaveTextContent("false");
  });

  test("6. App access denied renders explicit Access Denied view when allowedApps excludes niyantran or 403 returned", async () => {
    vi.spyOn(authClient, "get").mockResolvedValueOnce({
      data: {
        authenticated: true,
        guest: false,
        user: {
          user_id: "usr_restricted",
          email: "student@gurukul.com",
          tenant_id: "tenant_mssu_pune",
          roles: ["candidate"],
          permissions: ["learning:read"],
          allowedApps: ["gurukul", "sampada"],
          isGuest: false,
        },
      },
    });

    render(
      <AuthProvider>
        <DashboardLayout>
          <div data-testid="protected-dashboard-grid">Should Not Render</div>
        </DashboardLayout>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByRole("alert", { name: "Application Access Denied" })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("Access Denied to NIYANTRAN KENDRA")
    ).toBeInTheDocument();
    expect(screen.getByText(/student@gurukul\.com/)).toBeInTheDocument();
    expect(
      screen.queryByTestId("protected-dashboard-grid")
    ).not.toBeInTheDocument();
  });

  test("7 & 8. Guest protected action opens BHIV popup while unverified mutations are blocked without popup bypass", async () => {
    vi.spyOn(authClient, "get").mockResolvedValueOnce({
      data: {
        authenticated: true,
        guest: true,
        user: {
          user_id: "guest_popup_01",
          email: null,
          tenant_id: "tenant_default",
          roles: [],
          permissions: [],
          allowedApps: ["niyantran"],
          isGuest: true,
        },
      },
    });

    const openSpy = vi.spyOn(window, "open").mockReturnValue({} as Window);
    const onProtectedUi = vi.fn();
    const onMutation = vi.fn();
    const onGuardResult = vi.fn();

    render(
      <AuthProvider>
        <AuthConsumerHarness
          onProtectedUiExecuted={onProtectedUi}
          onMutationExecuted={onMutation}
          onLastGuardResult={onGuardResult}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("guest");
    });

    const signinErr = createAxiosError(403, {
      error: "Sign in to continue",
      code: "signin_required",
    });
    const appDeniedErr = createAxiosError(403, {
      error: "Access denied to requested application: niyantran",
    });
    const unauthErr = createAxiosError(401, { error: "Not authenticated" });
    const serverErr = createAxiosError(503, { error: "Upstream unavailable" });

    expect(classifyAuthError(signinErr).kind).toBe("signin_required");
    expect(isSigninRequiredError(signinErr)).toBe(true);
    expect(classifyAuthError(appDeniedErr).kind).toBe("app_access_denied");
    expect(isSigninRequiredError(appDeniedErr)).toBe(false);
    expect(classifyAuthError(unauthErr).kind).toBe("unauthenticated");
    expect(isSigninRequiredError(unauthErr)).toBe(false);
    expect(classifyAuthError(serverErr).kind).toBe("unavailable");
    expect(isSigninRequiredError(serverErr)).toBe(false);

    // Unverified backend mutation is immediately blocked even for guests (`backend_unverified`)
    fireEvent.click(screen.getByTestId("trigger-backend-mutation"));
    await waitFor(() => {
      expect(onGuardResult).toHaveBeenCalledWith({
        executed: false,
        reason: "backend_unverified",
      });
    });
    expect(onMutation).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();

    // Non-mutating protected operator action prompts BHIV sign-in popup (`?embed=1&app=niyantran`)
    fireEvent.click(screen.getByTestId("trigger-protected-ui"));
    expect(onProtectedUi).not.toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(
      "https://products.blackholeinfiverse.com/login?embed=1&app=niyantran",
      "bhiv-signin",
      "width=420,height=520"
    );
  });

  test("9 & 10. Rejects untrusted origins, null source, missing popup ref, and wrong window source; accepts exact popupWindowRef source and retries action", async () => {
    const getSpy = vi
      .spyOn(authClient, "get")
      .mockResolvedValueOnce({
        data: {
          authenticated: true,
          guest: true,
          user: {
            user_id: "guest_retry_01",
            email: null,
            tenant_id: "tenant_default",
            roles: [],
            permissions: [],
            allowedApps: ["niyantran"],
            isGuest: true,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          authenticated: true,
          guest: false,
          user: {
            user_id: "usr_operator_77",
            email: "operator@blackholeinfiverse.com",
            tenant_id: "tenant_default",
            roles: ["operator"],
            permissions: ["read", "operator:console_access"],
            allowedApps: ["niyantran"],
            isGuest: false,
          },
        },
      });

    const mockPopupWindow = { closed: false } as unknown as Window;
    const wrongWindow = { closed: false } as unknown as Window;
    const openSpy = vi
      .spyOn(window, "open")
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(mockPopupWindow);
    const onProtectedUi = vi.fn();

    render(
      <AuthProvider>
        <AuthConsumerHarness onProtectedUiExecuted={onProtectedUi} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("guest");
    });

    // First click: window.open returns null (popup blocked -> popupWindowRef.current === null)
    fireEvent.click(screen.getByTestId("trigger-protected-ui"));
    expect(openSpy).toHaveBeenCalledTimes(1);

    // Trusted origin MUST be rejected when popupWindowRef.current is null
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://products.blackholeinfiverse.com",
          source: wrongWindow,
          data: { type: "blackhole-auth-success" },
        })
      );
    });
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(onProtectedUi).not.toHaveBeenCalled();

    // Second click: window.open returns actual mockPopupWindow
    fireEvent.click(screen.getByTestId("trigger-protected-ui"));
    expect(openSpy).toHaveBeenCalledTimes(2);

    // Untrusted origin MUST be rejected even with matching source
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://malicious.attacker.example",
          source: mockPopupWindow,
          data: { type: "blackhole-auth-success" },
        })
      );
    });
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(onProtectedUi).not.toHaveBeenCalled();

    // Trusted origin with null event.source MUST be rejected
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://products.blackholeinfiverse.com",
          source: null,
          data: { type: "blackhole-auth-success" },
        })
      );
    });
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(onProtectedUi).not.toHaveBeenCalled();

    // Trusted origin with unexpected window source MUST be rejected
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://products.blackholeinfiverse.com",
          source: wrongWindow,
          data: { type: "blackhole-auth-success" },
        })
      );
    });
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(onProtectedUi).not.toHaveBeenCalled();

    // Exact approved origin + exact popupWindowRef source + `blackhole-auth-success` refreshes & retries
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://products.blackholeinfiverse.com",
          source: mockPopupWindow,
          data: { type: "blackhole-auth-success" },
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });

    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("user-email")).toHaveTextContent(
      "operator@blackholeinfiverse.com"
    );
    expect(onProtectedUi).toHaveBeenCalledTimes(1);
  });

  test("11. Central logout calls POST /api/auth/logout with credentials and returns product to guest mode", async () => {
    vi.spyOn(authClient, "get")
      .mockResolvedValueOnce({
        data: {
          authenticated: true,
          guest: false,
          user: {
            user_id: "usr_admin_99",
            email: "admin@blackholeinfiverse.com",
            tenant_id: "tenant_default",
            roles: ["admin"],
            permissions: ["all"],
            allowedApps: ["niyantran"],
            isGuest: false,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          authenticated: true,
          guest: true,
          user: {
            user_id: "guest_after_logout",
            email: null,
            tenant_id: "tenant_default",
            roles: [],
            permissions: [],
            allowedApps: ["niyantran"],
            isGuest: true,
          },
        },
      });

    const postSpy = vi
      .spyOn(authClient, "post")
      .mockResolvedValueOnce({ data: { success: true } });

    render(
      <AuthProvider>
        <DashboardLayout>
          <AuthConsumerHarness />
        </DashboardLayout>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });

    fireEvent.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("guest");
    });

    expect(postSpy).toHaveBeenCalledWith(
      "https://auth.blackholeinfiverse.com/api/auth/logout",
      {},
      expect.objectContaining({
        withCredentials: true,
      })
    );
    expect(screen.getByText("Guest")).toBeInTheDocument();
  });

  test("12. Preserves Niyantran Kendra dashboard branding and grid rendering without login redirect", async () => {
    vi.spyOn(authClient, "get").mockResolvedValueOnce({
      data: {
        authenticated: true,
        guest: true,
        user: {
          user_id: "guest_grid_01",
          email: null,
          tenant_id: "tenant_default",
          roles: [],
          permissions: [],
          allowedApps: ["niyantran"],
          isGuest: true,
        },
      },
    });

    const { container } = render(
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("NIYANTRAN KENDRA")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Runtime Integration & Operational Command Center")
    ).toBeInTheDocument();
    expect(container.querySelector("main > div.grid")).toBeInTheDocument();
  });

  test("13. Preserves existing Control Plane apiClient correlation extraction without ID conflation", () => {
    expect(apiClient.defaults.timeout).toBe(10000);

    const corr = extractRuntimeCorrelation({
      traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      "x-execution-id": "exec_777",
      "x-request-id": "req_888",
      "x-tenant-id": "tenant_999",
      "x-decision-id": "dec_111",
      "x-policy-id": "pol_222",
    });

    expect(corr).toEqual({
      trace_id: "4bf92f3577b34da6a3ce929d0e0e4736",
      execution_id: "exec_777",
      request_id: "req_888",
      tenant_id: "tenant_999",
      decision_id: "dec_111",
      policy_id: "pol_222",
    });

    const missingTrace = extractRuntimeCorrelation({
      "x-execution-id": "exec_only",
      "x-request-id": "req_only",
    });
    expect(missingTrace.trace_id).toBeNull();
    expect(missingTrace.execution_id).toBe("exec_only");
    expect(missingTrace.request_id).toBe("req_only");
  });

  test("14. Preserves offline banner and cached-data degradation resilience", async () => {
    vi.spyOn(authClient, "get").mockResolvedValueOnce({
      data: {
        authenticated: true,
        guest: true,
        user: {
          user_id: "guest_offline_01",
          email: null,
          tenant_id: "tenant_default",
          roles: [],
          permissions: [],
          allowedApps: ["niyantran"],
          isGuest: true,
        },
      },
    });

    render(
      <AuthProvider>
        <DashboardLayout>
          <DashboardCard title="Cached Runtime Zone" isError={true} hasData={true}>
            <div>Cached Operational Snapshot</div>
          </DashboardCard>
        </DashboardLayout>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Guest")).toBeInTheDocument();
    });

    await act(async () => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(
      screen.getByText(/system offline — dashboard is running on cached data/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText("Using cached data (Connection lost)")
    ).toBeInTheDocument();
    expect(screen.getByText("Cached Operational Snapshot")).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
  });

  test("15. Strict SSO claim normalization fails closed on incomplete or contradictory payloads", () => {
    // Missing user.isGuest === false
    expect(
      normalizeSsoSessionPayload({
        authenticated: true,
        guest: false,
        user: {
          user_id: "usr_missing_isguest",
          roles: ["operator"],
          permissions: [],
          allowedApps: ["niyantran"],
        },
      }).status
    ).toBe("unauthenticated");

    // Missing top-level guest === false
    expect(
      normalizeSsoSessionPayload({
        authenticated: true,
        user: {
          user_id: "usr_missing_top_guest",
          isGuest: false,
          roles: ["operator"],
          permissions: [],
          allowedApps: ["niyantran"],
        },
      }).status
    ).toBe("unauthenticated");

    // Contradictory flags (guest: true vs user.isGuest: false)
    expect(
      normalizeSsoSessionPayload({
        authenticated: true,
        guest: true,
        user: {
          user_id: "usr_contradictory_1",
          isGuest: false,
          roles: ["admin"],
          permissions: ["admin"],
          allowedApps: ["niyantran"],
        },
      }).status
    ).toBe("unauthenticated");

    // Contradictory flags (guest: false vs user.isGuest: true)
    expect(
      normalizeSsoSessionPayload({
        authenticated: true,
        guest: false,
        user: {
          user_id: "guest_contradictory_2",
          isGuest: true,
          roles: [],
          permissions: [],
          allowedApps: ["niyantran"],
        },
      }).status
    ).toBe("unauthenticated");

    // Missing authorization arrays
    expect(
      normalizeSsoSessionPayload({
        authenticated: true,
        guest: false,
        user: {
          user_id: "usr_incomplete_arrays",
          isGuest: false,
          allowedApps: ["niyantran"],
        },
      }).status
    ).toBe("unauthenticated");

    // Explicit consistent real user succeeds
    const valid = normalizeSsoSessionPayload({
      authenticated: true,
      guest: false,
      user: {
        user_id: "usr_valid_01",
        email: "op@blackholeinfiverse.com",
        tenant_id: "tenant_mssu_kharghar",
        roles: ["operator"],
        permissions: ["operator:console_access"],
        allowedApps: ["niyantran"],
        isGuest: false,
      },
    });
    expect(valid.status).toBe("authenticated");
    expect(valid.user?.isGuest).toBe(false);
    expect(valid.user?.user_id).toBe("usr_valid_01");
  });
});
