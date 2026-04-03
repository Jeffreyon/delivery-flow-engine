# Decisions

| Topic | Current choice | Why it exists today | Notes |
|---|---|---|---|
| Product identity | Generic workspace/account/admin scaffold | Matches the current runtime | Phase 0 hardening baseline |
| Frontend routing | Separate public, auth, user, and admin trees | Clear shell and auth boundaries | No storefront tree |
| Backend module shape | Controller, service, repository split | Keeps raw SQL code organized | Used across all live modules |
| Data access | Shared `query()` helper with raw SQL | Low abstraction overhead | No ORM |
| Auth transport | Session cookie plus bearer fallback | Local-first auth with simple protected-route support | Login still returns `idToken` |
| RBAC model | `users.roles` plus `roles.permissions` | Simple admin and self gating | `users.roles` is an array of role ids; no DB FK |
| Driver actor model | `drivers` will extend `users` with a delivery profile | Reuses the existing auth and RBAC foundation for delivery actors | Driver access still flows through role membership |
| Delivery API versioning | New delivery-domain routes will start under `/api/v1`, while scaffold routes remain under `/api/*` | Avoids retrofitting the current scaffold contract just to introduce delivery modules | Do not add unversioned clones of delivery routes in milestone 1 |
| Milestone 1 delivery actors | `admin` covers operator duties, and `driver` is an authenticated user with a driver profile and role membership | The current repo only has `admin` and `user` roles, so this keeps the first delivery cut aligned with live RBAC reality | Dedicated `operator` role remains deferred |
| Order-delivery cardinality | One order may own multiple deliveries in the first delivery cut | Avoids baking a 1:1 assumption into the first schema slice | Delivery slices should preserve split, retry, or redelivery options |
| Response model | Raw JSON success payloads and `{ message }`-style errors | That is what current controllers and error handler emit | No uniform success envelope today |
| User mutation surface | Shared `PUT /api/users/:id` route with actor-scoped field validation | Preserves the existing path while removing self-service access to admin-only fields | Route-level updates should only touch existing users |
| Notification mark-read | Authenticated route with ownership-scoped repository update | Minimal feed support with a safe write boundary | Response is still minimal |
| Event model | Public `GET /api/events` and admin-only `POST /api/events`, plus public `GET /api/delivery-events` and admin-only `POST /api/delivery-events` | Restores platform-wide observability while keeping delivery-specific logs isolated | Delivery writes should create a parent `events` row plus a child `delivery_events` row, and child types should stay delivery-scoped |
| Delivery event schema direction | `events` is the parent event ledger and `delivery_events` is the delivery-specific child ledger | The scaffold still needs generic platform events for base infrastructure behavior, not only logistics logs | Later delivery slices should build lifecycle-owned writes on top of the parent-child event model |
| Tracking ingress route | The first tracking write route will be `POST /api/v1/tracking/ping` | The PRD names both driver-location and tracking-ping writes, which would create duplicate ingress paths if both landed immediately | Add `drivers/:id/location` later only if it gains meaning beyond the tracking ping contract |
| Incident route exposure | Incident persistence is in scope, but explicit public incident endpoints are deferred from the first delivery contract cut | Keeps the first contract baseline bounded while still allowing Slice 08 to create internal incident records | Revisit public incident routes once the incident model is real |
| Tracking and incident scope | `location_pings` and `incidents` are active follow-on delivery slices, not indefinite deferrals | The delivery plan should cover tracking and exception handling in the first implementation wave | Land them after delivery core, lifecycle rules, and the `events` plus `delivery_events` baseline are established |
| Async platform direction | BullMQ plus Redis are now the shared async foundation | The delivery roadmap assumes queue-backed jobs early enough to justify real runtime scaffolding | Queue bootstrap lives under `backend/src/core/queue` and the worker entrypoint is `backend/worker.js` |
| Async worker topology | Start with one Railway `worker` service deployed from the `backend` path | A single worker is simpler than preemptive queue or process splitting | The worker service should use `npm run worker` and stay monolithic until real job load proves otherwise |
| Async platform env vars | `REDIS_URL`, `BULLMQ_PREFIX`, and `WORKER_CONCURRENCY` form the active queue runtime contract | Later job slices need stable env names and worker defaults | Queue names such as `dispatch`, `delivery-status`, `notifications`, `stalled-deliveries`, and `event-reconciliation` can layer on top of this baseline |
| Settings model | One global settings row | Keeps config simple in Phase 0 | Public read only |
| Schema path | `db:migrate` is the primary schema path; `db:init` delegates to it | Aligns local, CI, and preserved SQL behavior | Historical baseline SQL remains append-only |
| Frontend guidance location | `frontend/docs/DESIGN_SYSTEM.md`, `frontend/docs/MOBBIN_DESIGN_WORKFLOW.md`, and `frontend/intelligence.md` | Keeps reusable guidance in repo-true paths | Route inventory still belongs in `docs/UI_ARCHITECTURE.md` |
| Brand baseline | Generic workspace baseline derived from current UI | Matches the current dashboard-heavy template | No retail reference is active |
| Auth bootstrap ownership | Protected route loaders own auth bootstrap | Removes duplicate boot-time `/api/auth/me` requests from a global provider plus loaders | Public routes do not eagerly hydrate auth state today |
| Mobile dashboard nav | User and admin shells use desktop sidebars plus mobile dialog navigation | Preserves the current shell model while covering small screens | Keep the patterns visually aligned across both dashboard trees |

## Gaps and recommended targets
| Current state | Gap | Recommended target |
|---|---|---|
| `PUT /api/users/:id` is actor-scoped instead of broad upsert | Dedicated self and admin routes do not exist | Add dedicated routes only if a real consumer needs clearer boundaries |
| Event create routes are admin-only | Signed or internal-only ingestion is still not modeled for either platform or delivery events | Revisit only when a non-admin producer becomes necessary |
| Protected route loaders own auth bootstrap | Public surfaces do not currently expose auth-aware personalization | Keep bootstrap loader-owned until a real public auth dependency appears |
| Backend lint, typecheck, and build scripts are missing | Validation proof is uneven across layers | Add those scripts when the template runtime is ready to enforce them |
| Mobile dashboard nav exists for the current shells | Some secondary pages still need incremental state and copy cleanup | Tighten touched pages incrementally instead of broad UI rewrites |

## Open questions
- Should user profile writes stay on one route long-term, or split when real edit flows land?
- Which non-happy-path delivery transitions belong in the first lifecycle cut before `incidents` is implemented?
