# AutoCare Hub — автономное выполнение 100 пунктов

**Дата ревизии:** 06.09.2026
**Назначение:** чеклист задач из пилотного плана, которые можно выполнить в репозитории, mock/API и локальных проверках без staging-секретов, реальных сервисов и реальных устройств.

Статусы:

- `[x]` — выполнено и подтверждено локальным evidence.
- `[~]` — кодовая часть выполнена, но внешний/manual gate ещё нужен.
- `[E]` — полностью требует внешней инфраструктуры, реальных участников или ручного подтверждения.

Этот файл не расширяет `PILOT_SCOPE_FREEZE.md`, не добавляет обязательных требований и не меняет зафиксированные проценты.

## Локальный release и MVP

1. `[x]` Запустить полный `check:local-mvp`: все автоматические проверки проходят; responsive Chromium matrix — 30/30 после запуска Next production preview.
2. `[x]` Прогнать frontend unit-тесты: 151 файлов / 480 тестов.
3. `[x]` Прогнать backend unit-тесты: 291 файлов / 1051 тестов в pilot-focused
   unit-профиле; полный backend suite — 371 файл / 1246 тестов.
4. `[x]` Проверить frontend production build.
5. `[x]` Проверить backend TypeScript build.
6. `[x]` Проверить inventory всех Next.js routes: 57 route constants.
7. `[x]` Проверить прямые переходы, 404 и protected redirect контрактами.
8. `[x]` Проверить mock/API parity: 227 mock routes покрыты 257 backend routes.
9. `[x]` Проверить legacy cleanup и отсутствие Bookly runtime.
10. `[x]` Проверить отсутствие payment/subscription runtime-кода.
11. `[x]` Исправить и проверить migration-validation contract для forward `DROP → ADD` и rollback-only `down`.
12. `[x]` Проверить API runtime boundaries: 237 endpoints / 12 API modules.
13. `[x]` Проверить OpenAPI shape.
14. `[x]` Проверить единообразие error-code inventory: 20 канонических кодов, уникальные значения и все `ERROR_CODES.*` ссылки проходят отдельный contract gate.
15. `[x]` Проверить loading shell.
16. `[x]` Проверить UI state matrix.
17. `[x]` Проверить design tokens и light/dark overrides.
18. `[x]` Проверить interaction-state contract.
19. `[x]` Проверить capacity UI: компактный branch calendar, resource workspace изолирован post-MVP.
20. `[x]` Проверить отсутствие runtime ReferenceError в автоматическом локальном gate.

## Public discovery, UI и локали

21. `[x]` Проверить mock-услуги разных категорий для discovery.
22. `[x]` Проверить фильтрацию по услуге, марке, модели, году и радиусу.
23. `[x]` Проверить availability rate limit: `autocare:availability`, 60 запросов/минуту.
24. `[x]` Проверить discovery rate limit и bounded cache policy.
25. `[x]` Проверить bounded trust evidence.
26. `[x]` Проверить bounded public reviews limit.
27. `[x]` Проверить public media output policy.
28. `[x]` Проверить location coordinate guard.
29. `[x]` Проверить OpenAPI shape и structural contracts.
30. `[~]` Staging API compatibility probe подготовлен и теперь проходит против
локального реального API (OpenAPI и две discovery-вариации); `STAGING_API_BASE_URL`
для настоящего staging endpoint не задан.
31. `[x]` Проверить service-request normalizer.
32. `[x]` Проверить contact snapshot и preferred-date normalization.
33. `[x]` Проверить idempotency-key policy.
34. `[x]` Проверить duplicate request prevention.
35. `[x]` Проверить vehicle input policy, VIN и госномер.
36. `[x]` Проверить primary vehicle unique index и migration preflight.
37. `[x]` Проверить vehicle row-lock policy.
38. `[x]` Проверить booking payload normalization и slot locking.
39. `[x]` Проверить occupied-slots role/scope.
40. `[x]` Проверить reschedule/status/note, quote/offer accept/decline policies.

## Owner, admin и branch security

