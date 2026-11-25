# NIYANTRAN KENDRA — Runtime Integration & Operational Command Center

A production-grade, highly resilient, and configuration-driven React operational command center (`appSlug: niyantran`, production URL: `https://niyantran.blackholeinfiverse.com`) integrated with BHIV Core centralized SSO and ecosystem microservices.

## Overview
This is **NOT** a bespoke dashboard. This is a reusable, composable dashboard *capability* powered by a robust configuration schema (`DashboardProvider.tsx`). It provides 19 standardized `Layouts` and 16 reusable `Primitives`, allowing rapid assembly of diverse command center interfaces without touching backend services.

## Core Tenets
- **Configuration-Driven:** Layout visibility and structural spans are controlled via the central `DashboardProvider` which supports 19 configurable grid zones.
- **Graceful Degradation:** The frontend will never crash if the backend fails. Caching, retries, and offline banners ensure maximum data retention during outages.
- **Strict Architecture:** Adheres to a strict `Primitive -> Layout -> Grid` pattern.
- **Performance First:** Aggressive use of `React.lazy`, `<Suspense>`, and `useMemo` ensures lightning-fast renders.

## Features
- **19 Assembled Layouts:** Executive, Operations, Integrations, Evidence, Observability, Workflow, Operator Console, Runtime Health, Replay, plus BHEX operational surfaces (Repository, Build, Migration, Review, Capability Registries, Employee Execution, Engineering Capacity, Delivery Intelligence, Capability Dependency Graph).
- **Resilience:** Global Error Boundaries, Exponential API Backoff, and custom request timeouts per backend service.
- **Accessibility:** ARIA-live announcements for background updates and focus management.
- **Responsive:** Built on Tailwind CSS Grid, adapting elegantly from mobile to 4K displays.

## Stack
- **React 19**
- **TypeScript 6**
- **Vite 8**
- **Tailwind CSS v4**
- **TanStack Query (React Query v5)**

## Getting Started
```bash
npm install
npm run dev
```

## Testing Suite
The project contains a fully automated testing suite:
- **Unit & Component Testing:** Run `npm run test` (via Vitest and React Testing Library).
- **End-to-End Testing:** Run `npm run test:e2e` (via Playwright).

## Documentation Directory
Please refer to the `/docs` folder for deep-dive technical documentation:
1. `ARCHITECTURE.md` - Core structural paradigms.
2. `COMPONENT_LIBRARY.md` - Available primitives and layout components.
3. `DASHBOARD_CAPABILITY.md` - How to configure the DashboardProvider.
4. `RUNTIME_INTEGRATION.md` - Microservice API client and hook integration.
5. `INTEGRATION_GUIDE.md` - Connecting to backend services and environment variables.
6. `DEPLOYMENT_GUIDE.md` - CI/CD and Production build steps.
7. `TESTING_GUIDE.md` - Quality assurance and testing instructions.
8. `REVIEW_PACKET.md` - Executive review and sign-off criteria.
9. `CODE_PACKET.md` - Handover documentation.
