# DB Schema

## Purpose
- Record current schema truth.
- Keep historical SQL, migration runner behavior, and executable bootstrap aligned.
- Record the landed delivery schema baseline without claiming runtime modules already exist for it.

## Current schema sources
| Source | Current state | Notes |
|---|---|---|
| `backend/migrations/0001_baseline.sql` | Historical baseline SQL | Includes the older `installed_apps` column |
| `backend/migrations/0002_phase1_contracts.sql` | Additive SQL | Adds the notifications index |
| `backend/migrations/0003_remove_app_registry_and_installed_apps.sql` | Additive SQL | Removes `installed_apps` and any legacy `app_registry` table |
| `backend/migrations/0004_rename_events_to_delivery_events.sql` | Additive SQL | Renames the scaffold `events` table to `delivery_events` |
| `backend/migrations/0005_restore_events_parent_and_split_delivery_events.sql` | Additive SQL | Restores `events` as the parent ledger and reduces `delivery_events` to the child delivery-event table |
| `backend/migrations/0006_prune_non_delivery_child_events.sql` | Additive SQL | Removes non-delivery event types from the `delivery_events` child ledger after the parent-child split |
| `backend/migrations/0007_create_orders_and_drivers.sql` | Additive SQL | Adds the first delivery business record and driver-profile tables |
| `backend/migrations/0008_create_deliveries_and_assignments.sql` | Additive SQL | Adds lifecycle-bearing deliveries plus assignment history |
| `backend/scripts/migrate.js` | Executable migration runner | Creates `schema_migrations` and applies ordered SQL files |
| `backend/scripts/initDb.js` | Bootstrap alias | Delegates to the migration runner |
| `backend/scripts/seedLocal.js` | Idempotent local demo seed | Inserts roles, users, settings, notifications, devices, and sessions |
| `backend/scripts/seedBootstrapAdmin.js` | Idempotent remote bootstrap admin seed | Upserts one admin user from environment variables |
| `backend/scripts/seedDemo.js` | Guarded staging demo seed | Seeds demo users only when `DEMO_SEED_ALLOWED=true` |

## Tables after current migrations
| Table | Purpose | Key columns | Notes |
|---|---|---|---|
| `roles` | Role definitions | `id` PK, `permissions text[]` | Seeded with `admin`, `user` |
| `users` | Identity, profile, and auth state | `id` PK, `email` UNIQUE, `roles text[]`, `password_hash` | Stores profile fields plus the first BLN binding under `preferences.bln` |
| `notifications` | User notification feed | `id` PK, `to_uid` FK, `read` | Mark-read is now scoped by authenticated user id |
| `events` | Parent event ledger | `id` PK, `type`, `payload jsonb`, `created_at` | Covers generic platform events and the parent rows for delivery events |
| `delivery_events` | Delivery-event child ledger | `id` PK and FK to `events.id` | Public list and admin create exist, but lifecycle-owned producers are still missing |
| `orders` | Delivery work request | `id` PK, `reference` UNIQUE, `created_by_uid` FK | First delivery business record; runtime handlers do not exist yet |
| `drivers` | Driver profile extension of `users` | `id` PK and FK to `users.id`, `is_available`, `profile jsonb` | Driver remains a user-linked actor, not a separate identity table |
| `deliveries` | Lifecycle-bearing delivery record | `id` PK, `order_id` FK, `status` | One order may own multiple deliveries; runtime handlers do not exist yet |
| `assignments` | Delivery-to-driver assignment history | `id` PK, `delivery_id` FK, `driver_id` FK | Partial unique index keeps one open assignment per delivery |
| `devices` | Known device records | `id` PK, `uid` FK, `device_id`, `is_current` | Current-device clearing happens in repository code |
| `sessions` | Session history | `id` PK, `uid` FK, `created_at`, `ended_at` | Logout marks recent sessions ended |
| `settings` | Global settings row | `id` PK, `support_email`, `allowed_regions text[]` | Uses `id = 'global'` convention |
| `schema_migrations` | Applied migration tracker | `version` PK, `applied_at` | Created by the migration runner |

## Relationships and constraints
- Foreign keys:
  - `notifications.to_uid -> users.id` (`ON DELETE CASCADE`)
  - `delivery_events.id -> events.id` (`ON DELETE CASCADE`)
  - `orders.created_by_uid -> users.id` (`ON DELETE SET NULL`)
  - `drivers.id -> users.id` (`ON DELETE CASCADE`)
  - `deliveries.order_id -> orders.id` (`ON DELETE CASCADE`)
  - `assignments.delivery_id -> deliveries.id` (`ON DELETE CASCADE`)
  - `assignments.driver_id -> drivers.id` (`ON DELETE RESTRICT`)
  - `assignments.assigned_by_uid -> users.id` (`ON DELETE SET NULL`)
  - `devices.uid -> users.id` (`ON DELETE CASCADE`)
  - `sessions.uid -> users.id` (`ON DELETE CASCADE`)