41. `[x]` Проверить owner auth-before-validation.
42. `[x]` Проверить admin auth-before-validation.
43. `[x]` Проверить client-only route guards.
44. `[x]` Проверить owner/manager/staff branch scope на source/service boundary.
45. `[x]` Проверить foreign-branch denial contracts.
46. `[x]` Проверить membership/invitation policy.
47. `[x]` Проверить invitation token normalization.
48. `[x]` Проверить provider change-request policy.
49. `[x]` Проверить owner evidence и admin moderation evidence policies.
50. `[x]` Проверить catalog-gap и super-admin market-hierarchy policies.

## Security, media и retention

51. `[x]` Проверить duplicate CSRF headers.
52. `[x]` Проверить trusted-origin policy.
53. `[x]` Проверить security headers.
54. `[x]` Проверить JWT/session validation и revocation contracts.
55. `[x]` Проверить rate-limit option validation.
56. `[x]` Проверить rate-limit scope inventory.
57. `[~]` Redis fail-closed local tests, synthetic production-config probe,
multi-process limiter smoke и cross-process realtime smoke проходят; staging
outage/reconnect и production Redis infrastructure всё ещё требуются.
58. `[x]` Проверить WebSocket origin/token authentication.
59. `[x]` Проверить WebSocket message/event limits.
60. `[x]` Проверить PII redaction и security-event schema contracts.
61. `[x]` Проверить private-reference policy.
62. `[x]` Проверить attachment envelope validation.
63. `[x]` Проверить MIME/decode/re-encode/pixel limits.
64. `[x]` Проверить EXIF-removal helper contract.
65. `[~]` Signed-URL adapter contract и private/no-store preflight regression
пройдут локально; реальный bucket и signed delivery требуют S3.
66. `[x]` Проверить upload quarantine state machine.
67. `[x]` Проверить media output filtering.
68. `[x]` Проверить orphan-media cleanup policy.
69. `[~]` Policy/unit и Docker PostgreSQL deletion replay проходят, включая
повторный terminal `Completed` и нулевые invariants; staging/restore/storage
replay всё ещё требуется.
70. `[x]` Проверить retention/export PII policy.

## Integrity и concurrency

71. `[x]` Проверить row-lock календаря филиала.
72. `[x]` Проверить exact-seven-days schedule policy.
73. `[x]` Проверить booking transition locking.
74. `[x]` Проверить quote concurrency policy на service boundary.
75. `[~]` Проверить локальную transition policy; multi-process staging matrix требует PostgreSQL.
76. `[x]` Проверить client-vehicle primary race protection.
77. `[x]` Проверить favorites idempotency и verified-email guard.
78. `[x]` Проверить review idempotency/rate-limit policy.
79. `[x]` Проверить offer/broadcast duplicate guards.
80. `[x]` Проверить resource-reservation boundary без включения post-MVP workspace.

## Operations, recovery и evidence harness

81. `[x]` Проверить production preflight validator.
82. `[x]` Проверить placeholder/secret configuration detection.
83. `[x]` Проверить Docker/runtime diagnostic.
84. `[x]` Проверить worker mode contract.
85. `[x]` Проверить outbox retry/dead-letter contract.
86. `[x]` Проверить alert-rule source contract.
87. `[x]` Проверить backup encryption/checksum harness.
88. `[x]` Проверить isolated-restore guard и runbook contract.
89. `[x]` Проверить rollback/migration contract.
90. `[~]` Проверить pilot-evidence validator; repository-root path resolution,
curated **3/3** path regressions and toolkit contracts pass, но реальные
anonymized samples/participant rows отсутствуют.

## Release, performance и cleanup

91. `[x]` Проверить pilot-quality catalog coverage.
92. `[x]` Выполнить synthetic discovery benchmark: 10 000 и 100 000 записей, 3 итерации.
93. `[x]` Проверить JS/CSS performance budgets.
94. `[~]` Проверить repository SEO/Open Graph/prerender contracts; production Lighthouse и rendered HTML требуют deployed URL.
95. `[x]` Проверить dynamic provider prerender/ISR contract.
96. `[x]` Выполнить legacy entities/migration inventory audit.
97. `[x]` Проверить replacement coverage для retained compatibility families.
98. `[x]` Проверить API error/status contracts в OpenAPI и route checks.
99. `[x]` Подготовить финальный release checklist aggregator: нумерация 1–100, статусы и strict mode проверяются автоматически; фактическое закрытие зависит от внешних evidence gates.
100. `[x]` Обновить evidence-журнал и этот чеклист с командами, результатами и ограничениями среды.

