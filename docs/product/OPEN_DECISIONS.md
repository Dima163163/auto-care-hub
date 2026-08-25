# AutoCare Hub — Open Product Decisions

> Updated: 2026-08-22
>
> Rule: decisions affecting money, privacy, ranking, legal behavior, schema or
> destructive migration must be approved explicitly.

## D-001 Launch market

Status: decided in product-owner reply on 2026-08-12.

Decision:

- launch coverage includes Russia (starting with a million-plus city), Spain,
  and Moldova/Transnistria;
- countries and cities are data-driven so new markets can be added without a
  code rewrite;
- country, city, location and user interface locale remain separate concepts;
- local currency/display rules resolve from the service location and user
  preference.
- the location product is a full hierarchy (country → region → city →
  district/service area), backed by market and zone entities rather than a
  fixed list of launch-city labels; new markets and localized zones are added
  through data and moderation workflows.

Need:

- exact pilot city/region and initial provider onboarding scope;
- launch tax/VAT display rules;
- legal address formats and provider verification rules;
- platform legal entity/jurisdiction.

Remaining detail: choose the first concrete Russian city and initial pilot
locations in Spain and Moldova/Transnistria.

Why it matters: maps/geocoding, price formatting, provider verification,
privacy, subscription billing and app-store availability depend on it.

## D-002 Legacy data

Question: must any legacy users, cabinets, bookings, reviews or financial
records be preserved?

Decision: start AutoCare with a fresh database while preserving reusable code
and the archived legacy Git history outside the active repository.

## D-003 Repair payment scope

Status: decided in product-owner reply on 2026-08-12.

Decision: in the first release the customer does not pay AutoCare Hub for the
repair. The service confirmation is two-sided: the provider confirms the work
or quote and the customer confirms the appointment and terms.

Scope boundary: providers collect repair payment directly. AutoCare Hub
facilitates discovery, messaging, confirmation, and booking status; provider
subscriptions are a separate future billing product.

## D-004 Booking modes

Status: product baseline resolved on 2026-08-22; remaining work is delivery of
the API/UI states and release tests.

Baseline model:

- instant slot for standardized predictable services;
- request/provider confirmation for less predictable work;
- inquiry/quote for body repair, painting and other photo-assessed work.

The complete service/mode/attribute matrix is recorded in
`docs/product/MVP_POLICY_BASELINE.md`.

The two-sided provider/customer confirmation is required in the booking
contract, including quote-based services.

## D-004a Cancellation, reschedule and no-show

Status: product baseline resolved on 2026-08-22.

The baseline is free platform cancellation up to 24 hours before the visit,
provider-proposed time changes requiring an explicit client decision, and an
audited provider no-show action only after the scheduled time. AutoCare Hub
does not invent repair fees because payment is made directly to the provider.
The complete state and audit rules are in `docs/product/MVP_POLICY_BASELINE.md`.

## D-004b Review eligibility and edit rules

Status: product baseline resolved on 2026-08-22.

Only the client attached to a completed request may publish one verified
review. One edit is allowed within 14 days, providers may add one response,
and reports create a moderation case without silently deleting the history.
The full policy is in `docs/product/MVP_POLICY_BASELINE.md`.

## D-005 Bonus program v1

Choose one starting model:

- points;
- provider currency credit;
- percentage cashback credited after completion;
- visit/stamp rewards.

Also decide expiry, minimum redemption, partial redemption, cancellation/refund
reversal, manual grants and whether a provider can change rules for already
earned value.

Recommended technical invariant: provider-scoped immutable ledger, no transfer
between providers and no cash withdrawal.

## D-006 Subscription model

Need:

- plan names/features/limits;
- allowed periods (for example 1/3/6/12 months);
- permanent Free plan or paid-only after acquisition phase;
- founding-partner treatment;
- renewal, grace, cancellation and downgrade rules;
- launch billing currency/currencies;
- billing provider based on legal entity/country.

Confirmed capabilities: super-admin manual grants and subscription promo codes.

## D-007 Promo-code rules

Need:

