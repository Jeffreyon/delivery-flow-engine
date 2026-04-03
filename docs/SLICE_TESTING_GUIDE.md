# Slice Testing Guide

Use this guide with each slice pack to keep validation, staging proof, and PR handoff consistent.

## Validation declaration
- Always list the repo commands that must run for the slice.
- If the slice is docs-only, say `Docs consistency sweep only unless code or config changes during the slice.`
- Report unavailable backend lint, typecheck, and build scripts explicitly.

## Schema slices
- Record whether `npm run db:migrate` was run.
- If seed behavior changed, record whether `npm run db:seed`, `npm run db:seed:bootstrap-admin`, or `npm run db:seed:demo` was run.
- Do not claim migration or seed execution unless it actually happened.

## Staging proof
- Apply `docs/STAGING_CHECKLIST.md` only when staging or deploy work is requested.
- Mark checks as `pass`, `fail`, or `not applicable`.
- If staging was not requested, record that explicitly in the handoff.

## PR handoff proof
- Use `docs/PR_TEMPLATE.md` when PR preparation or publishing is in scope.
- Include:
  - change goal
  - current state and target
  - docs and runtime touched
  - migration evidence
  - validation evidence
  - staging status
  - remaining risks or deferrals
