# UI readiness audit — 25 August 2026

This audit records the implementation and automated verification for MVP workstreams 1.2–1.5. The approved desktop homepage visual direction was not changed.

## Loading and query states

- The Next shell keeps a visible header, content region and footer while MSW/translations initialise. The old full-page text loader is not used.
- Route-level fallbacks use content skeletons. Discovery keeps the filter form visible and disabled while its data loads; the map is one stable shimmer surface without nested skeleton blocks.
- Stable minimum heights are defined for discovery, map and workspace skeletons to prevent layout shifts after data arrives.
- Query state handling covers `loading`, `empty`, `error`, `stale-error`, `offline`, `permission-denied`, `suspended`, `partial` and `session-expired`, with guarded retry/sign-in actions.
- Request creation keeps its idempotency key after a failed attempt and clears it only after success, so retrying the same form does not create a second request.

## Responsive Chromium matrix

`e2e/autocare-release-audit.spec.ts` checks the public shell at 360, 390, 414, 540, 682, 768, 790, 1024, 1280 and 1440 px. The suite verifies the header mode (desktop navigation versus burger), filters, comparison/map area, cards and footer without horizontal overflow. Public service/gallery, client booking/garage/attachment/bonus states and the owner workspace are also covered at mobile widths.

## Accessibility coverage

- Chromium Axe audit passes for the public discovery route.
- Sort, filter and city listbox controls are keyboard operable; the city listbox supports ArrowUp/ArrowDown, Home, End, Escape and returns focus to its trigger.
- Public home, discovery and provider routes now have a keyboard traversal smoke check that exercises the visible interactive order.
- The service gallery closes with Escape and restores focus to its trigger.
- File inputs have accessible labels and image thumbnails expose responsive `sizes`.
- Custom select wrappers hide native arrows while retaining native keyboard semantics and visible focus styles.
- Error states expose `role=alert`; loading regions expose `role=status` and `aria-busy`.

## Localization and formatting

- Critical request, chat, vehicle-form, expert-question and multi-provider strings now use translation keys.
- Currency and date output in request quotes, result cards, comparison, map markers and favourites uses the selected locale through `src/shared/lib/locale-format.ts`.
- The initial document language and text direction are applied before async translation loading.
- Discovery count copy is localized for the launch languages (English, Russian, Romanian and Spanish); plural-category formatting is centralized in `src/shared/lib/locale-format.ts` and covered by unit tests.
- Translation tests cover locale tags, currency, date, plural categories and launch-language discovery copy; Chromium verifies all supported locales render without missing-key placeholders or overflow, with additional mobile checks for Spanish and Romanian.

## Remaining manual/release checks

- VoiceOver/TalkBack and real-device permission prompts still require a manual pass; Axe cannot validate spoken language quality.
- Automated keyboard traversal now covers the public journey plus the owner, admin and
  super-admin route matrix in the mock release gate. A manual keyboard pass on the
  release candidate is still required to catch browser/assistive-technology focus
  differences.
- A repository-wide literal scan still finds Russian strings in seed/demo data and several admin/owner legacy copy objects. These are not all UI copy (many are service names, fixtures or already locale-selected objects), but the remaining UI literals should be migrated before a translation freeze.
- Real API/offline behaviour must be rechecked against staging, because the Chromium matrix uses the deterministic mock API for repeatability. `e2e/autocare-real-mode.smoke.spec.ts` now checks the real `/auth/me` 401 contract and protected-cabinet redirect/session-expired boundary. The real PostgreSQL idempotency check is included in `autocare-capacity.integration.test.ts` and is gated by the integration prerequisites.
- Client requests, vehicles, provider availability, provider reviews, service-request chat, admin users and admin owners now pass the explicit `session-expired` state through the shared resolver; partial discovery remains visible with a non-blocking partial-data card. Run the real-mode suite after starting the API and use the mock matrix for deterministic offline/partial/error coverage.
- Visual snapshots at the listed widths are not committed; the release suite currently asserts layout contracts and no overflow rather than pixel diffs.
