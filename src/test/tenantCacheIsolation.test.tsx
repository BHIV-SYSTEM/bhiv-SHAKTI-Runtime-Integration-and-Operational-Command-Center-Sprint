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
} from "@testing-library/react";

// Restore real @tanstack/react-query behavior in this file so QueryClient caching,
// placeholderData, and cache clearing are tested end-to-end without mocked useQuery.
vi.mock("@tanstack/react-query", async () => {
  return await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query"
  );
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { authClient } from "@/api/authClient";
import * as niyantranEndpoints from "@/api/niyantranEndpoints";
import * as setuEndpoints from "@/api/setuEndpoints";
import * as bucketEndpoints from "@/api/bucketEndpoints";
import * as pranaEndpoints from "@/api/pranaEndpoints";
import * as karmaEndpoints from "@/api/karmaEndpoints";
import * as sanskarEndpoints from "@/api/sanskarEndpoints";
import * as pravahEndpoints from "@/api/pravahEndpoints";
import * as rajyaEndpoints from "@/api/rajyaEndpoints";
import * as endpoints from "@/api/endpoints";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useNiyantranTasks } from "@/hooks/useNiyantranQueries";
import { useSetuProjects } from "@/hooks/useSetuQueries";
import EvidenceLayout from "@/components/dashboard/layouts/EvidenceLayout";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 60_000,
      },
    },
  });
}

function TenantOperationalHarness() {
  const auth = useAuth();
  const tenant = useCurrentTenant();
  const tasks = useNiyantranTasks();
  const projects = useSetuProjects();

  const firstTask =
    Array.isArray(tasks.data) && tasks.data.length > 0 ? tasks.data[0].title : "none";
  const projectsData = projects.data as Array<{ name?: string }> | undefined;
  const firstProject =
    Array.isArray(projectsData) && projectsData.length > 0
      ? (projectsData[0].name ?? "none")
      : "none";

  return (
    <div>
      <span data-testid="auth-status">{auth.status}</span>
      <span data-testid="auth-user">{auth.user?.user_id ?? "null"}</span>
      <span data-testid="tenant-status">{tenant.status}</span>
      <span data-testid="tenant-id">{tenant.authoritativeTenantId ?? "null"}</span>
      <span data-testid="task-title">{firstTask}</span>
      <span data-testid="project-name">{firstProject}</span>
      <button
        type="button"
        data-testid="logout-btn"
        onClick={() => void auth.logout()}
      >
        Logout
      </button>
      <button
        type="button"
        data-testid="refresh-btn"
        onClick={() => void auth.refreshSession()}
      >
        Refresh
      </button>
    </div>
  );
}

