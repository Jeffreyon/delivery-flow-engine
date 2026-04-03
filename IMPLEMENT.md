# Implementation Runbook

## Source of truth
- docs/GAP_ANALYSIS.md
- docs/ARCHITECTURE.md
- docs/DECISIONS.md
- docs/DOMAIN_MODEL.md
- docs/DB_SCHEMA.md
- docs/API_SPEC.md
- docs/UI_ARCHITECTURE.md
- frontend/docs/DESIGN_SYSTEM.md
- frontend/docs/MOBBIN_DESIGN_WORKFLOW.md
- docs/IMPLEMENTATION_PLAN.md
- docs/slices/README.md and the active file under `docs/slices/` when implementing a delivery slice
- docs/MIGRATION_WORKFLOW.md when schema, bootstrap, CI, or deploy behavior is touched
- frontend/intelligence.md when frontend structure or reusable UI guidance is touched
- brand/BRAND_CONSTRAINTS.md when visual tone or branding is touched
- docs/RELEASE_CHECKLIST.md
- docs/STAGING_CHECKLIST.md when staging or deploy follow-through is in scope
- docs/PR_TEMPLATE.md when PR publishing or handoff is in scope
- docs/SLICE_IMPLEMENTATION_TEMPLATE.md and docs/SLICE_TESTING_GUIDE.md when authoring or refreshing slice packs

## Workflow
1. Reduce the request to one bounded runtime or harness area.
2. Inspect code, config, migrations or bootstrap scripts, then existing docs.
3. Record `current state`, `gap`, and `recommended target` where drift exists.
4. Update docs first when contracts, schema truth, runtime boundaries, or harness routing are changing.
5. Make the smallest code or config fixes needed to keep the docs and harness truthful.
6. Run a repo consistency audit across the touched files.
7. Run the available validation commands.
8. Apply `docs/RELEASE_CHECKLIST.md` to the touched slice scope before handoff.
9. If staging or deploy follow-through is requested, apply `docs/STAGING_CHECKLIST.md` and report unavailable evidence explicitly.
10. If PR or publish follow-through is requested, prepare the handoff from `docs/PR_TEMPLATE.md`.
11. Update `CHANGELOG.md` when the change materially affects how the template should be used or understood.

## Skill boundaries
- `repo-consistency-auditor` for drift review
- `validation-runner` for available checks
- `git-pr-prep`, `pr-publish`, and `staging-deploy` only when PR or deploy follow-through is explicitly in scope

## Rules
- Do not invent future phases or domain plans.
- Do not claim migrations, deploy steps, or scripts that do not exist.
- Treat `backend/migrations/`, `backend/scripts/initDb.js`, `backend/scripts/seedLocal.js`, and `.github/workflows/railway-deploy.yml` as separate evidence sources until they are aligned.
- Do not rewrite applied baseline migrations.
- Remove stale references when files or skills are deleted.
- Report unavailable checks explicitly instead of silently passing them.

## Do not
- expand scope into new commerce domains
- refactor unrelated runtime code
- silently preserve broken cross-doc links
- skip validation or hide missing commands
