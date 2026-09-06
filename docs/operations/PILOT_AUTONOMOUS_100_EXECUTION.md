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
2. `[x]` Прогнать frontend unit-тесты: 150 файлов / 477 тестов.
3. `[x]` Прогнать backend unit-тесты: 288 файлов / 1042 теста в pilot-focused
   unit-профиле; полный backend suite — 371 файл / 1245 тестов.
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
30. `[~]` Подготовить staging API compatibility probe; локальная parity проходит, `STAGING_API_BASE_URL` не задан.
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
57. `[~]` Проверить Redis fail-closed локальными тестами; multi-process outage требует Redis infrastructure.
58. `[x]` Проверить WebSocket origin/token authentication.
59. `[x]` Проверить WebSocket message/event limits.
60. `[x]` Проверить PII redaction и security-event schema contracts.
61. `[x]` Проверить private-reference policy.
62. `[x]` Проверить attachment envelope validation.
63. `[x]` Проверить MIME/decode/re-encode/pixel limits.
64. `[x]` Проверить EXIF-removal helper contract.
65. `[~]` Подготовить signed-URL adapter contract; реальный bucket и signed delivery требуют S3.
66. `[x]` Проверить upload quarantine state machine.
67. `[x]` Проверить media output filtering.
68. `[x]` Проверить orphan-media cleanup policy.
69. `[~]` Проверить deletion invariants локальными policy/unit тестами; PostgreSQL/storage replay требует staging.
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
90. `[~]` Проверить pilot-evidence validator; реальные anonymized samples отсутствуют, а `tsx` запускается только при разрешённом IPC.

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
- Frontend unit: **150 файлов / 477 тестов**.
- `npm run check:threat-surface`: PASS, включая availability rate limit.
- `npm run check:ops-harness`, `check:security-headers`, `check:capacity-ui`, API/OpenAPI checks: PASS.
- Synthetic discovery: 10 000 — p95 4.2 ms; 100 000 — p95 21.5 ms.
- `npm run check:mvp-readiness`: корректно блокируется отсутствующими PostgreSQL/Redis/JWT, SMTP, media path и bootstrap super-admin.
- `quality:backend` включает error-code, staging-contract и autonomous-plan checks; повторный локальный прогон всех новых проверок и `git diff --check` — PASS.
