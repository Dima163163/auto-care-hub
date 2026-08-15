# AutoCare Hub API Contract

This document is the human-readable contract shared by the Fastify backend,
the React real API client, and the MSW mock handlers. All paths below are
relative to the configured API base URL and include the `/api` prefix when the
frontend uses the Vite same-origin proxy.

The machine-readable foundation is available at `GET /openapi.json`. It covers
the shared error/cursor schemas and the main health, catalog, booking,
notification, admin collection, account-deletion, and privacy routes; automated real/mock parity
checks run with `npm run check:api-contract`. The checker validates backend and
OpenAPI route/method coverage, keeps privacy routes owned by the users module,
and `npm run check:openapi-shape` validates the required OpenAPI metadata,
security scheme, schemas, and operation IDs.

## Response envelope

Successful responses return the resource or collection described by the route.
Errors use this stable shape:

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "A human-readable fallback message.",
  "requestId": "request-id-from-response"
}
```

Validation errors additionally return `details`, with field-level Zod issues.
The frontend translates known `code` values first and uses `message` only as a
fallback. Current codes are:

`VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_SERVER_ERROR`, `BAD_REQUEST`,
`UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `OAUTH_IDENTITY_NOT_LINKED`,
`OAUTH_IDENTITY_ALREADY_LINKED`,
`OAUTH_LAST_LOGIN_METHOD`,
`TOO_MANY_REQUESTS`,
`CSRF_ORIGIN_MISMATCH`, `CSRF_TOKEN_MISMATCH`, `CABINET_IMAGE_TOO_LARGE`,
`CABINET_IMAGE_UNSUPPORTED_TYPE`, `CABINET_IMAGE_INVALID_CONTENT`,
`CABINET_IMAGE_INVALID_FILE_NAME`, `REVIEW_STORAGE_NOT_READY`, and
`EMAIL_VERIFICATION_REQUIRED`.

The authenticated `POST /client/experiment-events` endpoint accepts only the
allow-listed `book_again_clicked`, `preference_shortcut_used`,
`preference_shortcut_reset`, `catalog_filter_used`, `catalog_filter_reset`,
`catalog_search_to_detail`, `catalog_search_to_book`, and
`catalog_no_results` events. The catalog events measure an aggregate discovery
funnel and a no-results frustration signal before personalization is expanded.
It returns `{ "accepted": true }`, never accepts user, booking, cabinet,
provider, query, or free-form labels, and is protected by CSRF, client
authorization, no-store responses, and a bounded rate limit.
Successful Book again booking creation is counted server-side from the bounded
`experiment: "book_again"` request field plus its source booking id. The source
must belong to the authenticated client, match the requested cabinet/service,
and have `completed` or `cancelled` status; the old slot and payment are never
reused.

The super-admin-only `GET /admin/payments/attention` endpoint returns only
bounded counts for failed payments, open disputes, and disputes where funds
were withdrawn. It uses `no-store`, has OpenAPI/MSW/runtime-schema parity, and
does not return Stripe identifiers, payment payloads, customer data, or
provider error text.

Every response includes `X-Request-Id`. A caller may provide a request ID made
of letters, digits, `_`, and `-` with a length from 8 to 128 characters.

Collection endpoints preserve their legacy array response when no pagination
query is provided. Supplying `limit` or an opaque `cursor` opts into the
bounded cursor contract:

```json
{
  "items": [],
  "nextCursor": "base64url-cursor-or-null"
}
```

The cursor is tied to the endpoint's stable sort and must be passed back
unchanged. Bookings support `status`, `fromDate`, and `toDate`; notifications
support `read` and `category`. Admin users support `search`, `role`, and
`status`; admin payments support `search` and `status`; audit logs support
`action`, `targetType`, and `actorId`; system incidents support `search`,
`type`, `severity`, and `status`. Limits are positive integers capped at 100.

Security-sensitive server records use the resolved client IP. Forwarded client
IP headers are ignored unless the backend deployment explicitly configures a
trusted proxy CIDR allowlist and hop limit; callers cannot opt into that trust
through request headers.

