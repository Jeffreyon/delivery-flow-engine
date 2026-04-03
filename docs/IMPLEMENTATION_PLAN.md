# Implementation Plan

## Purpose
- Define the docs-first path from the current Phase 0 scaffold to a credible Delivery Flow Engine slice plan.
- Keep current scaffold truth, prerequisite hardening, and proposed delivery slices separate.

## Planning baseline
| Area | Current state | Gap | Recommended target |
|---|---|---|---|
| Plan identity | The live repo is still an auth and admin scaffold, while the PRD targets a delivery platform | The current plan does not bridge those realities cleanly | Make the plan explicit about what is scaffold truth and what is future delivery work |
| Schema path | `db:migrate` is the primary schema command, `db:init` delegates to it, and foundational delivery migrations now exist through `0008_*` | Later tracking and incident migration steps are still not implemented | Keep extending the delivery schema with forward-only migrations |
| API baseline | Current runtime APIs still cover scaffold modules only, while the first delivery contract is now locked in docs under `/api/v1` | Delivery runtime handlers do not exist yet for the locked contract | Implement later backend slices against the documented `/api/v1` baseline instead of inventing new route shapes |
| Validation truth | Frontend checks exist; backend exposes tests only | Later slice prompts could overstate available proof | Keep every later slice honest about the real validation commands |

## Planning tracks
| Track | Current state | Gap | Recommended target |
|---|---|---|---|
| 1. Scaffold hardening prerequisites | User writes, event ingestion, auth bootstrap, and dashboard mobile nav were tightened; backend validation gaps still remain | A few repo-level validation and secondary-page polish items are still not complete | Carry forward only the remaining hardening items that affect delivery foundations or doc truth |
| 2. PRD alignment docs | `docs/PRD.md` is broader than the current repo | Implementing agents would have to infer too much about domain, actors, and architecture | Record delivery-domain starting assumptions in docs before code work begins |
| 3. Slice sequencing | A bounded delivery slice queue now exists in the planning docs | The queue is only partially implemented so later prompts could still skip prerequisites or collapse slices together | Keep the queue dependency-ordered and use it to drive implementation one gate at a time, including async platform work, tracking, and incidents |

## Recommended slice matrix
| Slice | Goal | Current starting point | Gap | Recommended target | Likely touched docs or runtime areas | Depends on | Blocking questions |
|---|---|---|---|---|---|---|---|
| 0. PRD alignment baseline | Separate scaffold truth from the delivery target and lock vocabulary | Current docs mix scaffold hardening and delivery ambition unevenly | No single planning bridge exists | Update the planning chain so it states what the repo ships today and what later delivery slices must add | `docs/GAP_ANALYSIS.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/DECISIONS.md`, `docs/ARCHITECTURE.md` | none | Is the current auth and admin scaffold a retained platform foundation or only a temporary bootstrap layer? |
| 1. Domain and schema envelope | Decide the first additive delivery entities and migration order | The schema now contains platform tables plus `events`, `delivery_events`, `orders`, `drivers`, `deliveries`, and `assignments` | Runtime modules do not exist yet for the landed delivery tables | Use the landed schema as the base for later delivery runtime slices, plus planned `location_pings` and `incidents` | `docs/DOMAIN_MODEL.md`, `docs/DB_SCHEMA.md`, `docs/MIGRATION_WORKFLOW.md` | 0 | None; the first-cut entity and event-table decisions are locked |
| 2. Async platform slice | Define the queue runtime and deploy contract before job logic lands | BullMQ dependencies, shared queue config, `backend/worker.js`, and `worker` plus `Redis` metadata now exist | No processors, named queues, or live deploy evidence exist yet | Keep the single-worker async baseline and layer real jobs on top of it in later slices | `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/MIGRATION_WORKFLOW.md`, `.github/workflows/railway-deploy.yml`, `.scaffold/project.json`, `backend/src/core/queue`, `backend/worker.js` | 1 | None; the monolithic worker baseline is now the locked starting point |
| 3. Delivery API contract baseline | Choose the first delivery contract cut and versioning rule | Current runtime routes are still unversioned scaffold APIs under `/api/*`, and the first delivery contract is now documented under `/api/v1` | Delivery handlers do not exist yet for the locked contract | Implement the selected PRD endpoints and actor access rules without reopening the contract shape | `docs/API_SPEC.md`, `docs/DECISIONS.md`, `docs/ARCHITECTURE.md` | 1 | None; the versioning and actor-baseline decisions are now locked |
| 4. Lifecycle and event model | Define delivery state transitions and domain event boundaries | Parent `events` and child `delivery_events` surfaces exist, but no lifecycle state machine is modeled | The PRD state machine and immutable event expectations are not represented in the repo | Document lifecycle ownership, event rules, and the first delivery-owned producers for `delivery_events` while preserving generic `events` | `docs/DOMAIN_MODEL.md`, `docs/DECISIONS.md`, `docs/API_SPEC.md`, `docs/GAP_ANALYSIS.md` | 1, 3 | Which non-happy-path transitions belong in the first cut before incidents become first-class records? |
| 5. Tracking and incident model | Stage telemetry and exception recording as planned slices, not a vague future phase | No tracking or incident entities exist today | The roadmap would still stall if those concepts stayed under-specified | Define when `location_pings` and `incidents` land relative to deliveries, lifecycle rules, and queue processing | `docs/DOMAIN_MODEL.md`, `docs/DB_SCHEMA.md`, `docs/API_SPEC.md`, `docs/IMPLEMENTATION_PLAN.md` | 1, 3, 4 | Do tracking writes start synchronous, queued, or mixed? Which incident types belong in the first cut? |
| 6. Operations surface strategy | Decide whether early delivery work is backend-only or needs UI support | The frontend only exposes landing, auth, user dashboard, and admin dashboard surfaces | There is no dispatch, driver, or tracking UI plan yet | State whether early ops workflows extend admin surfaces incrementally or remain API-only until later | `docs/UI_ARCHITECTURE.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_PLAN.md` | 3 | Does milestone 1 need any operator UI, or should UI work stay deferred while backend slices land? |

