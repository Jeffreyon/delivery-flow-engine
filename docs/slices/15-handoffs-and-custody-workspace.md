# Slice 15: Handoffs and Custody Workspace

- Type: `backend or full-stack`
- Run order: `15`
- Depends on: Slices 12, 13, and 14
- Migration need: `No`
- Status: `Planned`

## PRD coverage
- delivery lifecycle actions
- event history and diagnostics
- useful product differentiation on top of the external network

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| The sibling BLN backend already supports initiate, retry, verify, dispute, resolve, audit, and status flows | The app exposes none of the custody-transfer workflows yet | Build a local handoff and custody workspace above the BLN API |
| PIN send, retry, and terminal transport events already exist remotely | Operators cannot see or act on that status from this app | Surface handoff diagnostics, retry, and dispute paths through the app backend and later UI |
| The current app shells already support admin and authenticated flows | No route or UI plan yet exists for custody workflows | Reuse the current shells and local auth while keeping BLN credentials hidden |

## Scope
- Implement local handoff routes for status, history, initiate, retry, verify, dispute, and resolve above the logistics client.
- Compose delivery timeline and handoff diagnostics into app-friendly payloads where useful.
- If frontend work is approved inside the slice, add the first custody workspace, inbox or outbox, or dispute screens.
- Add focused backend tests, and frontend tests only if UI work is in scope.

## Out of scope
- generalized offline sync
- local projection cache
- broad non-admin multi-tenant workspace switching
- public customer tracking views

## Likely runtime and doc targets
- `backend/src/app/handoffs/*` or a new facade area
- `backend/src/index.js`
- `backend/test/*`
- `frontend/src/pages/*` only if UI work is approved
- `docs/API_SPEC.md`
- `docs/UI_ARCHITECTURE.md`

## Required audit
- Run a touched-area repo consistency sweep across handoff semantics, local auth rules, upstream BLN expectations, and any new operator UI.
- Apply `docs/RELEASE_CHECKLIST.md` to the slice scope before handoff.

## Required validation
- `backend`: `npm test`
- `frontend`: `npm run lint`
- `frontend`: `npx tsc -b`
- `frontend`: `npm test -- --run`
- `frontend`: `npm run build`
- backend lint, typecheck, and build: report unavailable

## Staging follow-through
- Apply `docs/STAGING_CHECKLIST.md` only if the handoff workspace is exercised against staging.
- Record `not requested` when deploy proof is not in scope.

## PR follow-through
- Prepare `docs/PR_TEMPLATE.md` when publishing is in scope.
- Include custody semantics, transport diagnostics behavior, validation evidence, and any UI deferrals.

## Exit criteria
- The app exposes the main BLN handoff and custody actions through its own backend.
- Operators can inspect enough status to retry, verify, dispute, or resolve a handoff safely.
- Focused tests cover the local facade behavior and any approved UI work.

## Allowed deferrals
- inbound SMS flows inside this app
- deeper analytics
- customer-facing custody views
