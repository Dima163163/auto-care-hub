# AutoCare Hub — 100 следующих автономных шагов

Этот список — отдельный исполняемый backlog для работы в репозитории, mock/API и
локальных harness. Он не расширяет обязательный scope и не изменяет проценты в
`PILOT_SCOPE_FREEZE.md`. Реальные staging/production evidence по-прежнему
закрываются только фактическим окружением и владельцем продукта.

Текущий прогресс этой автономной очереди: **100/100 выполнено локально**. Внешние
staging/production gates по-прежнему перечислены отдельно и не считаются закрытыми.

Статусы: `[x]` локально выполнено; `[~]` кодовая подготовка выполнена, внешнее
доказательство ещё нужно; `[ ]` не начато.

## A. Локальный MVP и качество

1. `[x]` Добавить JSON-артефакт локального MVP gate с commit SHA и временем запуска.
2. `[x]` Добавить проверку, что все команды local gate запускаются без shell-интерполяции.
3. `[x]` Добавить ограничение максимального времени отдельной local-gate команды.
4. `[x]` Добавить контракт повторного запуска local gate без изменения fixtures.
5. `[x]` Добавить проверку стабильности порядка route inventory.
6. `[x]` Добавить проверку отсутствия дублирующихся route constants.
7. `[x]` Добавить snapshot списка mock/backend маршрутов без пользовательских данных.
8. `[x]` Добавить regression для пустого, ошибочного и частичного API-ответа формы поиска.
9. `[x]` Добавить regression для disabled-полей формы во время загрузки.
10. `[x]` Добавить regression для светлой и тёмной темы skeleton-токенов.
11. `[x]` Добавить regression для длинных русских и английских названий услуг.
12. `[x]` Добавить regression для переполнения карточки сервиса на узком экране.
13. `[x]` Добавить клавиатурный smoke для dropdown и Escape.
14. `[x]` Добавить контракт focus-visible для основных действий.
15. `[x]` Добавить проверку aria-label для иконок без текста.
16. `[x]` Добавить проверку отсутствия пустого полноэкранного loader.
17. `[x]` Добавить проверку сохранения введённых фильтров после retry.
18. `[x]` Добавить deterministic mock fixture для offline/reconnect сценария.
19. `[x]` Добавить проверку отсутствия платежных терминов в активном runtime.
20. `[x]` Добавить локальный summary отчёта всех MVP gate с pass/blocked/manual.

## B. Staging API и безопасный transport

21. `[x]` Добавить JSON-режим staging compatibility probe.
22. `[x]` Добавить retry/backoff для transient 502/503 staging ответов.
23. `[x]` Добавить ограничение размера OpenAPI response.
24. `[x]` Добавить безопасную кодировку staging discovery query.
25. `[x]` Добавить проверку Content-Type для OpenAPI и discovery ответов.
26. `[x]` Добавить проверку security headers staging health endpoint.
27. `[x]` Добавить проверку CORS/origin policy на staging probe.
28. `[x]` Добавить проверку cache policy для всех discovery вариантов.
29. `[x]` Добавить проверку, что staging probe не логирует credentials или cookies.
30. `[x]` Добавить contract test для IPv4/IPv6 localhost URL.
31. `[x]` Добавить contract test для base URL с API prefix.
32. `[x]` Добавить диагностический код причины timeout/network failure.
33. `[x]` Добавить bounded response timeout для каждой staging операции.
34. `[x]` Добавить режим `REQUIRE_STAGING_API` с явным exit code contract.
35. `[x]` Добавить staging evidence template с hash OpenAPI документа.

## C. Media pipeline и signed access

36. `[x]` Добавить JSON summary production media preflight без содержимого файлов.
37. `[x]` Добавить проверку обязательного checksum metadata после S3 promotion.
38. `[x]` Добавить проверку Content-Disposition=inline для private object.
39. `[x]` Добавить проверку private/no-store cache-control signed URL.
40. `[x]` Добавить regression для expired signed URL TTL.
41. `[x]` Добавить regression для URL с quarantine сегментом в середине пути.
42. `[x]` Добавить regression для path-style и virtual-hosted S3 URL.
43. `[x]` Добавить bounded body read в media preflight.
44. `[x]` Добавить проверку cleanup обоих объектов при неуспешной promotion.
45. `[x]` Добавить проверку, что cleanup failure не скрывает исходную ошибку.
46. `[x]` Добавить deterministic fake S3 adapter для unit harness.
47. `[x]` Добавить deterministic fake AV adapter для clean/infected payload.
48. `[x]` Добавить regression MIME mismatch до обращения к storage.
49. `[x]` Добавить regression EXIF removal на JPEG fixture.
50. `[x]` Добавить отчёт orphan quarantine/private candidates без удаления.

## D. Удаление, retention и восстановление

