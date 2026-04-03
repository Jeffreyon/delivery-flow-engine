# Slice 03: Foundational Delivery Schema

- Type: `backend`
- Run order: `3`
- Depends on: Slice 02
- Migration need: `Yes`
- Status: `Implemented on the current branch`

## PRD coverage
- `orders`
- `drivers`
- `deliveries`
- `assignments`

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| The schema now includes `events`, `delivery_events`, `orders`, `drivers`, `deliveries`, and `assignments` | Runtime modules do not exist yet for the landed delivery tables | Use the landed schema as the base for the next delivery runtime slices |
| Drivers are now expressed as `users` plus a linked profile table | Runtime authz and profile handlers do not exist yet | Build the driver runtime on the landed user-linked table instead of reopening schema shape |
| One order may now own multiple deliveries in schema | Runtime create and lookup flows do not exist yet | Implement later slices against the landed one-to-many cardinality |

## Scope
- Add new forward-only SQL files after `0006_prune_non_delivery_child_events.sql`.
- Add the first delivery-core table family in dependency order.
- Update `docs/DB_SCHEMA.md` and `docs/MIGRATION_WORKFLOW.md` to reflect the new runtime state.
- Keep seed behavior deferred unless a real delivery bootstrap path is implemented.

## Delivered baseline
- Added `0007_create_orders_and_drivers.sql` for the first delivery business record and user-linked driver profile tables.
- Added `0008_create_deliveries_and_assignments.sql` for lifecycle-bearing deliveries and assignment history.
- Preserved one order to many deliveries in schema.
- Kept seed behavior deferred and left runtime modules for later slices.

## Out of scope
- `location_pings`
- `incidents`
- Queue metadata tables
- UI changes

## Likely runtime and doc targets
- `backend/migrations/0007_*.sql` and later additive files
- `docs/DB_SCHEMA.md`
- `docs/MIGRATION_WORKFLOW.md`

## Required audit
- Run a touched-area repo consistency sweep across schema SQL, migration runner behavior, seed assumptions, and schema docs.
- Apply `docs/RELEASE_CHECKLIST.md` to the schema slice before handoff.

## Required validation
- `backend`: `npm run db:migrate`
- `backend`: `npm test`
- `frontend`: `npm run lint`
- `frontend`: `npx tsc -b`
- `frontend`: `npm test -- --run`
- `frontend`: `npm run build`
- backend lint, typecheck, and build: report unavailable

## Staging follow-through
- `Not requested` in the local schema-only completion path.
- Apply `docs/STAGING_CHECKLIST.md` later only if the schema slice is actually staged or deployed.

## PR follow-through
- `Not requested` in the local schema-only completion path.
- If publishing is requested later, prepare `docs/PR_TEMPLATE.md` with migration evidence, validation evidence, schema deferrals, and whether seeds changed.

## Exit criteria
- Core delivery migrations exist and apply cleanly after `0006_*`.
- Schema docs match the post-migration truth.
- The repo still treats seeds as scaffold-only unless a real delivery seed path was implemented.

## Allowed deferrals
- Seed updates
- Tracking and incident tables
- Non-essential indexes not yet justified by implemented queries