## Не закрывается автономно

- `MVP-05/MVP-06`: ручная visual/keyboard приёмка, VoiceOver/TalkBack и реальные телефоны.
- `PILOT-01/PILOT-02`: staging PostgreSQL/Redis/JWT, HTTPS, SMTP и bootstrap super-admin.
- `PILOT-03/SEC-02`: реальный private S3, ClamAV/quarantine и signed media delivery.
- `PILOT-04/SEC-07`: внешний encrypted backup vault, реальный restore и RPO/RTO.
- `PILOT-05/SEC-09/SEC-10`: delivery alerts, incident channel и технический rollback rehearsal.
- `PILOT-06/SEC-04`: две API-реплики и фактический Redis outage/reconnect.
- `PILOT-08`: юридическое утверждение города, privacy, retention и правил поддержки.
- `PILOT-09/PILOT-10/PILOT-11`: реальные автосервисы, клиенты, метрики и go/no-go.
- `SEC-01/SEC-03/SEC-05/SEC-06/SEC-08`: staging replay, восстановленная БД, независимый security review и perimeter evidence.

## Последнее evidence

- `npm run check:local-mvp`: все автоматические проверки PASS; responsive Chromium matrix 30/30 также PASS после запуска Next production server с разрешённым loopback-портом. Ручная visual/keyboard/device приёмка остаётся владельческим gate.
- Backend pilot-focused unit: **288 файлов / 1042 теста**; полный backend
  suite: **371 файл / 1245 тестов**.
- Frontend unit: **152 файла / 488 тестов**.
- `npm run check:threat-surface`: PASS, включая availability rate limit.
- `npm run check:ops-harness`, `check:security-headers`, `check:capacity-ui`, API/OpenAPI checks: PASS.
- Synthetic discovery: 10 000 — p95 4.2 ms; 100 000 — p95 21.5 ms.
- `npm run check:mvp-readiness`: корректно блокируется отсутствующими PostgreSQL/Redis/JWT, SMTP, media path и bootstrap super-admin.
- `quality:backend` включает error-code, staging-contract и autonomous-plan checks; повторный локальный прогон всех новых проверок и `git diff --check` — PASS.

## Последняя локальная сверка (07.09.2026)

- Feature-ветка опубликована; рабочее дерево чистое.
- `npm test -- --run`: **151 test files / 480 tests PASS**.
- `npm run test:server:unit`: **291 test files / 1051 tests PASS**.
- `npm run test:server:integration`: **14 test files / 63 tests PASS** on the
  local Docker PostgreSQL profile.
- `VITE_API_MODE=real npm run build:vite` and
  `npm run check:production-fixture-leakage`: PASS; no demo contact markers in
  generated JavaScript assets. Mock-mode UI contacts are local synthetic data.
- Vite ESM config uses `import.meta.dirname`; the real build emits no
  `__dirname`/future-native-config warning.
- GitHub Quality now repeats the real-mode Vite build and
  `check:production-fixture-leakage` in CI after the Next build.
- Backend Quality also runs the two-process PostgreSQL transition smoke against
  its PostgreSQL service container.
- Fresh `npm run check:local-mvp` on `2201da15f186` passed all 43 checks,
  including the responsive Chromium matrix.
- Frontend and backend production dependency audits pass with zero high-level
  vulnerabilities.
- Chrome accessibility-tree spot-check confirms the synthetic provider profile
  exposes booking/request CTAs, service rows, booking slots, language/theme
  controls, legal links and visible map attribution.
- Provider location map now exposes a localized named `region` without changing
  the visual layout or external map action.
