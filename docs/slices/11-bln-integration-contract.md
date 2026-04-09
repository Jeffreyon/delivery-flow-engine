# Slice 11: BLN Integration Contract

- Type: `docs-only -> backend`
- Run order: `11`
- Depends on: current baseline
- Migration need: `No`
- Status: `Implemented on the current branch`

## PRD coverage
- external delivery-network integration
- backend-owned client layer boundary
- app-local route contract above the BLN API

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| The PRD expects an external delivery API and the sibling `logistics-api` now provides one | The active pack queue still leans toward a local-first delivery runtime | Lock the BLN integration boundary as the active queue |
| No local app route contract exists yet for BLN-backed flows | Later agents could proxy the sibling API ad hoc or bypass the backend entirely | Define the first local `/api/v1/*` facade contract before implementation |
| Local delivery tables exist in schema | They could be mistaken for the next source-of-truth path | Mark the local-first runtime packs archived and keep the local schema dormant until a later explicit projection decision |

## Scope
- Map the PRD's external delivery API to the current sibling `logistics-api` repo.
- Lock the local app-versus-external-BLN boundary in docs.
- Define the first local `/api/v1` BLN-backed route family.
- Rebuild the active slice-pack queue around BLN integration.

## Out of scope
- runtime client implementation
- local tenant-binding persistence
- frontend delivery UI
- projection or sync jobs

## Likely runtime and doc targets
- `README.md`
- `docs/GAP_ANALYSIS.md`
- `docs/ARCHITECTURE.md`
- `docs/API_SPEC.md`
- `docs/DECISIONS.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/slices/README.md`

## Required audit
- Run a touched-area repo consistency sweep across the PRD, the active planning chain, and the new pack queue.
- Apply `docs/RELEASE_CHECKLIST.md` to the docs scope before handoff.

## Required validation
- Docs consistency sweep only unless runtime files are touched inside the slice.
- If runtime files are touched, run repo-true backend and frontend validation and report unavailable backend scripts explicitly.

## Staging follow-through
- `Not requested` in the docs-only path.
- If staging is requested later, apply `docs/STAGING_CHECKLIST.md` only after runtime work exists.

## PR follow-through
- `Not requested` in the docs-only path.
- If publishing is requested later, prepare handoff with `docs/PR_TEMPLATE.md`.

## Exit criteria
- The external BLN boundary is explicit.
- The active pack queue points at BLN integration instead of the archived local-first runtime track.
- The local app route family is documented without claiming it already exists in code.

## Allowed deferrals
- exact local tenant-binding persistence choice
- frontend route inventory changes
- local projection or caching decisions
