# Backend/API parity

Updated: 2026-08-15

## Decision

The real backend remains the existing Fastify + TypeScript + TypeORM +
PostgreSQL service. It is not being ported to Python in this slice. WebSocket
delivery also remains on the current Node/Fastify implementation; REST stays
the source of truth and WebSockets only deliver invalidation/message events.

## Contract inventory

The inventory compares the route signatures declared in
`src/app/mocks/handlers.ts` with the Fastify route declarations under
`server/src`:

| Set | Count | Meaning |
| --- | ---: | --- |
| MSW mock routes | 172 | Requests the browser can exercise without a server |
| Fastify routes | 202 | Mock routes plus auth, health, admin, uploads, chat and WebSocket support |
| Missing mock routes | 0 | Every mock request has a real backend route |

The check is executable with `npm run check:api-parity`. It intentionally
allows backend-only routes: those include health/readiness, OpenAPI, auth
callbacks, media attachment reads, provider/admin workflows and the two
WebSocket upgrades. A missing mock route fails the command so adding a new
MSW handler without a real implementation cannot silently pass review.

The only gap found during this audit was `GET /cabinets/all`. It is now
implemented as a flat public catalog of active cabinets and declared in
OpenAPI. The mock uses the same active-only rule; drafts and blocked records
remain owner/admin state and are never exposed through a public catalog.

The 172 mock routes are distributed across these top-level API groups:

| Prefix | Routes | Contract role |
| --- | ---: | --- |
| `/auth` | 22 | Registration, login, refresh, verification, password, OAuth and sessions |
| `/users` | 13 | Profile, vehicles, preferences, data export and deletion |
| `/notifications` | 4 | List, unread count, mark one/read all |
| `/admin` | 28 | Users, providers, reviews, audit, security and incidents |
| `/cabinets` + `/cabinet-images` | 9 | Legacy-compatible catalog and owner cabinet/media contracts |
| `/v1` | 50 | AutoCare discovery, markets, providers, offers, reviews, requests and chats |
| `/owner` | 28 | Provider workspace, locations, services, clients, requests and reviews |
| `/uploads` | 2 | AutoCare image delivery |
| `/super-admin` | 2 | Platform overview and platform review controls |
| `/reviews` | 2 | Cabinet review reads and client review actions |
| `/services` | 5 | Service catalog and owner offer management |
| `/client` | 1 | Experiment event telemetry |
| `/bookings` | 6 | Client bookings, availability and rescheduling |

Counts are generated from the route declarations rather than maintained by
hand; run `npm run check:api-parity` after changing a handler or route.

## What is covered by the real API

- Public automotive markets, location zones, service definitions, providers,
  locations, offers, reviews and discovery filters.
- Provider profiles, logos/gallery assets, service offerings and review media.
- Client service requests, availability, confirmations, estimates and
  request-scoped messages/attachments.
- General provider questions and support/admin escalation chats.
- Client/owner/admin/super-admin authentication and role boundaries.
- Bookings, notifications, platform reviews, audit logs, moderation and health
  endpoints.
- REST and WebSocket contracts for chat delivery; WebSockets are not required
  for deterministic mock-mode tests.

## Local verification modes

### Mock mode (no database)

```bash
npm run dev
```

The default `.env` mode is `VITE_API_MODE=mock`, so MSW serves the same UI
contract without external services.

### Real mode with local PostgreSQL/Redis

Start Docker Desktop first, then:

```bash
npm run server:db:up
npm run server:migrate
npm --prefix server run demo:seed
npm --prefix server run autocare:seed
npm run server:dev
# in a second terminal
npm run dev:real
```

The compose file exposes PostgreSQL on `localhost:5433` and Redis on
`localhost:6379`. `server/.env.example` contains the matching values. The
seed commands are idempotent and provide both stable auth/booking smoke data
and the generated AutoCare provider/review/location catalog.

### Contract and quality checks

```bash
npm run check:api-contract
npm run check:api-parity
npm run quality:backend
npm run test:e2e:real
```

`test:e2e:real` resets and reseeds the demo records, so it should only be run
against the disposable local database. Do not run database reset commands
against a shared or production instance.

## Next backend slices

The endpoint parity work is complete. Timezone-aware provider schedules,
provider memberships, locked overlap checks, attachment quotas/orphan media
cleanup and append-only quote history are now persisted. The next production
slices are reminder/resource-capacity scheduling, PostGIS distance indexes,
durable object storage/quarantine, quote-history moderation/review evidence and
the trust/ranking model. Python migration remains a separate future decision
and must not be started without explicit approval.
