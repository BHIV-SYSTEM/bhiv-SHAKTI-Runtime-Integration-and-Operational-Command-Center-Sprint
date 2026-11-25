# NIYANTRAN KENDRA — Product Rebranding & BHIV Core Authentication Integration

- **Feature Branch**: `feature/niyantran-kendra-auth-integration`
- **Baseline `main` HEAD SHA**: `0dccd4f3c1c8116ac4ff28229cff6d86f6d405ad`
- **Canonical Product Name**: `NIYANTRAN KENDRA`
- **Canonical Subtitle**: `Runtime Integration & Operational Command Center`
- **Canonical Application Slug**: `niyantran`
- **Canonical Production URL**: `https://niyantran.blackholeinfiverse.com`
- **Central Authentication Authority**: BHIV Core Auth (`blackhole_auth` — `https://auth.blackholeinfiverse.com`)

---

## 1. Architecture Before and After

### Before (`0dccd4f3`)
- **Branding**: Configured in `src/config/dashboard.config.ts` as `systemName: "SHAKTI"`, `subtitle: "Operational Command Center"`, `<title>shakti-command-center</title>`, and static header badge `"Operator" / "Grid Control"`.
- **Authentication**: `src/hooks/useAuth.ts` returned a hard-coded mock (`isAuthenticated: true`, `{ id: "usr_123", name: "P. Bhuwad", role: "operator" }`) with no-op `login()` and `logout()`.
- **Authorization**: `src/hooks/useAuthorization.ts` relied on the mock user and defaulted to `return true` for any unrecognized permission string.
- **Header**: `src/components/layout/Header.tsx` rendered static branding labels without inspecting session state.

### After
- **Branding**: Configured via the existing `DashboardProvider` mechanism (`defaultDashboardConfig.branding`) with `systemName: "NIYANTRAN KENDRA"`, `subtitle: "Runtime Integration & Operational Command Center"`, `appSlug: "niyantran"`, and `productionUrl: "https://niyantran.blackholeinfiverse.com"`, plus updated HTML `<title>` and metadata.
- **Centralized Session Architecture**:
  ```
  Browser (HttpOnly cookie: blackhole_token on .blackholeinfiverse.com)
     │
     ├──► AuthProvider (src/context/AuthContext.tsx)
     │       ├── Boot Check: GET ${VITE_AUTH_SERVER_URL}/api/auth/sso/session?app=niyantran (withCredentials: true)
     │       ├── Sign-In Popup: ${VITE_AUTH_UI_URL || VITE_AUTH_SERVER_URL}/login?embed=1&app=niyantran
     │       ├── PostMessage Verification: exact origin match + data.type === "blackhole-auth-success"
     │       └── Global Logout: POST ${VITE_AUTH_SERVER_URL}/api/auth/logout (withCredentials: true) -> refreshSession()
     │
     ├──► useAuth() & useAuthorization() (Single Source of Truth, Strict Default-Deny RBAC)
     │       ├── Header.tsx (Loading / Guest Read-Only + Sign In / Verified Identity + Logout / 403 Access Denied)
     │       └── DashboardLayout.tsx (Read-Only Guest Entry, Non-Blocking Auth Offline Banner, 403 App Access Gate)
     │
     └──► Existing Runtime API Layer (100% Preserved & Isolated)
             ├── src/api/client.ts (Control Plane Axios client + W3C/header correlation extractor)
             ├── src/api/{bucket,prana,niyantran,insightflow,tantra,rajya,sanskar,karma,keshav,setu,pravah,mitra}Endpoints.ts
             └── MITRA Companion (<mitra-companion host-app="shakti">)
  ```

---

## 2. Files Changed

Zero existing dashboard modules, zone layouts, or runtime API clients were deleted or replaced.

