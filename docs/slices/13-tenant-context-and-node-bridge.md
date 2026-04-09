# Slice 13: Tenant Context and Node Bridge

- Type: `backend`
- Run order: `13`
- Depends on: Slices 11 and 12
- Migration need: `No`
- Status: `Planned`

## PRD coverage
- backend-owned auth bridge into the external delivery network
- tenant bootstrap and node setup
- hiding BLN credentials from the frontend

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| Local auth exists, but no BLN tenant or node context exists | The app cannot safely use tenant-scoped BLN routes | Add a local context bridge before broad BLN-backed delivery access |
| The sibling BLN backend now supports tenant bootstrap, node create or read, and service-backed token exchange | This repo exposes none of that behind local auth | Add the first local network-context routes and bridge behavior |
| No dedicated local mapping table exists yet | The app could over-design persistence before it proves the first bridge | Start with the smallest safe local context decision and defer heavier schema until it is justified |

## Scope
- Implement the first local network-context routes above the logistics client.
- Wrap BLN tenant bootstrap and node create or read flows behind local auth.
- Add the first local context resolution behavior for BLN tenant and node access.
- Decide and document whether the first bridge lives in `users.preferences` or another small local mechanism.
- Add focused backend tests for the context bridge.

## Out of scope
- BLN-backed delivery or event routes
- handoff workflows
- frontend setup wizard
- local projection schema

## Likely runtime and doc targets
- `backend/src/app/network/*` or equivalent small integration area
- `backend/src/index.js`
- `backend/test/*`
- `docs/API_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`

## Required audit
- Run a touched-area repo consistency sweep across local auth, tenant-context resolution, bootstrap behavior, and node bridge rules.
- Apply `docs/RELEASE_CHECKLIST.md` to the slice scope before handoff.

## Required validation
- `backend`: `npm test`
- `frontend`: `npm run lint`
- `frontend`: `npx tsc -b`
- `frontend`: `npm test -- --run`
- `frontend`: `npm run build`
- backend lint, typecheck, and build: report unavailable

## Staging follow-through
- Apply `docs/STAGING_CHECKLIST.md` only if the tenant or node bridge is exercised against the staged BLN backend.
- Record `not requested` when the slice stops at local implementation.

## PR follow-through
- Prepare `docs/PR_TEMPLATE.md` when publishing is in scope.
- Include the local context decision, bootstrap flow, and validation evidence.

## Exit criteria
- The app can resolve a safe local BLN context through the backend.
- The first tenant bootstrap and node bridge routes exist behind local auth.
- Tests cover context resolution and failure cases.

## Allowed deferrals
- dedicated local membership schema
- non-admin BLN onboarding UI
- multi-tenant workspace switching
