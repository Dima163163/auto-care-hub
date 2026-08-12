# Legacy cabinet-booking Frontend Baseline Review

Last reviewed: 2026-08-09

## Status

Frontend MVP is integrated with the real backend mode and retains mock mode for
local UI development and contract tests.

This file is a historical inventory for migration. It is not the AutoCare Hub
page/design specification; use `ARCHITECTURE.md` and `PROJECT_PLAN.md` for the
target product.

## Completed scope

### Public
- Landing page
- Cabinets list
- Cabinet details
- Login/register
- Mock Google/Yandex auth

### Client
- Profile page
- Client bookings page
- Create booking from cabinet details
- Cancel own booking
- Booking grouping by status
- Booking summary cards

### Owner
- Owner dashboard
- Cabinets list
- Create/edit/delete cabinet
- Services list
- Create/edit/delete service
- Change service active status
- Owner bookings page
- Create booking manually
- Change booking status
- Booking grouping by status
- Booking summary cards

### Admin
- Admin dashboard
- Users list
- Change user status
- Cabinets list
- Change cabinet status

### Cross-cutting
- React Router route protection
- RTK Query API layer
- Real backend mode with runtime response validation at critical API boundaries
- RTK Query cache invalidation
- MSW mock API
- Base i18n layer
- LanguageSwitcher
- Route-level code splitting
- Shared ConfirmDialog
- Shared StateCard
- Shared PageHeader
- Base unit tests with Vitest
- PWA update safety, anonymous catalog caching, and offline-read coverage

## Known frontend debt

- Not all UI strings are translated yet.
- Zod validation messages are still mostly hardcoded.
- Toast messages are still mostly hardcoded.
- MSW error messages are not translated.
- Dashboard pages are basic and can be improved later.
- Calendar view is intentionally postponed.
- Full accessibility audit is not completed yet.
- Full test coverage is not completed yet.
- Component tests are not added yet.
- E2E tests are not added yet.
- External-provider OAuth exchange and delivery evidence still require
  deployment-specific credentials and provider smoke tests.
- Production mail, payment, map, and object-storage provider verification remain
  release gates even though their frontend contracts are wired.

## Historical backend block candidates

The following list records the original MVP integration backlog. The current
branch already contains these foundations; remaining provider verification and
production-readiness work is tracked in `PROJECT_PLAN.md`.

- Fastify backend setup
- PostgreSQL setup
- TypeORM entities
- Auth module
- Refresh token with httpOnly cookie
- Access token handling
- Real Google OAuth
- Real Yandex OAuth
- Cabinets CRUD
- Services CRUD
- Bookings CRUD
- Admin endpoints
- Request validation
- Error response format
- Frontend switch from MSW to real API
