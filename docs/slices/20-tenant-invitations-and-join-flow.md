# Slice 20: Tenant Invitations And Join Flow

- Type: `backend` and `frontend`
- Run order: `20`
- Depends on: Slices 17 and 19
- Migration need: `Yes`
- Status: `Implemented`

## PRD coverage
- client onboarding
- tenant membership assignment
- unprovisioned user join path

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| Generic signup is local-only again and explicit workspace bootstrap now exists | Unprovisioned users still have no first-party path to join an existing tenant | Add durable tenant invitations plus authenticated invitation acceptance |
| Admins can already assign memberships and node access directly with `/api/v1/network/users*` | There is no invitation record, acceptance workflow, or user-facing join surface | Add an invitation table, thin admin invitation routes, and a user-facing join path on the workspace page |

## Scope
- Add durable BLN tenant invitations in local schema.
- Add admin invitation creation under `/api/v1/network/invitations`.
- Add authenticated invitation listing for the signed-in user.
- Add authenticated invitation acceptance that writes membership and node assignment.
- Keep generic signup local-only.
- Extend the workspace onboarding page so users can either create a new workspace or accept an invitation to join an existing one.
- Update focused tests and current-reality docs.

## Out of scope
- email delivery infrastructure
- invitation links or magic tokens
- tenant-admin self-service outside the global admin role
- richer operator delivery and custody UI

## Required validation
- `backend`: `npm run db:migrate`
- `backend`: `npm test`
- `frontend`: `npm run lint`
- `frontend`: `npx tsc -b`
- `frontend`: `npm test -- --run`
- `frontend`: `npm run build`

## Required audit
- repo consistency review across backend routes, frontend onboarding copy, schema docs, and slice index

## PR follow-through
- Not requested in this slice.

## Allowed deferrals
- admin invitation creation UI
- email delivery or magic-link invitation transport
- richer operator delivery and custody UI

## Staging follow-through
- Not requested in this slice.
