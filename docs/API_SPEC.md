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

## Implemented backend-only BLN client foundation
This section is implemented runtime truth, but it is not an HTTP route surface yet.

- Location:
  - `backend/src/config/logisticsApi.js`
  - `backend/src/clients/logisticsClient.js`
- Current env contract:
  - `LOGISTICS_API_URL`
  - `LOGISTICS_API_SERVICE_SECRET`
  - `LOGISTICS_API_TIMEOUT_MS` optional; defaults to `10000`
- Wrapped upstream areas:
  - tenant bootstrap
  - tenant token exchange
  - nodes
  - deliveries
  - delivery events
  - handoffs
- Internal auth modes:
  - service auth uses `x-delivery-backend-secret`
  - tenant auth uses `Authorization: Bearer <tenant credential>`
- Upstream error normalization:
  - preserves upstream HTTP status for known BLN responses
  - maps transport failures to `502`
  - maps client-side timeouts to `504`
- Idempotency behavior:
  - passes `Idempotency-Key` through on wrapped write methods when the caller provides one

## Planned BLN integration contract baseline
This section is the recommended target for the next active queue. It is not implemented runtime truth yet.

### Versioning rule
- Existing scaffold routes stay under unversioned `/api/*`.
- New BLN-backed app routes start under `/api/v1/*`.
- Do not expose BLN secrets, tenant API keys, or exchanged tenant tokens directly to the frontend.
- Do not add direct frontend calls to the sibling `logistics-api` in the first cut.

### Actor matrix
| Actor | Auth basis | First-cut contract rights | Deferred or denied |
|---|---|---|---|
| `admin` | Existing scaffold admin auth and RBAC | Bootstrap BLN tenant and first node, inspect context, view or mutate BLN-backed deliveries, and operate handoff workflows | None in milestone 1 |
| `authenticated user with resolved BLN context` | Existing authenticated user plus a local BLN tenant or node binding | Read and mutate BLN-backed deliveries or handoffs only within the resolved local BLN context | Workspace-wide admin actions and bootstrap remain denied |
| `authenticated user without BLN context` | Existing authenticated user only | No BLN-backed delivery or handoff access yet beyond context or onboarding flows when they exist | Delivery and custody features stay denied until a safe binding exists |
| `frontend caller` | Browser session only | Calls only local app routes under `/api/v1/*` | Direct calls to `logistics-api` are deferred |

### First-cut planned routes
| Area | Method | Path | Planned actor access | Slice target | Notes |
|---|---|---|---|---|---|
| Network | POST | `/api/v1/network/bootstrap` | `admin` | 13 | Wraps BLN tenant-plus-first-node bootstrap through the local backend |
| Network | GET | `/api/v1/network/context` | `admin` or authenticated user with BLN binding | 13 | Returns the resolved BLN tenant or node context for the current app actor |
| Network | GET | `/api/v1/network/nodes` | `admin` or authenticated user with BLN binding | 13 | Lists nodes inside the resolved BLN context |
| Network | POST | `/api/v1/network/nodes` | `admin` or authenticated user with BLN binding | 13 | Creates a node through the local backend without exposing BLN credentials to the frontend |
| Deliveries | POST | `/api/v1/deliveries` | `admin` or authenticated user with BLN binding | 14 | Local facade over BLN delivery creation |
| Deliveries | GET | `/api/v1/deliveries` | `admin` or authenticated user with BLN binding | 14 | Local facade over BLN delivery listing |
| Deliveries | GET | `/api/v1/deliveries/:id` | `admin` or authenticated user with BLN binding | 14 | Local facade over BLN delivery detail |
| Delivery events | GET | `/api/v1/deliveries/:id/events` | `admin` or authenticated user with BLN binding | 14 | Reads the remote delivery timeline through the local backend |
| Delivery events | POST | `/api/v1/deliveries/:id/events` | `admin` or authenticated user with BLN binding | 14 | Appends delivery lifecycle events through the local backend |
| Handoffs | GET | `/api/v1/deliveries/:id/handoff-status` | `admin` or authenticated user with BLN binding | 15 | Local facade over BLN custody status |
| Handoffs | GET | `/api/v1/handoffs` | `admin` or authenticated user with BLN binding | 15 | Reads handoff history for one delivery through the local backend |
| Handoffs | GET | `/api/v1/handoffs/:id` | `admin` or authenticated user with BLN binding | 15 | Reads one remote handoff through the local backend |
| Handoffs | POST | `/api/v1/handoffs/initiate` | `admin` or authenticated user with BLN binding | 15 | Initiates custody transfer |
| Handoffs | POST | `/api/v1/handoffs/:id/retry` | `admin` or authenticated user with BLN binding | 15 | Retries the active handoff PIN send |
| Handoffs | POST | `/api/v1/handoffs/verify` | `admin` or authenticated user with BLN binding | 15 | Verifies a received PIN and completes custody transfer |
| Handoffs | POST | `/api/v1/handoffs/dispute` | `admin` or authenticated user with BLN binding | 15 | Raises a dispute through the local backend |
| Handoffs | POST | `/api/v1/handoffs/:id/resolve` | `admin` | 15 | Resolves a disputed handoff through the local backend |

### Explicit deferrals
- Do not expose direct browser calls to the sibling `logistics-api`.
- Do not reactivate the older local-first `orders`, `drivers`, `deliveries`, `dispatch`, `tracking`, or `incidents` route plan until the repo deliberately chooses a local augmentation role for those tables.
- Local tracking, incident, or queue-backed projection routes are deferred until the BLN-backed facade and custody workspace are real.
