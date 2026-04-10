# Slice 18: Signup Network Provisioning

- Type: `backend` and `frontend`
- Run order: `18`
- Depends on: Slices 12, 13, and 17
- Migration need: `No`
- Status: `Implemented`

## Later correction
- Slice 19 moved BLN tenant bootstrap back out of generic signup and into explicit workspace creation.
- Treat this slice as the bridge-foundation step, not the final product boundary.

## PRD coverage
- client onboarding
- first tenant bootstrap
- first node bootstrap

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| The app could sign up a local user and admins could bootstrap BLN tenants manually | Normal signup still left the new user without a tenant integration, membership, or node assignment | Add an explicit authenticated post-signup provisioning route and make the signup UI call it immediately |
| The sibling `logistics-api` already exposes trusted service bootstrap routes | Staging did not have the shared backend-to-backend bridge vars wired | Keep the bridge explicit and wire `LOGISTICS_API_URL` plus `LOGISTICS_API_SERVICE_SECRET` in the delivery app and `DELIVERY_BACKEND_SERVICE_SECRET` in the sibling BLN backend |

## Scope
- Add an authenticated self-provisioning route under `/api/v1/network`.
- Reuse the existing BLN bootstrap contract to create tenant integration, membership, and node assignment for the current user.
- Update the signup UI to collect the first workspace name and node phone number and call the provisioning route immediately after signup.
- Update focused backend tests and current-reality docs.

## Out of scope
- invite flows
- multi-step onboarding UI
- retry queue or saga compensation for cross-system bootstrap failures

## Required validation
- `backend`: `npm test`
- `frontend`: `npm run lint`
- `frontend`: `npx tsc -b`
- `frontend`: `npm test -- --run`
- `frontend`: `npm run build`

## Staging follow-through
- Set the delivery app staging `LOGISTICS_API_URL` and `LOGISTICS_API_SERVICE_SECRET`.
- Set the sibling `logistics-api` staging `DELIVERY_BACKEND_SERVICE_SECRET` to the same value.
- After deploy, verify that signup followed by `/api/v1/network/provision-self` creates BLN traffic in staging.