Sensitive endpoint rate limits use independent normalized buckets: public
email-based auth combines client IP and a keyed email digest, while
authenticated mutations combine client IP and a keyed user digest. This keeps
NAT-shared clients from bypassing account limits and prevents one account from
exhausting the limit for every client behind the same address.

Rate-limited responses expose `RateLimit-Limit`, `RateLimit-Remaining`,
`RateLimit-Reset`, and `Retry-After` headers. Limit configuration is validated
at startup and rejects non-positive windows, limits, or empty scopes.

Browser CORS is credentialed and restricted to the explicit `CORS_ORIGINS`
allowlist. Wildcard origins are not used. Preflight requests allow
`Content-Type`, `Authorization`, `X-CSRF-Token`, and `Idempotency-Key`.

## Authentication and CSRF

Cookie-authenticated mutations require:

1. `GET /auth/csrf` to receive the CSRF cookie and token;
2. the CSRF cookie on the request;
3. the same value in `X-CSRF-Token`;
4. an allowed `Origin` or `Referer`.

The refresh token is an `httpOnly` cookie. Access tokens are returned by login,
registration, and refresh. OAuth completion sets the refresh cookie and
redirects to a clean frontend callback URL; the frontend obtains the in-memory
access token through the protected refresh flow. The frontend must send cookies
with credentials for cookie-authenticated requests.

## Route groups

### Auth

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/auth/csrf` | public | Creates or returns the CSRF handshake. |
| POST | `/auth/register` | public | Creates a client or owner and starts email verification. |
| POST | `/auth/login` | public | Returns access token and refresh cookie. |
| POST | `/auth/logout` | authenticated | Revokes the current session when available. |
| POST | `/auth/refresh` | refresh cookie | Rotates the access token for the current session. |
| GET | `/auth/me` | authenticated | Returns the public current-user projection. |
| GET | `/auth/sessions` | authenticated | Lists the user's active sessions. |
| DELETE | `/auth/sessions/:id` | authenticated | Revokes one owned session. |
| POST | `/auth/sessions/revoke-all` | authenticated | Revokes all sessions and increments token version. |
| POST | `/admin/security-center/users/:id/revoke-sessions` | super-admin | Revokes all sessions for an investigated user, increments token version, returns `no-store`, and writes an audit event. |
| POST | `/auth/change-password` | authenticated | Changes password and invalidates sessions. |
| POST | `/auth/password/reset/request` | public | Always returns a neutral success response. |
| POST | `/auth/password/reset/verify` | public | Validates a one-time reset token. |
| POST | `/auth/password/reset/complete` | public | Completes reset and invalidates sessions. |
| POST | `/auth/email-verification/request` | authenticated | Sends a new verification token. |
| POST | `/auth/email-verification/verify` | public | Validates a verification token. |
| POST | `/auth/email-verification/complete` | public | Completes email verification. |

### OAuth

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/auth/oauth/:provider/url` | public | Creates a provider-bound one-time state cookie and authorization URL. |
| GET | `/auth/oauth/identities` | authenticated | Returns provider connection status without exposing provider subjects. |
| POST | `/auth/oauth/:provider/link/start` | authenticated + CSRF | Starts a short-lived re-verification flow for linking the selected provider to the current user. |
| POST | `/auth/oauth/:provider/unlink/start` | authenticated + CSRF | Starts a provider re-verification flow for unlinking one identity; the last available login method is protected. |
| GET | `/auth/oauth/:provider/callback` | provider callback | Requires the matching state cookie; creates a new user identity or signs in an already-linked identity. An existing email account is never linked implicitly. |

