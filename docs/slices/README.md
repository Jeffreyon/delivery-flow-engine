# Slice Packs

## Purpose
- Turn the current implementation plan into execution-ready packs.
- Keep each delivery change bounded, dependency-ordered, and truthful to the Phase 0 scaffold.

## Current readiness
- The repo still ships the Phase 0 auth, dashboard, and admin scaffold.
- The repo now keeps generic `events` plus child `delivery_events` as separate runtime surfaces.
- The async platform bootstrap now exists: BullMQ and `ioredis` are installed, shared queue config exists, and `backend/worker.js` is wired for a separate worker service.
- The foundational delivery schema and `/api/v1` contract baseline now exist in docs and migrations.
- No delivery runtime modules or real BullMQ job processors exist yet.

## How to use
1. Read `AGENTS.md`, `IMPLEMENT.md`, `docs/IMPLEMENTATION_PLAN.md`, and the active pack.
2. Treat each pack as a bounded change set with its own migration and validation intent.
3. Keep `current state`, `gap`, and `recommended target` explicit when code, config, migrations, and docs disagree.
4. Update current-reality docs only when the runtime actually changes.

## End-to-end slice workflow
1. Run the active pack through the audit flow in `IMPLEMENT.md`.
2. Apply the slice-specific validation block and the release scope checks in `docs/RELEASE_CHECKLIST.md`.
3. If staging or deploy work is requested, apply `docs/STAGING_CHECKLIST.md` and report missing evidence explicitly.
4. If PR prep or publishing is requested, use `docs/PR_TEMPLATE.md` and the git or publish skills.
5. Leave staging and PR sections marked `not requested` when the slice stops at local implementation.

## Pack index
| Pack | File | Type | Run order | Migration need | Status | Depends on |
|---|---|---|---|---|---|---|
| 01 | `docs/slices/01-async-platform-bootstrap.md` | backend or full-stack | 1 | No | Implemented | current baseline |
| 02 | `docs/slices/02-delivery-api-contract.md` | docs-only -> backend | 2 | No | Implemented | current baseline |
| 03 | `docs/slices/03-foundational-delivery-schema.md` | backend | 3 | Yes | Implemented | 02 |
| 04 | `docs/slices/04-orders-and-drivers-runtime.md` | backend | 4 | No | Planned | 02, 03 |
| 05 | `docs/slices/05-deliveries-and-dispatch-runtime.md` | backend | 5 | No | Planned | 03, 04 |
| 06 | `docs/slices/06-lifecycle-and-delivery-events.md` | backend | 6 | No | Planned | 05 |
| 07 | `docs/slices/07-tracking-runtime.md` | backend | 7 | Yes | Planned | 01, 05, 06 |
| 08 | `docs/slices/08-incident-runtime.md` | backend | 8 | Yes | Planned | 06 |
| 09 | `docs/slices/09-queue-backed-jobs.md` | backend or full-stack | 9 | No | Planned | 01, 06, 07, 08 |
| 10 | `docs/slices/10-operations-surface.md` | docs-only -> frontend or full-stack | 10 | No | Planned | 02, 04, 05, 06 |

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
- Keep the current scaffold APIs and frontend surfaces truthful until each delivery slice is actually implemented.
- Report unavailable backend lint, typecheck, and build scripts explicitly.
- Do not claim `npm run db:migrate`, `npm run db:init`, or seed commands were run unless they were actually executed.
