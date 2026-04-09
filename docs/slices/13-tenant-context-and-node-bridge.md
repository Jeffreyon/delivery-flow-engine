# Slice 13: Tenant Context and Node Bridge

- Type: `backend`
- Run order: `13`
- Depends on: Slices 11 and 12
- Migration need: `Yes`
- Status: `Implemented`

## PRD coverage
- backend-owned auth bridge into the external delivery network
- tenant bootstrap and node setup
- hiding BLN credentials from the frontend

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| Local auth, the BLN client, and the first `/api/v1/network/*` routes now exist | BLN-backed deliveries and handoffs still are not exposed through the local backend | Reuse the current bridge for the next facade slices instead of widening auth again |
| The sibling BLN backend supports tenant bootstrap, node create or read, support-only tenant exchange, and node-session auth | The bridge still stops at context and nodes | Build remote deliveries and custody on top of the current bridge |
| The first secure tenant integration, membership, and node-assignment records now exist locally | Future slices could over-design local role state beyond the first tenant and node bridge | Keep the first secure binding narrow until richer operator workflows are real |

## Scope
- Implement the first local network-context routes above the logistics client.
- Wrap BLN tenant bootstrap and node create or read flows behind local auth.
- Add the first local context resolution behavior for BLN tenant and node access.
- Decide and document whether the first bridge can stay in `users.preferences` or needs durable encrypted backend storage.
- Add focused backend tests for the context bridge.

## Out of scope
- BLN-backed delivery or event routes
- handoff workflows
- frontend setup wizard
- local projection schema

## Likely runtime and doc targets
- `backend/src/app/network/*` or equivalent small integration area
- `backend/src/index.js`
- `backend/test/*`
- `docs/API_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`

## Required audit
- Run a touched-area repo consistency sweep across local auth, tenant-context resolution, bootstrap behavior, and node bridge rules.
- Apply `docs/RELEASE_CHECKLIST.md` to the slice scope before handoff.

## Required validation
- `backend`: `npm test`
- `frontend`: `npm run lint`
- `frontend`: `npx tsc -b`
- `frontend`: `npm test -- --run`
- `frontend`: `npm run build`
- backend lint, typecheck, and build: report unavailable

## Staging follow-through
- Apply `docs/STAGING_CHECKLIST.md` only if the tenant or node bridge is exercised against the staged BLN backend.
- Record `not requested` when the slice stops at local implementation.

## PR follow-through
- Prepare `docs/PR_TEMPLATE.md` when publishing is in scope.
- Include the local context decision, bootstrap flow, and validation evidence.

## Delivered
- Added `POST /api/v1/network/bootstrap` behind local admin auth.
- Added `GET /api/v1/network/context` behind local auth with stale-binding issue reporting.
- Added `GET /api/v1/network/nodes` and `POST /api/v1/network/nodes` behind local auth.
- Added `backend/migrations/0009_create_tenant_owner_accounts.sql`, which now creates the first durable BLN tenant integration, membership, and node-assignment tables.
- Bound the first BLN tenant and node context through `bln_tenant_accounts`, `bln_tenant_memberships`, and `bln_node_assignments`, with `users.preferences.bln` left as a compatibility mirror.
- Kept the tenant API key encrypted in backend storage and minted backend-only node sessions on demand.
- Added focused backend service and controller coverage for the bridge.

## Exit criteria
- The app can resolve a safe local BLN context through the backend.
- The first tenant bootstrap and node bridge routes exist behind local auth.
- Tests cover context resolution and failure cases.

## Allowed deferrals
- broader local membership schema
- non-admin BLN onboarding UI
- multi-tenant workspace switching