describe("React Query Multi-Tenant Cache Isolation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("VITE_AUTH_SERVER_URL", "https://auth.blackholeinfiverse.com");
    vi.stubEnv("VITE_AUTH_UI_URL", "https://products.blackholeinfiverse.com");
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("1. Tenant A logout clears QueryClient cache and prevents guest from inheriting Tenant A data", async () => {
    const queryClient = createTestQueryClient();

    vi.spyOn(authClient, "get")
      .mockResolvedValueOnce({
        data: {
          authenticated: true,
          guest: false,
          user: {
            user_id: "usr_tenant_a",
            email: "op@tenanta.com",
            tenant_id: "tenant_alpha",
            roles: ["operator"],
            permissions: ["operator:console_access"],
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
            user_id: "guest_post_logout",
            email: null,
            tenant_id: "tenant_default",
            roles: [],
            permissions: [],
            allowedApps: ["niyantran"],
            isGuest: true,
          },
        },
      });

    vi.spyOn(authClient, "post").mockResolvedValueOnce({
      data: { success: true },
    });

    const tasksSpy = vi
      .spyOn(niyantranEndpoints, "fetchNiyantranTasks")
      .mockResolvedValueOnce([
        {
          _id: "t_a",
          title: "Confidential Tenant A Task",
          status: "Pending",
          priority: "High",
        },
      ])
      .mockResolvedValueOnce([
        {
          _id: "t_g",
          title: "Public Guest Snapshot",
          status: "Pending",
          priority: "Low",
        },
      ]);

    vi.spyOn(setuEndpoints, "getProjects")
      .mockResolvedValueOnce([
        { id: "p_a", name: "Secret Tenant A Project" } as never,
      ])
      .mockResolvedValueOnce([
        { id: "p_g", name: "Guest Project View" } as never,
      ]);

    vi.spyOn(setuEndpoints, "getSetuAuthMe").mockResolvedValue({
      success: false,
      data: undefined,
    } as never);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider queryClient={queryClient}>
          <TenantOperationalHarness />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("task-title")).toHaveTextContent(
        "Confidential Tenant A Task"
      );
    });
    expect(screen.getByTestId("project-name")).toHaveTextContent(
      "Secret Tenant A Project"
    );
    expect(screen.getByTestId("tenant-id")).toHaveTextContent("tenant_alpha");

    fireEvent.click(screen.getByTestId("logout-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("guest");
    });

    await waitFor(() => {
      expect(screen.getByTestId("task-title")).toHaveTextContent(
        "Public Guest Snapshot"
      );
    });
    expect(screen.getByTestId("project-name")).toHaveTextContent(
      "Guest Project View"
    );

    const remainingKeys = queryClient
      .getQueryCache()
      .getAll()
      .map((q) => JSON.stringify(q.queryKey));
    expect(remainingKeys.some((k) => k.includes("tenant_alpha"))).toBe(false);
    expect(tasksSpy).toHaveBeenCalledTimes(2);
  });

  test("2 & 5. Tenant A to Tenant B switch and session refresh isolate cache keys without bleeding stale Tenant A data", async () => {
    const queryClient = createTestQueryClient();

    vi.spyOn(authClient, "get")
      .mockResolvedValueOnce({
        data: {
          authenticated: true,
          guest: false,
          user: {
            user_id: "usr_a_01",
            email: "a@tenant-a.com",
            tenant_id: "tenant_a",
            roles: ["operator"],
            permissions: ["operator:console_access"],
            allowedApps: ["niyantran"],
            isGuest: false,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          authenticated: true,
          guest: false,
          user: {
            user_id: "usr_b_02",
            email: "b@tenant-b.com",
            tenant_id: "tenant_b",
            roles: ["operator"],
            permissions: ["operator:console_access"],
            allowedApps: ["niyantran"],
            isGuest: false,
          },
        },
      });

    let resolveTenantBTasks!: (
      value: niyantranEndpoints.NiyantranTask[]
    ) => void;
    const tenantBPromise = new Promise<niyantranEndpoints.NiyantranTask[]>(
      (resolve) => {
        resolveTenantBTasks = resolve;
      }
    );

    vi.spyOn(niyantranEndpoints, "fetchNiyantranTasks")
      .mockResolvedValueOnce([
        {
          _id: "t_a_1",
          title: "Tenant A Operational Task",
          status: "Pending",
          priority: "High",
        },
      ])
      .mockReturnValueOnce(tenantBPromise);

    vi.spyOn(setuEndpoints, "getProjects")
      .mockResolvedValueOnce([{ id: "pa", name: "Tenant A Project" } as never])
      .mockResolvedValueOnce([{ id: "pb", name: "Tenant B Project" } as never]);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider queryClient={queryClient}>
          <TenantOperationalHarness />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("task-title")).toHaveTextContent(
        "Tenant A Operational Task"
      );
    });

    // Switch session to Tenant B while Tenant B's tasks query is still in flight
    fireEvent.click(screen.getByTestId("refresh-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("tenant-id")).toHaveTextContent("tenant_b");
    });

    // While Tenant B is still loading, Tenant A's data MUST NOT leak via placeholderData or cache
    expect(screen.getByTestId("task-title")).toHaveTextContent("none");

    const cacheAfterSwitch = queryClient
      .getQueryCache()
      .getAll()
      .map((q) => JSON.stringify(q.queryKey));
    expect(cacheAfterSwitch.some((k) => k.includes("tenant_a"))).toBe(false);

    resolveTenantBTasks([
      {
        _id: "t_b_1",
        title: "Tenant B Operational Task",
        status: "Completed",
        priority: "Medium",
      },
    ]);

    await waitFor(() => {
      expect(screen.getByTestId("task-title")).toHaveTextContent(
        "Tenant B Operational Task"
      );
    });
    expect(screen.getByTestId("project-name")).toHaveTextContent(
      "Tenant B Project"
    );
  });

  test("3. Authenticated user to guest transition on session refresh clears privileged tenant cache", async () => {
    const queryClient = createTestQueryClient();

    vi.spyOn(authClient, "get")
      .mockResolvedValueOnce({
        data: {
          authenticated: true,
          guest: false,
          user: {
            user_id: "usr_priv_01",
            email: "priv@niyantran.com",
            tenant_id: "tenant_sensitive",
            roles: ["admin"],
            permissions: ["niyantran:admin"],
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
            user_id: "guest_downgrade_01",
            email: null,
            tenant_id: "tenant_default",
            roles: [],
            permissions: [],
            allowedApps: ["niyantran"],
            isGuest: true,
          },
        },
      });

    vi.spyOn(niyantranEndpoints, "fetchNiyantranTasks")
      .mockResolvedValueOnce([
        {
          _id: "t_priv",
          title: "Sensitive Tenant Task",
          status: "Pending",
          priority: "High",
        },
      ])
      .mockRejectedValueOnce(new Error("401 Unauthorized"));

    vi.spyOn(setuEndpoints, "getProjects")
      .mockResolvedValueOnce([
        { id: "p_priv", name: "Sensitive Project" } as never,
      ])
      .mockResolvedValueOnce([]);

    vi.spyOn(setuEndpoints, "getSetuAuthMe").mockResolvedValue({
      success: false,
      data: undefined,
    } as never);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider queryClient={queryClient}>
          <TenantOperationalHarness />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("task-title")).toHaveTextContent(
        "Sensitive Tenant Task"
      );
    });

    fireEvent.click(screen.getByTestId("refresh-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("guest");
    });

    expect(screen.getByTestId("task-title")).toHaveTextContent("none");
    expect(screen.getByTestId("project-name")).toHaveTextContent("none");
    expect(
      queryClient
        .getQueryCache()
        .getAll()
        .some((q) => JSON.stringify(q.queryKey).includes("tenant_sensitive"))
    ).toBe(false);
  });

  test("4. Missing tenant state blocks EvidenceLayout SETU dashboard tenant_id fallback", async () => {
    const queryClient = createTestQueryClient();

    vi.spyOn(authClient, "get").mockResolvedValueOnce({
      data: {
        authenticated: true,
        guest: false,
        user: {
          user_id: "usr_missing_tenant_01",
          email: "op@blackholeinfiverse.com",
          tenant_id: null,
          roles: ["operator"],
          permissions: ["operator:console_access"],
          allowedApps: ["niyantran"],
          isGuest: false,
        },
      },
    });

    vi.spyOn(endpoints, "fetchTelemetryDashboard").mockResolvedValue({
      timestamp: "2026-11-25T10:00:00.000Z",
      recent_telemetry: [
        {
          id: "tel_1",
          trace_id: "trace_missing_tenant_test",
          event: "runtime.tick",
          timestamp: "2026-11-25T10:00:00.000Z",
          severity: "info",
        } as never,
      ],
    } as never);
    vi.spyOn(bucketEndpoints, "fetchBucketArtifacts").mockResolvedValue({
      artifacts: [],
    } as never);
    vi.spyOn(bucketEndpoints, "fetchAuditRecent").mockResolvedValue({
      operations: [],
    } as never);
    vi.spyOn(pranaEndpoints, "fetchPranaPropagationLog").mockResolvedValue({
      logs: [],
    } as never);
    vi.spyOn(karmaEndpoints, "fetchKarmaLatestHash").mockResolvedValue({
      latest_hash: "abc123",
      hash_type: "sha256",
    } as never);
    vi.spyOn(rajyaEndpoints, "fetchSovereignTraces").mockResolvedValue([] as never);
    vi.spyOn(pravahEndpoints, "getPravahTraceRegistry").mockResolvedValue({
      evidence_bundles: [],
    } as never);
    vi.spyOn(sanskarEndpoints, "getTrace").mockResolvedValue({} as never);

    vi.spyOn(setuEndpoints, "getSetuDashboard").mockResolvedValue({
      trace_id: "trace_missing_tenant_test",
      tenant_id: "tenant_unrelated_from_setu_dashboard",
      execution_id: "exec_01",
    } as never);

    const setuMeSpy = vi
      .spyOn(setuEndpoints, "getSetuAuthMe")
      .mockResolvedValue({
        success: true,
        data: { user: { _id: "setu_1", tenant_id: "tenant_setu_me" } },
      } as never);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider queryClient={queryClient}>
          <EvidenceLayout />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/trace_missing_tenant_test/).length).toBeGreaterThan(0);
    });

    // Wait for SETU dashboard query to settle cleanly
    await waitFor(() => {
      expect(setuEndpoints.getSetuDashboard).toHaveBeenCalled();
    });

    // Neither setuDashboard.data.tenant_id nor getSetuAuthMe may leak into missing_tenant UI
    expect(setuMeSpy).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/tenant_unrelated_from_setu_dashboard/)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/tenant_setu_me/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Tenant:/)).not.toBeInTheDocument();
  });
});