## Execution rules
- Start from code, config, migrations or bootstrap scripts, then docs.
- Update planning docs first when architecture understanding, slice order, or contract boundaries change.
- Do not invent routes, tables, jobs, or screens that do not exist yet.
- Preserve baseline SQL history and use forward-only migrations when delivery schema work eventually starts.
- Keep later implementation prompts explicit about unavailable backend lint, typecheck, and build scripts.

## Recommended execution order
1. Refresh `docs/GAP_ANALYSIS.md` so it separates current scaffold hardening from PRD alignment gaps.
2. Use this file to lock the delivery slice queue and its dependencies.
3. Record actor, event-table, queue-platform, and versioning decisions before drafting schema or API changes.
4. Build on the `events` plus `delivery_events` baseline before continuing later delivery slice implementation.
5. Stand up the async platform contract early enough that later job slices do not invent deploy or env behavior.
6. Define additive schema, contract, tracking, and incident slices before any UI expansion.
7. Keep current-reality docs truthful until each slice is actually implemented.

## Implementation-ready slice packs
| Pack | File | Type | Run order | Notes |
|---|---|---|---|---|
| 01 | `docs/slices/01-async-platform-bootstrap.md` | backend or full-stack | 1 | Implemented async bootstrap baseline for later job slices |
| 02 | `docs/slices/02-delivery-api-contract.md` | docs-only -> backend | 2 | Locks `/api/v1`, actor access, and the first delivery contract cut |
| 03 | `docs/slices/03-foundational-delivery-schema.md` | backend | 3 | Adds `orders`, `drivers`, `deliveries`, and `assignments` migrations |
| 04 | `docs/slices/04-orders-and-drivers-runtime.md` | backend | 4 | Implements the first business object and driver actor foundation |
| 05 | `docs/slices/05-deliveries-and-dispatch-runtime.md` | backend | 5 | Implements deliveries, dispatch actions, and assignment history |
| 06 | `docs/slices/06-lifecycle-and-delivery-events.md` | backend | 6 | Enforces the state machine and emits immutable delivery events |
| 07 | `docs/slices/07-tracking-runtime.md` | backend | 7 | Adds `location_pings` plus tracking writes and reads |
| 08 | `docs/slices/08-incident-runtime.md` | backend | 8 | Adds incidents for failure, return, and cancellation paths |
| 09 | `docs/slices/09-queue-backed-jobs.md` | backend or full-stack | 9 | Adds BullMQ-backed jobs after the delivery core exists |
| 10 | `docs/slices/10-operations-surface.md` | docs-only -> frontend or full-stack | 10 | Decides or scopes admin UI work after the backend slices settle |

## Next agentic actions
| Action | Files | Purpose | Follow-on ownership |
|---|---|---|---|
| 1. Start from the slice packs index | `docs/slices/README.md` | Use the pack queue instead of rebuilding slice scope from the PRD on each turn | docs-only |
| 2. Implement delivery core runtime in order | `docs/slices/04-orders-and-drivers-runtime.md`, `docs/slices/05-deliveries-and-dispatch-runtime.md`, `docs/slices/06-lifecycle-and-delivery-events.md` | Build the delivery core in dependency order against the locked `/api/v1` contract and the now-landed schema | backend |
| 3. Land tracking, incidents, jobs, and UI only after core delivery exists | `docs/slices/07-tracking-runtime.md`, `docs/slices/08-incident-runtime.md`, `docs/slices/09-queue-backed-jobs.md`, `docs/slices/10-operations-surface.md` | Keep the PRD follow-on work bounded and sequenced | backend or full-stack |
