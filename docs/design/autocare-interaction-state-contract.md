# AutoCare Hub — interaction and state contract

This contract is the minimum state inventory for the browser MVP. Native clients should consume the same semantic states and API transitions.

## Shared state vocabulary

| State | Meaning | UX requirement |
| --- | --- | --- |
| `idle` | No input or request yet | Explain the next action. |
| `loading` | Request in flight | Preserve layout; use skeletons, not a blank page. |
| `ready` | Data can be acted on | Show source context, currency, and freshness. |
| `empty` | Valid request returned no items | Suggest nearby markets, wider radius, or another service. |
| `error` | Request failed | Explain retry and keep user-entered filters. |
| `offline` | Network unavailable | Keep drafts local; disable destructive/network-only actions. |
| `pending_confirmation` | One party has confirmed | Show who still needs to confirm and expiry. |
| `confirmed` | Customer and provider both confirmed | Show booking reference and next step. |
| `cancelled` | Booking ended before completion | Show reason, refund/payment note if applicable, and recovery path. |

## Primary flows

### Search and compare

`idle → loading → ready | empty | error | offline`

Filters are URL-addressable. Changing service, market, radius, currency display, or sort invalidates the result query but must not clear the comparison selection unless the selected provider is no longer eligible. Comparison supports 2–4 providers and exposes price, rating, distance, next slot, warranty, bonuses, and service inclusion side by side.

### Booking confirmation

`draft → customer_confirmed → pending_provider_confirmation → confirmed`

The provider may accept, request clarification, or decline. A customer can cancel while pending according to provider policy. Repair payment is direct to the provider; the platform records only booking/payment-note metadata needed for status and support.

### Service message thread

`not_started → open → awaiting_reply → estimate_shared → accepted | declined | closed`

Images are attachments with upload progress, retry, validation errors, and a private access policy. Messages are scoped to a service request or booking; there is no unscoped provider/customer chat in MVP.

### Provider profile and request panel

`loading → ready | error | offline`

The profile exposes service-specific price type (`FIXED`, `FROM`, `RANGE`, or
`QUOTE_REQUIRED`), inclusion list, duration, warranty, availability freshness,
bonuses, review context, location, and provider verification. The request panel
keeps a draft locally until the authenticated client sends it. Attachment
selection is separate from message submission and reports size/type/count
validation before upload.

### Appointment request

`draft → customer_confirmed → pending_provider_confirmation → confirmed`

The browser wizard collects contact details, preferred time, optional service
photos, and an explicit customer confirmation. It never renders a platform
repair checkout. The provider confirmation is a separate server transition;
the success state must say that the request was sent, not that the appointment
is confirmed, until both actors confirm.

### Subscription and promo

`trial/free → active → grace_period → expired | cancelled`

Super admin can grant a plan, set an end date, or issue a promo code. The provider-facing UI must display source (`admin_grant`, `promo`, or `self_serve`), effective dates, and redemption limits. Promo validation is server-authoritative and must be idempotent.

## Responsive interaction invariants

- The primary CTA is always visible or reachable in one tap/click.
- Compare selection is mirrored between cards, map markers, and the comparison tray.
- Locale, market, and currency controls preserve the current search and are safe to change mid-flow.
- Error and retry states never discard message drafts, notes, or booking fields.
- Focus order follows visual order; keyboard users can operate search, filters, compare, and booking without a pointer.