51. `[x]` Добавить dry-run режим account deletion retention rehearsal.
52. `[x]` Добавить JSON schema отчёта deletion invariant counts.
53. `[x]` Добавить bounded batch size для retention checker.
54. `[x]` Добавить проверку redaction user identifiers в retention output.
55. `[x]` Добавить regression для повторного запуска retention checker.
56. `[x]` Добавить regression для pending/failed outbox после удаления аккаунта.
57. `[x]` Добавить regression для completed/dead-letter outbox redaction.
58. `[x]` Добавить отчёт orphan media до удаления без destructive action.
59. `[x]` Добавить проверку checksum backup artifact перед restore command.
60. `[x]` Добавить проверку запрета restore в исходную БД по умолчанию.
61. `[x]` Добавить проверку уникальности backup archive names.
62. `[x]` Добавить проверку отсутствия секретов в backup/restore diagnostics.
63. `[x]` Добавить runbook checklist для RPO/RTO recording.
64. `[x]` Добавить локальный synthetic restore fixture без production данных.
65. `[x]` Добавить контракт удаления временных quarantine объектов по TTL.

## E. Redis, concurrency и операции

66. `[x]` Добавить JSON summary Redis fail-closed check.
67. `[x]` Добавить bounded Redis ping timeout и безопасный exit code.
68. `[x]` Добавить deterministic fake Redis outage/reconnect harness.
69. `[x]` Добавить проверку отсутствия process-local fallback в production mode.
70. `[x]` Добавить regression для rate-limit recovery после reconnect.
71. `[x]` Добавить локальный transition matrix report для booking.
72. `[x]` Добавить локальный transition matrix report для quote.
73. `[x]` Добавить локальный transition matrix report для reschedule/cancel.
74. `[x]` Добавить локальный transition matrix report для no-show/complete.
75. `[x]` Добавить regression для duplicate idempotency key across terminal transitions.
76. `[x]` Добавить bounded concurrency worker count в synthetic harness.
77. `[x]` Добавить p95/p99 summary в concurrency harness.
78. `[x]` Добавить проверку controlled 409 при capacity conflict.
79. `[x]` Добавить проверку audit event для каждого sensitive transition.
80. `[x]` Добавить redacted incident fixture для worker/outbox failure.

## F. Pilot evidence, analytics и SEO

81. `[x]` Добавить JSON schema version checker для pilot evidence.
82. `[x]` Добавить проверку duplicate participant IDs в evidence.
83. `[x]` Добавить проверку duplicate journey IDs в evidence.
84. `[x]` Добавить проверку timestamp freshness policy без PII.
85. `[x]` Добавить проверку, что evidence metrics не содержат negative values.
86. `[x]` Добавить CSV-to-JSON converter для обезличенных pilot metrics.
87. `[x]` Добавить summary response/confirmation/cancel/no-show rates.
88. `[x]` Добавить проверку, что synthetic fixtures не принимаются как real.
89. `[x]` Добавить проверку redaction для email/phone/VIN/plate-like values.
90. `[x]` Добавить локальный HTML metadata report по public routes.
91. `[x]` Добавить Open Graph image existence check.
92. `[x]` Добавить canonical/robots consistency report.
93. `[x]` Добавить production URL safety check для SEO runner.
94. `[x]` Добавить ограничение размера HTML ответа SEO runner.
95. `[x]` Добавить locale coverage report для RU/EN/ES/RO.

## G. Legacy, release и документация

96. `[x]` Добавить проверку checksum migration inventory в release report.
97. `[x]` Добавить проверку неизменяемости исторических migrations.
98. `[x]` Добавить report replacement coverage для retained compatibility families.
99. `[x]` Добавить единый локальный release summary без production claims.
100. `[x]` Обновить evidence-журнал после каждой порции и проверить `git diff --check`.

## Внешние gates, которые этот backlog не закрывает

Staging PostgreSQL/Redis/JWT, SMTP, private S3/ClamAV, encrypted backup vault,
две API-реплики, реальные автосервисы и клиенты, production URL, legal approval,
независимый security review и письменный go/no-go остаются внешними условиями.

## Последнее доказательство

Порция 291 (04.09.2026) закрыла пункты 7–12: snapshot mock/backend маршрутов
(`227/257`, без payload/PII), source-contract формы поиска и query-state matrix,
disabled loading wiring, dark/light skeleton token regression, длинные RU/EN
названия и narrow-card overflow. `npm run check:local-mvp -- --static-only`
прошёл все автоматические проверки; единственный оставшийся статус — ожидаемый
manual responsive browser gate. Frontend: **145 файлов / 461 тест**; backend
build PASS. Full local runtime и production/staging evidence не подменяются
локальными фикстурами.

Порция 292 (04.09.2026) закрыла пункты 21–35: staging probe получил JSON-режим,
retry/backoff для 502/503/504, ограничение и SHA-256 OpenAPI, safe query encoding,
Content-Type/security/CORS/cache проверки, `credentials: omit`, bounded timeout,
диагностические коды и `REQUIRE_STAGING_API`. Добавлен шаблон
`STAGING_API_EVIDENCE_TEMPLATE.md`. Локальный `check:staging-api -- --json`
возвращает безопасный `skipped`, пока staging URL не задан; внешний pass не
имитируется.

