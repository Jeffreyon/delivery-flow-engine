# Slice 08: Incident Runtime

- Type: `backend`
- Run order: `8`
- Depends on: Slice 06
- Migration need: `Yes`
- Status: `Planned`

## PRD coverage
- Incident entity
- Failure, return, and cancellation exception records

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| No `incidents` table or module exists | Non-happy-path delivery operations have no first-class record | Add incidents as delivery-linked exception records |
| Lifecycle and `delivery_events` will exist after earlier slices | Failures and returns would otherwise live only in status and event history | Persist incident records that can anchor operational follow-up |
| The PRD explicitly includes failed, returned, and cancelled paths | The runtime has no incident taxonomy yet | Start with the first bounded incident types needed for milestone 1 |

## Scope
- Add the `incidents` migration(s).
- Implement the first incident creation rules tied to delivery failure, return, and cancellation paths.
- Link incidents to deliveries and relevant delivery events.
- Expose the read or write surface that the contract slice reserved, or keep creation internal if that was the documented choice.
- Add focused backend tests.

## Out of scope
- Automated anomaly detection
- SLA dashboards
- UI support

## Likely runtime and doc targets
- `backend/migrations/*`
- `backend/src/app/incidents/*`
- touched delivery lifecycle code
- `backend/test/*`
- `docs/DB_SCHEMA.md`
- `docs/DOMAIN_MODEL.md`
- `docs/API_SPEC.md`

## Required audit
- Run a touched-area repo consistency sweep across incident schema, lifecycle integration, and delivery-event links.
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
- Apply `docs/STAGING_CHECKLIST.md` only if incident flows are staged.
- Record `not requested` or missing deploy evidence explicitly.

## PR follow-through
- Prepare `docs/PR_TEMPLATE.md` when publishing is in scope.
- Include migration evidence, incident taxonomy scope, and any deferred UI or notification work.

## Exit criteria
- Incident records exist for the first supported non-happy-path flows.
- Incidents are linked to deliveries and delivery events.
- Docs and tests reflect the implemented exception model.

## Allowed deferrals
- Rich taxonomy expansion
- External notification side effects
- Operator UI for incidents