| Commit | File | Action | Summary |
| :--- | :--- | :---: | :--- |
| `1` | `src/config/dashboard.config.ts` | Modified | Set `systemName: "NIYANTRAN KENDRA"`, `subtitle: "Runtime Integration & Operational Command Center"`, `appSlug: "niyantran"`, `productionUrl`, and safe `Guest / Read-Only` fallback labels. |
| `1` | `src/types/dashboard.types.ts` | Modified | Added optional `appSlug` and `productionUrl` fields to `DashboardBranding`. |
| `1` | `index.html` | Modified | Updated `<title>` and meta tags to `NIYANTRAN KENDRA`; preserved `<mitra-companion host-app="shakti">`. |
| `1` | `README.md` | Modified | Updated visible product heading and overview to NIYANTRAN KENDRA. |
| `1` | `TESTING.md` | Modified | Updated visible testing guide heading to NIYANTRAN KENDRA. |
| `2` | `src/types/auth.ts` | Created | Defined `CANONICAL_APP_SLUG`, explicit `AuthSessionStatus`, `AuthUser`, `BhivAuthError`, and `AuthContextValue`. |
| `2` | `src/api/authClient.ts` | Created | Dedicated Axios SSO client (`withCredentials: true`), independent `VITE_AUTH_SERVER_URL` / `VITE_AUTH_UI_URL` resolution, distinct `401` / `403 app_access_denied` / `403 signin_required` classification, and payload normalization. |
| `2` | `src/utils/authorization.ts` | Created | Explicit `CAPABILITY_POLICY_MATRIX`, role hierarchy evaluation, strict default-deny `evaluateUserPermission`, and `isBackendMutationAllowed` upstream-enforcement guard. |
| `2` | `src/context/authContextValue.ts` | Created | Isolated React `AuthContext` instance (satisfies `react-refresh/only-export-components`). |
| `2` | `src/context/AuthContext.tsx` | Created | `<AuthProvider>` implementing SSO bootstrap, popup login, exact-origin `postMessage` validation, post-login revalidation + action retry, and central logout. |
| `2` | `src/hooks/useAuth.ts` | Replaced Mock | Consumes `AuthContext` with fail-closed unauthenticated fallback outside provider. |
| `2` | `src/hooks/useAuthorization.ts` | Replaced Mock | Claim-backed `hasRole`, `hasPermission` (default-deny + `backendMutationVerified` enforcement), `canExecuteMutation`, and `guardAction`. |
| `2` | `src/hooks/useCurrentTenant.ts` | Modified | Prioritizes verified BHIV Core SSO `tenant_id` as authoritative for authenticated operators, rejects guest placeholder tenants, and preserves SETU `/api/auth/me` fallback. |
| `2` | `src/main.tsx` | Modified | Wrapped `<App />` in `<AuthProvider>` inside `<QueryClientProvider>` without changing React Query defaults. |
| `2` | `src/components/layout/Header.tsx` | Modified | Live session badge (`Verifying Session`, `Guest / Read-Only` + `Sign In`, verified `email` / role + `Logout`, `Auth Unavailable` + `Retry`, `Access Denied`). |
| `2` | `src/layouts/DashboardLayout.tsx` | Modified | Added explicit `403 Access Denied` view when a real user's `allowedApps` excludes `niyantran`, and non-blocking banner when auth server is unreachable. |
| `2` | `src/vite-env.d.ts` | Modified | Typed `VITE_AUTH_SERVER_URL`, `VITE_AUTH_UI_URL`, `VITE_MITRA_URL`, and `VITE_MITRA_LIVE_URL`. |
| `2` | `.env` | Modified | Added `VITE_AUTH_SERVER_URL="https://auth.blackholeinfiverse.com"` and `VITE_AUTH_UI_URL=""` alongside preserved proxy URLs. |
| `2` | `.env.example` | Created | Safe, secret-free environment configuration template. |
| `2` | `.gitignore` | Modified | Added `.env.secret*` pattern alongside `*.local`. |
| `3` | `src/test/auth.test.tsx` | Created | 13 unit/integration tests covering all 14 Phase 7 auth, RBAC, popup security, correlation, and offline scenarios. |
| `3` | `playwright.config.ts` | Modified | Added `webServer` configuration (`npm run dev -- --port 5173`) for reproducible E2E execution. |
| `3` | `src/test/e2e/dashboard.spec.ts` | Modified | 4 Chromium E2E tests validating NIYANTRAN KENDRA branding, guest entry, responsive grid, authenticated logout, Access Denied enforcement, and MITRA `host-app="shakti"` compatibility. |
| `4` | `docs/NIYANTRAN_KENDRA_AUTH_INTEGRATION.md` | Created | Architecture, contract, security audit, deployment migration proposal, and rollback documentation. |