- Post-fix `npm run check:local-mvp` on `2af350756dd6` passes all 43 checks,
  including the responsive Chromium matrix.
- HTTP SEO replay against the local server passes every rendered metadata/robots
  route; Lighthouse remains manual because its CLI is not installed.
- Owner providers map now exposes a localized named `region`, extending the map
  accessibility contract to protected workspace UI.
- Synthetic hero-map offer prices now use numeric values, locale-aware currency
  formatting and the localized `fromPrice` copy.
- Post-owner-map `npm run check:local-mvp` on `e03d0a34eec3` passes all 43
  checks, including the responsive Chromium matrix.
- Post-hero-price `npm run check:local-mvp` on `bc56583886df` passes all 43
  checks, including the responsive Chromium matrix; frontend suite is
  **151/481 PASS**.
- Home provider preview prices now use numeric values and locale-aware currency
  formatting for both current and old prices.
- Post-provider-price `npm run check:local-mvp` on `77b612d60eab` passes all 43
  checks, including the responsive Chromium matrix.
- Public result cards and comparison tables now format `Today/Tomorrow` slots
  through one locale-aware helper; the helper has EN/RU/ES regression coverage.
- Post-slot-localization `npm run check:local-mvp` on `7b3f672ff29f` passes all
  43 checks, including the responsive Chromium matrix; frontend suite is
  **151/482 PASS**.
- Public distances now retain numeric `distanceKm` and use one locale-aware
  formatter across result cards, comparison, map focus and favorites.
- Post-distance-localization `npm run check:local-mvp` on `a458350530ed` passes
  all 43 checks, including the responsive Chromium matrix; frontend suite is
  **151/483 PASS**.
- Provider profile and booking panel now format structured offering prices by
  selected locale, preserving a legacy display-label fallback. The targeted
  mapper/formatter suite is **2 files / 6 tests PASS**; Vite production build
  and the full local MVP gate pass on `2f94a34`.
- Post-provider-offering-price `npm run check:local-mvp` on `2f94a34` passes
  all 43 checks, including the responsive Chromium matrix; frontend suite is
  **152/486 PASS**.
- Request and order summaries now use locale-aware structured offering price
  and duration formatting; the total label uses the existing `booking.total`
  translation key. Targeted request/formatter coverage is **4 files / 14 tests
  PASS**, and production Vite build passes on `3d8264b`.
- Post-request-summary-localization `npm run check:local-mvp` on `3d8264b` passes
  all 43 checks, including the responsive Chromium matrix; frontend suite is
  **152/487 PASS**.
- Guarantee claim card now reads title, description, field copy, success and
  error messages from the translation contract; RU and EN component coverage
  passes in **2 files / 12 tests**. The full local MVP gate passes on `d064edb`.
- Post-guarantee-copy `npm run check:local-mvp` on `d064edb` passes all 43
  checks, including the responsive Chromium matrix; frontend suite is
  **152/488 PASS**.
- Owner provider cards now use typed translation keys for response windows,
  communication modes, prices, chat state, CTAs and toast/error copy; shared
  locale currency formatting is reused. The complete local MVP gate passes on
  `8681a9c` with frontend **152/488 PASS**.
- Post-owner-provider-copy `npm run check:local-mvp` on `8681a9c` passes all 43
  checks, including the responsive Chromium matrix.
- Owner dashboard metric cards now use typed translation keys for labels/notes
  and shared locale currency formatting; metric calculations and API semantics
  are unchanged.
- Post-owner-metrics `npm run check:local-mvp` on `b953ac8` passes all 43 checks,
  including the responsive Chromium matrix; frontend suite is **152/488 PASS**.
- Owner dashboard hero and quick actions now use typed translation keys; the
  obsolete locale prop was removed from the context-driven quick-actions card.
- Post-owner-dashboard-hero `npm run check:local-mvp` on `699dd85` passes all 43
  checks, including the responsive Chromium matrix; frontend suite is
  **152/488 PASS**.
- Owner request queue and branch panel now use typed translation keys and the
  shared locale date formatter; request sorting and provider data semantics are
  unchanged.
