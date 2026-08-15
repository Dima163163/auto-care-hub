# Legacy Cabinet Booking -> AutoCare Hub Migration Audit

> Date: 2026-08-12
>
> Scope: read-only repository/product audit before implementation
>
> Target architecture: `../ARCHITECTURE.md`

## Executive conclusion

Starting the whole project again would discard substantial production-oriented
work without solving the main problem. The current stack is compatible with the
AutoCare Hub requirements. The recommended path is to preserve the platform
foundation and replace the legacy domain in reviewed vertical slices.

The supplied `PROJECT_PLAN.md` and `ARCHITECTURE.md` described a greenfield
Next.js/FastAPI/SQLAlchemy/Alembic/PostGIS monorepo. The copied repository is
instead a React/Vite and Fastify/TypeORM project. The historical audit snapshot
contained 67 TypeORM migration files; the current repository contains 93,
hundreds of frontend/backend TypeScript files, existing production checks and
deployed AutoCare Hub assumptions. The greenfield documents were useful for the
AutoCare domain model, but not as executable instructions for this repository.

## Git safety state

- The inherited AutoCare Hub `.git` directory is no longer active.
- It is preserved for recovery at
  `/Users/a1/Desktop/my-projects/AutoCareHub/.legacy-git/legacy-booking.git-2026-08-12`.
- `/Users/a1/Desktop/my-projects/AutoCareHub/autocare-hub` is now maintained on
  the `dev` integration branch; `main` remains production-only and the remote
  is `git@github.com:Dima163163/auto-care-hub.git`.
- A new `origin` must not be added until the product owner supplies and approves
  the new AutoCare Hub repository URL.
- Real `.env.*` files are ignored; `.env.example` templates remain eligible for
  the initial reviewed commit.

## Current stack and maturity

| Area | Current implementation | AutoCare decision |
|---|---|---|
| Web | React 19, Vite, React Router, RTK Query | Reuse |
| UI foundation | Tailwind, Base UI, custom components, responsive layouts | Audit and rebrand |
| Mock mode | MSW with frontend contracts | Reuse and replace fixtures |
| Backend | Fastify + TypeScript modular monolith | Reuse |
| Database | PostgreSQL + TypeORM migrations | Reuse; add geospatial support |
| Validation | Zod plus DB checks | Reuse |
| Auth | Email/password, OAuth, JWT/refresh sessions, CSRF | Reuse/harden per new resources |
| Roles | client/owner/admin/super_admin | Keep platform roles; replace owner boundary with memberships |
| Security | rate limits, headers, sessions, security events | Reuse |
| Async | transactional outbox and worker runtime | Reuse |
| Media | image validation/re-encoding, local cabinet paths | Generalize to public/private object storage |
| Operations | health/readiness, metrics, incidents, backups/runbooks | Reuse and rename/revalidate |
| Tests | Vitest, Testing Library, Playwright, CI checks | Reuse and add AutoCare vertical coverage |
| API contract | OpenAPI foundation and runtime schemas | Version and expand for mobile |
| Payments | booking payments, commission, Stripe Connect | Legacy conflict; quarantine/remove |
| Subscription | old migration existed, then was dropped | Redesign provider-scoped subscriptions |

## Reusable modules/patterns

The following should not be deleted merely because their names or consumers are
currently legacy cabinet-booking-specific:

- authentication, OAuth, session and security-token modules;
- super-admin/admin role safeguards;
- audit logs, security events/mitigations and incident handling;
- CORS/CSRF/Helmet/rate-limit/proxy trust boundaries;
- Redis adapter and background runtime separation;
- transactional outbox, notification and mail delivery semantics;
- health/readiness and bounded metrics;
- cursor pagination and stable error patterns;
- upload decoding/re-encoding/checksum/orphan-cleanup techniques;
- booking idempotency, schedule and concurrency techniques;
- Stripe webhook/reconciliation techniques that can be generalized for later
  provider subscription billing without retaining repair commissions.

## Legacy domain to replace

