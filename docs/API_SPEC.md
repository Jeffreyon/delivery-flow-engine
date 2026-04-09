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
| Network | POST | `/api/v1/network/provision-self` | Authenticated | `{ tenant, node, binding, membership, assignment, apiKey }` |
| Network | GET | `/api/v1/network/context` | Authenticated | `{ actor, binding, memberships, assignments, effectiveContext, tenant, node, issues }` |
| Network | GET | `/api/v1/network/nodes` | Authenticated | `{ tenantId, activeNodeId, items }` |
| Network | POST | `/api/v1/network/nodes` | Admin | `{ node }` |
| Network | GET | `/api/v1/network/users` | Admin | `{ tenantId, availableNodes, items }` |
| Network | PUT | `/api/v1/network/users/:userId` | Admin | `{ tenantId, availableNodes, user, membership, assignments }` |
| Deliveries | POST | `/api/v1/deliveries` | Authenticated | `{ id, status }` |
| Deliveries | GET | `/api/v1/deliveries` | Authenticated | `{ items, nextCursor }` |
| Deliveries | GET | `/api/v1/deliveries/:id` | Authenticated | `RemoteDelivery` |
| Delivery events | GET | `/api/v1/deliveries/:id/events` | Authenticated | `RemoteDeliveryEvent[]` |
| Delivery events | POST | `/api/v1/deliveries/:id/events` | Authenticated | `{ success: true }` |
| Handoffs | GET | `/api/v1/deliveries/:id/handoff-status` | Authenticated | `RemoteHandoffStatus` |
| Handoffs | GET | `/api/v1/handoffs` | Authenticated | `{ items }` |
| Handoffs | GET | `/api/v1/handoffs/:id` | Authenticated | `{ handoff }` |
| Handoffs | POST | `/api/v1/handoffs/initiate` | Authenticated | `RemoteHandoffInitiation` |
| Handoffs | POST | `/api/v1/handoffs/:id/retry` | Authenticated | `RemoteHandoffRetry` |
| Handoffs | POST | `/api/v1/handoffs/verify` | Authenticated | `RemoteHandoffVerification` |
| Handoffs | POST | `/api/v1/handoffs/dispute` | Authenticated | `RemoteHandoffDispute` |
| Handoffs | POST | `/api/v1/handoffs/:id/resolve` | Admin | `RemoteHandoffResolution` |

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
- `/api/v1/network/bootstrap` stores the returned tenant API key only in encrypted backend storage and returns only safe metadata to the frontend.
- `/api/auth/signup` is still local-user creation only; the app’s first BLN tenant and node are provisioned by the explicit follow-up route `POST /api/v1/network/provision-self`.
- `/api/v1/network/provision-self` is the first-user onboarding route: it bootstraps a tenant and first node in the sibling `logistics-api`, stores the returned tenant API key only in encrypted backend storage, then writes the local tenant integration, membership, default node assignment, and compatibility binding mirror for the signed-in user.
- `/api/v1/network/context` returns `200` with `issues` when the secured BLN membership, node assignment, or tenant integration is missing, stale, or holds an invalid API key, instead of converting that local state gap into a hard 4xx.
- `/api/v1/network/nodes` never exposes BLN API keys, tenant tokens, or node session tokens to the frontend.
- `/api/v1/network/nodes` returns the selected tenant's node list plus `activeNodeId` for non-admin callers; `POST /api/v1/network/nodes` is still admin-only support flow.
- `/api/v1/network/users` and `PUT /api/v1/network/users/:userId` are admin-only tenant-member management routes above the local BLN bridge.
- `PUT /api/v1/network/users/:userId` manages tenant membership and node assignments together so secure BLN writes remain node-scoped.
- `/api/v1/deliveries*` and `/api/v1/handoffs*` routes always resolve BLN access through the local backend first, using the tenant's encrypted API key to mint a short-lived node session token.
- Tenant data is membership-scoped in this app. Normal callers may select only tenants and nodes they are assigned to.
- `POST /api/v1/deliveries` and `POST /api/v1/deliveries/:id/events` pass `Idempotency-Key` through when the header is present.
- `/api/v1/handoffs*` routes use the same tenant-resolution rule as `/api/v1/deliveries*`.
- `GET /api/v1/handoffs` requires `deliveryId` and returns the upstream `{ items }` shape.
- `POST /api/v1/handoffs/:id/resolve` is intentionally admin-only in this app, even though the sibling BLN backend can resolve through tenant access. Local admins still resolve through a selected BLN tenant context because the sibling handoff routes are not service-readable.
- `POST /api/v1/handoffs/initiate`, `POST /api/v1/handoffs/:id/retry`, and `POST /api/v1/handoffs/verify` pass `Idempotency-Key` through when the header is present.

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| Routes mostly return raw JSON payloads | The API is not yet uniform | Keep the current payload shapes documented until the code is hardened |
| `PUT /api/users/:id` stays shared by self and admin | Separate self and admin endpoints do not exist | Keep actor-scoped field validation until a real consumer needs dedicated routes |
| `notifications/mark-read` is now ownership-scoped | Response remains minimal | Expand the response only when a real consumer needs counts or detail |
| `POST /api/events` and `POST /api/delivery-events` are admin-only | Signed or internal-only ingestion is not modeled yet, and delivery-specific producers are not wired yet | Keep the write boundaries narrow until a dedicated ingestion flow exists |
| `/api/v1/network/*`, `/api/v1/deliveries*`, and `/api/v1/handoffs*` now exist as BLN-backed local route families | Operator-facing custody UI and summarized projections still do not exist | Keep the backend-owned bridge pattern and add UI or projection slices on top instead of bypassing it from the frontend |

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
  - node session exchange
  - nodes
  - deliveries
  - delivery events
  - handoffs
