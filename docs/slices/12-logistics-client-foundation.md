# Slice 12: Logistics Client Foundation

- Type: `backend`
- Run order: `12`
- Depends on: Slice 11
- Migration need: `No`
- Status: `Implemented on the current branch`

## PRD coverage
- backend-owned delivery client layer
- external API env contract
- normalized external API error handling

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| No backend client layer exists | Backend routes cannot consume `logistics-api` safely or consistently | Add a bounded logistics client abstraction first |
| No env contract exists for the sibling BLN backend | Runtime code cannot discover the external base URL or service secret cleanly | Define and document the minimum env contract before feature routes land |
| Idempotency and error behavior would otherwise be route-specific | Later facades could drift on retries, timeouts, and error mapping | Centralize request headers, timeouts, and error normalization in the client layer |

## Scope
- Add a backend-only logistics client module for the sibling `logistics-api`.
- Define the env contract for the external base URL, service secret, and request timeout.
- Wrap the first external calls needed for tenant bootstrap, token exchange, nodes, deliveries, events, and handoffs.
- Normalize upstream errors and pass through `Idempotency-Key` where relevant.
- Add focused backend tests for the client layer.

## Out of scope
- local BLN tenant-binding persistence
- app-local `/api/v1/*` facade routes
- frontend changes
- local projections or sync jobs

## Likely runtime and doc targets
- `backend/src/clients/*`
- `backend/src/config/*` or equivalent small config area
- `backend/test/*`
- `docs/API_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`

## Required audit
- Run a touched-area repo consistency sweep across the client layer, env contract, and sibling BLN API assumptions.
- Apply `docs/RELEASE_CHECKLIST.md` to the slice scope before handoff.

## Required validation
- `backend`: `npm test`
- `frontend`: `npm run lint`
- `frontend`: `npx tsc -b`
- `frontend`: `npm test -- --run`
- `frontend`: `npm run build`
- backend lint, typecheck, and build: report unavailable

## Staging follow-through
- Apply `docs/STAGING_CHECKLIST.md` only if the client layer is exercised against a staged BLN backend.
- Record `not requested` when the slice stops at local implementation.

## PR follow-through
- Prepare `docs/PR_TEMPLATE.md` when publishing is in scope.
- Include the env contract, upstream error model, and validation evidence.

## Exit criteria
- A bounded backend-only client layer exists for the sibling BLN backend.
- The env contract is explicit and documented.
- Focused tests cover request construction, error normalization, and retry-relevant behavior.

## Allowed deferrals
- SDK extraction or publishing
- circuit breakers beyond simple timeout and error mapping
- background refresh or caching