---

## 3. Session Contract

Verified against `blackhole_auth` (`GUEST_MODE.md`, `backend/src/app.js`, `backend/src/middleware/blackholeAuth.js`, `backend/data/apps.json`):

- **Cookie**: `blackhole_token` (`HttpOnly`, `Secure` in production, `SameSite=Lax`, `Path=/`, `Domain=.blackholeinfiverse.com`). Never read via `document.cookie` or persisted to `localStorage` / `sessionStorage`.
- **Verification Endpoint**:
  ```http
  GET ${VITE_AUTH_SERVER_URL}/api/auth/sso/session?app=niyantran
  Credentials: include
  ```
- **Explicit Frontend States (`AuthSessionStatus`)**:
  1. `loading`: Initial session request in flight; protected actions blocked.
  2. `guest`: Server returned `200` with `guest: true` or `user.isGuest: true`. Normalized to `{ isGuest: true, email: null, tenant_id: null, roles: [], permissions: [] }` with `isAuthenticated: false`. Dashboard renders read-only without redirecting.
  3. `authenticated`: Server returned `200` with `authenticated: true`, `guest: false`, `!user.isGuest`, valid `user_id`, AND `allowedApps` containing `"niyantran"` (case-insensitive). Exposes only verified claims (`user_id`, `email`, `tenant_id`, `roles`, `permissions`, `allowedApps`, `isGuest: false`).
  4. `unauthenticated`:
     - Standard signed-out / invalid token (`401` or `authenticated: false`): `isAccessDenied: false`.
     - Disallowed application / revoked lifecycle (`403` from SSO endpoint OR `200` real user missing `"niyantran"` in `allowedApps`): `isAccessDenied: true`, rendering the explicit Access Denied screen with a Sign Out action.
  5. `error`: Auth server unreachable, network timeout, `5xx`, or missing `VITE_AUTH_SERVER_URL`. Dashboard remains available for read-only telemetry with a warning banner while blocking all protected actions.

---

## 4. Security Boundaries & Legacy Token Dependency Audit

### Enforced Security Controls
- **No Frontend Secrets**: `JWT_SECRET` is never referenced or added to Vite variables.
- **HttpOnly Cookie Isolation**: `blackhole_token` is managed exclusively by the browser cookie jar and central BHIV Auth server (`credentials: "include"` / `withCredentials: true`).
- **Zero Client-Supplied Trust**: Browser storage values are never used to populate BHIV `user_id`, `email`, `tenant_id`, `roles`, `permissions`, or `allowedApps`.
- **Strict PostMessage Origin & Window Source Verification**: `AuthContext` requires `popupWindowRef.current !== null`, `event.source === popupWindowRef.current`, `event.origin === extractExactOrigin(authUiUrl)`, and `event.data?.type === "blackhole-auth-success"`, rejecting `null` or mismatched sources and arbitrary origins.
- **Strict Claim Validation**: `normalizeSsoSessionPayload` classifies a session as `authenticated` only when `authenticated === true`, `guest === false`, `user.isGuest === false`, `user_id` is valid, `roles`/`permissions`/`allowedApps` are arrays, and `allowedApps` includes `niyantran`. Contradictory or incomplete claims fail closed.
- **Authoritative Tenant Boundary**: `useCurrentTenant` prioritizes verified BHIV SSO `tenant_id` for authenticated users and returns `missing_tenant` if a real BHIV user lacks `tenant_id` (never substituting a legacy SETU tenant); SETU `/api/auth/me` fallback runs only for guest or unauthenticated sessions.
- **Role-Aligned Default-Deny RBAC**: Removed generic `write` and `all` permissions from protected/admin capabilities (`operator:console_access`, `audit:inspect_protected`, and mutations) and enforced `policy.allowedRoles` eligibility whenever a user carries roles so `candidate` users cannot escalate via generic permissions.
- **Distinct Error Handling**: `classifyAuthError` separates `401` (`unauthenticated`), `403` with `code: "signin_required"` (`signin_required`), `403` without `signin_required` (`app_access_denied`), and network/`5xx` (`unavailable`). Unrelated runtime API errors never open login popups.

