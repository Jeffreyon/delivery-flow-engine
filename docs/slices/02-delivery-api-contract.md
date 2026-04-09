# Slice 02: Delivery API Contract Baseline

- Type: `docs-only -> backend`
- Run order: `2`
- Depends on: current planning baseline; can run in parallel with Slice 01
- Migration need: `No`
- Status: `Archived`

> Archived note: this local-first contract pack is no longer the active queue. Use the BLN integration track starting at Slice 11 unless the repo explicitly reopens a local augmentation path.

## PRD coverage
- Orders API
- Deliveries API
- Drivers API
- Dispatch API
- Tracking API boundary
- Versioned delivery routes

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| The live backend only exposes unversioned scaffold routes under `/api/*`, and the first delivery contract is now locked in docs under `/api/v1` | Delivery handlers do not exist yet for the documented contract | Implement later delivery runtime slices against the locked `/api/v1` boundary while leaving existing scaffold routes unchanged |
| The repo only has `admin` and `user` roles today | Delivery actors and their permissions are not defined | Decide the milestone-1 actor matrix before handlers or schema expand |
| Delivery resource and mutation shapes are now documented, but not implemented | Later runtime slices could still drift from the locked contract | Implement handlers against the documented route and actor matrix |

## Scope
- Decide whether the first delivery routes begin under `/api/v1`.
- Lock the first implementation subset for PRD-aligned endpoints.
- Record the actor matrix for `admin`, driver-backed users, and any deferred operator role.
- Decide which PRD routes are in the first cut and which remain explicit follow-ons.
- Keep existing scaffold APIs documented as current runtime truth.

## Delivered baseline
- New delivery-domain routes are locked to `/api/v1`, while the current scaffold stays under unversioned `/api/*`.
- Milestone 1 actor access is locked to `admin` plus self-scoped or assigned `driver` access where needed; a dedicated `operator` role stays deferred.
- The first delivery contract cut covers orders, drivers, deliveries, and dispatch, while tracking routes are reserved for a later slice and incident endpoints remain explicitly deferred.
- The first tracking write route is `POST /api/v1/tracking/ping`; the PRD's parallel `drivers/:id/location` write path is not part of the first cut.

## Minimum contract to lock
- Orders: create, list, get
- Drivers: create, update availability
- Deliveries: create, get, update status
- Dispatch: assign, reassign
- Tracking: reserve the route shape now even if implementation lands in a later slice
- Incidents: either reserve or defer explicitly

## Out of scope
- No runtime handlers
- No schema changes
- No UI work

## Likely doc targets
- `docs/API_SPEC.md`
- `docs/DECISIONS.md`
- `docs/ARCHITECTURE.md`

## Required audit
- Run a touched-area repo consistency sweep across current routes, planning docs, and slice sequencing.
- Apply `docs/RELEASE_CHECKLIST.md` to the touched docs scope before handoff.

## Required validation
- Docs consistency sweep only unless code or config changes during the slice

## Staging follow-through
- `Not requested` for this slice unless later contract publication is tied to a real deploy or staging review.
- If staging is requested later, apply `docs/STAGING_CHECKLIST.md` only to the touched delivery-contract surfaces.

## PR follow-through
- `Not requested` in the local docs-only completion path.
- If publishing is requested later, prepare handoff with `docs/PR_TEMPLATE.md` and capture the locked `/api/v1` contract decisions plus remaining runtime follow-ons.

## Exit criteria
- The first delivery route set is documented.
- Versioning rules are explicit.
- Actor access rules are explicit enough for schema and handler work to proceed.

## Allowed deferrals
- External notification or webhook contracts
- Incident endpoint details if incidents remain a later runtime slice
- Separate operator role if milestone 1 can run on `admin` plus driver role membership
