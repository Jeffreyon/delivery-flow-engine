# Slice 06: Lifecycle and Delivery Events

- Type: `backend`
- Run order: `6`
- Depends on: Slice 05
- Migration need: `No`
- Status: `Planned`

## PRD coverage
- Delivery lifecycle state machine
- Immutable event log

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| Parent `events` and child `delivery_events` surfaces exist | No delivery-owned producer or transition policy is enforced yet | Use `events` as the parent ledger and `delivery_events` as the immutable delivery sink for lifecycle actions |
| The PRD transition matrix is documented only in `docs/PRD.md` | Runtime status updates are not modeled | Enforce the first lifecycle state machine in code |
| Orders, deliveries, and assignments will exist after earlier slices | Their side effects are not yet reflected in the event ledger | Emit delivery-domain events for creation, assignment, and status changes |

## PRD transition baseline
- `PENDING -> ASSIGNED`
- `ASSIGNED -> ACCEPTED`
- `ACCEPTED -> PICKED_UP`
- `PICKED_UP -> IN_TRANSIT`
- `IN_TRANSIT -> DELIVERED`
- `IN_TRANSIT -> FAILED`
- `FAILED -> RETURNED`
- `PENDING -> CANCELLED`
- `ASSIGNED -> CANCELLED`

## Scope
- Enforce the first delivery state machine in service-layer code.
- Update the status mutation path to reject invalid transitions.
- Emit immutable `delivery_events` records for the delivery actions that now exist.
- Add focused backend tests for transition rules and event writes.
- Update current-reality docs where lifecycle behavior becomes implemented.

## Out of scope
- `incidents`
- `location_pings`
- BullMQ jobs
- UI work

## Likely runtime and doc targets
- `backend/src/app/deliveries/*`
- `backend/src/app/dispatch/*`
- `backend/src/app/events/*`
- `backend/src/app/deliveryEvents/*`
- `backend/test/*`
- `docs/API_SPEC.md`
- `docs/DOMAIN_MODEL.md`
- `docs/DECISIONS.md`

## Required audit
- Run a touched-area repo consistency sweep across lifecycle rules, delivery event writes, and parent-child event boundaries.
- Apply `docs/RELEASE_CHECKLIST.md` to the slice scope before handoff.

## Required validation
- `backend`: `npm test`
- `frontend`: `npm run lint`
- `frontend`: `npx tsc -b`
- `frontend`: `npm test -- --run`
- `frontend`: `npm run build`
- backend lint, typecheck, and build: report unavailable

## Staging follow-through
- Apply `docs/STAGING_CHECKLIST.md` only if lifecycle behavior is staged.
- Record `not requested` or missing deploy evidence explicitly.

## PR follow-through
- Prepare `docs/PR_TEMPLATE.md` when publishing is in scope.
- Include transition coverage, event-write evidence, and any incident or job deferrals.

## Exit criteria
- Valid transitions are enforced in code.
- Invalid transitions fail predictably.
- Delivery-domain event writes are emitted and tested.

## Allowed deferrals
- Rich failure taxonomy that depends on `incidents`
- Background jobs triggered from events
- Non-core event consumers