### Documented Legacy `localStorage` Dependencies (Preserved Pending Separate Upstream Migration)
Per operational safety constraints, existing runtime service clients were **not** stripped of their legacy headers until each owning backend migrates to `blackhole_token` verification:
1. `src/api/niyantranEndpoints.ts` (lines 38–45): Reads `localStorage.getItem("WorkflowToken")` and sends `x-auth-token` to `https://niyantran.blackholeinfiverse.com` (`workflow-blackhole` currently validates `x-auth-token` in `server/middleware/auth.js`).
2. `src/api/tantraEndpoints.ts` (lines 29–38): Reads `localStorage.getItem("token")` for `Authorization: Bearer <token>`.
3. `src/api/setuEndpoints.ts` (lines 36–45) & `src/hooks/useCurrentTenant.ts`: Reads `localStorage.getItem("token") || localStorage.getItem("WorkflowToken")` when calling `GET /api/auth/me` on SETU.
4. `public/mitra/src/*`: Embedded MITRA Shadow-DOM companion manages its own `mitra_*` / `authToken` keys in `localStorage` against `https://mitra.blackholeinfiverse.com` with `host-app="shakti"`.

NIYANTRAN KENDRA's new BHIV Core SSO layer writes **zero** tokens to `localStorage` or `sessionStorage`.

---

## 5. Guest and Authenticated User Flows

1. **Initial Boot (Guest Mode)**:
   - User opens NIYANTRAN KENDRA -> `<AuthProvider>` enters `loading` -> calls `GET /api/auth/sso/session?app=niyantran` with `withCredentials: true`.
   - When no real account cookie exists, BHIV Auth mints a 24h `blackhole_token` guest cookie and returns `{ authenticated: true, guest: true, user }`.
   - UI transitions to `guest`, displays `Guest / Read-Only` + `Sign In` in the header, and renders all read-only operational telemetry surfaces without forcing login.
2. **Gated Action -> Sign-In Popup -> Revalidation**:
   - Guest clicks `Sign In` or triggers `guardAction(capability, callback)`.
   - Callback is held in memory without executing; `window.open("${authUiUrl}/login?embed=1&app=niyantran", "bhiv-signin", "width=420,height=520")` opens BHIV Core's embedded login view.
   - Upon login, popup posts `{ type: "blackhole-auth-success" }` to `window.opener` and closes.
   - `AuthProvider` verifies exact `event.origin`, calls `refreshSession()`, verifies the user is `authenticated` (`!isGuest`, `niyantran` in `allowedApps`, and holds `requiredPermission`), and only then executes the queued action.
3. **Central Logout**:
   - User clicks `Logout` -> calls `POST ${VITE_AUTH_SERVER_URL}/api/auth/logout` with `withCredentials: true` -> clears `blackhole_token` -> calls `refreshSession()` -> BHIV Auth issues a fresh guest session and UI returns smoothly to `Guest / Read-Only`.

---

## 6. Authorization Matrix & Mutation Audit

### Capability Policy Matrix (`src/utils/authorization.ts`)