- Internal auth modes:
  - service auth uses `x-delivery-backend-secret`
  - tenant auth uses `Authorization: Bearer <tenant credential>`
  - node session exchange uses `Authorization: Bearer <tenant API key>`
- Service secret note:
  - `LOGISTICS_API_SERVICE_SECRET` is not tenant auth
  - it must match `DELIVERY_BACKEND_SERVICE_SECRET` in the sibling `logistics-api`
  - it exists only for trusted backend-to-backend calls such as tenant bootstrap and support flows
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
  - the secured tenant integration lives in `bln_tenant_accounts`
  - local user access is granted through `bln_tenant_memberships`
  - node act-as rights are granted through `bln_node_assignments`
  - `users.preferences.bln` remains only as a compatibility mirror
  - the backend never stores exchanged tenant access tokens or node session tokens in Postgres
- `POST /api/v1/network/bootstrap`
  - request body:
    - `name`
    - `firstNode.phoneNumber`
    - optional `firstNode.trustScore`
    - optional `bindUserId`
  - current behavior:
    - wraps sibling `logistics-api` tenant bootstrap
    - creates the resulting tenant integration, tenant membership, and default node assignment for the target local user
    - encrypts and stores the returned tenant API key in `bln_tenant_accounts`
    - returns only safe API key metadata: `last4` and `createdAt`
    - never returns the plaintext upstream API key to the frontend
- `POST /api/v1/network/provision-self`
  - request body:
    - `tenantName`
    - `phoneNumber`
    - optional `trustScore`
  - current behavior:
    - requires an authenticated local user
    - bootstraps one tenant and first node in the sibling `logistics-api`
    - stores the returned tenant API key only in encrypted backend storage
    - creates the local tenant membership as `OWNER`
    - creates the local default node assignment for the current user
    - returns only safe API key metadata: `last4` and `createdAt`
    - rejects the request when the current user already has an active BLN tenant membership
