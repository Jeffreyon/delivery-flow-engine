# Slice 21: Single-Tenant Workspace And User Node OTP

- Type: `backend` and `frontend`
- Run order: `21`
- Depends on: Slices 19 and 20
- Migration need: `No`
- Status: `Implemented`

## PRD coverage
- client installation onboarding
- first-admin workspace bootstrap
- user node activation

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| Explicit workspace bootstrap exists and the older invitation join flow still exists as residue | This app instance actually represents one client workspace, so user-created workspaces and invitation-first onboarding are the wrong default | Lock workspace bootstrap to the first admin and first run, then auto-scope every later user to that single tenant |
| Delivery and handoff access already require a BLN node assignment | New users still have no first-party phone verification path to activate their node, and signup does not persist a phone number yet | Add authenticated OTP request and verify routes for self node activation, persist signup phone numbers locally, and drive the first onboarding UI from that path |

## Scope
- Make workspace bootstrap admin-only and first-run only.
- Treat the app instance as one BLN tenant workspace.
- Auto-provision local BLN membership for signed-in users when a workspace exists.
- Add authenticated self node-OTP request and verify routes above the sibling BLN API.
- Replace invitation-first workspace onboarding UI with:
  - admin workspace bootstrap when the workspace does not exist
  - waiting state for non-admin users when the workspace does not exist
  - user phone verification when the workspace exists but the user has no node
- Keep invitation routes dormant instead of using them as the primary path.
- Update focused docs and tests.

## Out of scope
- multi-tenant workspace selection inside one app instance
- removing dormant invitation support entirely
- operator delivery or custody UI beyond onboarding status

## Required validation
- `backend`: `npm test`
- `frontend`: `npm run lint`
- `frontend`: `npx tsc -b`
- `frontend`: `npm test -- --run`
- `frontend`: `npm run build`

## Staging follow-through
- Completed:
  - staged signup stays local-only
  - first-admin workspace bootstrap stays first-run only
  - authenticated users can request an OTP through the sibling `logistics-api`
  - authenticated users can verify the OTP and activate a node for the configured workspace tenant
