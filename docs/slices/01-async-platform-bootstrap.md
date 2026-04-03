# Slice 01: Async Platform Bootstrap

- Type: `backend` or `full-stack`
- Run order: `1`
- Depends on: current `events` plus `delivery_events` baseline only
- Migration need: `No`
- Status: `Implemented on the current branch`

## PRD coverage
- Worker service
- Queue system
- Background job foundation

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| `backend/package.json` now includes `bullmq` and `ioredis`, and shared queue config lives under `backend/src/core/queue` | No named queues or processors exist yet | Reuse the shared queue runtime in later job slices instead of inventing another bootstrap layer |
| `.scaffold/project.json` declares `Redis` and `worker`, the Railway workflow deploys `worker` from `backend`, and the live Railway project now matches that topology in both deploy environments | No real queue processors or workload exist yet | Build later queue-job slices on top of the live service topology instead of changing the repo contract again |
| `backend/worker.js` now boots the async runtime through `npm run worker` with `REDIS_URL`, `BULLMQ_PREFIX`, and `WORKER_CONCURRENCY` | The worker is idle because no processors are registered yet | Keep the worker monolithic until real BullMQ job slices land |

## Delivered baseline
- Added BullMQ and `ioredis` to the backend package.
- Added shared queue runtime helpers under `backend/src/core/queue`.
- Added `backend/worker.js` plus backend scripts to boot the worker separately.
- Extended `.scaffold/project.json` and `.github/workflows/railway-deploy.yml` with `Redis` and `worker`.
- Provisioned live Railway `Redis` and `worker` services in both environments and aligned the worker env contract to the canonical `Redis` service.
- Updated current-reality docs and harness notes to match the async bootstrap.

## Out of scope
- No delivery jobs yet.
- No delivery-domain tables or routes.
- No queue splitting, sharding, or advanced concurrency tuning.

## Likely runtime and doc targets
- `backend/package.json`
- `backend/worker.js`
- `backend/src/core/*` or a small shared queue runtime area
- `.scaffold/project.json`
- `.github/workflows/railway-deploy.yml`
- `docs/ARCHITECTURE.md`
- `docs/MIGRATION_WORKFLOW.md`

## Required audit
- Run a touched-area repo consistency sweep across queue runtime code, deploy metadata, env-contract docs, and harness notes.
- Apply `docs/RELEASE_CHECKLIST.md` to the touched async-platform scope before handoff.

## Required validation
- `backend`: `npm test`
- `frontend`: `npm run lint`
- `frontend`: `npx tsc -b`
- `frontend`: `npm test -- --run`
- `frontend`: `npm run build`
- backend lint, typecheck, and build: report unavailable

## Staging follow-through
- Apply `docs/STAGING_CHECKLIST.md` only when a worker or Redis deployment is actually requested.
- If staging was not run, record `not requested` or `unavailable` instead of implying deploy proof exists.

## PR follow-through
- Prepare `docs/PR_TEMPLATE.md` only when publishing is in scope.
- Include worker boot evidence, deploy metadata changes, validation evidence, and any missing live Railway proof.

## Exit criteria
- Worker and Redis services exist in project metadata and in the live Railway project.
- A worker process can boot with the documented env contract.
- Runtime and deploy docs match the implemented service topology.

## Allowed deferrals
- Queue names beyond the baseline prefix
- Real job processors
- Dead-letter handling and advanced retry dashboards
