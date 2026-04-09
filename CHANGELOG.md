# Changelog

This file records material changes to how the template should be understood or used.

## 2026-04-09

### Changed
- Reframed the active Delivery Flow Engine roadmap around integration with the sibling `logistics-api` BLN backend instead of continuing the older local-first delivery runtime queue by default.
- Updated the planning chain to make `logistics-api` the active external delivery, event, node, and handoff source of truth for the next slices, while keeping the local `orders`, `drivers`, `deliveries`, and `assignments` schema explicit as dormant extension or projection candidates.
- Rebuilt the active slice-pack queue around BLN contract alignment, logistics client foundation, tenant-context bridging, BLN-backed deliveries and events, handoff and custody workflows, and later projections or operator surfaces.
- Added the backend-only logistics client foundation plus env contract for the sibling `logistics-api`, with focused backend coverage for service-auth requests, tenant-auth requests, idempotency-header pass-through, query building, and upstream error normalization.
- Added explicit BLN-backed feature opportunities in the docs so later work can focus on onboarding, custody workflows, diagnostics, and notifications on top of the existing BLN API rather than duplicating core logistics storage first.
- Updated migration and prompt-routing guidance so future agents do not add more local delivery schema or contract surface by reflex when the next active gap is still the external BLN integration layer.

## 2026-04-03

### Changed
- Fixed the frontend Railway auth wiring so the container now generates `runtime-config.js` from `VITE_API_URL` at boot, API calls fail closed when that env var is missing, and login only succeeds after a real authenticated `/api/auth/me` response.
- Added an environment-driven `db:seed:bootstrap-admin` flow so staging and production can provision one scaffold admin without relying on demo credentials, and wired that contract into the Railway deploy workflow and scaffold docs.
- Reframed `docs/GAP_ANALYSIS.md` around the PRD-to-runtime gap so it now separates scaffold hardening from Delivery Flow Engine alignment work.
- Rewrote `docs/IMPLEMENTATION_PLAN.md` into a docs-first slice queue with dependency ordering, blocking questions, and next agentic doc actions.
- Removed stale `web_app` and manifest-backed wording from current-reality docs where it conflicted with the live repo state.
- Hardened the scaffold by narrowing route-level user writes, requiring admin auth for the delivery-event write surface, moving auth bootstrap ownership to route loaders, and adding mobile dialog navigation to the dashboard shells.
- Added explicit fetch-failure states to the touched dashboard and admin pages, plus focused backend and frontend coverage for the new hardening behavior.
- Promoted `location_pings`, `incidents`, and async platform work into the active delivery slice queue, and defined the planned BullMQ plus Redis worker contract in the delivery planning docs.
- Corrected harness guidance to point at `.scaffold/project.json` and the Railway workflow instead of a missing root `template.json`, and removed stale install-token assumptions from scaffolder notes.
- Implemented the first delivery gate by renaming the scaffold `events` runtime surface to `delivery_events` across migrations, API routes, seeds, and touched admin UI copy.
- Restored generic platform `events` as the parent event ledger and kept `delivery_events` as the delivery-specific child ledger so delivery logging no longer replaces base infrastructure events.
- Restored the slice-pack workflow docs so packs now have an end-to-end contract for audit, validation, staging follow-through, and PR handoff instead of stopping at implementation scope alone.
- Locked the first delivery API contract in the docs: delivery routes start under `/api/v1`, milestone 1 uses `admin` plus driver-scoped access, and tracking keeps one ingress route while public incident endpoints stay deferred.
- Added the foundational delivery schema in forward-only migrations for `orders`, `drivers`, `deliveries`, and `assignments`, and updated the planning docs to treat that schema as current runtime truth.
- Added implementation-ready slice packs under `docs/slices/` so the PRD can now be executed as bounded backend, docs, and later frontend cuts instead of one broad roadmap.
- Implemented the async platform bootstrap by adding BullMQ and `ioredis`, a shared queue runtime, `backend/worker.js`, and `Redis` plus `worker` service metadata in the project and deploy workflow files.
- Aligned the shared backend Dockerfile and live Railway project so `backend` and `worker` now share the same deploy path, with real `Redis` and `worker` services provisioned for both `staging` and `production`.
- Recorded the live Railway drift where staging currently uses `Redis` while production resolves worker traffic through `Redis-nFa9`, keeping that mismatch explicit instead of implying the metadata contract is fully reconciled.
- Reconciled the live Railway Redis topology so both `staging` and `production` now use the canonical `Redis` service for the worker runtime.

## 2026-04-01

### Changed
- Consolidated `web_app` around a Phase 0 workspace and admin baseline instead of the copied commerce roadmap.
- Rewrote the core architecture, schema, API, UI, PRD, migration, and release docs to match the live scaffold.
- Added `.scaffold` project metadata, root `.gitignore`, `db:migrate`, and `db:seed:demo` to the generated scaffold flow.
- Switched `db:init` to the migration runner and added `0003_remove_app_registry_and_installed_apps.sql` to remove the legacy registry surface from the active runtime.
- Added `frontend/docs/DESIGN_SYSTEM.md` and `frontend/docs/MOBBIN_DESIGN_WORKFLOW.md` as repo-true frontend guidance paths.
- Reframed brand guidance around the current generic workspace UI instead of retail-specific residue.
- Marked the remaining hardening backlog explicitly: user-write narrowing, event-ingestion hardening, mobile navigation, and backend validation scripts.

### Removed
- Removed backend and frontend app-registry and installed-app runtime surfaces.

## 2026-03-20

### Added
- `docs/MIGRATION_WORKFLOW.md` to make per-slice migration decisions, safety rules, run order, and release expectations explicit.
- `docs/SLICE_TESTING_GUIDE.md` to make per-slice backend, frontend, and integration test intent explicit.

### Changed
- Wired migration and test-planning rules into `IMPLEMENT.md`.
- Expanded `docs/SLICE_IMPLEMENTATION_TEMPLATE.md` so every slice must declare migration need and test intent.
- Tightened `docs/RELEASE_CHECKLIST.md` so release gating now proves migration handling and slice test coverage or deferral.
- Added a short readiness overlay to `docs/IMPLEMENTATION_PLAN.md`.
- Updated repo prompt routing to include the new workflow docs.
- Updated all starter slice packs under `docs/slices/` so each one now declares migration need, run order, required tests, and allowed deferrals.
- Made `docs/STAGING_CHECKLIST.md` slice-scoped and `not applicable` aware for early-slice staging truth.
- Expanded `docs/PR_TEMPLATE.md` so PR handoff now captures migration evidence, test evidence, residual risk, changelog status, and slice-scoped staging scope.
- Aligned `implementation-orchestrator`, `repo-consistency-auditor`, `validation-runner`, `pr-publish`, and `staging-deploy` with the current migration, testing, release, and staging workflow.
- Tightened deferred-test tracking so slice docs, the runbook, validation output, and PR handoff now require an explicit follow-up hook.
- Tightened `docs/RELEASE_CHECKLIST.md` so release gating now matches current repo reality for available checks, unavailable backend scripts, and slice-scoped `not applicable` staging checks.