- Unique constraints:
  - `users.email`
  - `orders.reference`
- Secondary indexes:
  - `notifications_to_uid_created_at_idx (to_uid, created_at DESC)`
  - `orders_created_at_idx (created_at DESC)`
  - `drivers_is_available_idx (is_available)`
  - `deliveries_order_id_idx (order_id)`
  - `deliveries_status_created_at_idx (status, created_at DESC)`
  - `assignments_delivery_id_assigned_at_idx (delivery_id, assigned_at DESC)`
  - `assignments_driver_id_assigned_at_idx (driver_id, assigned_at DESC)`
  - `assignments_one_open_assignment_per_delivery_idx (delivery_id) WHERE unassigned_at IS NULL`
- No FK links `users.roles[]` to `roles.id`.

## Schema behavior notes
- Timestamps are stored as `BIGINT` epoch milliseconds in runtime tables.
- `0001_baseline.sql` is preserved as history; later SQL files carry the removal of legacy app-related schema.
- Fresh environments should use the migration runner path, not manual reconstruction from one SQL file.
- The first BLN bridge reuses `users.preferences` and stores a small `bln` object shaped as `{ tenantId, nodeId? }`; no dedicated local membership table exists yet.

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| The repo has one migration-backed schema path for scaffold and delivery tables | Later delivery schema slices such as tracking and incidents are still not implemented | Keep using additive migrations as later delivery slices land |
| Historical SQL still shows older fields before later removals | Future delivery work could be tempted to rewrite baseline files | Preserve `0001` to `0003` as history and add new files after them |
| Seed scripts currently cover scaffold identities only | Later prompts could overstate delivery bootstrap readiness or confuse demo users with production access | Keep delivery seeds deferred, but use the dedicated bootstrap-admin path for the first real remote admin account |
| The parent-child split between `events` and `delivery_events` is now the event baseline, and core delivery tables now exist in schema | No delivery runtime modules or handlers exist yet for the new tables, and the active next queue is now external BLN integration rather than more local delivery schema | Freeze new local delivery-table growth until the BLN client layer, context bridge, and any projection or augmentation role are explicit |

## Recommended first delivery schema set
| Planned schema object | Why it belongs in the first envelope | Depends on | Slice 1 status |
|---|---|---|---|
| `orders` | Introduces the first business record for requested delivery work | Existing scaffold foundation only | Implemented in schema |
| `drivers` | Separates driver-specific operational data from the generic `users` row | `users`, `roles` actor model | Implemented in schema |
| `deliveries` | Introduces the lifecycle-bearing operational record | `orders`, `drivers` | Implemented in schema with one order allowed to own multiple deliveries |
| `assignments` | Preserves assignment and reassignment history | `deliveries`, `drivers` | Implemented in schema |
| `events` | Preserves general platform events and the parent rows for later domain-specific ledgers | Existing scaffold runtime | Implemented event baseline |
| `delivery_events` | Reuses the existing delivery-specific route while specializing from the parent `events` ledger | Existing scaffold runtime | Implemented first hard gate |
| `location_pings` | Supports tracking telemetry | `deliveries`, `drivers` | Active follow-on target after delivery core |
| `incidents` | Supports failures, returns, and operational exceptions | `deliveries`, `delivery_events` | Active follow-on target after lifecycle and event rules are locked |

## Recommended dependency order
1. `orders` now anchor the delivery-domain business record layer.
2. `drivers` now extend `users` as delivery profiles.
3. `deliveries` now preserve one-to-many cardinality from `orders` to `deliveries`.
4. `assignments` now preserve dispatch history instead of hiding reassignment on a mutable delivery row.
5. Add `location_pings` once delivery ownership and queue-backed tracking ingestion are ready.
6. Add `incidents` once lifecycle transitions and delivery events can anchor exception history.

## Planning guardrails
- Do not document exact delivery columns, indexes, or constraints as current runtime truth before the delivery contract and lifecycle slices are defined.
- Do not describe `delivery_events` as full delivery lifecycle proof before delivery-owned producers and rules are implemented.
- Do not collapse general platform events back into `delivery_events`; the locked plan is to keep `events` as the parent ledger and `delivery_events` as the delivery-specific child ledger.
- Keep the scaffold tables and any future delivery tables additive under the same migration runner.
- Do not add new local delivery schema just because the sibling BLN backend already exposes a feature; add local tables only when the app needs a real projection, cache, or business object that the BLN backend does not own.
