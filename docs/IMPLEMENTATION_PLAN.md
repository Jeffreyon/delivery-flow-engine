# Implementation Plan

## Purpose
- Define the docs-first path from the current Phase 0 scaffold to a credible Delivery Flow Engine roadmap on top of the sibling `logistics-api` BLN backend.
- Keep current scaffold truth, external BLN integration work, and any dormant local delivery-schema plans separate.

## Planning baseline
| Area | Current state | Gap | Recommended target |
|---|---|---|---|
| Plan identity | The live repo is still an auth and admin scaffold, while the PRD targets a delivery app powered by an external delivery network | The earlier queue still leaned toward a local-first delivery runtime | Reframe the active queue around integrating the sibling `logistics-api` BLN surface first |
| External contract | The sibling `logistics-api` now exposes tenant bootstrap, token exchange, deliveries, events, nodes, and handoffs, and Delivery Flow Engine now has a backend-only client layer plus the first local context bridge and remote delivery facade for that contract | No local handoff facade routes consume the bridge yet | Use the current client, context bridge, and remote delivery facade as the only integration seam before implementing more feature routes |
| Local schema | `orders`, `drivers`, `deliveries`, and `assignments` exist locally | Those tables could be mistaken for the next source-of-truth path even though the BLN backend already owns live delivery state | Treat the local delivery schema as dormant until a deliberate projection or augmentation decision is made |
| Validation truth | Frontend checks exist; backend exposes tests only | Later slice prompts could overstate available proof | Keep every later slice honest about the real validation commands |

## Recommended workstreams
| Workstream | Current state | Gap | Recommended target |
|---|---|---|---|
| 1. BLN contract alignment | The PRD names an external delivery API, and the sibling `logistics-api` now supplies it | The active docs and pack queue do not yet map that product boundary clearly | Make the external BLN contract the active planning baseline |
| 2. Client and auth bridge | The backend-only logistics client plus the first local tenant-context bridge now exist | The app still does not expose BLN handoffs through local routes | Reuse the current bridge for the next route families instead of widening auth again |
| 3. BLN-backed app routes | Local `/api/v1/network/*` and `/api/v1/deliveries*` now proxy or compose BLN data | The frontend still has no custody routes or operator UI to call | Build a local facade for handoffs and later UI features on the same boundary |
| 4. Custody feature exposure | The BLN backend already supports handoffs, retries, disputes, resolution, and transport diagnostics | The app exposes none of those differentiators today | Make custody and handoff workflows the first real product features on top of the BLN API |
| 5. Projection and async jobs | Redis plus BullMQ and a worker already exist locally | No BLN projection, alerting, or sync jobs exist yet | Reuse the async baseline later for cached summaries, stalled-handoff alerts, and notifications |
| 6. Dormant local delivery schema | Local delivery tables already exist | They could keep attracting more local-first runtime work | Keep them archived until the app needs business objects or projections the BLN backend does not own |

## Execution rules
- Start from code, config, migrations or bootstrap scripts, then docs.
- Update planning docs first when architecture understanding, slice order, or contract boundaries change.
- Do not invent routes, tables, jobs, or screens that do not exist yet.
- Preserve baseline SQL history and use forward-only migrations when local schema work eventually becomes necessary again.
- Keep later implementation prompts explicit about unavailable backend lint, typecheck, and build scripts.

## Recommended execution order
1. Lock the BLN integration contract and the local app boundary above the sibling `logistics-api`.
2. Add the backend-only logistics client and env contract.
3. Build the handoff and custody facade on top of the implemented local tenant-context bridge and remote delivery facade.
6. Add projection or sync jobs only after the remote facade exists and real product needs justify caching.
7. Revisit the dormant local delivery schema only after the app has a clear augmentation role beyond the BLN source of truth.

