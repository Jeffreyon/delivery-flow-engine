# Slice 05: Deliveries and Dispatch Runtime

- Type: `backend`
- Run order: `5`
- Depends on: Slices 03 and 04
- Migration need: `No`
- Status: `Archived`

> Archived note: this local-first runtime pack is no longer the active queue. Use the BLN integration track starting at Slice 11 unless the repo explicitly reopens a local augmentation path.

## PRD coverage
- Deliveries module
- Dispatch module
- Assignment history

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| No delivery or dispatch modules exist yet | The repo cannot create or assign deliveries | Add delivery and dispatch runtime modules on top of the new schema |
| One order may own multiple deliveries | The runtime has no logic for that cardinality yet | Preserve one-to-many order-to-delivery creation and lookup flows |
| Assignment history is planned as a first-class record | Reassignment could be lost on a mutable delivery row | Persist assignment and reassignment history in `assignments` |

## Scope
- Implement delivery creation and read paths.
- Implement dispatch assign and reassign actions using the contract from Slice 02.
- Persist assignment history instead of hiding it on the delivery row only.
- Add focused backend tests for deliveries and dispatch behavior.
- Update touched docs when runtime truth changes.

## Out of scope
- Full lifecycle enforcement beyond the minimal creation and assignment path
- Tracking
- Incidents
- Queue-backed dispatch heuristics

## Likely runtime and doc targets
- `backend/src/app/deliveries/*`
- `backend/src/app/dispatch/*`
- `backend/src/index.js`
- `backend/test/*`
- `docs/API_SPEC.md`
- `docs/ARCHITECTURE.md`

## Required audit
- Run a touched-area repo consistency sweep across deliveries, dispatch flows, assignment history, and the locked delivery contract.
- Apply `docs/RELEASE_CHECKLIST.md` to the slice scope before handoff.

## Required validation
- `backend`: `npm test`
- `frontend`: `npm run lint`
- `frontend`: `npx tsc -b`
- `frontend`: `npm test -- --run`
- `frontend`: `npm run build`
- backend lint, typecheck, and build: report unavailable

## Staging follow-through
- Apply `docs/STAGING_CHECKLIST.md` only if deliveries or dispatch flows are staged.
- Record `not requested` when deploy proof is not in scope.

## PR follow-through
- Prepare `docs/PR_TEMPLATE.md` when publishing is in scope.
- Include assignment-history behavior, validation evidence, and any dispatch deferrals.

## Exit criteria
- Deliveries can be created and fetched.
- Drivers can be assigned and reassigned through a bounded dispatch surface.
- Assignment history is persisted and test-covered.

## Allowed deferrals
- Automated dispatch selection
- Optimization heuristics
- UI support for dispatch workflows
