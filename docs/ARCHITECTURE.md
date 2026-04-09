# Architecture

## Purpose
- Describe the scaffold that exists today.
- Keep current runtime truth separate from later hardening targets.

## System shape
- Frontend: `frontend/` using React 19, Vite, TypeScript, and React Router.
- Backend: `backend/` using Express 5, Postgres, JWT cookie or bearer auth, and raw SQL repositories.
- Worker: `backend/worker.js` using BullMQ plus `ioredis` against the shared backend package.
- Shared runtime package: none.
- Static storage: backend serves local files from `/storage`.

## Planned BLN integration boundary
This section is the recommended target, not current runtime truth.

Current note:
- The backend-only logistics client foundation now exists in `backend/src/clients/logisticsClient.js`.
- The local `/api/v1/network` route family now exists as the first BLN bridge.
- The local `/api/v1/deliveries` route family now exists as the first BLN-backed delivery facade.
- The local `/api/v1/handoffs` route family is still planned, not implemented.

| Planned module | Local route prefix | External dependency | Notes |
|---|---|---|---|
| logistics client | backend-only | sibling `logistics-api` | Implemented foundation; wraps tenant bootstrap, token exchange, nodes, deliveries, events, and handoffs |
| network context | `/api/v1/network` | `logistics-api` tenant bootstrap, exchange, and nodes | Resolves the local user or admin session into BLN tenant and node context |
| deliveries facade | `/api/v1/deliveries` | `logistics-api` deliveries and events | Local backend composes remote delivery state for the frontend |
| handoffs facade | `/api/v1/handoffs` and `/api/v1/deliveries/:id/handoff-status` | `logistics-api` handoffs | Exposes custody-transfer workflows without leaking BLN secrets to the frontend |
| projections and jobs | local queue plus optional local DB | `logistics-api` reads, events, and health checks | Deferred until the remote facade exists and the app needs cached summaries or alerts |

## Frontend runtime boundaries
| Surface | Paths | Guard | Shell |
|---|---|---|---|
| Public | `/` | none | none |
| Auth | `/auth/*` | none | `AuthLayout` |
| User | `/dashboard/*` | `requireAuth` | `DashboardLayout` |
| Admin | `/admin/dashboard/*` | `adminLoader` | `AdminDashboardLayout` |
| Fallback | `*` | none | `ErrorPage` |

## Backend module boundaries
| Module | Route prefix | Current auth shape |
|---|---|---|
| auth | `/api/auth` | mixed public and authenticated routes |
| users | `/api/users` | authenticated; admin for list, self or admin for read and update |
| network | `/api/v1/network` | authenticated; admin-only bootstrap, actor-scoped context and node bridge routes |
| deliveries | `/api/v1/deliveries` | authenticated; actor-scoped BLN delivery and event facade routes |
| roles | `/api/roles` | admin-only |
| notifications | `/api/notifications` | authenticated |
| events | `/api/events` | public list, admin create |
| delivery-events | `/api/delivery-events` | public list, admin create |
| devices | `/api/devices` | authenticated |
| sessions | `/api/sessions` | authenticated |
| settings | `/api/settings` | public read |

## Archived local-first delivery route boundary
- Earlier planning packs assumed this repo would build `orders`, `drivers`, `deliveries`, `dispatch`, `tracking`, and `incidents` as app-owned runtime modules first.
- That local-first track is now archived while the active queue shifts to integrating the live `logistics-api` BLN surface.
- The existing local delivery tables remain real schema, but they are not the next active backend contract.

## Request and data flow
- Frontend:
  - route loader or page `useEffect`
  - service module
  - axios client with `withCredentials`
  - backend route
- Backend:
  - route
  - auth middleware when required
  - service
  - repository
  - Postgres

## Auth and authorization model
- Login returns an `idToken`.
- The backend also mints a session cookie from that token.
- Secure cross-origin deployments use `SameSite=None`; local insecure cookie flows stay `SameSite=Lax`.
- Protected routes accept the cookie and still allow bearer fallback.
- RBAC is derived from `users.roles` plus `roles.permissions`.
- `req.authz.roles` contains role documents, not only role ids.
- The first BLN bridge stores tenant or node binding in `users.preferences.bln`.
- The backend exchanges short-lived tenant access tokens on demand and does not persist them locally.
- The first BLN-backed delivery facade also uses exchanged tenant access for admin requests, because the sibling BLN delivery and event routes are tenant-scoped.

## Frontend composition model
- `main.tsx` wraps the app with:
  - `ToastProvider`
  - `AppProvider`
