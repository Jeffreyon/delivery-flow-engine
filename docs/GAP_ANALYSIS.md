# Gap Analysis

## Executive summary
- The repo still ships a Phase 0 workspace/account/admin scaffold.
- `docs/PRD.md` describes Delivery Flow Engine as a delivery app that is powered by an external delivery network API.
- The sibling `logistics-api` repo now implements that BLN surface for deliveries, events, nodes, tenant bootstrap, support-only tenant exchange, node-session auth, and handoffs.
- The backend-only logistics client foundation and the first local membership-scoped tenant-context bridge now exist.
- The BLN-backed delivery and event facade now exists above that bridge.
- The BLN-backed handoff and custody facade now exists above that bridge.
- The first admin-side tenant-member and node-assignment management routes now exist above that bridge.
- Explicit workspace bootstrap now exists for the first admin, and authenticated users can now activate their BLN node through self OTP request or verify routes.
- The first operator-visible delivery and custody UI now exists under `/dashboard/operations`.
- The next runtime gap is whether the app needs durable projections, alerts, or async jobs now that the stateless operator surface is real.
- The local delivery schema that already exists in this repo should not be mistaken for the next source-of-truth path while the BLN integration layer is still absent.

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
| Product identity and scope | The live repo is a generic auth, dashboard, and admin scaffold with no external delivery integration code | The PRD target is a delivery app that consumes an external network API | Treat the current scaffold as the app shell and build the BLN integration layer before local delivery expansion |
| External BLN client layer | A backend-only client module plus env contract now exist for the sibling `logistics-api`, the local delivery plus handoff facades consume it, and the frontend now has a first stateless operator workspace over those routes | There is still no async refresh, alerting, or durable cached summary layer | Keep the client layer as the only integration seam and add projections or jobs only when operational cost justifies them |
| Auth and tenant context | Local auth now bridges into one BLN workspace tenant through `/api/v1/network/*`, `bln_tenant_accounts`, `bln_tenant_memberships`, `bln_node_assignments`, `/api/v1/deliveries*`, and `/api/v1/handoffs*`, and authenticated users can now claim or verify their node through self OTP routes | The bridge is still backend-only and local admins keep only narrow support exceptions, but richer local role semantics are still deferred | Reuse the current workspace-and-node bridge and avoid inventing a second local auth model before a real tenant UI need exists |
| Source of truth for deliveries | Current tables include `orders`, `drivers`, `deliveries`, and `assignments`, but no runtime handlers use them | The slice queue could drift into building a second delivery system even though `logistics-api` already owns live deliveries, events, and handoffs | Treat `logistics-api` as the active source of truth and keep the local delivery schema dormant until a later projection or augmentation decision is explicit |
| API surface | The backend exposes unversioned scaffold routes plus `/api/v1/network/*`, `/api/v1/deliveries*`, and `/api/v1/handoffs*` | The frontend still has no first-party custody or delivery workspace on top of those routes | Build UI and later projection slices on the same local API boundary |
| Handoff and custody feature exposure | `logistics-api` now supports handoff initiate, retry, verify, dispute, resolve, audit, status, and transport diagnostics, this repo exposes those flows locally, and the operations workspace now surfaces read-side delivery and custody detail | Dedicated inbox, outbox, dispute queue, and write-side operator forms still do not exist in the UI | Build the next delivery-flow-engine features around focused custody workflows instead of duplicating basic delivery storage first |
| Async architecture | BullMQ and `ioredis` are installed, shared queue config exists, `backend/worker.js` can boot a worker against `REDIS_URL`, and the live Railway project now has `worker` plus `Redis` in both environments | The first operator surface proved the app can stay stateless for now, so no named queues, processors, retries, or BLN sync jobs are implemented yet | Reuse the live worker and Redis topology later for BLN projection refresh, stalled-handoff alerts, and notification fanout only when those needs become concrete |
| Actor and UI model | Auth, user dashboard, admin dashboard, explicit workspace-bootstrap onboarding, and self node OTP activation now exist; current roles are `admin` and `user` | Operator-facing delivery or custody UI is still missing, and the invitation support routes do not yet have first-party admin UI | Keep admin as the first operator fallback, leave invitation tooling dormant unless a support workflow needs it, and add BLN-backed delivery and handoff surfaces on top of the existing shells |
| Harness metadata truth | The migration runner is present, harness docs point at `.scaffold/project.json`, the Railway workflow includes a `worker` deploy target, the live Railway project now matches that `Redis` plus `worker` topology in both environments, and the active pack queue now points at BLN integration | The runtime still lacks the first operator UI and projection slices even though the backend bridge is now real | Move from backend integration work into UI or projection slices instead of reopening local-first runtime packs |

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
- The repo now has a backend-only logistics client foundation plus the first local BLN membership bridge, remote delivery facade, remote handoff facade, explicit workspace-bootstrap onboarding flow, and self-service node OTP activation flow.

## Planning implication
- Use `docs/IMPLEMENTATION_PLAN.md` as the active execution queue for the next delivery slices.
- Treat the sibling `logistics-api` repo as the active external delivery backbone for the next execution queue.
- Build focused custody actions, alerts, and later projections on top of the new backend client layer, workspace bridge, remote delivery facade, remote handoff facade, and the new stateless operator surface before reviving the local-first delivery schema track.
- Keep current-reality docs truthful while each later slice lands, and update planning docs whenever slice order or prerequisites change.
