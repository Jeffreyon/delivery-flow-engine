# Domain Model

## Purpose
- Define the current Phase 0 scaffold domain truth.
- Define the first planned delivery-domain envelope without claiming the runtime already supports it.

## Current scaffold domain
| Primitive | Role | Current state | Notes |
|---|---|---|---|
| User | Identity and profile anchor | Implemented | Stores auth, profile, and preferences |
| Role | RBAC definition | Implemented | Permissions are resolved at request time |
| Session | Session history record | Implemented | Tracks login sessions and logout endings |
| Device | Known device record | Implemented | Supports current-device visibility |
| Notification | User-facing feed entry | Partial | Read and mark-read only |
| Event | Platform event ledger | Implemented | Covers shared infrastructure and domain event parents |
| DeliveryEvent | Delivery-specific event specialization | Partial | Public list and admin create exist, but lifecycle-owned producers are still missing |
| Order | Local delivery work request candidate | Partial | Schema exists, but no runtime module or active integration plan uses it yet |
| Driver | Local user-linked delivery profile candidate | Partial | Schema exists as `drivers.id -> users.id`, but no runtime module yet |
| Delivery | Local lifecycle-bearing operational record candidate | Partial | Schema exists, but runtime handlers do not yet exist and the sibling BLN backend is now the active delivery source of truth |
| Assignment | Local dispatch history candidate | Partial | Schema exists, but runtime dispatch logic does not yet exist |
| Settings | Global template configuration | Partial | Single-row model today |

## Active BLN integration primitives
| Primitive | Role | Current state | Notes |
|---|---|---|---|
| BLNTenantAccount | Durable local tenant integration record for one BLN tenant | Implemented | Stored in `bln_tenant_accounts`; keeps encrypted tenant API key material plus tenant-level status |
| BLNTenantMembership | Durable local membership record between an authenticated app actor and a BLN tenant | Implemented first secure bridge | Stored in `bln_tenant_memberships`; determines which tenants a local user may access |
| BLNNodeAssignment | Durable local act-as right for one tenant-owned BLN node | Implemented first secure bridge | Stored in `bln_node_assignments`; determines which nodes a local user may use when minting node sessions |
| BLNTenantContext | Local binding between an authenticated app actor and a BLN tenant | Implemented first secure bridge | Derived from `bln_tenant_memberships.tenant_id`; mirrored into `users.preferences.bln.tenantId` only for compatibility |
| BLNNodeContext | Local or session-level binding to the acting BLN node | Implemented first secure bridge | Derived from `bln_node_assignments.node_id`; mirrored into `users.preferences.bln.nodeId` only for compatibility |
| BLNNodeSession | Short-lived runtime credential minted by the sibling `logistics-api` for one tenant-owned node | Implemented backend-only | Minted on demand from the stored tenant API key and never persisted locally |
| RemoteDelivery | Delivery record owned by the sibling `logistics-api` | Implemented backend facade | Exposed locally through `/api/v1/deliveries` and remains the active delivery source of truth |
| RemoteDeliveryEvent | Immutable delivery lifecycle or handoff event owned by `logistics-api` | Implemented backend facade | Exposed locally through `/api/v1/deliveries/:id/events` for timeline and lifecycle append flows |
| RemoteHandoff | Custody-transfer record owned by `logistics-api` | Implemented backend facade | Exposed locally through `/api/v1/handoffs` and `/api/v1/deliveries/:id/handoff-status` for audit, action, and custody-status flows |
| ProjectionCache | Optional local summary or read model built from BLN data | Deferred | Use only after the client layer and remote facade are real |

## Platform boundaries
| Domain | Owns today | Does not own today | Current state |
|---|---|---|---|
| Identity and access | `users`, `roles`, auth context | delivery actors, dispatch rules, tracking | Implemented |
| Session and device history | `sessions`, `devices` | delivery availability or telematics | Implemented |
| Notification feed | generic user-facing notifications | delivery-specific notification policy | Partial |
| Platform event log | `events` records | delivery lifecycle ownership, tracking, or incident ownership | Implemented |
| Delivery event log | `delivery_events` child records | canonical lifecycle state, tracking, or incident ownership | Partial |
| Global settings | shared config inputs | per-delivery or per-driver state | Partial |

