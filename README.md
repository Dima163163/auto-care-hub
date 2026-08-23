# AutoCare Hub

AutoCare Hub is a web-first aggregator for automotive service providers:
workshops, tire services, oil-change services, diagnostics, detailing, car
washes, body repair, painting, air-conditioning work, and related categories.

The product will let drivers search for a standardized service, compare
compatible offers by price, rating, distance, inclusions and availability,
book a visit, or discuss complex work with a provider through a service-specific
messenger with photo attachments and quotes.

Provider participation is free during the initial acquisition phase. Later,
AutoCare Hub will support provider subscriptions, super-admin subscription
grants and subscription promo codes. Providers will also be able to run their
own customer bonus programs.

## Repository status

This repository is currently in a controlled migration from a legacy
cabinet-rental booking product to AutoCare Hub.

- The platform foundation is mature and will be reused.
- The automotive provider/catalog/search/messaging/bonus domain is implemented
  in reviewed vertical slices; the remaining work is to replace legacy
  workspace flows one slice at a time.
- The historical cabinet-rental and booking-payment schema is retained only in
  immutable migration history; it is not mapped, exposed, or executed by the
  AutoCare application.
- Do not present any legacy deployment as the current AutoCare Hub service.
- Do not remove legacy code until the corresponding AutoCare vertical slice and
  tests are accepted.

Read before making changes:

- [`AGENTS.md`](AGENTS.md) — workflow and design lock;
- [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) — compact current handoff;
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — target system and domain boundaries;
- [`PROJECT_PLAN.md`](PROJECT_PLAN.md) — phased delivery roadmap;
- [`SECURITY_CONTEXT.md`](SECURITY_CONTEXT.md) — target security boundaries;
- [`docs/MIGRATION_AUDIT.md`](docs/MIGRATION_AUDIT.md) — current/target inventory;
- [`docs/architecture/domain-model.yaml`](docs/architecture/domain-model.yaml) —
  machine-readable domain map;
- [`docs/architecture/delivery-plan.yaml`](docs/architecture/delivery-plan.yaml) —
  phase dependency/gate map;
- [`docs/architecture/legacy-migration-map.yaml`](docs/architecture/legacy-migration-map.yaml) —
  reuse/replace/delete map.

## Delivery sequence

1. Product/architecture approval.
2. Design system and responsive mocks.
3. Automotive domain and web vertical slices.
4. Stable responsive web pilot/release.
5. Provider subscription activation after the free phase is validated.
6. iOS and Android after the mobile-readiness gate.

## Current technology

### Frontend

- React 19 and TypeScript;
- Next.js App Router as the production web entrypoint, with the existing React
  Router feature tree mounted behind a catch-all route during migration;
- Vite remains available as `dev:vite`/`build:vite` for the PWA fallback and
  compatibility checks;
- Redux Toolkit and RTK Query;
- React Hook Form and Zod;
- Tailwind CSS and Base UI primitives;
- MSW mock mode;
- custom i18n and theme support;
- Vitest, Testing Library and Playwright;
- PWA support.

### Backend

- Fastify and TypeScript;
- PostgreSQL and TypeORM migrations;
- Zod validation;
- Redis-backed distributed rate limiting;
- JWT access tokens and rotating refresh sessions;
- Google/Yandex OAuth foundation;
- transactional outbox, email and notifications;
- media decoding/re-encoding through `sharp`;
- audit logs, security events, health/readiness and metrics;
- Clients arrange payment directly with the selected service; the platform has
  no payment-provider integration.

## Project structure

```text
.
├── src/                       # React application
│   ├── app/                   # bootstrap, routing, layouts, mocks, store
│   │   └── next/              # Next.js client shell and App Router entrypoint
│   ├── pages/                 # route composition
│   ├── widgets/               # large UI sections
│   ├── features/              # user actions/workflows
│   ├── entities/              # frontend domain projections
│   ├── shared/                # API, contracts, config, UI, utilities
│   └── components/ui/         # reusable UI primitives
├── server/
│   └── src/
│       ├── modules/           # Fastify domain/application modules
│       ├── entities/          # TypeORM persistence entities
│       ├── database/          # data source and migrations
│       ├── shared/            # auth, errors, mail, metrics, Redis, security
│       └── routes/            # cross-cutting HTTP routes
├── docs/                      # contracts, runbooks, ADRs and migration docs
├── ARCHITECTURE.md
├── PROJECT_PLAN.md
└── PROJECT_CONTEXT.md
```

The layout will stay a modular monolith. A separate `apps/api` rewrite is not
planned. The future Expo/React Native client will be added only after the shared
versioned API is stable; its exact workspace structure will be decided then.

## Local prerequisites

- Node.js compatible with the checked-in dependencies;
- npm;
- Docker Desktop for local PostgreSQL/Redis integration work;
- Playwright browser only for browser test execution.

Install dependencies:

```bash
npm install
npm --prefix server install
```

Create local environment files:

```bash
cp .env.example .env
cp server/.env.example server/.env
```

The environment examples use the new `autocarehub` database, cookie and
technical namespaces. Existing deployed environments must be migrated with an
explicit session/database rollout; changing production values casually can
invalidate sessions or point at the wrong database/storage.

## Run modes

Frontend mock mode:

```bash
npm run dev
```

Real frontend/backend mode with local PostgreSQL/Redis:

```bash
npm run dev:full
```

Or run components separately:

```bash
npm run server:db:up
npm run server:dev
npm run dev:real
```

Default local URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:4000
Ready:    http://localhost:4000/health/ready
OpenAPI:  http://localhost:4000/openapi.json
```

## Quality gates

Frontend:

```bash
npm run lint
npm run test
npm run build
```

Backend:

```bash
npm --prefix server run build
npm --prefix server run test:unit
```

Full backend/repository checks are available through the scripts in
`package.json`. Integration and real-mode E2E suites require their documented
PostgreSQL, Redis, secrets and browser prerequisites.

Documentation-only changes normally require a complete `git diff` review rather
than runtime tests.

## Git workflow

`main` is the production branch. No direct push, merge, or deployment to
`main` happens without explicit user approval.

All implementation work goes through `dev` and short-lived feature branches:

```text
main  <- production, approval required
  ^
dev   <- integration branch, normal development push target
  ^
feature/<short-task-name>
```

- Keep `dev` based on the latest `main` and push completed work to `origin/dev`.
- Create `feature/*` branches from `dev` for isolated tasks; merge them into
  `dev` after checks pass.
- Preserve unrelated user changes and stage explicit files; never use `git add .`.
- Do not delete files outside `/Users/a1/Desktop/my-projects/AutoCareHub`.

Current repository branches:

```text
main  (production)
dev   (active development)
```

The inherited Git metadata is not active. A recoverable copy is stored
outside this repository at
`/Users/a1/Desktop/my-projects/AutoCareHub/.legacy-git/legacy-booking.git-2026-08-12`.

## Product boundaries

- Platform-controlled service catalog; providers configure offerings.
- Provider organizations and physical locations are distinct.
- Repair booking payments, provider subscriptions and customer bonuses are
  separate bounded contexts.
- The first release does not assume platform commission or split repair
  payments.
- Messages and customer damage photos are private by default.
- Paid subscription status cannot silently influence organic ranking.
- Native apps reuse the backend API and do not own business logic.

## Open decisions

The project owner still needs to confirm launch market/currency/languages,
legacy data retention, repair-payment scope, bonus rules, subscription periods,
message/media retention, provider verification, SEO strategy and the new Git
repository URL. See `PROJECT_PLAN.md` for the full decision register.
