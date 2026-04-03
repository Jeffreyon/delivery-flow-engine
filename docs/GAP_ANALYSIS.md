# Gap Analysis

## Executive summary
- The repo still ships a Phase 0 workspace/account/admin scaffold.
- `docs/PRD.md` describes Delivery Flow Engine, a delivery-operations platform with orders, deliveries, drivers, dispatch, tracking, immutable events, and background jobs.
- The main planning gap is the missing bridge between those two realities.
- The next doc work should keep current scaffold hardening explicit while building a bounded, dependency-ordered delivery slice plan.

## Current runtime baseline
- Backend:
  - auth
  - users
  - roles
  - notifications
  - events
  - delivery-events
  - devices
  - sessions
  - settings
- Frontend:
  - public landing
  - auth pages
  - user dashboard
  - admin dashboard
- Schema path:
  - primary command `npm run db:migrate`
  - bootstrap alias `npm run db:init`
  - seed commands `npm run db:seed`, `npm run db:seed:bootstrap-admin`, and `npm run db:seed:demo`
- Validation:
  - frontend lint, typecheck, tests, and build exist
  - backend exposes tests only

## PRD alignment gap inventory
| Area | Current state | Gap | Recommended target |
|---|---|---|---|
| Product identity and scope | The live repo is a generic auth, dashboard, and admin scaffold | The PRD target is a delivery platform | Treat the current scaffold as the platform starting point and document which pieces survive the first delivery slices |
| Core delivery modules | No `orders`, `deliveries`, `drivers`, `dispatch`, or `tracking` runtime modules exist in code | The PRD module set is still absent from the runtime layer | Implement additive delivery runtime slices instead of rewriting docs as if those modules already ship |
| Data model | Current tables now include `orders`, `drivers`, `deliveries`, and `assignments` alongside `roles`, `users`, `notifications`, `events`, `delivery_events`, `devices`, `sessions`, and `settings` | Tracking and incident entities still do not exist, and the new delivery tables have no runtime handlers yet | Use the new schema as the base for orders, drivers, deliveries, and assignments runtime slices, then add `location_pings` and `incidents` later |
| API surface | The backend exposes unversioned `/api/*` routes for scaffold modules only, and the first delivery contract is now documented as a `/api/v1` target | Delivery endpoints still do not exist in runtime code | Implement the foundational schema and handlers against the locked `/api/v1` contract instead of inventing routes per slice |
| Workflow and event model | Generic `events` and child `delivery_events` tables exist, with public list and admin-only create routes for each surface | There is still no delivery lifecycle state machine or immutable domain event policy | Build lifecycle ownership, producer rules, and incident handling on top of the parent-child event baseline |
| Async architecture | BullMQ and `ioredis` are installed, shared queue config exists, `backend/worker.js` can boot a worker against `REDIS_URL`, and the live Railway project now has `worker` plus `Redis` in both environments | No named queues, processors, retries, or delivery jobs are implemented yet | Build later async slices on top of the live shared worker and queue bootstrap instead of inventing a second runtime |
| Actor and UI model | Auth, user dashboard, and admin dashboard exist; current roles are `admin` and `user`, and milestone 1 now treats `admin` as the operator fallback while `driver` stays `users` plus profile | Driver runtime and operator-specific UI still do not exist | Implement backend slices first, then decide whether the admin surface needs bounded operator support |
| Harness metadata truth | The migration runner is present, harness docs point at `.scaffold/project.json`, the Railway workflow includes a `worker` deploy target, and the live Railway project now matches that `Redis` plus `worker` topology in both environments | The live project is configured, but worker behavior is still limited to idle boot because no queue processors exist yet | Treat the repo metadata as the source of truth and extend the live topology through later queue-job slices instead of changing the service layout again |

## Current scaffold hardening gaps
| Area | Current state | Gap | Recommended target |
|---|---|---|---|
| User write contract | Self and admin still share `PUT /api/users/:id` | Dedicated self and admin endpoints do not exist | Keep actor-scoped field validation until a real consumer needs separate routes |
| Event ingestion | `GET /api/events` and `GET /api/delivery-events` stay public while both write routes are narrowed | Signed or internal-only ingestion is still undefined | Keep the write boundaries narrow until a dedicated producer model exists |
| Frontend bootstrap | Protected route loaders own auth bootstrap | Public routes do not expose auth-aware personalization | Keep loader-owned bootstrap until that need becomes real |
| Mobile dashboard UX | User and admin shells expose mobile dialog navigation | Secondary screens still need incremental polish | Keep one mobile nav pattern and tighten page states as surfaces are touched |
| Page quality | Some pages still carry placeholder copy and thin error handling | UX polish lags the documented baseline | Tighten copy and explicit error states incrementally |
| Validation coverage | Frontend lint, typecheck, tests, and build exist; backend only exposes tests | Backend lint, typecheck, and build scripts are unavailable | Keep reporting this honestly until scripts are added |

## What was resolved
- The backend package now exposes `db:migrate`, `db:seed:bootstrap-admin`, and `db:seed:demo`.
- `db:init` now delegates to the migration runner instead of maintaining a separate schema path.
- Legacy registry and per-user module metadata were removed from the active runtime surface.
- Core docs and harness files now point to repo-true frontend guidance paths under `frontend/docs/`.

## Planning implication
- Use `docs/IMPLEMENTATION_PLAN.md` as the active execution queue for the next delivery slices.
- Treat delivery modules, schema, contracts, tracking, incidents, and async architecture as additive slices beyond the current `events` plus `delivery_events` gate, not current runtime truth.
- Keep current-reality docs truthful while each later slice lands, and update planning docs whenever slice order or prerequisites change.
