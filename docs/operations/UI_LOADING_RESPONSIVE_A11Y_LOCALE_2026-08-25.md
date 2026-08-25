# UI readiness audit — 25 August 2026

This audit records the implementation and automated verification for MVP workstreams 1.2–1.5. The approved desktop homepage visual direction was not changed.

## Loading and query states

- The Next shell keeps a visible header, content region and footer while MSW/translations initialise. The old full-page text loader is not used.
- Route-level fallbacks use content skeletons. Discovery keeps the filter form visible and disabled while its data loads; the map is one stable shimmer surface without nested skeleton blocks.
- Stable minimum heights are defined for discovery, map and workspace skeletons to prevent layout shifts after data arrives.
- Query state handling covers `loading`, `empty`, `error`, `stale-error`, `offline`, `permission-denied` and `suspended`, with a guarded retry action.
- Request creation keeps its idempotency key after a failed attempt and clears it only after success, so retrying the same form does not create a second request.

## Responsive Chromium matrix

`e2e/autocare-release-audit.spec.ts` checks the public shell at 360, 390, 414, 540, 682, 768, 790, 1024, 1280 and 1440 px. The suite verifies the header mode (desktop navigation versus burger), filters, comparison/map area, cards and footer without horizontal overflow. Public service/gallery, client booking/garage/attachment/bonus states and the owner workspace are also covered at mobile widths.

## Accessibility coverage

- Chromium Axe audit passes for the public discovery route.
- Sort and filter controls are keyboard operable.
- The service gallery closes with Escape and restores focus to its trigger.
- File inputs have accessible labels and image thumbnails expose responsive `sizes`.
- Custom select wrappers hide native arrows while retaining native keyboard semantics and visible focus styles.
- Error states expose `role=alert`; loading regions expose `role=status` and `aria-busy`.

## Localization and formatting

- Critical request, chat, vehicle-form, expert-question and multi-provider strings now use translation keys.
- Currency and date output in request quotes, result cards, comparison, map markers and favourites uses the selected locale through `src/shared/lib/locale-format.ts`.
- The initial document language and text direction are applied before async translation loading.
- Translation tests cover locale tags, currency and date formatting; Chromium verifies all supported locales render without missing-key placeholders or overflow.

## Remaining manual/release checks

- VoiceOver/TalkBack and real-device permission prompts still require a manual pass; Axe cannot validate spoken language quality.
- A repository-wide literal scan still finds Russian strings in seed/demo data and several admin/owner legacy copy objects. These are not all UI copy (many are service names, fixtures or already locale-selected objects), but the remaining UI literals should be migrated before a translation freeze.
- Real API/offline behaviour must be rechecked against staging, because the Chromium matrix uses the deterministic mock API for repeatability.
- Visual snapshots at the listed widths are not committed; the release suite currently asserts layout contracts and no overflow rather than pixel diffs.
