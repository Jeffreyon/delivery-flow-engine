# Slice 09: Queue-Backed Jobs

- Type: `backend` or `full-stack`
- Run order: `9`
- Depends on: Slices 01, 06, 07, and 08
- Migration need: `No`
- Status: `Planned`

## PRD coverage
- Dispatch assignment jobs
- Delivery status update side effects
- Stalled-delivery detection
- Notification jobs
- Event reconciliation

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| The async platform bootstrap will exist after Slice 01 | No processors, enqueuers, or retry policy exist yet | Add the first bounded BullMQ jobs on top of the single worker service |
| Lifecycle, tracking, and incident flows will exist after earlier slices | Heavy or retry-worthy side effects still run nowhere | Move the first async work off the request path where the PRD expects it |
| Notifications already exist as a scaffold module | They are not yet part of delivery workflows | Reuse the existing notifications surface where it fits instead of inventing a parallel channel first |

## Scope
- Add the first queue definitions and processors.
- Enqueue work from delivery lifecycle, tracking, and incident flows where the contract now requires async handling.
- Document retry and idempotency rules for each implemented job type.
- Keep the first worker service monolithic unless runtime pressure proves otherwise.
- Update docs and deploy notes if worker boot or env behavior changes.

## Out of scope
- Route optimization
- Multi-worker sharding
- Real-time streaming

## Likely runtime and doc targets
- `backend/worker.js`
- queue runtime added in Slice 01
- touched delivery, tracking, incident, or notification modules
- `backend/test/*`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`

## Required audit
- Run a touched-area repo consistency sweep across queue definitions, enqueuers, processors, retry policy, and deploy docs.
- Apply `docs/RELEASE_CHECKLIST.md` to the async slice scope before handoff.

## Required validation
- `backend`: `npm test`
- `frontend`: `npm run lint`
- `frontend`: `npx tsc -b`
- `frontend`: `npm test -- --run`
- `frontend`: `npm run build`
- backend lint, typecheck, and build: report unavailable

## Staging follow-through
- Apply `docs/STAGING_CHECKLIST.md` only if queue-backed jobs are staged or deployed.
- Record worker, Redis, and job-execution evidence explicitly.

## PR follow-through
- Prepare `docs/PR_TEMPLATE.md` when publishing is in scope.
- Include queue names, retry and idempotency rules, validation evidence, and any missing live deploy proof.

## Exit criteria
- At least one real BullMQ-backed job path is implemented end to end.
- Retry and idempotency rules are documented for the implemented jobs.
- Worker and deploy docs still match the runtime.

## Allowed deferrals
- Advanced concurrency tuning
- Dead-letter dashboards
- Non-essential jobs not needed for milestone 1
