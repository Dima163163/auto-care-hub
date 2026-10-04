# AutoCare responsibility map

N11 keeps the public service exports and HTTP/DTO contracts stable. The three
service entry points are compatibility facades; their exported names lead to
the concrete use case. Helpers are imported directly from their owning module.

| Workflow | Owning modules | Boundary retained |
| --- | --- | --- |
| Create/read a request | `request-create.service`, `request-read.service` | Atomic creation, idempotency and participant access |
| Conversation/offers | `request-conversation.service`, `request-attachment.service` | Scoped access, message idempotency and private objects |
| Quote | `request-quote.service` | Quote acceptance, capacity, booking snapshot and bonuses stay in one original transaction |
| Scheduling | `request-availability.service`, `request-reschedule.service`, `request-transition.service` | Capacity locks, expiry and status transitions |
| Request helpers | `request-access.service`, `request-response`, `request-snapshots`, `request-idempotency`, `request-effects.service`, `request-errors` | Explicit authorization, mapping and effects |
| Public discovery | `catalog-read.service`, `public-market-access.service`, `provider-discovery.service`, `discovery-geo` | Launch-ready markets, bounds, ordering and public profile access |
| Provider management | `provider-create.service`, `provider-workspace.service`, `provider-resources.service`, `provider-media.service`, `provider-read.service`, `provider-guards` | Provider/location membership and storage boundaries |
| Reviews | `provider-review-read-model.service`, `provider-reviews-read.service`, `provider-reviews-write.service`, `provider-review-promo.service` | SQL location scope, verified review uniqueness and one-time edit authorization |
| Chat | `chat-read.service`, `chat-thread.service`, `chat-messaging.service`, `chat-attachment.service` | Bounded reads, participant access, locks and private attachments |
| Chat moderation | `chat-report.service`, `chat-moderator-assignment.service`, `chat-block.service` | Report evidence, scoped assignment, access expiry and sanctions |
| Chat helpers | `chat-access.service`, `chat-response`, `chat-moderation-response`, `chat-idempotency`, `chat-errors` | Shared explicit authorization and DTO policies |

Examples: `createAutoCareServiceRequest` now resolves to
`request-create.service.ts`; `acceptAutoCareServiceQuote` resolves to
`request-quote.service.ts`; `getAutoCareDiscovery` resolves to
`provider-discovery.service.ts`; `decideAdminAutoCareChatReport` resolves to
`chat-report.service.ts`. Route validation and public imports remain compatible.

## Frontend API

`src/entities/automotive-service/api/autocare/` owns domain `types`, `schemas`
and endpoint factories: catalog, providers, requests, chat, workspace,
resources, reviews, bonuses, governance and marketplace. Type-only schema
imports avoid introducing initialization cycles. `autocareApi.ts` registers
all 136 endpoints **once** and exposes the original hooks, DTOs and schemas.
Query arguments, transforms, cache tags and mutations are unchanged.

## Mock HTTP workflows

`src/app/mocks/autocare/*.handlers.ts` owns 18 route families. HTTP callbacks
import focused access, availability, chat, review, bonus and other helpers.
`mock-fixtures.ts` owns the single initialized synthetic state: arrays and maps
are shared by reference. Fixture construction retains its original order.
The private community profile ID counter is exposed through an allocator so
both callers mutate the same counter without assigning to an imported binding.

The `handlers.ts` facade orders handlers by their original registration ordinal,
preserving literal/dynamic-route precedence for all 244 handlers. Contract
checkers read the registered modules; the route snapshot is unchanged. A
regression verifies that modular route drift is detected and unregistered
files do not contribute to the contract.

This refactor changes responsibility ownership, not product visuals, API paths,
database schema, encryption format or transaction boundaries. Existing unit,
PostgreSQL and browser scenarios are the behavior acceptance criteria.