- The frontend now reads its API base from `window.__APP_CONFIG__.VITE_API_URL` first, then falls back to build-time `import.meta.env.VITE_API_URL`.
- Railway frontend containers generate `dist/runtime-config.js` at startup so the same image can boot against different backend domains per environment.
- Protected route loaders own auth bootstrap for dashboard and admin trees.
- Pages mostly fetch directly inside `useEffect` rather than through a shared cache layer.

## Schema and bootstrap boundary
- `npm run db:migrate` applies SQL migrations and records versions in `schema_migrations`.
- `npm run db:init` delegates to the migration runner.
- `npm run db:seed` runs the local seed.
- `npm run db:seed:bootstrap-admin` upserts one environment-driven scaffold admin.
- `npm run db:seed:demo` exists for guarded staging demo seeding.
- Preserved SQL artifacts:
  - `backend/migrations/0001_baseline.sql`
  - `backend/migrations/0002_phase1_contracts.sql`
  - `backend/migrations/0003_remove_app_registry_and_installed_apps.sql`
  - `backend/migrations/0004_rename_events_to_delivery_events.sql`
  - `backend/migrations/0005_restore_events_parent_and_split_delivery_events.sql`
  - `backend/migrations/0006_prune_non_delivery_child_events.sql`
  - `backend/migrations/0007_create_orders_and_drivers.sql`
  - `backend/migrations/0008_create_deliveries_and_assignments.sql`

## Async platform baseline
| Area | Current state | Gap | Recommended target |
|---|---|---|---|
| Queue runtime | `backend/package.json` now includes `bullmq` and `ioredis`, and shared queue config lives under `backend/src/core/queue` | No named queues or processors exist yet | Build later job slices on top of the shared queue runtime |
| Worker process | `backend/worker.js` can boot the queue runtime through `npm run worker`, and the shared backend Dockerfile now switches between `npm start` and `npm run worker` by `RAILWAY_SERVICE_NAME` | No processors are registered yet | Keep one worker service until real job load proves a split is needed |
| Deploy topology | The live Railway project now includes `Postgres`, `Redis`, `backend`, `worker`, and `frontend` in both `staging` and `production` | No queue workload or worker-specific health evidence exists yet | Use the live topology as the async base and add queue behavior in later slices instead of reworking service layout |
| Queue env contract | `REDIS_URL`, `BULLMQ_PREFIX`, and `WORKER_CONCURRENCY` are now the documented worker env contract | Queue names and job-specific retry policy are still undefined | Reuse the same env names for all later BullMQ slices |

## Transaction reality
- A transaction helper exists in `backend/src/core/db/postgres.js`.
- Current module code does not call that helper.
- Multi-write flows such as login and device registration still run without an explicit transaction boundary.

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| Generic workspace runtime is implemented | Older docs described broader or different surfaces | Keep architecture docs centered on auth, dashboards, notifications, settings, and admin operations |
| The repo now has local delivery schema plus a live sibling BLN backend to consume | The first BLN bridge and remote delivery facade now exist, but custody and handoff routes still are not exposed through local routes | Extend the same backend-owned bridge pattern to custody workflows before reviving local delivery modules |
| The migration runner is present and `db:init` delegates to it | Production bootstrap can otherwise be mistaken for demo seeding | Keep architecture docs anchored to the migration runner, the bootstrap-admin seed contract, and the current Railway workflow |
| The frontend now fails closed when `VITE_API_URL` is missing and Railway boot writes runtime config from the `frontend` service env | Older static builds could silently post `/api/*` requests back to the frontend origin when `VITE_API_URL` was absent at build time | Keep runtime API-base injection explicit so one frontend image can target the matching backend domain per Railway environment |
| Route handlers still return mostly raw JSON payloads | The API is not yet uniformly shaped | Harden deliberately instead of documenting an idealized contract |
| `POST /api/events` and `POST /api/delivery-events` are narrowed to admin access | Signed or internal-only ingestion is still undefined, and lifecycle-owned producers do not exist yet | Keep both write surfaces narrow until a clearer producer model exists |
| The live backend now has `/api/v1/network`, `/api/v1/deliveries`, plus unversioned scaffold routes | The BLN-backed app boundary is still incomplete, and the next route families could drift back into ad hoc integration | Keep the remaining BLN-backed app surface under `/api/v1` and preserve the local-app-versus-external-BLN split |
| Foundational delivery tables now exist in schema | No orders, drivers, deliveries, or assignments runtime modules exist yet | Treat the new tables as the base for the next backend runtime slices instead of reopening schema design |
