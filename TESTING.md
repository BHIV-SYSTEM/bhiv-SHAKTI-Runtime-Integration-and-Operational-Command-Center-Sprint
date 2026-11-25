# NIYANTRAN KENDRA - Testing Guide

This guide details the steps to set up, configure, and execute the test suites implemented for the **NIYANTRAN KENDRA** (`Runtime Integration & Operational Command Center`) dashboard. 

The test stack covers:
- **Unit and Component Tests**: Powered by [Vitest](https://vitest.dev/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).
- **End-to-End (E2E) Tests**: Powered by [Playwright](https://playwright.dev/).

---

## 1. Setup & Installation

Before running any tests, install the dependencies configured in `package.json`:

```bash
# Navigate to the frontend directory
cd shakti-command-center

# Install dependencies (installs Vitest, RTL, jsdom, and Playwright)
npm install

# Install Playwright browser binaries (required for E2E tests)
npx playwright install chromium
```

---

## 2. Vitest Unit & Component Tests

Vitest is configured with `jsdom` to mock a browser DOM environment. 

### Coverage Summary
- **[ErrorBoundary.test.tsx](file:///c:/Pratik_Bhuwad/shakti-command-center/src/test/ErrorBoundary.test.tsx)**: Asserts uncaught component crash capturing, fallback UI rendering, and the state reset flow.
- **[DashboardCard.test.tsx](file:///c:/Pratik_Bhuwad/shakti-command-center/src/test/DashboardCard.test.tsx)**: Tests `DashboardCard` render states (Loading, Success, Empty, Error, Offline), caching behaviors, and metadata status computation.
- **[layouts.test.tsx](file:///c:/Pratik_Bhuwad/shakti-command-center/src/test/layouts.test.tsx)**: Mocks TanStack hooks to verify rendering logic and empty states for the `ExecutiveLayout`, `RuntimeHealthLayout`, and `WorkflowLayout` components.
- **[DecisionIntelligenceLayout.test.tsx](file:///c:/Pratik_Bhuwad/shakti-command-center/src/test/DecisionIntelligenceLayout.test.tsx)**: Verifies the mock hook orchestration and details of the decision intelligence logs list.
- **[integration.test.tsx](file:///c:/Pratik_Bhuwad/shakti-command-center/src/test/integration.test.tsx)**: Evaluates root level React context mappings, branding details, and routing states.

### Execution Instructions

```bash
# Run the test suite once
npm run test

# Run Vitest in interactive watch mode (live re-runs on changes)
npm run test:watch
```

---

## 3. Playwright End-to-End Tests

Playwright E2E tests validate rendering integrity and viewport responsiveness.

### Coverage Summary
- **[dashboard.spec.ts](file:///c:/Pratik_Bhuwad/shakti-command-center/src/test/e2e/dashboard.spec.ts)**:
  - Asserts main container visibility and headers.
  - Verifies presence of all core layout widgets (`Executive`, `Runtime Health`, `Pipelines`, `Replay`).
  - Simulates responsive viewports (Desktop `1280x800` grid layout and Mobile `375x667` stack layout).

### Execution Instructions

> [!IMPORTANT]
> The local development server must be running before starting E2E tests.

```bash
# Step 1: Start the local dev server in one terminal
npm run dev

# Step 2: Run the Playwright test suite in another terminal
npm run test:e2e

# Run Playwright tests with the UI visual runner
npx playwright test --ui
```

---

## 4. Test Files Map

- **Configurations**:
  - [vitest.config.ts](file:///c:/Pratik_Bhuwad/shakti-command-center/vitest.config.ts)
  - [playwright.config.ts](file:///c:/Pratik_Bhuwad/shakti-command-center/playwright.config.ts)
  - [setup.ts](file:///c:/Pratik_Bhuwad/shakti-command-center/src/test/setup.ts)
- **Unit/Component Test Files**:
  - [ErrorBoundary.test.tsx](file:///c:/Pratik_Bhuwad/shakti-command-center/src/test/ErrorBoundary.test.tsx)
  - [DashboardCard.test.tsx](file:///c:/Pratik_Bhuwad/shakti-command-center/src/test/DashboardCard.test.tsx)
  - [layouts.test.tsx](file:///c:/Pratik_Bhuwad/shakti-command-center/src/test/layouts.test.tsx)
  - [DecisionIntelligenceLayout.test.tsx](file:///c:/Pratik_Bhuwad/shakti-command-center/src/test/DecisionIntelligenceLayout.test.tsx)
  - [integration.test.tsx](file:///c:/Pratik_Bhuwad/shakti-command-center/src/test/integration.test.tsx)
- **E2E Test Files**:
  - [dashboard.spec.ts](file:///c:/Pratik_Bhuwad/shakti-command-center/src/test/e2e/dashboard.spec.ts)
