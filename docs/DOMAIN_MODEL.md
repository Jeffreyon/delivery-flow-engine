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
| Order | Delivery work request | Partial | Schema exists, but no runtime module or API yet |
| Driver | User-linked delivery profile | Partial | Schema exists as `drivers.id -> users.id`, but no runtime module yet |
| Delivery | Lifecycle-bearing operational record | Partial | Schema exists, but runtime handlers do not yet exist |
| Assignment | Dispatch history record | Partial | Schema exists, but runtime dispatch logic does not yet exist |
| Settings | Global template configuration | Partial | Single-row model today |

## Platform boundaries
| Domain | Owns today | Does not own today | Current state |
|---|---|---|---|
| Identity and access | `users`, `roles`, auth context | delivery actors, dispatch rules, tracking | Implemented |
| Session and device history | `sessions`, `devices` | delivery availability or telematics | Implemented |
| Notification feed | generic user-facing notifications | delivery-specific notification policy | Partial |
| Platform event log | `events` records | delivery lifecycle ownership, tracking, or incident ownership | Implemented |
| Delivery event log | `delivery_events` child records | canonical lifecycle state, tracking, or incident ownership | Partial |
| Global settings | shared config inputs | per-delivery or per-driver state | Partial |

## PRD delivery gap for Slice 1
| PRD concept | Current state | Gap | Recommended target |
|---|---|---|---|
| Order | Partial | Schema now exists, but no create, list, or get runtime path is implemented yet | Use the new table as the first delivery-domain anchor for customer or operator-submitted work |
| Delivery | Partial | Schema now exists, but no lifecycle runtime exists yet | Build the operational record on top of the new table, with one order allowed to own multiple deliveries from the first cut |
| Driver | Partial | The schema now models drivers as `users` plus profile, but no delivery-operator runtime module exists yet | Build the runtime on the new user-linked profile table |
| Assignment | Partial | Schema now preserves assignment history, but dispatch logic does not yet use it | Use the new table once deliveries and drivers runtime modules land |
| DeliveryEvent | Partial | `delivery_events` now exists as a child ledger of `events`, but delivery-owned producers and immutability rules are not in place yet | Narrow it further through lifecycle and producer slices |
| LocationPing | Missing | No tracking telemetry model exists | Include as a planned first-wave tracking entity, but implement after the delivery core and event rename gate |
| Incident | Missing | No non-happy-path operational record exists | Include as a planned first-wave exception entity, but implement after lifecycle ownership is locked |

## Recommended first delivery envelope
| Entity | Why it belongs in Slice 1 planning | Relationship to the scaffold | Slice 1 status |
|---|---|---|---|
| Order | Gives the repo a business object beyond workspace and admin scaffolding | New delivery-domain entity on top of current users and settings foundations | Implemented in schema; runtime next |
| Delivery | Gives the repo a lifecycle-bearing operational record | New delivery-domain entity with one-to-many cardinality from `orders` to `deliveries` | Implemented in schema; runtime next |
| Driver | Makes delivery actors explicit without replacing the existing auth stack | Locked target is `users` + driver profile, with role membership still used for auth | Implemented in schema; runtime next |
| Assignment | Preserves dispatch and reassignment history | Depends on delivery and driver foundations | Implemented in schema; runtime next |
| DeliveryEvent | Preserves immutable delivery history | The child `delivery_events` ledger now exists on top of the generic `events` parent ledger | Implemented hard gate; needs lifecycle follow-through |
| LocationPing | Supports tracking and stall detection | Depends on delivery and driver identities | Active follow-on target after delivery core and async platform slices |
| Incident | Supports failures, returns, and operational exceptions | Depends on delivery lifecycle rules and failure taxonomy | Active follow-on target after lifecycle and delivery events are in place |

## Locked Slice 1 decisions
- Drivers are modeled as `users` plus a delivery profile. Driver access still flows through the existing RBAC foundation.
- The first delivery cut assumes one order may own multiple deliveries.
- `location_pings` and `incidents` are part of the active delivery roadmap, but they follow the delivery core and `delivery_events` gate instead of leading it.
- `events` remains the generic platform event ledger, and `delivery_events` is the delivery-specific child ledger built on top of it.

## Planning guardrails
- Keep `users`, `roles`, `sessions`, `devices`, `settings`, current `notifications`, the generic `events` ledger, and the child `delivery_events` ledger as scaffold foundations until broader delivery modules land.
- Do not describe `orders`, `deliveries`, `drivers`, `assignments`, `delivery_events`, `location_pings`, or `incidents` as implemented until schema and runtime slices actually land.
- Do not treat the current `delivery_events` child ledger as complete delivery lifecycle proof before delivery producers and rules actually land.
