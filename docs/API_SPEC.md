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
| Network | POST | `/api/v1/network/bootstrap` | Admin | `{ tenant, node, binding, apiKey }` |
| Network | GET | `/api/v1/network/context` | Authenticated | `{ actor, binding, effectiveContext, tenant, node, issues }` |
| Network | GET | `/api/v1/network/nodes` | Authenticated | `{ tenantId, items }` |
| Network | POST | `/api/v1/network/nodes` | Authenticated | `{ node }` |
| Deliveries | POST | `/api/v1/deliveries` | Authenticated | `{ id, status }` |
| Deliveries | GET | `/api/v1/deliveries` | Authenticated | `{ items, nextCursor }` |
| Deliveries | GET | `/api/v1/deliveries/:id` | Authenticated | `RemoteDelivery` |
| Delivery events | GET | `/api/v1/deliveries/:id/events` | Authenticated | `RemoteDeliveryEvent[]` |
| Delivery events | POST | `/api/v1/deliveries/:id/events` | Authenticated | `{ success: true }` |

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
- `/api/v1/network/bootstrap` binds the bootstrapped tenant and first node to one local user immediately; `bindUserId` defaults to the current admin.
- `/api/v1/network/context` returns `200` with `issues` when the stored BLN binding is missing or stale, instead of converting that local state gap into a hard 4xx.
- `/api/v1/network/nodes` never exposes BLN API keys or exchanged tenant tokens to the frontend.
- `/api/v1/network/nodes` uses the current local BLN binding for non-admin callers; admin callers may override the target tenant with `tenantId` or fall back to their own stored binding.
- `/api/v1/deliveries*` routes always resolve BLN tenant access through the local backend first.
- Because the sibling BLN delivery routes are tenant-scoped, admin callers must still resolve a target tenant through `tenantId` or a stored BLN binding.
- `POST /api/v1/deliveries` and `POST /api/v1/deliveries/:id/events` pass `Idempotency-Key` through when the header is present.

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| Routes mostly return raw JSON payloads | The API is not yet uniform | Keep the current payload shapes documented until the code is hardened |
| `PUT /api/users/:id` stays shared by self and admin | Separate self and admin endpoints do not exist | Keep actor-scoped field validation until a real consumer needs dedicated routes |
| `notifications/mark-read` is now ownership-scoped | Response remains minimal | Expand the response only when a real consumer needs counts or detail |
| `POST /api/events` and `POST /api/delivery-events` are admin-only | Signed or internal-only ingestion is not modeled yet, and delivery-specific producers are not wired yet | Keep the write boundaries narrow until a dedicated ingestion flow exists |
| `/api/v1/network/*` now exists as the first BLN-backed local route family | Remote delivery and handoff facade routes still do not exist | Extend the same backend-owned bridge pattern to deliveries and handoffs before adding frontend flows |
| `/api/v1/deliveries*` now exists as the first BLN-backed delivery facade | Handoff and custody routes still are not exposed through the local app | Add custody routes on the same facade pattern instead of bypassing it from the frontend |

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

## Implemented `/api/v1/network` bridge
- Location:
  - `backend/src/app/network/network.controller.js`
  - `backend/src/app/network/network.service.js`
- Local auth rule:
  - all `/api/v1/network/*` routes require existing local auth
  - bootstrap remains admin-only
- First local BLN binding rule:
  - the first bridge lives in `users.preferences.bln`
  - stored shape is `{ tenantId, nodeId? }`
  - the backend never stores exchanged tenant access tokens in Postgres
- `POST /api/v1/network/bootstrap`
  - request body:
    - `name`
    - `firstNode.phoneNumber`
    - optional `firstNode.trustScore`
    - optional `bindUserId`
  - current behavior:
    - wraps sibling `logistics-api` tenant bootstrap
    - binds the resulting tenant and node to the target local user
    - returns only safe API key metadata: `last4` and `createdAt`
    - discards the plaintext upstream API key instead of returning it to the frontend
- `GET /api/v1/network/context`
  - current response shape:
    - `actor`
    - `binding`
    - `effectiveContext`
    - `tenant`
    - `node`
    - `issues`
  - admin callers may override the inspected tenant or node through query params
  - non-admin callers stay limited to their stored BLN binding
- `GET /api/v1/network/nodes`
  - non-admin callers list nodes through an exchanged tenant token
  - admin callers use service-backed access and must resolve a target tenant through query or stored binding
- `POST /api/v1/network/nodes`
  - non-admin callers create nodes only inside their bound BLN tenant
  - admin callers create nodes inside an explicit or bound tenant without exposing BLN credentials to the browser

## Implemented `/api/v1/deliveries` facade
- Location:
  - `backend/src/app/deliveries/deliveries.controller.js`
  - `backend/src/app/deliveries/deliveries.service.js`
- Local auth rule:
  - all `/api/v1/deliveries*` routes require existing local auth
- Tenant-resolution rule:
  - all delivery and event routes resolve a BLN tenant through the network bridge first
  - non-admin callers use their stored BLN binding only
  - admin callers may pass `tenantId` in query or body, or fall back to their stored BLN binding
- `POST /api/v1/deliveries`
  - forwards the upstream delivery-create payload
  - accepts optional local `tenantId` for admin targeting
  - forwards `Idempotency-Key` to the sibling BLN backend
- `GET /api/v1/deliveries`
  - forwards the upstream delivery-list query
  - accepts optional local `tenantId` for admin targeting
  - returns the upstream `{ items, nextCursor }` shape
- `GET /api/v1/deliveries/:id`
  - reads one BLN delivery detail through the local backend
  - accepts optional local `tenantId` query for admin targeting
- `GET /api/v1/deliveries/:id/events`
  - returns the upstream delivery event timeline array
  - accepts optional local `tenantId` query for admin targeting
- `POST /api/v1/deliveries/:id/events`
  - injects `deliveryId` from the route path instead of trusting frontend callers to provide it
  - accepts optional local `tenantId` in the body for admin targeting
  - forwards `Idempotency-Key` to the sibling BLN backend

## Planned BLN integration contract baseline
This section is the recommended target for the remaining active queue. It is not implemented runtime truth yet.

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
