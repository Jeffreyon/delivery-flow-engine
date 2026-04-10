# UI Architecture

## Purpose
- Record current UI runtime truth for the current scaffold.
- Keep reusable guidance in `frontend/docs/DESIGN_SYSTEM.md` and `frontend/intelligence.md`.

## Surfaces
- Public: `/`
- Auth: `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/verify-email`
- User dashboard: `/dashboard`, `/dashboard/workspace`, `/dashboard/account`, `/dashboard/notifications`, `/dashboard/security`
- Admin dashboard: `/admin/dashboard`, `/admin/dashboard/users`, `/admin/dashboard/events`, `/admin/dashboard/roles`

## Route map
| Area | Path | Guard | Shell | Notes |
|---|---|---|---|---|
| Public | `/` | none | none | Placeholder landing surface |
| Auth | `/auth/*` | none | `AuthLayout` | Form flows only |
| User | `/dashboard/*` | `requireAuth` | `DashboardLayout` | Desktop sidebar plus mobile dialog nav |
| Admin | `/admin/dashboard/*` | `adminLoader` | `AdminDashboardLayout` | Separate admin nav with matching mobile fallback |
| Fallback | `*` | none | `ErrorPage` | 404 screen |

## Current UI coverage
| Area | Status | Current state |
|---|---|---|
| Auth flows | Existing | Login, signup, forgot-password, verify-email |
| User account | Existing | Overview, workspace onboarding, invitation join, account, notifications, security |
| Admin operations | Partial | Overview, users, delivery events, roles |
| Settings UI | Missing | Only backend global settings read exists |
| Write-oriented admin forms | Missing | No create or edit workflows for admin entities |

## Shared components and patterns
- Layout shells:
  - `AuthLayout`
  - `DashboardLayout`
  - `AdminDashboardLayout`
- Cross-cutting providers:
  - `ToastProvider`
  - `AppProvider`
- Data layer:
  - route loaders for auth guards
  - page-local `useEffect`
  - service modules under `src/services/*`
- UI primitives:
  - `src/components/ui/*`
  - pages still mix shared primitives and raw HTML controls

## State patterns
- Loading:
  - page-local booleans with inline pulse skeletons
- Empty:
  - dashed or muted bordered cards with short guidance
- Error:
  - auth pages show inline messages plus toast feedback
  - touched overview pages should show explicit fetch-failure cards

## Current visual baseline
- Theme:
  - dark-first neutral workspace baseline from `src/index.css`
  - blue primary accent
  - border-first cards and restrained shadows
- Guidance sources:
  - `frontend/docs/DESIGN_SYSTEM.md`
  - `frontend/docs/MOBBIN_DESIGN_WORKFLOW.md`
  - `frontend/intelligence.md`
  - `brand/BRAND_CONSTRAINTS.md`

## Current state, gap, recommended target
| Current state | Gap | Recommended target |
|---|---|---|
| User and admin dashboard shells are implemented | The mobile fallback should stay aligned across both trees | Keep one dialog-nav pattern instead of diverging early |
| Protected route loaders own auth bootstrap | Public routes do not pre-hydrate auth state | Keep loader-owned bootstrap until a public auth-aware surface needs more |
| Pages mix primitives and raw controls | UI composition is inconsistent | Prefer shared primitives when touching a page |
| Dashboard copy and error handling are improving incrementally | Some secondary routes still need cleanup | Tighten touched pages without broad UI rewrites |

## Recommended BLN-backed UI opportunities
This section is a recommended target, not current runtime truth.

| Surface | Why it fits this repo | Depends on |
|---|---|---|
| BLN connection setup | Turns explicit workspace bootstrap, invitation acceptance, and later tenant assignment into an app-friendly workflow | local BLN context bridge |
| Tenant member and node management | Gives admins a first-party way to assign dashboard users to a tenant and choose which BLN nodes they can act through | implemented `/api/v1/network/users*` backend routes |
| Tenant invitation management | Gives admins a first-party way to invite existing dashboard users into a tenant before opening broader operator tooling | implemented `/api/v1/network/invitations*` backend routes |
| Delivery workspace | Gives operators a useful list and detail view backed by remote BLN deliveries | BLN-backed deliveries facade |
| Delivery timeline and diagnostics | Exposes remote lifecycle, handoff, and SMS transport events in one place | BLN-backed events and handoff facades |
| Handoff inbox and outbox | Surfaces incoming verification work and outgoing custody transfers | Implemented BLN-backed handoff facade |
| Dispute queue | Gives the app a bounded operational workflow above the BLN dispute and resolve routes | Implemented BLN-backed handoff facade |
| Map-backed operations workspace | Adds route, stop, or custody visualization only after the BLN facade is real; `Navigatr` is the current future SDK candidate for this surface | Implemented BLN-backed deliveries and handoff facades plus later ops slice |
| Stalled-work alerts | Reuses existing notifications, dashboard cards, and worker topology for operational awareness | BLN projections and jobs |
