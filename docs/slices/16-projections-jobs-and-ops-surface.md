# Slice 16: Projections, Jobs, and Ops Surface

- Type: `full-stack`
- Run order: `16`
- Depends on: Slices 01, 14, and 15
- Migration need: `Maybe`
- Status: `Planned`

## PRD coverage
- useful dashboard and workflow polish on top of the external network
- background job support
- developer-friendly operational visibility

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| Redis, BullMQ, and a worker already exist | No BLN projection refresh, alerting, or notification jobs exist yet | Reuse the async baseline for cached summaries and operational alerts only after the remote facade is real |
| Delivery, handoff, and transport data will exist through earlier slices | The app still would not have operator-friendly overviews, stalled-work alerts, or summarized dashboards | Add app-owned summaries and alerts without taking delivery ownership away from the BLN backend |
| Local delivery tables exist in schema | It is still unclear whether the app needs durable projection storage or can stay stateless for longer | Add local schema only if summaries, bindings, or alerting truly need durability |

## Scope
- Decide whether the app needs local projection storage, scheduled refresh jobs, or both.
- If justified, add the first bounded queue jobs for BLN summary refresh, stalled-handoff detection, or notification fanout.
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

## Allowed deferrals
- long-term analytics
- cross-tenant benchmarking
- customer-facing notifications
- map-backed operator visualization through `Navigatr` until the BLN facade and operator surface are both real
