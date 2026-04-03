# Doc Routing

## Purpose
- Keep prompt generation aligned with the current repo doc set and slice-pack workflow.

## Task routing
| Task type | Read first | Use skills |
|---|---|---|
| docs-only | `AGENTS.md`, touched docs, `docs/IMPLEMENTATION_PLAN.md`, active slice pack when relevant | `repo-prompt-generator` |
| backend | `AGENTS.md`, `backend/AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/API_SPEC.md`, `docs/DECISIONS.md`, `docs/DB_SCHEMA.md`, `docs/MIGRATION_WORKFLOW.md`, active slice pack | `repo-prompt-generator`, `backend-dev`, `validation-runner` |
| frontend | `AGENTS.md`, `frontend/AGENTS.md`, `docs/UI_ARCHITECTURE.md`, `frontend/docs/DESIGN_SYSTEM.md`, `frontend/intelligence.md`, active slice pack when relevant | `repo-prompt-generator`, `frontend-dev`, `validation-runner` |
| full-stack | `AGENTS.md`, `backend/AGENTS.md`, `frontend/AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/API_SPEC.md`, `docs/UI_ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/MIGRATION_WORKFLOW.md`, active slice pack | `repo-prompt-generator`, `backend-dev`, `frontend-dev`, `validation-runner` |
| template-harness | `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/MIGRATION_WORKFLOW.md`, `.scaffold/project.json`, `.github/workflows/railway-deploy.yml` | `repo-prompt-generator`, `backend-dev`, `validation-runner` |
| validation or release follow-through | `AGENTS.md`, `docs/RELEASE_CHECKLIST.md`, `docs/MIGRATION_WORKFLOW.md` | `validation-runner`, `git-pr-prep`, `staging-deploy` |
| review | `AGENTS.md`, touched docs or code, active slice pack when relevant | `repo-consistency-auditor`, `validation-runner` |

## Slice-pack routing
- Start from `docs/slices/README.md`.
- Read the active slice pack before generating or executing a delivery implementation prompt.
- Treat completed slices as current-reality docs once the runtime has landed.

## Current delivery queue
1. `docs/slices/02-delivery-api-contract.md`
2. `docs/slices/03-foundational-delivery-schema.md`
3. `docs/slices/04-orders-and-drivers-runtime.md`
4. `docs/slices/05-deliveries-and-dispatch-runtime.md`
5. `docs/slices/06-lifecycle-and-delivery-events.md`
6. `docs/slices/07-tracking-runtime.md`
7. `docs/slices/08-incident-runtime.md`
8. `docs/slices/09-queue-backed-jobs.md`
9. `docs/slices/10-operations-surface.md`