| Legacy concept/path family | Target concept | Migration note |
|---|---|---|
| `CabinetEntity`, cabinet routes/pages | `ServiceProvider` + `ServiceLocation` | Not a mechanical rename |
| Provider-owned free-text `ServiceEntity` | `ServiceDefinition` + `ServiceOffering` | Platform canonical catalog required |
| `pricePerHour` | automotive offering price types | Fixed/from/range/quote rules |
| global `owner` authorization | `ProviderMembership` permissions | Supports teams/multi-location/multi-provider |
| cabinet city/address filter | geospatial offering search | Requires coordinates and spatial index |
| cabinet booking snapshot | automotive offer/quote snapshot | Preserve inclusions, vehicle and policy |
| favorite cabinet | favorite provider/location/offering | Product decision per UI |
| cabinet gallery storage | provider/location public media | Separate from private inquiry media |
| booking payment/commission | no initial repair payment context | Remove after new booking path |
| Stripe Connect payout | provider subscription billing later | Different payer/payee/state model |

## Why not rewrite the backend

A rewrite would need to recreate:

- authentication and session hardening;
- authorization and super-admin controls;
- migrations, error handling and validation conventions;
- outbox/notifications/email;
- rate limits, metrics, readiness and incident tooling;
- upload hardening;
- testing/CI/deployment/runbooks.

Those capabilities are independent of the legacy rental domain and are directly useful to
AutoCare Hub. Replacing only the business domain has lower risk and allows each
customer/provider journey to remain testable.

## Why legacy code may still be deleted later

Keeping two domains forever would create confusing contracts and security debt.
After a new AutoCare vertical slice covers the same operational need, exact
legacy files should be removed. The user has authorized deletion inside the
AutoCare Hub workspace as needed, but deletion must still be:

- scoped to resolved paths;
- preceded by a replacement and tests;
- reviewed in the local diff;
- accompanied by a data/migration/rollback statement;
- performed without touching paths outside the workspace.

## Database recommendation

Recommended: create a fresh AutoCare database for the new product and do not
import AutoCare Hub cabinet/payment fixtures. This avoids pretending that cabinet
records map safely to workshops, locations and standardized offerings.

Before executing that approach, confirm that no old users/bookings must be
preserved. If preservation is required, create a dedicated mapping, data-quality
and reconciliation plan. Never drop legacy tables on an unknown deployed
database based solely on this audit.

## Frontend/design assessment

The supplied references give a coherent desktop information architecture:

- service/location-first homepage search;
- synchronized list/map results;
- comparable cards and shortlist;
- detailed location profile;
- booking wizard;
- customer request history.

They do not yet specify:

- narrow mobile/tablet composition;
- complete side-by-side comparison;
- vehicle garage;
- inquiry/chat/photo/quote flow;
- provider onboarding/workspace/inbox/quote composer;
- bonus program and ledger;
- super-admin subscription grants/promo codes;
- loading, empty, error, offline, permission and suspension states;
- evidence/policy behind badges, discounts, partner logos and claims.

Production visual code remains locked until the required proposal and three
explicit confirmations in `AGENTS.md` are complete.

## Documentation classification during migration

### Current source of truth

- `../AGENTS.md`
- `../PROJECT_CONTEXT.md`
- `../ARCHITECTURE.md`
- `../PROJECT_PLAN.md`
- this audit;
- new ADRs under `docs/adr`.
- machine-readable maps under `docs/architecture`.

### Operationally useful but legacy-derived until revalidated

- `API_CONTRACT.md`;
- `CUSTOMER_HANDOFF.md`;
- `PRODUCTION_READINESS.md`;
- `RELEASE_CHECKLIST.md`;
- payment/financial retention documents;
- map/provider configuration documents;
- current design approvals/proposals;
- `server/README.md`;
- current `.env.example` values and deployment names.

Do not silently rewrite those files to describe endpoints or infrastructure
that the code does not implement. Update each document with the vertical slice
that changes the corresponding runtime behavior.

## Immediate next action

Apply migrations through `178595` in the disposable Docker PostgreSQL instance,
run `npm run check:autocare-integrity`, repair any existing mismatches, and
validate the `NOT VALID` aggregate constraints. Then add the AutoCare-specific
database integration cases to CI before enabling a pilot. No legacy deletion or
Python backend rewrite is authorized in this phase.