Порция 293 (04.09.2026) закрыла пункты 36–45 и 48–50: media preflight получил
JSON summary, checksum/private metadata, inline/no-store signed access,
path-style/virtual-hosted и quarantine/TTL regressions, bounded streaming body
read, MIME/EXIF checks и orphan cleanup policy. Targeted backend media suite
**38/38 PASS**; реальные S3/ClamAV и cleanup replay остаются внешними.

Порция 294 (04.09.2026) закрыла пункты 51–57: retention rehearsal получил dry-run,
versioned JSON summary, bounded `--limit` (1–10 000), redacted invariant names и
регрессии для повторного запуска и outbox payloads во всех terminal statuses.
Локальный dry-run не открывает БД; фактический deletion/restore replay остаётся
внешним staging gate.

Порция 295 (04.09.2026) закрыла пункты 58–65: добавлен неразрушающий orphan-media
report, backup/restore contract с basename-bound SHA-256 проверкой до restore,
запретом восстановления в исходную БД, уникальными archive names, redaction
диагностики, RPO/RTO checklist и synthetic gzip fixture во временной директории.
Quarantine TTL-контракт проверяется по storage tier и grace period. `check:backup-restore`
и его 4 regressions проходят; реальные vault, WAL/PITR и изолированный staging
restore остаются внешними gates.

Порция 296 (04.09.2026) закрыла пункты 13–20: добавлен единый
`check-mvp-interaction-contract` и regression suite **2/2**, которые фиксируют
keyboard dropdown/Escape smoke, focus-visible стили, aria-label icon-only действий,
отсутствие text-only full-screen loader, сохранение фильтров при retry,
deterministic offline/reconnect fixtures, отсутствие platform payment-provider
runtime и JSON summary local MVP gate. Проверка подключена к `check:local-mvp` и
`quality:backend`; direct payment guidance остаётся только пользовательской
документацией, платёжные системы в runtime не добавляются.

Порция 297 (04.09.2026) закрыла пункты 46–47: добавлены
`DeterministicFakeS3Adapter` (put/copy/head/get/delete, operation history,
checksum) и `DeterministicFakeAntivirusAdapter` для clean/EICAR fixtures.
Backend unit regression **2/2 PASS**, TypeScript build PASS; адаптеры работают
только в памяти и не подключаются к production buckets или AV-сервисам.

Порция 298 (04.09.2026) закрыла пункты 66–70: Redis fail-closed preflight
получил versioned JSON summary, bounded timeout до 10 секунд, safe timeout/network
diagnostics и exit code; добавлены deterministic outage/reconnect fake и
регрессии recovery. Source contract подтверждает production fail-closed boundary
и отсутствие process-local fallback в production. Redis endpoint и multi-process
rehearsal остаются внешними инфраструктурными gates.

Порция 300 (04.09.2026) закрыла пункты 81–89: добавлен anonymized pilot
metrics toolkit с CSV→JSON конвертацией, summary response/confirmation/cancel/
no-show rates, schemaVersion/source guard, duplicate participant/journey IDs,
timestamp freshness до 90 дней, non-negative metrics и PII-like column/value
redaction. `check:pilot-evidence-toolkit` — PASS; `test:pilot-evidence-toolkit` —
**4/4 PASS**. Toolkit подготавливает evidence, но не создаёт real pilot файл и
не засчитывает synthetic fixtures как staging/production evidence.

Порция 299 (04.09.2026) закрыла пункты 71–80: `concurrency-matrix` получил
детерминированный transition report для booking/quote/reschedule/cancellation/
no-show, bounded worker count (1–16), p95/p99 latency summary, controlled 409
для capacity conflict, audit event на каждый sensitive transition и redacted
worker/outbox incident fixture. Duplicate terminal retries разделяются на
conflict/idempotent outcomes. Backend concurrency suite **6/6 PASS**, contract
suite PASS, server build PASS; реальный multi-process PostgreSQL/Redis replay
остаётся внешним gate.

Порция 301 (04.09.2026) закрыла пункты 90–95: SEO runner получил локальный
HTML-report для 12 сгенерированных public/provider routes, проверку существования
OG/Twitter image assets, canonical/robots parity между server metadata и
гидратируемым `SeoHead`, безопасную HTTPS/credential URL policy, bounded HTML
body read до **2 MiB** и coverage report для RU/EN/ES/RO. `npm run check:seo`
показывает все repository checks PASS; production Lighthouse и deployed HTML
остаются ручным evidence gate.

Порция 302 (04.09.2026) закрыла пункты 96–99: добавлен
`check-release-summary`/`test-release-summary` с SHA-256 migration inventory,
проверкой отсутствия изменений 67 исторических migrations до boundary
`1785700000000`, replacement coverage legacy manifest и versioned local summary
с `environment=local`, `productionClaims=false` и redacted external-gates list.
`test:release-summary` — **2/2 PASS**, `check:release-summary -- --json` —
`blocked=0`; staging/production release evidence не создаётся локально.