### Legacy catalog and client (migration-only)

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/cabinets` | public | Search, filters, availability preview, pagination. |
| GET | `/cabinets/:id` | public | Active cabinet details. |
| GET | `/cabinets/:id/reviews` | public | Approved public reviews. |
| GET | `/services?cabinetId=...` | public/authenticated | Services for a cabinet. |
| GET | `/bookings/occupied` | authenticated | Occupied slots for booking UI. |
| POST | `/bookings` | verified client | Creates a booking after availability checks. Accepts an optional validated `Idempotency-Key` for retry-safe creation. |
| GET | `/bookings/my` | authenticated client | Lists own bookings; cursor mode supports `status`, `fromDate`, and `toDate`. |
| PATCH | `/bookings/:id/cancel` | booking owner | Cancels an allowed booking. |
| GET | `/bookings/:id/history` | booking participant/owner | Returns status history. |
| POST | `/bookings/:id/reschedule` | booking participant/owner | Creates a reschedule request. |
| POST | `/cabinets/:id/reviews` | eligible client | Creates an eligible review. |
| GET | `/cabinets/:id/reviews/my` | authenticated client | Lists own reviews for a cabinet. |

### AutoCare discovery and provider profiles (target `/api/v1`)

The browser mock currently uses `/services` and `/services/:id`; the backend
implementation must expose the versioned equivalents below and keep the
legacy cabinet routes isolated during migration.

The first discovery/profile implementation is now available at the backend
`/v1/*` routes and is exposed to browsers as `/api/v1/*` by the local proxy and
deployment rewrites. The frontend uses the same typed RTK Query contract in
mock and real modes.

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/api/v1/markets` | public | Country, region, city center, currency, timezone, and available UI locales. |
| GET | `/api/v1/markets/:marketId/zones` | public | Localized district/neighborhood/service-area hierarchy with parent traversal, active service counts, images, radius and optional nearest-coordinate ordering. |
| GET | `/api/v1/service-definitions` | public | Moderated major/minor service catalog with comparison schema. |
| GET | `/api/v1/fair-price` | public | Fair-price benchmark by service, market and optional vehicle context; includes methodology and disclaimer. |
| GET | `/api/v1/vehicle-catalog` | public | Versioned makes, models, production years and engine options; optional `brandId` narrows the response. The checked-in MVP catalog is normalized to the official NHTSA vPIC schema; a scheduled production importer is still required for full market coverage. |
| GET | `/api/v1/reviews/featured` | public | Approved homepage reviews with rating, vehicle, avatar and publication date; optional `limit` up to 12. |
| GET | `/api/v1/discovery/providers` | public | Service/location/radius/vehicle filters, sort, cursor, map projection. |
| GET | `/api/v1/providers/:providerId` | public | Provider profile, locations, trust status, offerings, bonuses, review summary, `logoUrl`, `coverImageUrl`, and `galleryImageUrls`. |
| GET | `/api/v1/providers/:providerId/trust` | public | Trust score, badge and auditable evidence items used for ranking explanations. |
| POST | `/api/owner/autocare-providers` | verified owner | Creates a draft service point with profile, contact, warranty, brand, amenity and media references. |
| POST | `/api/owner/autocare-providers/logo` | verified owner | Validates and stores a provider logo as a normalized WebP asset. |
| POST | `/api/owner/autocare-providers/media` | verified owner | Stores a normalized WebP cover or gallery image; `kind` is `cover` or `gallery`. |
| GET | `/api/uploads/autocare/logos/:fileName` | public | Serves a normalized provider logo referenced by `logoUrl`; missing files return `404`. |
| GET | `/api/uploads/autocare/media/:kind/:fileName` | public | Serves a normalized provider cover/gallery image referenced by the provider profile. |
| GET | `/api/v1/providers/:providerId/offers` | public | Price type, range/from price, duration, inclusions, warranty, availability preview. |
| GET | `/api/v1/providers/:providerId/reviews` | public | Approved reviews with service context and pagination. |
| POST | `/api/v1/service-requests` | authenticated client | Creates a service-scoped inquiry; requires participant authorization and idempotency. |
| POST | `/api/v1/service-requests/:requestId/attachments` | request participant | Private JPEG/PNG/WebP damage photos with bounded size/count and malware scanning. |
| POST | `/api/v1/service-requests/:requestId/confirmations/client` | request client | Customer confirms appointment/quote terms. |
| POST | `/api/v1/service-requests/:requestId/confirmations/provider` | provider membership | Provider confirms work/quote; only both confirmations activate the booking. |
| GET | `/api/v1/service-requests/:requestId/messages` | request participant | Cursor-paginated private thread, no public provider chat. |
| POST | `/api/v1/service-requests/:requestId/messages` | request participant | Durable text message with optional attachment references. |
| GET | `/api/v1/service-requests/:requestId/timeline` | request participant | Repair timeline with request, quote and confirmation events. |
| POST | `/api/v1/broadcast-requests` | authenticated client | Sends one issue and vehicle/photo context to multiple eligible providers for comparable offers. |
| GET | `/api/v1/broadcast-requests/my` | authenticated client | Lists the client's multi-provider requests and received offers. |
| GET | `/api/v1/broadcast-requests/:broadcastId` | participant/admin | Returns a broadcast request and normalized provider offers. |
| GET | `/api/owner/broadcast-requests` | verified owner | Lists open broadcast requests matching the owner's published service catalog. |
| POST | `/api/owner/broadcast-requests/:broadcastId/offers` | verified owner | Publishes a structured provider offer with price, duration and validity. |
| POST | `/api/v1/guarantee-claims` | authenticated client | Opens a post-visit AutoCare guarantee claim with evidence links. |
| GET | `/api/v1/guarantee-claims/my` | authenticated client | Lists guarantee claims and their resolution status. |
| POST | `/api/v1/expert-questions` | authenticated client | Sends a guided symptom/vehicle question to the expert queue. |
| GET | `/api/v1/expert-questions/my` | authenticated client | Lists expert questions and answers. |
| GET | `/api/owner/fleets` | verified owner | Lists fleet accounts and their vehicles for partner/fleet workflows. |
| POST | `/api/owner/fleets` | verified owner | Creates a fleet account with optional approval notes. |
| POST | `/api/owner/fleets/:fleetId/vehicles` | verified owner | Adds a vehicle and approval policy to an owned fleet. |

The first browser slice intentionally does not collect repair payment. Payment
status, if needed for a provider’s own workflow, is a provider-side note and
never a platform checkout or commission ledger.

Provider image policy: mock and seed data may reference generated WebP assets
under `/images/autocare/providers/`. The backend resolves missing or invalid
paths to `/images/autocare/placeholders/provider.svg`; clients must also keep a
runtime image fallback for deleted or failed assets. Image URLs are public
presentation data only and never a verification signal.

### Owner

| Method | Path | Access |
| --- | --- | --- |
| GET | `/owner/cabinets` | owner |
| GET | `/owner/cabinets/:id` | cabinet owner |
| POST | `/cabinets` | owner |
| PATCH | `/cabinets/:id` | cabinet owner |
| DELETE | `/cabinets/:id` | cabinet owner |
| POST | `/cabinet-images` | cabinet owner |
| GET | `/owner/services` | owner |
| POST | `/services` | owner |
| PATCH | `/services/:id` | service owner |
| PATCH | `/services/:id/status` | service owner |
| DELETE | `/services/:id` | service owner |
| GET | `/owner/bookings` | owner | Cursor mode supports `status`, `fromDate`, and `toDate`; each booking includes an owner-safe `paymentLedger` with gross, commission, owner payout, refund, remaining balance, currency, status, and creation time when a payment exists. Stripe provider identifiers are never returned. |
| POST | `/owner/bookings` | owner |
| PATCH | `/bookings/:id/status` | cabinet owner |
| GET | `/owner/clients` | owner |

### Admin, notifications, favorites, and payments

| Method | Path | Access |
| --- | --- | --- |
| GET | `/admin/users` | admin | Cursor mode supports `search`, `role`, and `status`. |
| PATCH | `/admin/users/:id/status` | admin/super-admin rules apply |
| PATCH | `/admin/users/:id/role` | super-admin |
| POST | `/admin/admins` | super-admin |
| GET | `/admin/cabinets` | admin |
| PATCH | `/admin/cabinets/:id/status` | admin |
| GET | `/admin/payments` | admin | Cursor mode supports `search` and `status`. |
| POST | `/admin/payments/:id/refund` | super-admin | Financial refund mutation; amount/reason are bounded and the payment transition writes an idempotent audit record. |
| GET | `/bookings/:id/payment/status` | client booking owner | Returns server-calculated payment balance and a provider-free receipt summary. |
| GET | `/admin/payments/:id/refunds` | admin | Returns at most 100 auditable refund ledger records in creation order. |
| PATCH | `/admin/security-center/mitigations/:id` | super admin | Extends an active temporary mitigation within the 24-hour recovery window; response is `no-store`. |
| GET | `/admin/payments/:id/disputes` | admin | Returns at most 100 retained Stripe dispute records in event order; response is `no-store`. |
| GET | `/admin/reviews` | admin |
| PATCH | `/admin/reviews/:id/status` | admin |
| GET | `/admin/audit-logs` | admin | Cursor mode supports `action`, `targetType`, and `actorId`. |
| GET | `/admin/audit-logs/export` | admin | CSV export; filters match audit list and the request is capped at 10,000 rows. |
| GET | `/admin/system-incidents` | super-admin | Cursor mode supports `search`, `type`, `severity`, and `status`. |
| PATCH | `/admin/system-incidents/:id/status` | super-admin |
| GET | `/admin/outbox/health` | admin | Returns bounded delivery-status counts and sanitized failed-event metadata; operator summaries should render aggregate counters only. |
| GET | `/admin/account-deletion-requests` | super-admin | Bounded list of deletion requests; cursor mode supports `status`. |
| PATCH | `/admin/account-deletion-requests/:id/status` | super-admin | Moves a pending request to `cancelled` or `completed`; does not delete data automatically. |
| GET | `/notifications` | authenticated | Cursor mode supports `read` and `category`. |
| GET | `/notifications/unread-count` | authenticated |
| PATCH | `/notifications/:id/read` | notification owner |
| PATCH | `/notifications/read-all` | authenticated |
| GET | `/users/me/favorites` | authenticated |
| POST | `/users/me/favorites/sync` | authenticated |
| POST | `/users/me/favorites/:cabinetId` | authenticated |
| DELETE | `/users/me/favorites/:cabinetId` | authenticated |

AutoCare provider favorites are separate from the legacy cabinet collection:

| GET | `/v1/favorites/providers` | authenticated client |
| POST | `/v1/favorites/providers/sync` | authenticated client |
| POST | `/v1/favorites/providers/:providerId` | authenticated client |
| DELETE | `/v1/favorites/providers/:providerId` | authenticated client |
| PATCH | `/users/me/preferences` | authenticated |
| GET | `/users/me/export` | authenticated | Rate-limited JSON export of the caller's own data; response is `no-store`. |
| POST | `/users/me/deletion-request` | authenticated | Creates or returns one pending deletion request; does not delete data. |
| GET | `/users/me/deletion-request` | authenticated | Returns the caller's pending deletion request or `null`. |
| DELETE | `/users/me/deletion-request` | authenticated | Cancels the caller's pending deletion request. |
| POST | `/bookings/:id/payment/checkout` | verified client | Accepts an optional validated `Idempotency-Key`; returns `{ url, attemptId, reused }` and reuses the active Checkout attempt on retries. |
| POST | `/webhooks/stripe` | Stripe signature | Processed duplicates return `200`; an active concurrent delivery returns `409` with `Retry-After` while a five-minute processing lease is held. |

`PATCH /users/me/preferences` accepts optional `emailNotifications`,
`bookingEmailNotifications`, `preferredCity`, and `preferredCategories` fields.
The booking email preference is evaluated together with the global email
master switch; account and security emails are not disabled by it.

## Mock parity

When a frontend feature changes an API request or response, update the real
route, the typed RTK Query endpoint, and the matching MSW handler in the same
change. Add a focused test for a new code or field when it affects an error,
permission, booking, payment, or security flow. The mock is for UI feedback
and local development; it is not a substitute for backend authorization or
database integration tests.

## Verification commands

```bash
npm run lint
npm run check:api-contract
npm run check:openapi-shape
npm run test:migration-check
npm --prefix server run check:migrations
npm --prefix server run test:unit
npm test
npm run build
npm --prefix server run build
npm --prefix server test
npm run test:e2e
```

The backend integration and real-mode tests require PostgreSQL and Redis. A
machine-readable OpenAPI document and generated client remain a follow-up
improvement; this file is the current reviewable contract baseline.
