# Delivery Flow Engine Scaffold

`delivery-flow-engine` currently ships a Phase 0 workspace/account/admin scaffold that serves as the starting point for Delivery Flow Engine planning.

Current runtime coverage:
- auth
- users
- roles
- notifications
- events
- delivery-events
- devices
- sessions
- settings
- user and admin dashboards

Current stack:
- backend: Express 5 + Postgres + raw SQL repositories
- async runtime: BullMQ + `ioredis` queue bootstrap with a separate worker entrypoint
- frontend: React 19 + Vite + TypeScript + React Router

## Local demo accounts

Running `backend/scripts/seedLocal.js` through `npm run db:seed` creates two local demo users:

- Admin: `admin@example.com` / `password123`
- User: `user@example.com` / `password123`

The seed is idempotent, so rerunning `npm run db:seed` updates those records instead of duplicating them.

## Remote bootstrap admin

- `main` and `staging` deploys can seed one idempotent bootstrap admin through `npm run db:seed:bootstrap-admin`.
- Configure GitHub Actions secrets `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` to activate it.
- Demo credentials stay local and staging-only. Production should rely on the bootstrap-admin contract instead of `admin@example.com / password123`.

## Current known Phase 0 gaps

- API and auth contracts are only partially hardened; see `docs/GAP_ANALYSIS.md` before widening runtime behavior.
- delivery-domain runtime modules, tracking and incident schema, and actual queue-backed jobs still need to be implemented on top of the scaffold, locked `/api/v1` contract, and foundational delivery schema.
- backend lint, typecheck, and build scripts are still unavailable.
- scaffolder and deploy metadata should be read from `.scaffold/project.json` and `.github/workflows/railway-deploy.yml`, not a missing root `template.json`.

## Start here

- `AGENTS.md`
- `IMPLEMENT.md`
- `docs/GAP_ANALYSIS.md`
- `docs/ARCHITECTURE.md`
- `docs/DB_SCHEMA.md`
- `docs/API_SPEC.md`
- `docs/UI_ARCHITECTURE.md`
- `docs/slices/README.md`

## Frontend guidance

The current frontend guidance set is:
- `frontend/docs/DESIGN_SYSTEM.md`
- `frontend/docs/MOBBIN_DESIGN_WORKFLOW.md`
- `frontend/intelligence.md`
- `frontend/design/mobbin/README.md`
- `brand/BRAND_CONSTRAINTS.md`
