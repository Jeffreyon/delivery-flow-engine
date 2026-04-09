# Slice 04: Orders and Drivers Runtime

- Type: `backend`
- Run order: `4`
- Depends on: Slices 02 and 03
- Migration need: `No`
- Status: `Archived`

> Archived note: this local-first runtime pack is no longer the active queue. Use the BLN integration track starting at Slice 11 unless the repo explicitly reopens a local augmentation path.

## PRD coverage
- Orders module
- Drivers module foundation

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| No `orders` or `drivers` modules exist in runtime code | The PRD business record and driver actor model are not implemented | Add bounded backend modules for orders and driver profiles |
| Drivers are modeled as `users` plus profile in planning docs | The runtime does not yet expose that actor model | Implement driver profile logic on top of the current auth and RBAC foundation |
| Existing controllers return mostly raw JSON payloads | Delivery modules could drift from the current response baseline | Keep the response style consistent with the current scaffold unless the contract slice chose otherwise |

## Scope
- Implement the orders routes and repository flow locked in Slice 02.
- Implement driver-profile routes and repository flow locked in Slice 02.
- Reuse the current auth, localAuth, and authz model instead of creating a second identity path.
- Add focused backend tests for the new modules.
- Update current-reality docs if runtime boundaries change.

## Out of scope
- Deliveries
- Dispatch or assignment history
- Tracking
- Incidents
- Async jobs

## Likely runtime and doc targets
- `backend/src/app/orders/*`
- `backend/src/app/drivers/*`
- `backend/src/index.js`
- `backend/test/*`
- `docs/API_SPEC.md`
- `docs/ARCHITECTURE.md`

## Required audit
- Run a touched-area repo consistency sweep across orders, drivers, authz boundaries, and the locked `/api/v1` contract docs.
- Apply `docs/RELEASE_CHECKLIST.md` to the slice scope before handoff.

## Required validation
- `backend`: `npm test`
- `frontend`: `npm run lint`
- `frontend`: `npx tsc -b`
- `frontend`: `npm test -- --run`
- `frontend`: `npm run build`
- backend lint, typecheck, and build: report unavailable

## Staging follow-through
- Apply `docs/STAGING_CHECKLIST.md` only if the new orders or drivers runtime is staged.
- Record `not requested` when the slice stops at local implementation.

## PR follow-through
- Prepare `docs/PR_TEMPLATE.md` when publishing is in scope.
- Include contract compliance, validation evidence, and any deferred search or onboarding behavior.

## Exit criteria
- Orders and drivers routes work against the new schema.
- Driver logic stays tied to `users` plus profile data.
- Backend tests cover the new route and service behavior.

## Allowed deferrals
- Advanced search and filtering
- Batch import flows
- Driver onboarding UI
