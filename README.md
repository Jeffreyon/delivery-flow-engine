# Delivery Flow Engine Scaffold

`delivery-flow-engine` currently ships a Phase 0 workspace/account/admin scaffold that serves as the starting point for Delivery Flow Engine planning and the future app shell that integrates with the sibling `logistics-api` BLN surface.

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

## Frontend API runtime config

- Local frontend development reads `VITE_API_URL` from `frontend/.env.local`; start from `frontend/.env.local.example`.
- Railway frontend deploys now generate a runtime `runtime-config.js` file from the `frontend` service `VITE_API_URL` variable when the container boots.
- Keep `VITE_API_URL` pointed at the matching backend public domain in both `staging` and `production`, or auth and other `/api/*` requests will fail closed instead of falling back to the frontend origin.

## Backend BLN runtime config

- `backend/.env.example` now includes the first sibling BLN client contract.
- Set `LOGISTICS_API_URL` to the sibling `logistics-api` backend base URL.
- Set `LOGISTICS_API_SERVICE_SECRET` to the same value as the sibling `logistics-api` `DELIVERY_BACKEND_SERVICE_SECRET`.
- That shared secret is trusted backend-to-backend auth for tenant bootstrap and support flows only. Tenants still authenticate with tenant API keys and node-bound runtime tokens in `logistics-api`.
- `LOGISTICS_API_TIMEOUT_MS` is optional and defaults to `10000`.

## Current known Phase 0 gaps

- API and auth contracts are only partially hardened; see `docs/GAP_ANALYSIS.md` before widening runtime behavior.
- the backend-only logistics client foundation now exists, but no local BLN context bridge or `/api/v1` facade routes consume it yet.
- no local bridge exists yet between authenticated app users and BLN tenant or node context.
- no BLN-backed delivery, event, handoff, or custody UI exists yet on top of the scaffold.
- local `orders`, `drivers`, `deliveries`, and `assignments` tables exist in schema, but they are not the active execution path and should be treated as future augmentation or caching candidates until a deliberate decision reactivates them.
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
