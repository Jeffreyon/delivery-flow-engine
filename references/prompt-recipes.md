# Prompt Recipes

## Purpose
- Provide small prompt frames that stay aligned with the current scaffold and slice-pack flow.

## Backend implementation recipe
```text
Task
- Implement `<slice or change name>` from `<active slice pack>`.
- Keep the work grounded in the current Phase 0 scaffold and touched runtime area only.

Read first
- AGENTS.md
- backend/AGENTS.md
- smallest relevant touched docs
- active slice pack

Use skills
- backend-dev
- validation-runner

Priority order
1. docs
2. code or config
3. validation

Current repo truth to preserve
- include only repo-true runtime facts needed for the task

Scope
- smallest bounded runtime or harness cut

Out of scope
- adjacent slices and speculative future-state work

Validation
- backend: npm test
- frontend: npm run lint
- frontend: npx tsc -b
- frontend: npm test -- --run
- frontend: npm run build
- backend lint/typecheck/build: report unavailable
```

## Docs-only planning recipe
```text
Task
- Update the planning docs for `<slice or decision>`.
- Keep the work docs-only and document current reality, not idealized architecture.

Read first
- AGENTS.md
- smallest relevant touched docs

Use skills
- none required

Extraction order
1. code
2. config
3. migrations or bootstrap scripts
4. existing docs

Output requirements
- record current state
- record gap
- record recommended target
```

## Full-stack slice recipe
```text
Task
- Implement `<slice>` across the backend and touched frontend surfaces only.

Read first
- AGENTS.md
- backend/AGENTS.md
- frontend/AGENTS.md
- touched docs
- active slice pack

Use skills
- backend-dev
- frontend-dev
- validation-runner

Priority order
1. docs
2. code or config
3. validation

Validation
- backend: npm test
- frontend: npm run lint
- frontend: npx tsc -b
- frontend: npm test -- --run
- frontend: npm run build
- backend lint/typecheck/build: report unavailable
```