- `GET /api/v1/network/context`
  - current response shape:
    - `actor`
    - `binding`
    - `memberships`
    - `assignments`
    - `effectiveContext`
    - `tenant`
    - `node`
    - `issues`
  - non-admin callers stay limited to BLN tenants where they hold an active membership
  - the route requires explicit `tenantId` or `nodeId` only when the user has multiple active memberships or assignments
  - the route mints a fresh backend-only node session to confirm the selected tenant integration credentials are still valid
- `GET /api/v1/network/nodes`
  - non-admin callers receive the selected tenant's node list plus the active node assignment id
  - admin callers may still list nodes for an explicit tenant through service-backed access
- `POST /api/v1/network/nodes`
  - admin-only support flow
  - creates nodes inside an explicit tenant without exposing BLN credentials to the browser
- `GET /api/v1/network/users`
  - admin-only tenant-member management read
  - requires `tenantId`
  - returns local users, their tenant membership state, their node assignments, and the available BLN nodes for that tenant
- `PUT /api/v1/network/users/:userId`
  - admin-only tenant-member management write
  - requires `tenantId`
  - accepts `role`, `status`, `nodeIds`, and optional `defaultNodeId`
  - validates that assigned `nodeIds` exist in the selected BLN tenant before persisting local membership state
  - updates the compatibility-only `users.preferences.bln` mirror to the selected default node when the membership remains active

## Implemented `/api/v1/deliveries` facade
- Location:
  - `backend/src/app/deliveries/deliveries.controller.js`
  - `backend/src/app/deliveries/deliveries.service.js`
- Local auth rule:
  - all `/api/v1/deliveries*` routes require existing local auth
- Tenant-resolution rule:
  - all delivery and event routes resolve BLN access through the selected tenant membership and node assignment first
  - normal callers may only target tenants and nodes they are assigned to
  - the backend mints a short-lived node session token per request and forwards that token to the sibling BLN backend
- `POST /api/v1/deliveries`
  - forwards the upstream delivery-create payload
  - forwards `Idempotency-Key` to the sibling BLN backend
- `GET /api/v1/deliveries`
  - forwards the upstream delivery-list query
  - returns the upstream `{ items, nextCursor }` shape
- `GET /api/v1/deliveries/:id`
  - reads one BLN delivery detail through the local backend
- `GET /api/v1/deliveries/:id/events`
  - returns the upstream delivery event timeline array
- `POST /api/v1/deliveries/:id/events`
  - injects `deliveryId` from the route path instead of trusting frontend callers to provide it
  - forwards `Idempotency-Key` to the sibling BLN backend

## Implemented `/api/v1/handoffs` facade
- Location:
  - `backend/src/app/handoffs/handoffs.controller.js`
  - `backend/src/app/handoffs/handoffs.service.js`
- Local auth rule:
  - all handoff routes require existing local auth
  - `POST /api/v1/handoffs/:id/resolve` additionally requires local admin auth
- Tenant-resolution rule:
  - user-scoped handoff routes resolve BLN access through the selected tenant membership and node assignment first
  - normal callers may only target tenants and nodes they are assigned to
  - the backend mints a short-lived node session token per request and forwards that token to the sibling BLN backend
  - `POST /api/v1/handoffs/:id/resolve` remains the one local admin support exception and still resolves tenant context through the delivery-backend service bridge
- `GET /api/v1/deliveries/:id/handoff-status`
  - reads the upstream handoff-status view for one delivery
- `GET /api/v1/handoffs`
  - requires `deliveryId` in query
  - returns the upstream `{ items }` audit shape
- `GET /api/v1/handoffs/:id`
  - reads one upstream handoff detail
- `POST /api/v1/handoffs/initiate`
  - forwards the upstream initiate payload
  - forwards `Idempotency-Key` to the sibling BLN backend
- `POST /api/v1/handoffs/:id/retry`
  - forwards `Idempotency-Key` to the sibling BLN backend
- `POST /api/v1/handoffs/verify`
  - forwards the upstream verify payload
  - forwards `Idempotency-Key` to the sibling BLN backend
