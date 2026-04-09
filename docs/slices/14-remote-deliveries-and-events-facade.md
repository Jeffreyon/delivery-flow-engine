# Slice 14: Remote Deliveries and Events Facade

- Type: `backend`
- Run order: `14`
- Depends on: Slices 12 and 13
- Migration need: `No`
- Status: `Implemented`

## PRD coverage
- create delivery
- list and detail deliveries
- event timeline
- backend-mediated external API use

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| The app now exposes BLN-backed delivery create, list, detail, and event routes | Handoff and custody routes still are not exposed locally | Reuse the same facade pattern for the custody slice instead of bypassing the local backend |
| The sibling BLN backend already supports create, list, get, append-event, and event-history flows | This repo still has no operator UI on top of those remote routes | Build the first delivery workspace and timeline UI on the existing facade instead of rebuilding local delivery ownership first |
| Local delivery tables exist but have no runtime handlers | They could still distract from the remote facade work | Keep local tables dormant while the handoff and UI slices land |

## Scope
- Implement local `/api/v1/deliveries` create, list, and detail routes backed by the logistics client.
- Implement local `/api/v1/deliveries/:id/events` read and append routes backed by the logistics client.
- Propagate idempotency headers and normalize upstream responses for frontend callers.
- Add focused backend tests for the remote facade.
- Update current-reality docs if runtime boundaries change.

## Out of scope
- handoff and custody flows
- node setup UI
- local projections or cached summaries
- local orders or drivers runtime

## Likely runtime and doc targets
- `backend/src/app/deliveries/*`
- `backend/src/app/deliveryEvents/*` or a new facade area
- `backend/src/index.js`
- `backend/test/*`
- `docs/API_SPEC.md`
- `docs/ARCHITECTURE.md`

## Required audit
- Run a touched-area repo consistency sweep across the local delivery facade, upstream BLN contract assumptions, and error mapping.
- Apply `docs/RELEASE_CHECKLIST.md` to the slice scope before handoff.

## Required validation
- `backend`: `npm test`
- `frontend`: `npm run lint`
- `frontend`: `npx tsc -b`
- `frontend`: `npm test -- --run`
- `frontend`: `npm run build`
- backend lint, typecheck, and build: report unavailable

## Staging follow-through
- Apply `docs/STAGING_CHECKLIST.md` only if the BLN-backed delivery facade is exercised against staging.
- Record `not requested` when the slice stops at local implementation.

## PR follow-through
- Prepare `docs/PR_TEMPLATE.md` when publishing is in scope.
- Include upstream BLN assumptions, validation evidence, and any deferrals around caching or UI work.

## Delivered
- Added `POST /api/v1/deliveries`.
- Added `GET /api/v1/deliveries`.
- Added `GET /api/v1/deliveries/:id`.
- Added `GET /api/v1/deliveries/:id/events`.
- Added `POST /api/v1/deliveries/:id/events`.
- Reused the network bridge so all delivery and event routes resolve tenant-scoped BLN access through the local backend.
- Forwarded `Idempotency-Key` for delivery create and delivery-event append routes.
- Added focused backend service and controller coverage for the facade.

## Exit criteria
- The local backend exposes BLN-backed delivery create, list, detail, and event routes.
- Idempotency and upstream errors are handled consistently.
- Focused tests cover success and failure paths.

## Allowed deferrals
- local search indexing
- cached summaries
- dashboard UI