## Implementation-ready slice packs
| Pack | File | Type | Run order | Status | Notes |
|---|---|---|---|---|---|
| 01 | `docs/slices/01-async-platform-bootstrap.md` | backend or full-stack | 1 | Implemented | Reusable async baseline for later projection or alert jobs |
| 02 | `docs/slices/02-delivery-api-contract.md` | docs-only | 2 | Archived | Older local-first contract pack; no longer the active queue |
| 03 | `docs/slices/03-foundational-delivery-schema.md` | backend | 3 | Implemented | Local delivery schema foundation; dormant until a projection or augmentation need is explicit |
| 04 | `docs/slices/04-orders-and-drivers-runtime.md` | backend | 4 | Archived | Older local-first runtime pack |
| 05 | `docs/slices/05-deliveries-and-dispatch-runtime.md` | backend | 5 | Archived | Older local-first runtime pack |
| 06 | `docs/slices/06-lifecycle-and-delivery-events.md` | backend | 6 | Archived | Older local-first runtime pack |
| 07 | `docs/slices/07-tracking-runtime.md` | backend | 7 | Archived | Older local-first runtime pack |
| 08 | `docs/slices/08-incident-runtime.md` | backend | 8 | Archived | Older local-first runtime pack |
| 09 | `docs/slices/09-queue-backed-jobs.md` | backend or full-stack | 9 | Archived | Older local-first runtime pack |
| 10 | `docs/slices/10-operations-surface.md` | docs-only -> frontend or full-stack | 10 | Archived | Older local-first UI pack |
| 11 | `docs/slices/11-bln-integration-contract.md` | docs-only -> backend | 11 | Implemented | Locks the BLN integration boundary and active queue |
| 12 | `docs/slices/12-logistics-client-foundation.md` | backend | 12 | Implemented | Adds the backend-only client layer and env contract for `logistics-api` |
| 13 | `docs/slices/13-tenant-context-and-node-bridge.md` | backend | 13 | Implemented | Adds local BLN tenant or node context plus bootstrap and node bridge routes |
| 14 | `docs/slices/14-remote-deliveries-and-events-facade.md` | backend | 14 | Implemented | Adds BLN-backed deliveries and events routes under the local app |
| 15 | `docs/slices/15-handoffs-and-custody-workspace.md` | backend or full-stack | 15 | Planned | Adds handoff, custody, dispute, and diagnostics flows on top of the BLN API |
| 16 | `docs/slices/16-projections-jobs-and-ops-surface.md` | full-stack | 16 | Planned | Adds cached summaries, alerts, and operator UI on top of the BLN-backed routes |

## BLN-backed feature opportunities
| Feature | BLN dependency | Why it belongs in Delivery Flow Engine |
|---|---|---|
| Tenant and node onboarding wizard | tenant bootstrap and node routes | Turns the raw BLN admin surface into an app-friendly setup flow |
| Connected delivery dashboard | remote deliveries and events | Gives operators a useful default view without duplicating delivery ownership locally |
| Delivery detail timeline | remote delivery detail and events | Maps directly to the PRD timeline requirement while staying BLN-backed |
| Handoff inbox and outbox | handoff status, history, verify, retry, initiate | Exposes the custody-transfer differentiator that the BLN backend already supports |
| Dispute and resolution center | dispute, resolve, audit routes | Gives operators a bounded non-happy-path workflow without inventing a second logistics core |
| SMS transport diagnostics | `HANDOFF_PIN_*` events and receipt callbacks | Helps operators understand whether a PIN send failed, was delivered, or needs retry |
| Map-backed operations workspace | BLN deliveries, events, handoffs, and later ops UI | Keeps route or custody visualization in the app layer; `Navigatr` is the current future SDK candidate once the facade is real |
| Stalled delivery and handoff alerts | BLN reads plus local queue jobs | Reuses the existing worker and Redis topology for useful operational automation |
| Workspace overview and notifications | BLN deliveries, events, and handoffs | Lets the app own summaries and user-facing notifications while the BLN backend stays the system of record |

## Next agentic actions
| Action | Files | Purpose | Follow-on ownership |
|---|---|---|---|
| 1. Start from the active BLN integration pack index | `docs/slices/README.md` | Use the new integration queue instead of reviving the archived local-first packs by default | docs-only |
| 2. Land BLN-backed handoff workflows next | `docs/slices/15-handoffs-and-custody-workspace.md` | Build the first real custody features on top of the BLN API and the implemented delivery facade | backend or full-stack |
| 4. Add projections, alerts, and operator UI only after the BLN facade exists | `docs/slices/16-projections-jobs-and-ops-surface.md` | Keep async work and UI expansion bounded and evidence-backed | full-stack |
