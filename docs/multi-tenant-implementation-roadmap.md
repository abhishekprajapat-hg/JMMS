# JMMS Multi-Tenant SaaS Roadmap

## Phase 1 (Completed in this iteration)
- Added tenant master model (`mandirs`) and `mandirId` migration hooks.
- Added `super_admin` role in RBAC.
- Added tenant helper service for:
  - resolving active tenant context,
  - filtering tenant-scoped records,
  - building tenant-scoped DB projections.
- Added global devotee + multi-mandir affiliation primitives:
  - `devoteeUsers`,
  - `devoteeAffiliations`.
- Added tenant-aware public/user APIs:
  - `/api/public/mandirs`,
  - `/api/public/home`,
  - `/api/public/library`,
  - `/api/user/register`,
  - `/api/user/login`,
  - `/api/user/me`.
- Added super-admin tenant APIs:
  - `/api/tenants/context`,
  - `/api/tenants/mandirs` (list/create/update).
- Tenant scoping applied to core modules:
  - families,
  - transactions,
  - payments,
  - dashboard/reports,
  - events,
  - expenses,
  - inventory,
  - scheduler,
  - approvals,
  - public/user portal routes.

## Phase 2 (Next recommended)
- Mandir-specific config isolation:
  - `whatsappConfig` per tenant,
  - `paymentPortal` per tenant.
- Super-admin tenant onboarding workflow:
  - create mandir,
  - create first trustee/admin for that mandir,
  - seed default categories/settings.
- Devotee affiliation UX:
  - API for “join/follow mandir” from existing login,
  - switch active mandir in session.

## Phase 3
- Centralized Jain calendar engine (`globalCalendarEntries`) with tenant sync.
- Live boli via WebSockets channel per `mandirId`.
- Push-token infrastructure (`deviceTokens`) and FCM delivery service.
- Saadhu Vihar network graph with anticipatory alerts between mandirs.

## API-First Contract Guidance
- Every tenant-scoped endpoint must enforce `mandirId` resolution server-side.
- No client-supplied `mandirId` should bypass user-role tenant boundaries.
- Mobile app should consume the same public/user/admin APIs with no feature forks.
