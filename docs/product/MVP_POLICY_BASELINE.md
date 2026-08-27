# AutoCare Hub — MVP policy baseline

Updated: 2026-08-22

This document records the product defaults used by the first web release. It
is an implementation baseline, not legal advice. Legal pages remain drafts
until the operating entity, controller details and launch-country counsel have
reviewed them.

## Service classes and booking modes

The public catalog uses one of three customer-visible modes. Providers may not
silently change a mode per offer without showing the customer the new rule.

| Services | Default mode | Comparable attributes |
| --- | --- | --- |
| Oil change, tire service, car wash | Instant slot | price type, duration, included parts/materials, warranty |
| Diagnostics, maintenance, air conditioning, wheel alignment, battery service, mobile diagnostics, roadside assistance, tow truck | Request confirmation | diagnostic scope, response time, call-out fee, duration, warranty |
| Brakes, engine, suspension, auto electrician, windshield repair | Request confirmation or quote | symptom/scope, parts included, estimated range, duration, warranty |
| Body & paint, detailing | Photo assessment / quote | visible work scope, materials, stages, estimated range, warranty |

Every result must expose price type (`FIXED`, `FROM`, `RANGE` or
`QUOTE_REQUIRED`), currency, inclusions, warranty and the next available time
when those values are known. A quote is not a final price until the customer
accepts the versioned quote snapshot.

## Cancellation, reschedule and no-show

- A customer may cancel a pending or confirmed request from the request page.
- Cancellation up to 24 hours before the scheduled visit is free at the
  platform level. Repair payment is always arranged directly with the provider.
- A cancellation inside 24 hours is recorded with a reason and may require
  provider acknowledgement; the platform does not invent a financial penalty.
- A provider-proposed time change requires an explicit customer accept/reject
  decision and never mutates the original confirmed snapshot silently.
- A confirmed visit can be marked `no_show` only after its scheduled time by
  an authorized provider member, with a reason and an audit event.
- Completion is an explicit provider action. It creates the eligibility event
  for a verified review; it does not charge the customer through AutoCare Hub.

## Review eligibility and moderation

- One review is allowed per completed AutoCare request.
- Only the customer attached to the request may submit the verified review.
- The customer may edit the review once within 14 days; the edit history is
  retained for moderation and trust calculations.
- A provider may publish one response without changing the customer rating.
- A customer or provider may report abusive, private, fraudulent or unsafe
  content. Moderators can hide content with a reason and audit event.
- Reviews never affect eligibility for a different provider and paid access
  never creates, removes or boosts a review.

## Provider verification and trust badge

The initial badge is conservative and location-scoped. A location must have:

1. an approved provider profile and contact/location evidence;
2. at least 10 completed or confirmed visits;
3. at least 5 eligible verified reviews from those visits;
4. a Bayesian-adjusted rating of at least 4.2/5 (prior mean 4.2, prior weight 5);
5. no unresolved critical safety, fraud or identity violation;
6. complaint and no-show rates at or below 10%; when final-price observations
   exist, at least 90% must match the accepted quote snapshot.

The badge expires when evidence becomes stale, a critical moderation event is
open, or the current trust snapshot falls below the threshold. Paid placement,
other commercial mechanics and self-reported review counts cannot raise the
organic rank or create the badge. Every recalculation stores the
policy version, counters and reason codes. The score also records recent rating
trend and first-response time when those signals are available; missing signals
are shown in reason codes rather than silently treated as positive evidence.

## SEO baseline

The web release uses the Next.js App Router shell for authenticated and public
workspaces. The existing `SeoHead` contract remains the runtime metadata
source while the React Router feature tree is migrated incrementally behind the
Next catch-all route. The public release gate uses selected prerendered HTML
(ISR via `generateStaticParams`) for these crawlable routes:

- `/`, `/services`, `/for-owners`, `/about`, `/help`, `/agreement`, `/rules`,
  `/privacy`, `/reviews`;
- approved, stable city/service landing routes once their API data contract is
  stable.

Search-result query pages, private workspaces and user-specific URLs remain
`noindex,follow`. Canonical URLs and locale alternates must use the same API
origin and must never expose private request, vehicle or message data.

## Legal publication gate

The current agreement, rules and privacy pages are readable drafts. Before
production publication, the owner must provide the legal entity, controller or
operator details, support/privacy contacts, retention basis and country-specific
consumer wording for Russia, Spain, Moldova and Transnistria. Until then the
UI must keep the draft label and must not claim legal approval.