## BLN integration gap for the next execution queue
| PRD concept | Current state | Gap | Recommended target |
|---|---|---|---|
| Delivery Client Layer | Implemented | Backend-only client wraps the sibling BLN API | Keep later route families on the same seam instead of adding ad hoc fetch calls |
| Remote delivery access | Implemented backend facade | The app still has no frontend delivery workspace yet | Build the first operator-visible delivery views on top of the local facade instead of bypassing it |
| Remote handoff access | Implemented backend facade | The repo still has no operator custody UI above the local routes | Build handoff inbox, outbox, dispute, and diagnostics views on top of the local facade instead of bypassing it |
| Local tenant or node binding | Implemented first secure bridge | The current auth model now stores tenant integrations, memberships, and node assignments and powers delivery plus custody routes, but richer local role semantics are still deferred | Reuse the existing bridge before broadening the local data model |
| Local delivery schema | Partial | Local delivery tables exist, but they would duplicate the active external source of truth if promoted now | Keep them dormant until the app needs a real local projection or augmentation layer |

## Recommended first BLN-backed feature envelope
| Entity or surface | Why it belongs in the next queue | Relationship to the scaffold | Current status |
|---|---|---|---|
| BLN client layer | Makes the PRD's external-API architecture real | New backend-only abstraction on top of current auth and request handlers | Implemented |
| BLN tenant or node context | Makes authenticated app sessions usable against tenant-scoped BLN routes | Extends current users and auth without exposing BLN credentials to the frontend | Implemented first bridge |
| Remote deliveries | Makes the app useful without duplicating delivery ownership locally | Reuses current admin and dashboard shells as consumer surfaces | Implemented backend facade |
| Remote delivery events | Delivers the timeline and transport diagnostics promised by the PRD | Extends the existing event-oriented UI and notification ideas with external data | Implemented backend facade |
| Remote handoffs | Exposes the real custody-transfer differentiator already implemented in `logistics-api` | Gives this repo a distinctive operator feature beyond simple CRUD | Implemented backend facade |
| Projection cache | Supports future dashboards, summaries, and alerts | Reuses the current Postgres and BullMQ baseline if the app later needs local denormalized reads | Deferred |

## Locked integration decisions
- The sibling `logistics-api` repo is the active delivery, event, node, and handoff source of truth for the next slice queue.
- Delivery Flow Engine should keep using a backend-owned client layer for BLN-backed routes and later UI instead of adding direct browser-to-BLN calls.
- The durable local BLN tenant integration lives in `bln_tenant_accounts`.
- Local BLN membership lives in `bln_tenant_memberships`.
- Local BLN node assignment lives in `bln_node_assignments`.
- `users.preferences.bln` remains only as a compatibility mirror of ids.
- Node session tokens stay ephemeral and backend-only.
- The first local remote-delivery facade lives under `/api/v1/deliveries` and stays upstream-shaped by default.
- The first local remote-handoff facade lives under `/api/v1/handoffs` plus `/api/v1/deliveries/:id/handoff-status` and stays upstream-shaped by default.
- The dormant local delivery schema should not be treated as the active next runtime path while UI and projection work on top of the BLN layer still remain.
- `events` and `delivery_events` in this repo remain local platform scaffolding until a later projection or synchronization slice gives them a new role.

## Planning guardrails
- Keep `users`, `roles`, `sessions`, `devices`, `settings`, current `notifications`, the generic `events` ledger, and the child `delivery_events` ledger as scaffold foundations until broader delivery modules land.
- Do not describe operator custody UI, BLN projections, or queue-backed summaries as implemented until those later slices land.
- Do not describe the dormant local `orders`, `deliveries`, `drivers`, `assignments`, `location_pings`, or `incidents` path as the active execution queue while `logistics-api` is the source of truth.
- Do not treat the current `delivery_events` child ledger as complete delivery lifecycle proof before delivery producers and rules actually land.
