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
| BLNTenantContext | Local binding between an authenticated app actor and a BLN tenant | Missing | Required before non-admin BLN-backed routes can be safe and useful |
| BLNNodeContext | Local or session-level binding to the acting BLN node | Missing | Needed for custody and handoff actions that depend on current or receiving node identity |
| RemoteDelivery | Delivery record owned by the sibling `logistics-api` | Missing integration | This is the active delivery source of truth for the next execution queue |
| RemoteDeliveryEvent | Immutable delivery lifecycle or handoff event owned by `logistics-api` | Missing integration | Powers delivery timeline, transport diagnostics, and custody history |
| RemoteHandoff | Custody-transfer record owned by `logistics-api` | Missing integration | Covers initiate, retry, verify, dispute, resolve, audit, and status flows |
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
| Delivery Client Layer | Missing | No backend abstraction wraps the sibling BLN API yet | Add the client layer first so later app routes do not talk to `logistics-api` ad hoc |
| Remote delivery access | Missing | No route or service in this repo can list, create, or read BLN deliveries yet | Build a local facade on top of the external delivery and event endpoints |
| Remote handoff access | Missing | No route or UI in this repo exposes BLN handoff, custody, or dispute flows | Build handoff and custody features as the first distinctive app behaviors on top of the BLN API |
| Local tenant or node binding | Missing | The current auth model has no concept of BLN tenant or node context | Add a local bridge before broad non-admin BLN access |
| Local delivery schema | Partial | Local delivery tables exist, but they would duplicate the active external source of truth if promoted now | Keep them dormant until the app needs a real local projection or augmentation layer |

## Recommended first BLN-backed feature envelope
| Entity or surface | Why it belongs in the next queue | Relationship to the scaffold | Current status |
|---|---|---|---|
| BLN client layer | Makes the PRD's external-API architecture real | New backend-only abstraction on top of current auth and request handlers | Missing |
| BLN tenant or node context | Makes authenticated app sessions usable against tenant-scoped BLN routes | Extends current users and auth without exposing BLN credentials to the frontend | Missing |
| Remote deliveries | Makes the app useful without duplicating delivery ownership locally | Reuses current admin and dashboard shells as consumer surfaces | Missing |
| Remote delivery events | Delivers the timeline and transport diagnostics promised by the PRD | Extends the existing event-oriented UI and notification ideas with external data | Missing |
| Remote handoffs | Exposes the real custody-transfer differentiator already implemented in `logistics-api` | Gives this repo a distinctive operator feature beyond simple CRUD | Missing |
| Projection cache | Supports future dashboards, summaries, and alerts | Reuses the current Postgres and BullMQ baseline if the app later needs local denormalized reads | Deferred |

## Locked integration decisions
- The sibling `logistics-api` repo is the active delivery, event, node, and handoff source of truth for the next slice queue.
- Delivery Flow Engine should add a backend-owned client layer before it adds BLN-backed routes or UI.
- The dormant local delivery schema should not be treated as the active next runtime path while the BLN integration layer is still missing.
- `events` and `delivery_events` in this repo remain local platform scaffolding until a later projection or synchronization slice gives them a new role.

## Planning guardrails
- Keep `users`, `roles`, `sessions`, `devices`, `settings`, current `notifications`, the generic `events` ledger, and the child `delivery_events` ledger as scaffold foundations until broader delivery modules land.
- Do not describe BLN client, tenant or node binding, remote deliveries, remote delivery events, or remote handoffs as implemented until the integration slices land.
- Do not describe the dormant local `orders`, `deliveries`, `drivers`, `assignments`, `location_pings`, or `incidents` path as the active execution queue while `logistics-api` is the source of truth.
- Do not treat the current `delivery_events` child ledger as complete delivery lifecycle proof before delivery producers and rules actually land.
