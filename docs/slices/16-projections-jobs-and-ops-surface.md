# Slice 16: Projections, Jobs, and Ops Surface

- Type: `full-stack`
- Run order: `16`
- Depends on: Slices 01, 14, and 15
- Migration need: `Maybe`
- Status: `Implemented`

## PRD coverage
- useful dashboard and workflow polish on top of the external network
- background job support
- developer-friendly operational visibility

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| Redis, BullMQ, and a worker already exist | No BLN projection refresh, alerting, or notification jobs exist yet | Keep the async baseline ready, but do not add jobs until a real refresh or alerting problem appears |
| Delivery, handoff, and transport data already exist through earlier slices | Operators still needed a useful first-party workspace to inspect delivery and custody state | Add the first stateless operator workspace on top of the BLN-backed facade without taking delivery ownership away from the BLN backend |
| Local delivery tables exist in schema | It is still unclear whether the app needs durable projection storage or can stay stateless for longer | Stay stateless in this slice and add local schema only if summaries, bindings, or alerting later need durability |

## Scope
- Decide whether the app needs local projection storage, scheduled refresh jobs, or both.
- Keep jobs and local projection storage deferred when the current BLN-backed facade is sufficient.
- Add the first operator dashboard or overview surfaces on top of BLN-backed data.
- If map-backed operator surfaces are approved later, treat `Navigatr` as the current future SDK candidate for route or custody visualization instead of introducing a generic map dependency earlier in the queue.
- Document what remains stateless versus what now persists locally.

## Out of scope
- replacing `logistics-api` as the source of truth
- building a separate local delivery lifecycle engine
- public customer portal
- broad analytics or billing

## Likely runtime and doc targets
- `backend/src/core/queue/*`
- `backend/worker.js`
- `backend/src/app/notifications/*`
- new projection or summary area only if justified
- `frontend/src/pages/admin/*`
- `docs/ARCHITECTURE.md`
- `docs/UI_ARCHITECTURE.md`
- `docs/MIGRATION_WORKFLOW.md`

## Required audit
- Run a touched-area repo consistency sweep across queue jobs, local persistence decisions, operator UI scope, and the BLN source-of-truth boundary.
- Apply `docs/RELEASE_CHECKLIST.md` to the slice scope before handoff.

## Required validation
- `backend`: `npm test`
- `frontend`: `npm run lint`
- `frontend`: `npx tsc -b`
- `frontend`: `npm test -- --run`
- `frontend`: `npm run build`
- backend lint, typecheck, and build: report unavailable

## Staging follow-through
- Apply `docs/STAGING_CHECKLIST.md` only if jobs or operator UI are staged.
- Record whether queue jobs, refresh flows, or local persistence proof is unavailable, not requested, or passed.

## PR follow-through
- Prepare `docs/PR_TEMPLATE.md` when publishing is in scope.
- Include local-persistence decisions, queue behavior, validation evidence, and remaining stateless assumptions.

## Exit criteria
- The app has an explicit operator-surface and async strategy on top of the BLN-backed facade.
- Any local persistence that lands has a clear reason and does not compete with the BLN source of truth.
- Queue jobs and UI surfaces are test-covered where they exist.

## Outcome
- Landed a stateless operator workspace under `/dashboard/operations`.
- Reused the existing local BLN facade routes for delivery list, delivery detail, event timeline, handoff status, and handoff history.
- Added no queue jobs and no local projection storage in this slice because the first operator surface does not yet justify durability or refresh orchestration.

## Allowed deferrals
- long-term analytics
- cross-tenant benchmarking
- customer-facing notifications
- map-backed operator visualization through `Navigatr` until the BLN facade and operator surface are both real