- `POST /api/v1/handoffs/dispute`
  - forwards the upstream dispute payload
- `POST /api/v1/handoffs/:id/resolve`
  - keeps local resolution admin-only
  - accepts optional local `tenantId` in the body for admin targeting
  - forwards the upstream `resolution` payload through the selected BLN tenant context

## Planned BLN integration contract baseline
This section is the recommended target for the remaining active queue. It is not implemented runtime truth yet unless a later section above already marks it implemented.

### Versioning rule
- Existing scaffold routes stay under unversioned `/api/*`.
- New BLN-backed app routes start under `/api/v1/*`.
- Do not expose BLN secrets, tenant API keys, exchanged tenant tokens, or node session tokens directly to the frontend.
- Do not add direct frontend calls to the sibling `logistics-api` in the first cut.

### Actor matrix
| Actor | Auth basis | First-cut contract rights | Deferred or denied |
|---|---|---|---|
| `admin` | Existing scaffold admin auth and RBAC | Bootstrap BLN tenant and first node, inspect context, create support nodes, manage tenant users and node assignments, and resolve disputes through the explicit admin-only route | General delivery or handoff reads and writes still require a tenant membership and node assignment in milestone 1 |
| `authenticated user with resolved BLN context` | Existing authenticated user plus a local BLN tenant membership, node assignment, and backend-minted node session | Read and mutate BLN-backed deliveries or handoffs only within the resolved local BLN context | Workspace-wide admin actions and bootstrap remain denied |
| `authenticated user without BLN context` | Existing authenticated user only | No BLN-backed delivery or handoff access yet beyond context or onboarding flows when they exist | Delivery and custody features stay denied until a safe binding exists |
| `frontend caller` | Browser session only | Calls only local app routes under `/api/v1/*` | Direct calls to `logistics-api` are deferred |

### First-cut planned routes
| Area | Method | Path | Planned actor access | Slice target | Notes |
|---|---|---|---|---|---|
| Network | GET | `/api/v1/network/users` | `admin` | 17 | Implemented admin-side tenant-member list plus available-node read |
| Network | PUT | `/api/v1/network/users/:userId` | `admin` | 17 | Implemented admin-side tenant-member and node-assignment write |
| Handoffs | GET | `/api/v1/deliveries/:id/handoff-status` | authenticated user with BLN tenant membership and node assignment | 15 | Implemented local facade over BLN custody status |
| Handoffs | GET | `/api/v1/handoffs` | authenticated user with BLN tenant membership and node assignment | 15 | Implemented handoff history read through the local backend |
| Handoffs | GET | `/api/v1/handoffs/:id` | authenticated user with BLN tenant membership and node assignment | 15 | Implemented remote handoff read through the local backend |
| Handoffs | POST | `/api/v1/handoffs/initiate` | authenticated user with BLN tenant membership and node assignment | 15 | Implemented custody-transfer initiation |
| Handoffs | POST | `/api/v1/handoffs/:id/retry` | authenticated user with BLN tenant membership and node assignment | 15 | Implemented active handoff PIN retry |
| Handoffs | POST | `/api/v1/handoffs/verify` | authenticated user with BLN tenant membership and node assignment | 15 | Implemented PIN verification and custody completion |
| Handoffs | POST | `/api/v1/handoffs/dispute` | authenticated user with BLN tenant membership and node assignment | 15 | Implemented dispute raise through the local backend |
| Handoffs | POST | `/api/v1/handoffs/:id/resolve` | `admin` | 15 | Implemented admin-only local dispute resolution |

### Explicit deferrals
- Do not expose direct browser calls to the sibling `logistics-api`.
- Do not reactivate the older local-first `orders`, `drivers`, `deliveries`, `dispatch`, `tracking`, or `incidents` route plan until the repo deliberately chooses a local augmentation role for those tables.
- Local tracking, incident, or queue-backed projection routes are deferred until the BLN-backed facade and custody workspace are real.