- Post-owner-dashboard-queue `npm run check:local-mvp` on `5f57b25` passes all
  43 checks, including the responsive Chromium matrix; frontend suite is
  **152/488 PASS**.
- Owner analytics and broadcast panels now use typed translation keys and
  shared locale-aware metric formatting; the broadcast regression fixture now
  supplies the translated RU labels used by the component.
- Post-owner-analytics `npm run check:local-mvp` on `9655361` passes all 43
  checks, including the responsive Chromium matrix; frontend suite is
  **152/488 PASS**.
- Owner fleet panel, responsive vehicle table and add-vehicle form now use typed
  translation keys; fleet mutations, draft persistence and vehicle snapshots
  remain unchanged.
- Post-owner-fleet `npm run check:local-mvp` on `1499b63` passes all 43 checks,
  including the responsive Chromium matrix; targeted fleet coverage is **2 files
  / 3 tests PASS**.
- Owner provider onboarding documents and customer contact sections now use
  typed translation keys; validation, media uploads and communication-mode
  values are unchanged.
- Post-provider-contact-copy `npm run check:local-mvp` on `23ca2e8` passes all
  43 checks, including the responsive Chromium matrix; provider form coverage
  is **1 file / 3 tests PASS**.
- Provider evidence and onboarding panels now use typed translation keys and
  shared locale date formatting; verification, cancellation and profile-update
  mutations remain unchanged.
- Post-provider-details-panels `npm run check:local-mvp` on `a4f5551` passes all
  43 checks, including the responsive Chromium matrix; onboarding coverage is
  **1 file / 3 tests PASS**.
- Provider communication settings now use typed translation keys for all team,
  business, booking, response-window and switch copy; payload and mutation
  semantics are unchanged.
- Post-provider-communication `npm run check:local-mvp` on `c5a123d` passes all
  43 checks, including the responsive Chromium matrix; targeted communication
  coverage is **1 file / 1 test PASS**.
- Provider profile change form now uses typed translation keys for public fields,
  multibrand and private document references; draft restoration, document
  payload and profile-update semantics remain unchanged.
- Post-provider-profile-form `npm run check:local-mvp` passes all 43 checks,
  including the responsive Chromium matrix; profile/onboarding coverage is
  **2 files / 4 tests PASS**.
- Provider members panel now uses typed translation keys for team access,
  invitations, loading/error/retry states and revoke aria-labels; provider and
  location scopes plus invite/revoke mutations remain unchanged.
- Post-provider-members `npm run check:local-mvp` passes all 43 checks,
  including the responsive Chromium matrix; targeted members coverage is
  **1 file / 3 tests PASS**.
- Provider bonus/liability panel now uses typed translation keys and the shared
  locale date formatter; bonus grant payload, provider/client scope and
  idempotency semantics remain unchanged.
- Post-provider-bonus `npm run check:local-mvp` passes all 43 checks, including
  the responsive Chromium matrix; targeted bonus coverage is **1 file / 1 test
  PASS**, and the full frontend suite is **153/489 PASS**.
- Restricted provider details access state now uses a typed translation key;
  workspace scope lookup and owner permission checks remain unchanged.
- Post-provider-access `npm run check:local-mvp` passes all 43 checks, including
  the responsive Chromium matrix; frontend suite remains **153/489 PASS**.
- Owner provider reviews page now uses typed translation keys for all review,
  contact and promo surfaces, shared locale date formatting and translated
  completed-work photo alt text; filters and promo mutation semantics remain
  unchanged.
- Post-owner-reviews `npm run check:local-mvp` passes all 43 checks, including
  the responsive Chromium matrix; targeted reviews coverage is **1 file / 1
  test PASS**, and the frontend suite is **153/489 PASS**.
- `npm run check:pilot-autonomous-plan -- --json`: **93 complete / 7 partial**;
  `check:pilot-autonomous-next -- --json`: **100 complete / 0 partial**.
- Эти результаты подтверждают текущую локальную воспроизводимость, но не
  закрывают внешний staging/production, deployed-URL, participant или manual
  acceptance evidence.
