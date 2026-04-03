# Migration Workflow

## Purpose
- Describe the schema-change path honestly.
- Keep the migration runner, preserved SQL files, and bootstrap alias aligned.
- Show how a future Slice 1 delivery rollout should be staged without implying the migrations already exist.

## Current reality
| Item | Current truth |
|---|---|
| Primary schema command | `npm run db:migrate` |
| Bootstrap alias | `npm run db:init` |
| Local seed command | `npm run db:seed` |
| Bootstrap admin seed command | `npm run db:seed:bootstrap-admin` |
| Demo seed command | `npm run db:seed:demo` |
| Preserved SQL files | `backend/migrations/0001_baseline.sql`, `0002_phase1_contracts.sql`, `0003_remove_app_registry_and_installed_apps.sql`, `0004_rename_events_to_delivery_events.sql`, `0005_restore_events_parent_and_split_delivery_events.sql`, `0006_prune_non_delivery_child_events.sql`, `0007_create_orders_and_drivers.sql`, `0008_create_deliveries_and_assignments.sql` |
| Migration runner script | `backend/scripts/migrate.js` |
| Tracking table | `schema_migrations` created by the migration runner |
| Delivery migration files | `0004_rename_events_to_delivery_events.sql`, `0005_restore_events_parent_and_split_delivery_events.sql`, `0006_prune_non_delivery_child_events.sql`, `0007_create_orders_and_drivers.sql`, `0008_create_deliveries_and_assignments.sql` |
| Delivery seed coverage | None yet |

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| `db:migrate` is the real schema path and `db:init` delegates to it | No documented delivery migration sequence exists after `0003_*` | Stage future delivery work as new forward-only SQL files after the current scaffold chain |
| The runner already records ordered applied versions | There is no delivery rollout guidance for splitting foundational, async-platform, tracking, and incident slices | Document a staged rollout before adding any delivery SQL |
| Seed commands now split between local demo data, remote bootstrap admin access, and deferred delivery data | Production access could be misread as coming from demo users | Keep the bootstrap-admin contract explicit, keep demo users out of production assumptions, and defer delivery seeds until delivery tables and flows are real |
| The event split and foundational delivery schema are implemented through `0004_*` to `0008_*` | No delivery runtime modules exist yet for the new tables | Add orders, drivers, deliveries, and assignments runtime modules next, then tracking and incidents |

## Decision rule for Phase 0 work
| Change type | What to do now |
|---|---|
| Docs-only change | No schema command needed |
| Schema-affecting change | Add a new forward-only SQL file, then update `docs/DB_SCHEMA.md` |
| Local bootstrap change | Keep `db:init` delegating to the migration runner |
| Workflow or CI change | Keep command names aligned with real package scripts |

## Recommended Slice 1 rollout sequence
| Stage | What changes when schema work actually starts | What stays truthful before then |
|---|---|---|
| 1. Planning lock | Confirm the first delivery table family and open decisions in docs | Do not claim any delivery migration file or table exists before it is added |
| 2. Event-table rename gate | Implemented by `0004_rename_events_to_delivery_events.sql` | Do not imply lifecycle-owned delivery events already ship just because the temporary rename landed |
| 3. Event parent-child split gate | Implemented by `0005_restore_events_parent_and_split_delivery_events.sql` | Do not imply that `delivery_events` replaced generic platform events; the current baseline is `events` plus child `delivery_events` |
| 4. Delivery-child cleanup gate | Implemented by `0006_prune_non_delivery_child_events.sql` | Do not treat inherited generic rows such as `user.created` as delivery events after the split |
| 5. Foundational delivery migrations | Implemented by `0007_create_orders_and_drivers.sql` and `0008_create_deliveries_and_assignments.sql` | Do not imply runtime handlers or seeds already ship just because the tables exist |
| 6. Async platform bootstrap | Implemented in backend runtime and deploy metadata without a schema change | Do not imply real processors, jobs, or queue-backed delivery behavior exist yet |
| 7. Tracking migrations | Add `location_pings` when delivery ownership and ingestion rules are ready | Do not imply real-time tracking already ships |
| 8. Incident migrations | Add `incidents` once lifecycle transitions and delivery events can anchor exception history | Do not imply exception handling already ships |
| 9. Bootstrap follow-through | Update seeds or bootstrap docs only after delivery tables are real and exercised | Do not claim delivery seed coverage before scripts change |

## Rules
- Do not rewrite `0001_baseline.sql` or `0002_phase1_contracts.sql`.
- Do not rewrite `0003_remove_app_registry_and_installed_apps.sql`.
- Prefer additive migrations over historical edits.
- Do not claim `db:migrate`, `db:seed:bootstrap-admin`, or `db:seed:demo` were run unless they were actually executed.
- Keep schema docs aligned with the post-migration runtime state.
- If a delivery rollout is partial, document the deferral rather than flattening it into one speculative migration.
- Keep later delivery slices on the `events` parent plus `delivery_events` child baseline; do not collapse generic and delivery-specific events back into one table.

## Validation notes
- If schema-affecting work lands, record whether `npm run db:migrate` was run.
- If bootstrap-admin behavior changes, note whether `db:seed:bootstrap-admin` was exercised or deferred.
- If demo-seed behavior changes, note whether `db:seed:demo` was exercised or deferred.
- Report unavailable commands as unavailable, not passed.
