# Slice 17: Tenant User and Node Management

- Type: `backend`
- Run order: `17`
- Depends on: Slices 12, 13, and 15
- Migration need: `No`
- Status: `Implemented`

## PRD coverage
- company-side operator onboarding
- tenant-scoped access control
- safe node-scoped custody actions

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| The local BLN bridge already stores tenant integrations, memberships, and node assignments | Admins previously had no app-owned route to manage those records after bootstrap | Add an admin-only tenant-member management surface above the bridge |
| Nodes already exist in the sibling BLN backend and secure writes are node-bound | Local user management previously stopped at generic `/api/users` profile updates | Validate local node assignments against the selected BLN tenant before persisting act-as rights |
| The app still has only `admin` and `user` local roles | Richer tenant-scoped operator roles are still deferred | Keep the first management surface simple: admin chooses tenant member role plus assigned nodes |

## Scope
- Add admin-only routes to list tenant members plus their node assignments.
- Add an admin-only route to upsert one user's tenant membership and assigned nodes.
- Validate assigned node ids against the selected BLN tenant.
- Add focused backend tests and doc updates.

## Out of scope
- tenant-scoped admin self-service
- frontend member-management UI
- invitation flows
- richer local operator role taxonomy

## Likely runtime and doc targets
- `backend/src/app/network/*`
- `backend/src/app/users/users.repository.js`
- `backend/test/network.*.test.js`
- `docs/API_SPEC.md`
- `docs/IMPLEMENTATION_PLAN.md`

## Required audit
- Review the admin management routes against the current BLN membership and node-session model.
- Confirm the routes do not widen generic `/api/users` scope accidentally.

## Required validation
- `backend`: `npm test`
- backend lint, typecheck, and build: report unavailable

## Staging follow-through
- Apply `docs/STAGING_CHECKLIST.md` only if the admin member-management routes are deployed or exercised.
- Record `not requested` when publish or deploy proof is not in scope.

## PR follow-through
- Prepare `docs/PR_TEMPLATE.md` when publishing is requested.
- Include the tenant-member management contract and local-versus-BLN validation behavior.

## Exit criteria
- Admins can list tenant members and their assigned BLN nodes through the local backend.
- Admins can assign or revoke tenant membership and node act-as rights for one user.
- Assigned node ids are validated against the selected BLN tenant before the local bridge state is saved.

## Delivered
- Added `GET /api/v1/network/users` as an admin-only tenant-member management read surface.
- Added `PUT /api/v1/network/users/:userId` as an admin-only tenant-member and node-assignment write surface.
- Reused the existing BLN bridge storage instead of widening generic user CRUD.
- Added focused backend controller and service coverage for the new admin routes.

## Allowed deferrals
- invite or accept flows
- tenant-scoped admin roles
- frontend admin forms
