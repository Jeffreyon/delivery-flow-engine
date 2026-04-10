# Slice 19: Workspace Bootstrap Outside Signup

- Type: `backend` and `frontend`
- Run order: `19`
- Depends on: Slices 13, 17, and 18
- Migration need: `No`
- Status: `Implemented`

## PRD coverage
- client onboarding
- workspace creation
- explicit tenant bootstrap boundary

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| The app already had a working BLN workspace-bootstrap bridge | The frontend still triggered that bridge from generic signup, which incorrectly made tenant provisioning look per-user instead of per-client-instance | Keep signup local-only and expose BLN tenant bootstrap only through an explicit workspace-creation flow |
| The backend already exposed the authenticated self-bootstrap route | The route name and UI placement still implied post-signup provisioning instead of deliberate client onboarding | Add an explicit workspace-bootstrap route and onboarding page, while keeping the older route as a compatibility alias |

## Scope
- Keep `POST /api/auth/signup` local-user creation only.
- Add an explicit workspace-bootstrap route at `POST /api/v1/network/workspaces/bootstrap`.
- Keep `POST /api/v1/network/provision-self` as a compatibility alias.
- Remove workspace bootstrap fields and calls from the generic signup page.
- Add the first authenticated workspace-onboarding page under the dashboard.
- Show unprovisioned BLN state on the dashboard and guide users either to create a workspace or wait for tenant assignment.
- Update focused backend tests and current-reality docs.

## Out of scope
- invitation flows
- tenant join-acceptance flows
- richer operator delivery and custody UI
- tenant-scoped admin self-service beyond the existing admin member-management routes

## Required validation
- `backend`: `npm test`
- `frontend`: `npm run lint`
- `frontend`: `npx tsc -b`
- `frontend`: `npm test -- --run`
- `frontend`: `npm run build`

## Staging follow-through
- Reuse the existing bridge env vars.
- Verify signup creates only the local user path.
- Verify explicit workspace bootstrap still creates BLN tenant traffic.