| Capability | `isMutation` | Guest (`isGuest: true`) | Candidate (`niyantran` allowed) | Operator (`niyantran` allowed) | Admin (`niyantran` allowed) | `backendMutationVerified` | Effective Runtime Verdict |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `dashboard:view` / `view_dashboard` | `false` | Allow | Allow | Allow | Allow | `true` | **Allowed** |
| `telemetry:read` | `false` | Allow | Allow | Allow | Allow | `true` | **Allowed** |
| `evidence:read` | `false` | Allow | Allow | Allow | Allow | `true` | **Allowed** |
| `replay:read` | `false` | Allow | Allow | Allow | Allow | `true` | **Allowed** |
| `health:read` | `false` | Allow | Allow | Allow | Allow | `true` | **Allowed** |
| `operator:console_access` | `false` | **Deny (Popup)** | **Deny** | Allow | Allow | `true` | **Allowed for Operator/Admin** |
| `audit:inspect_protected` | `false` | **Deny (Popup)** | **Deny** | Allow | Allow | `true` | **Allowed for Operator/Admin** |
| `execute_workflow` / `workflow:execute` | `true` | **Deny** | **Deny** | Claim Only | Claim Only | **`false`** | **Blocked Across All UI Paths** |
| `replay:trigger` | `true` | **Deny** | **Deny** | Claim Only | Claim Only | **`false`** | **Blocked Across All UI Paths** |
| `alerts:acknowledge` | `true` | **Deny** | **Deny** | Claim Only | Claim Only | **`false`** | **Blocked Across All UI Paths** |
| `intelligence:write` | `true` | **Deny** | **Deny** | **Deny** | Claim Only | **`false`** | **Blocked Across All UI Paths** |
| `configure_system` / `system:configure` | `true` | **Deny** | **Deny** | **Deny** | Claim Only | **`false`** | **Blocked Across All UI Paths** |
| *Any Unknown / Unmapped Action* | N/A | **Deny** | **Deny** | **Deny** | **Deny** | `false` | **Blocked (Default-Deny)** |

### Dashboard & Upstream Backend Mutation Audit
- **Dashboard React Codebase (`src/`)**: Contains **zero** state-mutating HTTP requests (`POST /intelligence/confidence/:id` and `POST /intelligence/reasoning/:id` in `src/api/karmaEndpoints.ts` are stateless read/scoring evaluations).
- **Upstream Enforcement Gate**: Because upstream runtime microservices do not all independently verify `blackhole_token` + `isGuest: false` on write routes yet, `backendMutationVerified` is set to `false` on all state-mutating capabilities (`isMutation: true`). `evaluateUserPermission` (`hasPermission`), `isBackendMutationAllowed` (`canExecuteMutation`), `guardAction`, `executeProtectedAction`, and post-login queued retries **all** enforce `!(policy.isMutation && !policy.backendMutationVerified)`, and `login()` accepts no callback parameters — eliminating every alternate UI bypass path.

---

## 7. Configuration Requirements

### Frontend Build-Time Variables (`.env` / `.env.example`)
- `VITE_AUTH_SERVER_URL`: Canonical BHIV Auth API base URL (`https://auth.blackholeinfiverse.com` in production; e.g. `http://localhost:8080` in `.env.local` for local dev).
- `VITE_AUTH_UI_URL`: Optional independent origin for the BHIV Auth Login SPA hosting `/login?embed=1&app=niyantran` (defaults to `VITE_AUTH_SERVER_URL` when empty; set to `https://products.blackholeinfiverse.com` or `http://localhost:5173` when the Auth SPA runs on a separate host/port from the Express API).

### Auth Service (`blackhole_auth`) Production Requirements
- `COOKIE_DOMAIN=.blackholeinfiverse.com`
- `COOKIE_SECURE=true`
- `COOKIE_SAME_SITE=lax`
- `HttpOnly=true` (`blackhole_token`)
- HTTPS enabled across `auth.blackholeinfiverse.com`, `products.blackholeinfiverse.com`, and `niyantran.blackholeinfiverse.com`
- `CORS_ORIGINS` includes `https://niyantran.blackholeinfiverse.com` (and `https://niyantrankendra.blackholeinfiverse.com` where applicable) with `credentials: true`

---

## 8. Test Results (Executed)

All verification commands were executed on `feature/niyantran-kendra-auth-integration`:

