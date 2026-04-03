# Slice 07: Tracking Runtime

- Type: `backend`
- Run order: `7`
- Depends on: Slices 01, 05, and 06
- Migration need: `Yes`
- Status: `Planned`

## PRD coverage
- Tracking module
- `location_pings`
- Delivery tracking reads

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| No `location_pings` table or tracking routes exist | The PRD tracking flow is absent from both schema and runtime | Add a tracking slice that stores pings and exposes delivery tracking reads |
| Deliveries and driver identities will exist after earlier slices | No telemetry ties those actors together yet | Record pings against the established delivery and driver foundations |
| Async platform planning exists | Tracking writes and stalled checks have no runtime path yet | Start with synchronous ingestion and layer async stalled-detection later |

## Scope
- Add the `location_pings` migration(s).
- Implement the contract-locked tracking write path.
- Implement the delivery tracking read path.
- Add only the indexes needed for the implemented queries.
- Add focused backend tests for tracking writes and reads.

## Out of scope
- WebSockets
- Live map UI
- Stalled-delivery detection jobs

## Likely runtime and doc targets
- `backend/migrations/*`
- `backend/src/app/tracking/*`
- `backend/src/index.js`
- `backend/test/*`
- `docs/DB_SCHEMA.md`
- `docs/API_SPEC.md`
- `docs/MIGRATION_WORKFLOW.md`

## Required audit
- Run a touched-area repo consistency sweep across tracking schema, delivery access rules, and the locked tracking contract.
- Apply `docs/RELEASE_CHECKLIST.md` to the slice scope before handoff.

## Required validation
- `backend`: `npm run db:migrate`
- `backend`: `npm test`
- `frontend`: `npm run lint`
- `frontend`: `npx tsc -b`
- `frontend`: `npm test -- --run`
- `frontend`: `npm run build`
- backend lint, typecheck, and build: report unavailable

## Staging follow-through
- Apply `docs/STAGING_CHECKLIST.md` only if tracking writes or reads are staged.
- Record whether migration and tracking-route evidence is unavailable, not requested, or passed.

## PR follow-through
- Prepare `docs/PR_TEMPLATE.md` when publishing is in scope.
- Include migration evidence, validation evidence, and any deferred realtime or geospatial work.

## Exit criteria
- Tracking pings can be written and queried.
- Schema and API docs match the implemented tracking flow.
- The slice remains synchronous until the async jobs slice lands.

## Allowed deferrals
- Real-time push delivery
- Geospatial optimizations
- Stalled-delivery detection automation
