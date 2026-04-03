# API Spec

## Purpose
- Document the live HTTP contract.
- Avoid claiming a hardened envelope the code does not yet implement.

## Current conventions
- Auth:
  - session cookie (`local_session` by default) or bearer token
  - protected routes use `localAuth`
  - admin routes add `attachAuthz` and admin checks
- Success responses:
  - mostly raw objects or arrays from controllers
- Error responses:
  - mostly `{ message }`
  - Zod validation errors return `{ message, issues }`
- Pagination:
  - no public pagination contract
  - repositories use fixed limits where needed

## Implemented endpoints
| Area | Method | Path | Auth | Current response shape |
|---|---|---|---|---|
| Health | GET | `/health` | Public | `{ status: "ok" }` |
| Health | GET | `/ready` | Public | `{ status: "ready" }` |
| Auth | POST | `/api/auth/signup` | Public | `{ idToken, user, verification }` |
| Auth | POST | `/api/auth/login` | Public | `{ idToken, user }` and sets session cookie |
| Auth | GET | `/api/auth/me` | Authenticated | `{ uid, user, roles, permissions, isAdmin }` |
| Auth | POST | `/api/auth/forgot-password` | Public | `{ message, email }` |
| Auth | POST | `/api/auth/verify-email` | Public | `{ message }` |
| Auth | POST | `/api/auth/logout` | Authenticated | `{ success: true }` |
| Users | GET | `/api/users` | Admin | `UserProfile[]` |
| Users | GET | `/api/users/:id` | Self or admin | `UserProfile` |
| Users | PUT | `/api/users/:id` | Self or admin | `UserProfile` |
| Roles | GET | `/api/roles` | Admin | `RoleItem[]` |
| Roles | GET | `/api/roles/:id` | Admin | `RoleItem` |
| Notifications | GET | `/api/notifications` | Authenticated | `NotificationItem[]` |
| Notifications | POST | `/api/notifications/mark-read` | Authenticated | `{ success: true }` |
| Events | GET | `/api/events` | Public | `EventItem[]` |
| Events | POST | `/api/events` | Admin | `EventItem` |
| Delivery events | GET | `/api/delivery-events` | Public | `DeliveryEventItem[]` |
| Delivery events | POST | `/api/delivery-events` | Admin | `DeliveryEventItem` |
| Settings | GET | `/api/settings/global` | Public | `GlobalSettings` |
| Devices | GET | `/api/devices` | Authenticated | `DeviceItem[]` |
| Devices | POST | `/api/devices` | Authenticated | `DeviceItem` |
| Sessions | GET | `/api/sessions` | Authenticated | `SessionItem[]` |

## Contract notes
- `/api/auth/me` returns role documents in `roles`, not a `string[]` of role ids.
- `PUT /api/users/:id` updates existing users only.
- Self-service user writes are limited to `displayName`, `photoURL`, and `preferences`.
- Admin writes may additionally update `email`, `roles`, and `emailVerified`.
- `notifications/mark-read` is ownership-scoped by authenticated user id, but still returns only `{ success: true }`.
- `events` supports an optional `type` query filter on list.
- `delivery-events` supports an optional `type` query filter on list.
- `POST /api/events` now requires admin auth.
- `POST /api/delivery-events` now requires admin auth.
- `POST /api/delivery-events` rejects non-delivery type namespaces such as `user.*` or `auth.*`.
- When `SESSION_COOKIE_SECURE=true`, auth cookies are issued with `SameSite=None` so the Railway frontend can use credentialed cross-origin requests; local insecure cookie flows stay `SameSite=Lax`.

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| Routes mostly return raw JSON payloads | The API is not yet uniform | Keep the current payload shapes documented until the code is hardened |
| `PUT /api/users/:id` stays shared by self and admin | Separate self and admin endpoints do not exist | Keep actor-scoped field validation until a real consumer needs dedicated routes |
| `notifications/mark-read` is now ownership-scoped | Response remains minimal | Expand the response only when a real consumer needs counts or detail |
| `POST /api/events` and `POST /api/delivery-events` are admin-only | Signed or internal-only ingestion is not modeled yet, and delivery-specific producers are not wired yet | Keep the write boundaries narrow until a dedicated ingestion flow exists |

## Planned Slice 02 delivery contract baseline
This section is a recommended target for the first delivery cut. It is not implemented runtime truth yet.

### Versioning rule
- Existing scaffold routes stay under unversioned `/api/*`.
- New delivery-domain routes start under `/api/v1/*`.
- Do not add unversioned clones for delivery-domain routes in the first cut.

### Actor matrix
| Actor | Auth basis | First-cut contract rights | Deferred or denied |
|---|---|---|---|
| `admin` | Existing scaffold admin auth and RBAC | Full first-cut access to orders, drivers, deliveries, dispatch, tracking reads, and incident administration when that slice lands | None in milestone 1 |
| `driver` | Existing authenticated user plus driver profile and role membership | Self-scoped availability updates, tracking pings, assigned-delivery reads, and status changes allowed by the lifecycle slice | No order creation, no dispatch reassignment, no broad list access |
| `user` | Existing authenticated user without driver role membership | No first-cut delivery route access | Customer-facing order flows are deferred |
| `operator` | Deferred role | Covered by `admin` in milestone 1 so runtime slices do not need a new RBAC surface yet | Dedicated operator role is deferred |

### First-cut planned routes
| Area | Method | Path | Planned actor access | Slice target | Notes |
|---|---|---|---|---|---|
| Orders | POST | `/api/v1/orders` | `admin` | 04 | First delivery business-record create path |
| Orders | GET | `/api/v1/orders` | `admin` | 04 | List stays admin-scoped in milestone 1 |
| Orders | GET | `/api/v1/orders/:id` | `admin` | 04 | Expand later only if a non-admin consumer becomes real |
| Drivers | POST | `/api/v1/drivers` | `admin` | 04 | Creates the driver profile tied to an existing or newly provisioned user |
| Drivers | PATCH | `/api/v1/drivers/:id/availability` | `admin` or self-scoped `driver` | 04 | Self-scoped for drivers; admin override remains allowed |
| Deliveries | POST | `/api/v1/deliveries` | `admin` | 05 | One order may own multiple deliveries |
| Deliveries | GET | `/api/v1/deliveries/:id` | `admin` or assigned `driver` | 05 | Driver access is limited to assigned work |
| Deliveries | PATCH | `/api/v1/deliveries/:id/status` | `admin` or assigned `driver` | 06 | Final allowed transitions are enforced by the lifecycle slice |
| Dispatch | POST | `/api/v1/dispatch/assign` | `admin` | 05 | First assignment path |
| Dispatch | POST | `/api/v1/dispatch/reassign` | `admin` | 05 | Reassignment stays admin-scoped in milestone 1 |
| Tracking | POST | `/api/v1/tracking/ping` | `admin` or self-scoped `driver` | 07 | Single first-cut tracking ingress route |
| Tracking | GET | `/api/v1/deliveries/:id/tracking` | `admin` or assigned `driver` | 07 | Read route stays tied to delivery access |

### Explicit deferrals
- Do not implement `POST /api/v1/drivers/:id/location` in the first cut. The first tracking ingress route is `POST /api/v1/tracking/ping`.
- Explicit public incident endpoints are deferred until Slice 08. Incident creation may begin as an internal runtime path if that slice needs it.
- Broad delivery list endpoints for drivers or end users are deferred until a real consumer needs them.
