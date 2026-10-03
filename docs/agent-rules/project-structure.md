# Project Structure

AutoCare Hub is an automotive service marketplace with provider workspaces.
The inherited cabinet-booking modules are compatibility code, not a new scope.

Frontend: Next.js App Router 16 production/SSR, React and TypeScript, RTK Query,
custom i18n, Tailwind/Base UI, Lucide, MSW synthetic fixtures, Vitest and Playwright.
Vite remains a compatibility/development test build, not the production release.
Backend: TypeScript Fastify modular monolith, PostgreSQL/TypeORM, Zod, JWT sessions,
Redis and an outbox/job worker. No parallel apps/api rewrite is planned.

- Frontend root: `.`; API: `server`.
- App Router: `src/app/**/*.page.tsx` and `*.route.ts`; Next client shell: `src/app/next`.
- Feature-Sliced layers: `src/pages`, `src/widgets`, `src/features`, `src/entities`, `src/shared`.
- UI primitives: `src/components/ui`; mock API: `src/app/mocks`; assets: `public`.
- Backend application modules: `server/src/modules`; ORM entities: `server/src/entities`;
  migrations/data source: `server/src/database`; security/http/observability: `server/src/shared`.
- Contracts/runbooks/audits: `docs`; current architecture: ARCHITECTURE.md;
  current pilot scope: docs/operations/PILOT_SCOPE_FREEZE.md.

Read bundled Next documentation before editing Next code. Use the build selected
by NEXT_DIST_DIR for production checks; keep mock and real artifacts isolated.