1. **Targeted ESLint on all 17 modified & newly created TS/TSX files**:
   - Command: `npx eslint src/types/dashboard.types.ts src/config/dashboard.config.ts src/types/auth.ts src/api/authClient.ts src/utils/authorization.ts src/context/authContextValue.ts src/context/AuthContext.tsx src/hooks/useAuth.ts src/hooks/useAuthorization.ts src/hooks/useCurrentTenant.ts src/main.tsx src/components/layout/Header.tsx src/layouts/DashboardLayout.tsx src/vite-env.d.ts src/test/auth.test.tsx playwright.config.ts src/test/e2e/dashboard.spec.ts`
   - Result: **PASS** (`Exit Code 0` — `0 errors, 0 warnings`)
2. **Full Repository Lint (`npm run lint`)**:
   - Result: `Exit Code 1` — `195 problems (183 errors, 12 warnings)`, down from `198` on baseline `0dccd4f3` (**zero** newly introduced errors or warnings).
3. **Production Type-Check & Bundle Build (`npm run build`)**:
   - Command: `tsc -b && vite build`
   - Result: **PASS** (`Exit Code 0` — `2,518 modules transformed`, `0` TypeScript errors).
4. **Unit & Integration Tests (`npm run test`)**:
   - Command: `vitest run`
   - Result: **PASS** (`Exit Code 0` — `10/10` test suites passed, `92/92` tests passed: `76` existing + `16` new auth/RBAC/tenant/security/correlation/offline tests).
5. **End-to-End Browser Tests (`npm run test:e2e`)**:
   - Command: `playwright test`
   - Result: **PASS** (`Exit Code 0` — `4/4` Chromium E2E tests passed in `3.7s`; `4 skipped` in `production-live.spec.ts` as expected when `PRODUCTION_URL` is unset).

---

## 9. Known Limitations

1. **Split Auth API vs. Login SPA Hosting**: In `blackhole_auth`, Express (`backend/src/app.js`) serves `/api/*` while the React SPA (`frontend/src/pages/LoginPage.jsx`) serves `/login?embed=1&app=niyantran`. If `https://auth.blackholeinfiverse.com` only proxies to Express without serving the SPA on `/login`, `VITE_AUTH_UI_URL` must be set at build time to the Auth Launcher SPA origin (e.g. `https://products.blackholeinfiverse.com`).
2. **Legacy Upstream Auth Contracts**: Niyantran (`workflow-blackhole`), Tantra, and Setu endpoints continue to use their existing `x-auth-token` / `Bearer` contracts until migrated to `blackhole_token`.
3. **Pre-Existing Unrelated Lint Debt**: 198 pre-existing `@typescript-eslint/no-explicit-any` / `no-unused-vars` / `react-refresh` lint issues in untouched files remain unchanged per scope rules.
4. **Documented Upstream 404 Secondary Routes**: SANSKAR (`/ranking`, `/trace/:id`) and InsightFlow (`/stage-metrics`, `/bucket/status`) secondary routes continue to rely on existing resilient empty fallbacks.

---

## 10. Isolated Deployment Migration Proposal (Not Executed)

Production Docker resources, CI/CD workflows, VM paths, and port mapping (`5176:5173`) were kept **unchanged** in this integration. When infrastructure migration from `shakti-*` naming to `niyantran-kendra-*` is separately approved, execute the following staged cutover:

