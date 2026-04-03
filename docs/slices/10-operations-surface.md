# Slice 10: Operations Surface

- Type: `docs-only -> frontend or full-stack`
- Run order: `10`
- Depends on: Slices 02, 04, 05, and 06
- Migration need: `No`
- Status: `Planned`

## PRD coverage
- Operator workflows
- Admin delivery visibility
- Future delivery UI expansion

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| The frontend only exposes landing, auth, user dashboard, and admin dashboard | No delivery operations UI plan exists | Decide whether milestone 1 stays backend-only or extends the existing admin dashboard |
| The admin shell already has a proven desktop and mobile nav pattern | Delivery UI work could diverge from current scaffold patterns | Reuse the current admin shell if UI support is approved |
| Delivery runtime slices will land before this pack | UI work could start against unstable contracts | Gate UI work on the already implemented backend slices |

## Scope
- Decide whether early PRD work remains API-only or extends the current admin dashboard.
- If UI work is approved, lock the minimum admin surfaces needed for orders, deliveries, drivers, tracking, and incidents.
- Reuse the current dashboard shells, mobile dialog navigation, and explicit load-error treatment.
- Document what remains backend-only even if some admin UI is added.

## Out of scope
- Driver mobile app
- Public customer tracking portal
- Brand redesign
- Analytics dashboard

## Likely doc and runtime targets
- `docs/UI_ARCHITECTURE.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `frontend/src/pages/admin/*` only if the slice graduates from docs to runtime

## Required audit
- Run a touched-area repo consistency sweep across UI route inventory, existing admin shell patterns, and any new delivery-surface scope.
- Apply `docs/RELEASE_CHECKLIST.md` to the docs or frontend scope before handoff.

## Required validation
- Docs consistency sweep only unless frontend runtime work is approved inside the slice

## Staging follow-through
- `Not requested` unless frontend runtime work is actually implemented and staged.
- If staging is requested later, apply `docs/STAGING_CHECKLIST.md` only to the touched admin or delivery surfaces.

## PR follow-through
- `Not requested` in the docs-only planning path.
- If publishing is requested later, prepare handoff with `docs/PR_TEMPLATE.md` and capture what remains API-only versus UI-backed.

## Exit criteria
- The UI strategy is explicit enough that frontend work is either clearly deferred or clearly scoped.
- Any approved admin-surface extension reuses the current layout and request-state patterns.

## Allowed deferrals
- Full dispatch console
- Customer-facing tracking pages
- Analytics and reporting surfaces