- percent and/or fixed discount;
- eligible plans/periods/countries;
- validity window and redemption limits;
- first purchase only or renewals too;
- stacking with manual grants or other promotions;
- treatment after refund/cancellation.

Recommended default: no stacking of multiple promo codes; manual entitlement
grants remain separate from billing discounts.

## D-008 Messaging and media

Need:

- can any authenticated client start a conversation before booking;
- how long messages and damage photos are retained;
- image formats/size/count limits;
- whether providers can download originals;
- reporting/moderator access policy;
- whether voice/video/PDF attachments are ever needed.

Recommended MVP: text plus JPEG/PNG/WebP photos, private processed images, no
voice/video/documents, durable REST delivery before realtime extras.

## D-009 Provider verification

Status: product baseline resolved on 2026-08-22; legal/entity review remains
required before the badge is presented as a public guarantee.

Baseline:

- required business/contact/location documents;
- what the verified badge promises;
- re-verification triggers;
- suspension and appeal process;
- the badge is location-scoped, expires with stale evidence and never depends
  on subscription or paid placement;
- public phone/email visibility follows the provider's published contact
  settings.

The evidence and threshold policy is recorded in
`docs/product/MVP_POLICY_BASELINE.md`.

## D-010 Public SEO

Status: product baseline resolved on 2026-08-22.

Decision: use the Next.js App Router shell for authenticated and public
workspaces while migrating the existing React Router feature tree behind a
catch-all route. Add selected prerendered HTML for crawlable public routes
before the production web gate. Vite remains a PWA/compatibility fallback.
Runtime `SeoHead`, canonical links, locale alternates, robots and sitemap stay
the source of truth for the route contract. The exact route list and noindex
boundaries are recorded in `docs/product/MVP_POLICY_BASELINE.md`; the
prerender build step remains a release-gate implementation task.

## D-011 Map/geocoding provider

Need provider coverage, licensing, geocoding terms, quotas, routing needs and
launch-country availability. Existing Leaflet UI is reusable; tile/geocoder
choice is not yet final.

## D-012 New Git repository

Status: resolved on 2026-08-12.

Resolved configuration:

- repository: `git@github.com:Dima163163/auto-care-hub.git`;
- integration branch: `dev`;
- production branch: `main`;
- inherited history is archived outside the active repository;
- branch-protection requirements are recorded in
  `docs/REPOSITORY_PROTECTION.md` and still need to be toggled by a GitHub
  repository administrator.

## D-013 Design direction

Status: decided in product-owner reply on 2026-08-12.

Decision:

- the five supplied screens are the approved baseline for the first design
  system and main customer journeys;
- keep the dark navy/white/blue visual language as the starting direction;
- improvements may be proposed and implemented during design work;
- logo alternatives may be proposed; the chosen logo variant requires product
  owner approval;
- design changes and implementation are explicitly authorized in this thread;
- prefer focused components and hooks, generally keeping files around 100–150
  lines where that improves readability and extensibility.

Remaining detail: approve the final logo variant and any material deviation from
the five-screen visual baseline.

## D-014 Localization and global coverage

Status: decided in product-owner reply on 2026-08-12.

Decision:

- support all major world languages through an extensible locale registry;
- prioritize Russian, Spanish, Romanian and English as the first maintained
  packs;
- interface language is independent from provider country and location;
- a Russian user can inspect a Spanish service in Russian, and a Spanish user
  can inspect a Russian service in Spanish;
- provider-entered content needs a translation/fallback policy.

Implementation constraint: do not use a finite database enum for every future
language. Keep stable backend codes separate from labels and use locale packs
plus an approved fallback chain.

Remaining detail: decide whether provider content is human-translated,
machine-assisted then reviewed, or shown with fallback only.

## D-015 Initial service catalog

Status: decided in product-owner reply on 2026-08-12.

Decision: include the complete major and minor automotive-service catalog from
the beginning, implemented as a moderated, platform-controlled catalog rather
than uncontrolled free text.

Implementation constraint: load all relevant categories into catalog data, then
release comparison/search capabilities in vertical slices with explicit
attributes per service class.
