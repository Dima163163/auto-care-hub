# AutoCare Hub — design brief

**Status:** approved direction, implementation in progress  
**Scope:** browser MVP first; the same contracts must remain usable by iOS and Android later.

## Product promise

AutoCare Hub helps a driver find, compare, clarify, and book automotive services. The primary decision is not “which cabinet has an opening”, but “which provider is the best fit for this service, vehicle, location, price, trust, and time”.

The platform does not collect payment for repair work in the first release. A customer and a provider both confirm the appointment; payment is completed directly with the provider under the provider’s published terms.

## Approved visual direction

The five reference screens are the baseline for hierarchy and interaction patterns:

- dark navy navigation and hero surfaces;
- white content surfaces with high-contrast blue actions;
- compact, information-dense comparison cards;
- map and location context used as a decision aid, not as decoration;
- explicit trust signals: verified provider, rating, review count, price range, availability, warranty, and service scope.

The direction is intentionally kept, while the information architecture changes from “cabinet booking” to “automotive service marketplace”. The first design pass introduces a clearer service-first search, a provider comparison rail, and a language/location control that does not assume the user’s language matches the provider’s country.

## Foundations

| Area | Decision |
| --- | --- |
| Brand | AutoCare Hub wordmark is temporary; mark options are documented separately for approval. |
| Primary color | Electric service blue for actions, links, selection, and focus. |
| Surface color | Navy for navigation, hero, map overlays, and provider promotion; white/near-white for comparison workspaces. |
| Status colors | Green = verified/available/savings; amber = rating/highlight; red = destructive/closed/price warning. |
| Typography | Inter/system sans for UI; large, short headlines; numbers and prices use tabular figures where available. |
| Shape | Medium control radius, larger panel radius, restrained shadow, 1px borders. |
| Density | Desktop comparison uses a two-column list/map layout; mobile becomes a filterable list with a persistent comparison tray. |
| Motion | Short, purposeful transitions; respect `prefers-reduced-motion`; never hide price or availability behind animation. |

## Core screen model

1. **Home/search:** service, location, radius, vehicle (optional), and “search nearby”.
2. **Results/compare:** service-specific result cards, filters, sort, map/list, and up to four selected providers.
3. **Provider profile:** service catalog, price ranges, availability, reviews, bonuses, photos, contact, and message thread entry.
4. **Booking:** service and provider confirmation, date/time, contact, notes/photos, customer confirmation, provider confirmation.
5. **Messages:** one thread per booking/service request; text, image attachments, estimate status, and read state.
6. **Account/business/admin:** favorites, vehicles, requests, rewards; provider workspace; subscription, promo, and moderation controls for super admin.

## Responsive rules

- Desktop: 12-column shell, max public width `82rem`, operational workspace max `98rem`.
- Tablet: collapse map to a drawer or tab; keep comparison tray visible.
- Mobile: service-first search, bottom-sheet filters, sticky compare bar, one-handed primary action.
- All critical states must have loading, empty, error, offline/retry, disabled, and success variants.

## Internationalisation and market model

The UI locale is independent from provider country, city, and currency. A Russian user may browse Spain in Russian; a Spanish user may browse Russia in Spanish. Market definitions are data-driven and must be added without a code branch per country. The initial registry covers Russia, Spain, Moldova, and Transnistria with a million-plus launch city selected by configuration.

The first translation packs prioritize `ru`, `es`, `ro`, and `en`; the locale registry remains extensible and falls back through language → English → server-provided label. Currency is displayed from the provider/market context, with a clear ISO code and optional user display conversion. No authorization decision may depend on locale, currency, or translation.

## Content and trust rules

- Prices are ranges until a provider confirms an estimate; “from” is explicit.
- Ratings always show review count and recency context.
- A provider may publish bonuses, but redemption terms and expiry are visible before booking.
- User-uploaded damage photos are private to the relevant thread and provider until the user explicitly shares them elsewhere.
- Provider photos are optional content. A missing, invalid, or still-loading photo must show a neutral automotive placeholder with a useful accessible label; cards remain readable without photography.
- Provider verification, subscription status, promo eligibility, and moderation state are never implied by visual polish alone; use explicit labels from the API.

## Logo decision

The supplied wordmark is a useful placeholder, not a final identity lock. Three code-native mark directions are documented in `logo-options.md`. The current UI keeps the wordmark name and uses a temporary AutoCare “A” mark so the product language is no longer AutoCare Hub; replacing the mark later is isolated to `BrandLogo`.
