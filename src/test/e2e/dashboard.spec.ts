import { test, expect } from "@playwright/test";

test.describe("NIYANTRAN KENDRA Dashboard E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Stub BHIV Core SSO session check to return canonical Guest Mode session deterministically
    await page.route("**/api/auth/sso/session*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "Access-Control-Allow-Origin": "http://localhost:5173",
          "Access-Control-Allow-Credentials": "true",
        },
        body: JSON.stringify({
          authenticated: true,
          guest: true,
          user: {
            user_id: "guest_e2e_niyantran",
            email: null,
            tenant_id: "tenant_default",
            roles: [],
            permissions: [],
            allowedApps: ["niyantran"],
            isGuest: true,
          },
        }),
      });
    });

    await page.goto("/");
  });

  test("should render NIYANTRAN KENDRA header branding, guest mode badge, and core layout zones", async ({ page }) => {
    await expect(page).toHaveTitle(
      /NIYANTRAN KENDRA — Runtime Integration & Operational Command Center/
    );

    const header = page.locator("header");
    await expect(header).toContainText("NIYANTRAN KENDRA");
    await expect(header).toContainText("Runtime Integration & Operational Command Center");
    await expect(header).toContainText("Guest");
    await expect(page.getByRole("button", { name: /sign in with bhiv core/i })).toBeVisible();

    // Verify core dashboard zones render without redirecting to a login page
    await expect(
      page.getByRole("region", { name: "Executive Command Center", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Runtime Health", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Workflow Layout", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Replay Layout", exact: true })
    ).toBeVisible();

    // Verify MITRA companion host-app compatibility attribute remains preserved
    await expect(page.locator("mitra-companion")).toHaveAttribute("host-app", "shakti");
  });

  test("should adapt to mobile and desktop viewport sizes", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator("header")).toContainText("NIYANTRAN KENDRA");
    await expect(
      page.getByRole("region", { name: "Executive Command Center", exact: true })
    ).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 800 });
    const mainGrid = page.locator("main > div.grid");
    await expect(mainGrid).toBeVisible();
  });

  test("should support authenticated SSO session and central logout back to Guest mode", async ({ page }) => {
    let loggedOut = false;

    await page.route("**/api/auth/sso/session*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "Access-Control-Allow-Origin": "http://localhost:5173",
          "Access-Control-Allow-Credentials": "true",
        },
        body: JSON.stringify(
          loggedOut
            ? {
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
              }
            : {
                authenticated: true,
                guest: false,
                user: {
                  user_id: "usr_e2e_admin",
                  email: "admin@niyantran.com",
                  tenant_id: "tenant_default",
                  roles: ["admin"],
                  permissions: ["all"],
                  allowedApps: ["niyantran"],
                  isGuest: false,
                },
              }
        ),
      });
    });

    await page.route("**/api/auth/logout*", async (route) => {
      loggedOut = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "Access-Control-Allow-Origin": "http://localhost:5173",
          "Access-Control-Allow-Credentials": "true",
        },
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/");
    const header = page.locator("header");
    await expect(header).toContainText("admin@niyantran.com");
    await expect(header).toContainText("ADMIN");

    await page.getByRole("button", { name: "Logout" }).click();
    await expect(header).toContainText("Guest");
    await expect(page.getByRole("button", { name: /sign in with bhiv core/i })).toBeVisible();
  });

  test("should enforce Access Denied view when real user lacks niyantran in allowedApps", async ({ page }) => {
    await page.route("**/api/auth/sso/session*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "Access-Control-Allow-Origin": "http://localhost:5173",
          "Access-Control-Allow-Credentials": "true",
        },
        body: JSON.stringify({
          authenticated: true,
          guest: false,
          user: {
            user_id: "usr_restricted_e2e",
            email: "restricted@gurukul.com",
            tenant_id: "tenant_mssu_kharghar",
            roles: ["candidate"],
            permissions: ["learning:read"],
            allowedApps: ["gurukul"],
            isGuest: false,
          },
        }),
      });
    });

    await page.goto("/");
    await expect(
      page.getByRole("alert", { name: "Application Access Denied" })
    ).toBeVisible();
    await expect(page.getByText("Access Denied to NIYANTRAN KENDRA")).toBeVisible();
  });
});