| Resource | Current Production Value | Proposed Target Value | Safe Cutover Strategy |
| :--- | :--- | :--- | :--- |
| **Docker Image** | `bhiv/shakti-dashboard:<sha7>` | `bhiv/niyantran-kendra-dashboard:<sha7>` | Dual-push both image tags for one release cycle before retiring `bhiv/shakti-dashboard`. |
| **Container Name** | `shakti-dashboard` | `niyantran-kendra-dashboard` | Stop old compose stack (`docker compose -f ~/SHAKTI/docker-compose.production.yml down`) immediately prior to starting new stack so port `5176` does not collide. |
| **Compose Service** | `Shakti-dashboard` | `niyantran-kendra-dashboard` | Update `docker-compose.production.template.yml` and `docker-compose.yml` in a dedicated DevOps PR. |
| **Docker Network** | `shakti-network` | `niyantran-kendra-network` | Bridge network is container-local (Nginx proxies via `127.0.0.1:5176`); safe to switch alongside compose service cutover. |
| **VM Directory & Release History** | `~/SHAKTI` & `/var/tmp/SHAKTI/RELEASE_HISTORY.md` | `~/NIYANTRAN_KENDRA` & `/var/tmp/NIYANTRAN_KENDRA/RELEASE_HISTORY.md` | Copy existing `/var/tmp/SHAKTI/RELEASE_HISTORY.md` into `/var/tmp/NIYANTRAN_KENDRA/RELEASE_HISTORY.md` **before** switching `cicd.yml` so automated rollback history is preserved. |
| **Port Mapping** | `5176:5173` | **`5176:5173` (Keep Unchanged)** | Preserves zero-downtime compatibility with host-level Nginx upstream `http://127.0.0.1:5176`. |
| **Health Checks** | Container: `curl -f http://localhost:5173`<br>VM CI: `curl -sf http://localhost:5176` | Same probes on `5173` / `5176` | Verify `HTTP 200 OK` and `<title>NIYANTRAN KENDRA` in CI health loop. |
| **Build-Time `VITE_*` Args** | `cicd.yml` passes unused secret `--build-arg` flags | Pass only non-secret `VITE_AUTH_SERVER_URL` & `VITE_AUTH_UI_URL` | Remove `VITE_NIYANTRAN_AUTH_TOKEN`, `VITE_NIYANTRAN_EXECUTION_KEY`, and `VITE_TANTRA_BRIDGE_SIGNATURE` from Docker build args so secrets can never enter client bundles. |

---

## 11. Rollback Procedure

### Git / Code Rollback (Pre-Merge or Post-Merge)
```bash
# Return local branch or main reference to exact pre-integration baseline SHA:
git checkout main
git reset --hard 0dccd4f3c1c8116ac4ff28229cff6d86f6d405ad
```

### Production VM Container Rollback (If Deployed in Future)
```bash
cd ~/SHAKTI
# Inspect last healthy 7-char SHA (e.g. from RELEASE_HISTORY.md)
tail -n 10 docs/RELEASE_HISTORY.md
sed "s|IMG_TAG|<LAST_HEALTHY_SHA7>|g" docker-compose.production.template.yml > docker-compose.production.yml
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d --remove-orphans
curl -sf http://localhost:5176 > /dev/null && echo "Rollback healthy"
```

---

## 12. Outstanding Decisions

1. **Auth Popup Origin Confirmation in Production**: Confirm with BHIV Auth / DevOps whether `https://auth.blackholeinfiverse.com/login?embed=1&app=niyantran` is reverse-proxied directly to the Auth SPA (`VITE_AUTH_UI_URL=""`) or whether `VITE_AUTH_UI_URL="https://products.blackholeinfiverse.com"` (or `https://pravesh.blackholeinfiverse.com`) should be baked into the production image.
2. **MITRA `host-app` Identifier**: Confirm with the MITRA team whether `host-app="niyantran"` is accepted before changing `host-app="shakti"` in `index.html` and `MitraFloatingCompanion.tsx`.
3. **PRAVAH `X-Source-System` Header**: Confirm with the PRAVAH team before changing `X-Source-System: "SHAKTI"` in `src/api/pravahEndpoints.ts` and `vite.config.ts`.
4. **Upstream `blackhole_token` Adoption**: Coordinate with Niyantran (`workflow-blackhole`), Setu, and Tantra service owners to accept `blackhole_token` SSO cookies and enforce `isGuest: false` on mutations so legacy `localStorage` tokens can be retired.
5. **Infrastructure Rename Approval**: Approve a separate DevOps change window to execute the Section 10 Docker/VM naming migration and remove unused secret `--build-arg` flags from `.github/workflows/cicd.yml`.
