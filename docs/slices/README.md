# Slice Packs

## Purpose
- Turn the current implementation plan into execution-ready packs.
- Keep each Delivery Flow Engine change bounded, dependency-ordered, and truthful to both the current scaffold and the live sibling `logistics-api` BLN surface.

## Current readiness
- The repo still ships the Phase 0 auth, dashboard, and admin scaffold.
- The repo now keeps generic `events` plus child `delivery_events` as separate runtime surfaces.
- The async platform bootstrap now exists: BullMQ and `ioredis` are installed, shared queue config exists, `backend/worker.js` is wired for a separate worker service, and the live Railway project now includes `Redis` plus `worker`.
- The local schema now includes `orders`, `drivers`, `deliveries`, and `assignments`, but that local-first runtime track is no longer the active queue.
- The sibling `logistics-api` repo now exposes the live BLN surface for tenant bootstrap, token exchange, nodes, deliveries, events, and handoffs.
- A backend-only BLN client foundation now exists, but no BLN-backed app routes, local BLN context bridge, or custody UI exist yet in this repo.

## How to use
1. Read `AGENTS.md`, `IMPLEMENT.md`, `docs/IMPLEMENTATION_PLAN.md`, and the active pack.
2. Treat each pack as a bounded change set with its own contract, audit, and validation intent.
3. Keep `current state`, `gap`, and `recommended target` explicit when code, config, migrations, sibling-repo contracts, and docs disagree.
4. Update current-reality docs only when the runtime actually changes.

## End-to-end slice workflow
1. Run the active pack through the audit flow in `IMPLEMENT.md`.
2. Apply the slice-specific validation block and the release scope checks in `docs/RELEASE_CHECKLIST.md`.
3. If staging or deploy work is requested, apply `docs/STAGING_CHECKLIST.md` and report missing evidence explicitly.
4. If PR prep or publishing is requested, use `docs/PR_TEMPLATE.md` and the git or publish skills.
5. Leave staging and PR sections marked `not requested` when the slice stops at local implementation.

## Historical foundation and archived local-first track
| Pack | File | Type | Run order | Status | Notes |
|---|---|---|---|---|---|
| 01 | `docs/slices/01-async-platform-bootstrap.md` | backend or full-stack | 1 | Implemented | Reusable async baseline for later BLN projection and alert jobs |
| 02 | `docs/slices/02-delivery-api-contract.md` | docs-only | 2 | Archived | Older local-first contract pack |
| 03 | `docs/slices/03-foundational-delivery-schema.md` | backend | 3 | Implemented | Local delivery schema foundation; dormant until a projection or augmentation need is explicit |
| 04 | `docs/slices/04-orders-and-drivers-runtime.md` | backend | 4 | Archived | Older local-first runtime pack |
| 05 | `docs/slices/05-deliveries-and-dispatch-runtime.md` | backend | 5 | Archived | Older local-first runtime pack |
| 06 | `docs/slices/06-lifecycle-and-delivery-events.md` | backend | 6 | Archived | Older local-first runtime pack |
| 07 | `docs/slices/07-tracking-runtime.md` | backend | 7 | Archived | Older local-first runtime pack |
| 08 | `docs/slices/08-incident-runtime.md` | backend | 8 | Archived | Older local-first runtime pack |
| 09 | `docs/slices/09-queue-backed-jobs.md` | backend or full-stack | 9 | Archived | Older local-first runtime pack |
| 10 | `docs/slices/10-operations-surface.md` | docs-only -> frontend or full-stack | 10 | Archived | Older local-first UI pack |

## Active BLN integration track
| Pack | File | Type | Run order | Migration need | Status | Depends on |
|---|---|---|---|---|---|---|
| 11 | `docs/slices/11-bln-integration-contract.md` | docs-only -> backend | 11 | No | Implemented | current baseline |
| 12 | `docs/slices/12-logistics-client-foundation.md` | backend | 12 | No | Implemented | 11 |
| 13 | `docs/slices/13-tenant-context-and-node-bridge.md` | backend | 13 | No | Planned | 11, 12 |
| 14 | `docs/slices/14-remote-deliveries-and-events-facade.md` | backend | 14 | No | Planned | 12, 13 |
| 15 | `docs/slices/15-handoffs-and-custody-workspace.md` | backend or full-stack | 15 | No | Planned | 12, 13, 14 |
| 16 | `docs/slices/16-projections-jobs-and-ops-surface.md` | full-stack | 16 | Maybe | Planned | 01, 14, 15 |

## Required pack fields
- `Type`
- `Run order`
- `Depends on`
- `Migration need`
- `Status`
- `Required audit`
- `Required validation`
- `Staging follow-through`
- `PR follow-through`
- `Allowed deferrals`

## Global guardrails
- Do not rewrite `0001_baseline.sql`, `0002_phase1_contracts.sql`, `0003_remove_app_registry_and_installed_apps.sql`, `0004_rename_events_to_delivery_events.sql`, `0005_restore_events_parent_and_split_delivery_events.sql`, or `0006_prune_non_delivery_child_events.sql`.
- Do not treat the archived local-first packs as the active queue while the sibling BLN backend is the source of truth.
- Report unavailable backend lint, typecheck, and build scripts explicitly.
- Do not claim `npm run db:migrate`, `npm run db:init`, or seed commands were run unless they were actually executed.
