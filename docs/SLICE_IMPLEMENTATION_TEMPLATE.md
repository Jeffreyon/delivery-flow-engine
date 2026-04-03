# Slice Implementation Template

Use this template when creating or refreshing a slice pack so the pack can be executed end to end instead of stopping at scope notes.

## Required header fields
- `Type`
- `Run order`
- `Depends on`
- `Migration need`
- `Status`

## Required sections
1. `PRD coverage`
2. `Current state, gap, recommended target`
3. `Scope`
4. `Out of scope`
5. `Likely runtime and doc targets`
6. `Required audit`
7. `Required validation`
8. `Staging follow-through`
9. `PR follow-through`
10. `Exit criteria`
11. `Allowed deferrals`

## Default wording rules
- Keep current runtime truth separate from planned target behavior.
- If the slice is docs-only, say so explicitly and do not claim runtime evidence.
- If staging or PR work is not requested, say `not requested` or `not in scope` instead of implying it was completed.
- If backend lint, typecheck, or build scripts do not exist, mark them unavailable.
- If schema work lands, record whether `npm run db:migrate` was actually run.

## Default completion flow
1. Audit touched code, config, migrations, and docs.
2. Update docs first when contracts, schema truth, or runtime boundaries change.
3. Implement the bounded code or config change.
4. Run the declared validation set.
5. Apply the release checklist to the touched slice scope.
6. Apply staging and PR follow-through only when requested.
