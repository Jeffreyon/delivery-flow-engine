# UI Architecture

## Purpose
- Record current UI runtime truth for the current scaffold.
- Keep reusable guidance in `frontend/docs/DESIGN_SYSTEM.md` and `frontend/intelligence.md`.

## Surfaces
- Public: `/`
- Auth: `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/verify-email`
- User dashboard: `/dashboard`, `/dashboard/account`, `/dashboard/notifications`, `/dashboard/security`
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
| User account | Existing | Overview, account, notifications, security |
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
