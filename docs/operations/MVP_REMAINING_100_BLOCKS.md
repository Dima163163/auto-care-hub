# AutoCare Hub — оставшиеся MVP-блоки по 100 шагов

Этот файл — исполняемая очередь для продолжения локального MVP. Он раскладывает
только уже существующие условия `PILOT_SCOPE_FREEZE.md`, `FINAL_PROJECT_AUDIT`
и manual checklist на более мелкие действия. Новых обязательных критериев и
нового знаменателя не добавляет.

## Правило работы

Когда пользователь пишет «делай», берётся следующий блок из 100 шагов, начиная
с первого незакрытого `[ ]` в активном блоке. Для каждого шага Codex:

1. выполняет безопасную локальную часть;
2. запускает focused regression/evidence;
3. помечает `[x]`, `[~]` или `[E]` с причиной;
4. обновляет журнал evidence и указатель очереди;
5. не объявляет staging, production, device или owner sign-off закрытыми без
   соответствующего внешнего доказательства.

`[x]` — подтверждено, `[ ]` — готово к выполнению, `[~]` — локальная часть
готова, но нужен внешний replay, `[E]` — шаг нельзя выполнить без внешней
инфраструктуры, устройства или решения владельца.

Текущий указатель: **BLOCK-03, внешний acceptance**. BLOCK-01, BLOCK-02 и локальная
подготовка BLOCK-03 обработаны; оставшиеся `[~]` требуют внешнего replay, а `[E]` —
внешней инфраструктуры, устройства, участников или approval. После закрытия блока активируется
следующий. Статусы в этом файле — детализация выполнения; canonical progress
остаётся в `PILOT_SCOPE_FREEZE.md`.

## BLOCK-01 — локальный код, replay и evidence (100 шагов)

Основание: `V2-MVP-02`, `V2-MVP-05…V2-MVP-10`, `CHANGE-C001…C014`.

1. `[x]` Собрать список обоих AutoCare WebSocket routes и их auth boundaries (`C001`).
2. `[x]` Зафиксировать live session/membership check перед private delivery (`C001`).
3. `[x]` Добавить/проверить close при session revoke (`C001`).
4. `[x]` Добавить/проверить close при membership revoke (`C001`).
5. `[~]` Добавить/проверить close при provider suspension (`C001`).
6. `[~]` Добавить/проверить close при account deletion (`C001`).
7. `[~]` Добавить/проверить close при JWT/session expiry (`C001`).
8. `[x]` Прогнать single-socket revoke regression по первому WS route (`C001`).
9. `[x]` Прогнать single-socket revoke regression по второму WS route (`C001`).
10. `[x]` Зафиксировать fail-closed результат delivery после revoke (`C001`).
11. `[x]` Проверить, что quote accept payload содержит `quoteId` (`C002`).
12. `[x]` Проверить, что quote accept payload содержит `quoteVersion` (`C002`).
13. `[x]` Проверить привязку quoteId/version к UI snapshot (`C002`).
14. `[x]` Добавить regression stale quote → `409` (`C002`).
15. `[x]` Проверить отсутствие booking при stale quote (`C002`).
16. `[x]` Проверить отсутствие reservation при stale quote (`C002`).
17. `[x]` Проверить повтор того же acceptance intent (`C002`).
18. `[x]` Проверить сохранение accepted price в booking snapshot (`C002`).
19. `[x]` Проверить expiry quote и повторное предложение (`C002`).
20. `[x]` Зафиксировать quote acceptance evidence в integration report (`C002`).
21. `[x]` Проверить lock order account-deletion request (`C003`).
22. `[x]` Проверить terminal-state guard `completed → cancelled` (`C003`).
23. `[x]` Проверить terminal-state guard `anonymized → cancelled` (`C003`).
24. `[~]` Добавить interleaving completion-then-cancel regression (`C003`).
25. `[~]` Добавить interleaving cancel-then-completion regression (`C003`).
26. `[~]` Проверить stale reason после completion (`C003`).
27. `[~]` Проверить согласованный audit result для гонки (`C003`).
28. `[x]` Зафиксировать account-deletion integration evidence (`C003`).
29. `[x]` Проверить, что availability отдаёт server `startsAt` (`C004`).
30. `[x]` Проверить сохранение service timezone в API type (`C004`).
31. `[x]` Проверить отправку выбранного `startsAt` без browser-local conversion (`C004`).
32. `[~]` Прогнать Moscow browser / service timezone scenario (`C004`).
33. `[~]` Прогнать New York browser / Moscow service scenario (`C004`).
34. `[~]` Прогнать DST boundary scenario (`C004`).
35. `[~]` Прогнать midnight service-date scenario (`C004`).
36. `[x]` Прогнать malformed date/slot response (`C004`).
37. `[x]` Проверить отображение timezone рядом с выбранным временем (`C004`).
38. `[x]` Проверить booking persistence именно выбранного instant (`C004`).
39. `[x]` Зафиксировать timezone regression evidence (`C004`).
40. `[x]` Проверить API contract для server-side slot snapshot (`C004`).
41. `[x]` Проверить немедленную очистку private RTK cache при logout (`C009`).
42. `[~]` Прогнать logout при offline/network failure (`C009`).
43. `[~]` Прогнать logout при HTTP 500 (`C009`).
44. `[x]` Проверить блокировку refresh после logout (`C009`).
45. `[x]` Проверить generation guard позднего refresh (`C009`).
46. `[~]` Прогнать switch identity A → B (`C009`).
47. `[~]` Проверить, что Back не восстанавливает identity A (`C009`).
48. `[x]` Проверить очистку PWA/private cache после logout (`C009`).
49. `[x]` Проверить session-expired redirect и recoverable alert (`C009`).
50. `[~]` Зафиксировать auth race evidence (`C009`).
51. `[x]` Проверить canonical date parser до render (`C010`).
52. `[x]` Прогнать malformed URL date (`C010`).
53. `[x]` Прогнать impossible calendar date (`C010`).
54. `[x]` Прогнать leap-day invalid date (`C010`).
55. `[x]` Прогнать malformed slot query (`C010`).
56. `[x]` Проверить recoverable error вместо `RangeError`/white screen (`C010`).
57. `[x]` Проверить reload/back/forward после нормализации URL (`C010`).
58. `[x]` Зафиксировать malformed-input regression (`C010`).
59. `[x]` Проверить suspended provider read policy (`C013`).
60. `[x]` Проверить suspended provider quote mutation policy (`C013`).
61. `[x]` Проверить suspended provider booking mutation policy (`C013`).
62. `[x]` Проверить разрешённые support/recovery actions (`C013`).
63. `[x]` Проверить suspended HTTP boundary для owner (`C013`).
64. `[x]` Проверить suspended HTTP boundary для branch member (`C013`).
65. `[~]` Проверить suspended WebSocket boundary (`C013`).
66. `[x]` Проверить audit event для suspended denial (`C013`).
67. `[x]` Зафиксировать единый provider-access policy report (`C013`).
68. `[x]` Проверить draft key account/provider/location/offering (`C014`).
69. `[x]` Проверить vehicle identity в draft key (`C014`).
70. `[x]` Проверить reset draft при смене identity (`C014`).
71. `[x]` Проверить reset draft при смене provider/location (`C014`).
72. `[~]` Прогнать slow create → navigation (`C014`).
73. `[~]` Прогнать slow create → logout (`C014`).
74. `[~]` Прогнать slow create → новый provider (`C014`).
75. `[~]` Прогнать slow FileReader → context switch (`C014`).
76. `[x]` Проверить duplicate-submit guard (`C014`).
77. `[x]` Проверить upload partial-failure isolation (`C014`).
78. `[x]` Зафиксировать request-generation evidence (`C014`).
79. `[x]` Прогнать public state matrix: loading/error/offline/stale (`MVP-08`).
80. `[x]` Прогнать protected state matrix: permission/suspended/expired (`MVP-08`).
81. `[x]` Прогнать mock и real discovery retry с сохранением filters (`MVP-05`).
82. `[x]` Прогнать quote/booking/reschedule/cancel/no-show/complete chain (`MVP-06`).
83. `[x]` Прогнать bonus earn/redeem/refund/expiry history (`MVP-06`).
84. `[x]` Прогнать review create/edit/photo resolution (`MVP-06`).
85. `[x]` Прогнать все supported widths 360–1440 без overflow (`MVP-09`).
86. `[x]` Прогнать light/dark loading и skeleton states (`MVP-09`).
87. `[x]` Прогнать public/protected keyboard order и Escape (`MVP-09`).
88. `[x]` Прогнать Axe на public/owner/admin/super-admin (`MVP-09`).
89. `[x]` Прогнать RU/EN/ES/RO длинные labels и locales (`MVP-09`).
90. `[x]` Проверить отсутствие console/runtime errors в production Next (`MVP-09`).
91. `[x]` Запустить local migration checksum inventory (`MVP-02`).
92. `[x]` Запустить schema/integrity/migration smoke на изолированной БД (`MVP-02`).
93. `[x]` Проверить release summary на clean immutable SHA (`C005/C006`).
94. `[x]` Проверить staged/unstaged/untracked migration immutability (`C005/C007`).
95. `[x]` Проверить legacy/payment/subscription runtime scan (`MVP-10`).
96. `[~]` Проверить active owner/product/design copy consistency (`MVP-10`).
97. `[~]` Проверить demo-only contacts/numbers/images inventory (`MVP-10`).
98. `[x]` Повторить `quality:backend` после закрытия focused fixes.
99. `[x]` Обновить local MVP JSON/evidence с commit SHA.
100. `[x]` Перевести активный указатель на BLOCK-02 или зафиксировать внешний блокер.

## BLOCK-02 — staging, operations и security (100 шагов)

Основание: `V2-OPS-01…V2-OPS-14`, `V2-SEC-01…V2-SEC-20`, `CHANGE-C005…C008`.
Все шаги этого блока требуют staging/production-like доступа и стартуют как `[E]`.

1. `[~]` Создать изолированный staging deployment.
2. `[~]` Подключить HTTPS/DNS и закрыть internal endpoints.
3. `[~]` Разделить staging data от local/demo data.
4. `[~]` Зафиксировать deployment SHA и artifact hash.
5. `[E]` Проверить direct Next routes на deployed URL.
6. `[E]` Проверить Fastify proxy и `/api` base path.
7. `[E]` Проверить 404/protected redirects на deployed URL.
8. `[E]` Проверить deployed auth/CSRF/session cookies.
9. `[E]` Проверить deployed health live/ready.
10. `[~]` Сохранить redacted staging evidence envelope.
11. `[E]` Настроить production-like PostgreSQL secret.
12. `[E]` Настроить production-like Redis secret.
13. `[E]` Настроить strong JWT access secret.
14. `[E]` Настроить strong JWT refresh secret.
15. `[~]` Проверить trusted proxy configuration.
16. `[E]` Настроить SMTP host/port/user/password/from.
17. `[E]` Подтвердить SPF/DKIM/DMARC.
18. `[E]` Создать bootstrap super-admin.
19. `[E]` Ротировать bootstrap secret.
20. `[E]` Проверить secret redaction в deployed logs.
21. `[~]` Подключить private S3-compatible bucket.
22. `[~]` Подключить ClamAV clean path.
23. `[~]` Подключить ClamAV infected path.
24. `[~]` Прогнать quarantine → promotion clean upload.
25. `[~]` Прогнать infected upload rejection.
26. `[~]` Прогнать EXIF stripping на deployed storage.
27. `[~]` Проверить signed URL TTL.
28. `[~]` Проверить no-store/private media headers.
29. `[~]` Проверить cross-user media denial.
30. `[~]` Проверить deletion cleanup в bucket.
31. `[~]` Настроить encrypted offsite backup.
32. `[~]` Настроить WAL/PITR policy.
33. `[~]` Настроить object versioning/lifecycle.
34. `[~]` Создать isolated restore target.
35. `[~]` Выполнить DB checksum restore.
36. `[~]` Выполнить media checksum restore.
37. `[~]` Проверить restored migrations/schema.
38. `[~]` Записать измеренный RPO.
39. `[~]` Записать измеренный RTO.
40. `[~]` Проверить purge/tombstones после restore.
41. `[~]` Запустить отдельный worker process.
42. `[~]` Проверить reminder processing.
43. `[~]` Проверить outbox lease/retry.
44. `[~]` Проверить dead-letter handling.
45. `[~]` Проверить worker restart recovery.
46. `[~]` Проверить duplicate delivery idempotency.
47. `[~]` Подключить uptime/error monitoring.
48. `[~]` Подключить alert delivery mailbox/channel.
49. `[~]` Проверить redacted metrics labels.
50. `[~]` Провести incident alert acknowledgement.
51. `[~]` Запустить CI на immutable release SHA.
52. `[E]` Включить branch protection.
53. `[E]` Включить required checks.
54. `[~]` Включить dependency scan.
55. `[~]` Включить secret scan.
56. `[E]` Ограничить deploy identity.
57. `[~]` Запустить strict promotion gate.
58. `[~]` Проверить stale evidence rejection.
59. `[~]` Проверить dirty tree rejection.
60. `[~]` Проверить missing manifest rejection.
61. `[E]` Включить MFA/SSO для admin.
62. `[E]` Включить MFA/SSO для super-admin.
63. `[E]` Проверить owner/manager/staff step-up policy.
64. `[~]` Проверить recovery и reset policy.
65. `[~]` Проверить session/key revocation.
66. `[~]` Проверить TLS/HSTS/CSP deployed headers.
67. `[~]` Проверить CORS/origin policy deployed.
68. `[~]` Проверить login/upload/mutation rate limits.
69. `[~]` Остановить Redis на реплике A и проверить fail-closed.
70. `[~]` Восстановить Redis и проверить recovery.
71. `[~]` Запустить IDOR branch replay.
72. `[~]` Запустить owner/manager/staff matrix.
73. `[~]` Проверить request/quote/chat isolation.
74. `[~]` Проверить media/bonus/review isolation.
75. `[~]` Проверить WebSocket revoke replay.
76. `[~]` Проверить two-replica WebSocket delivery.
77. `[~]` Проверить malformed input no-500 policy.
78. `[~]` Проверить bounded body/count/size limits.
79. `[~]` Проверить security-event redaction.
80. `[~]` Проверить audit event completeness.
81. `[~]` Проверить export ownership/no-store.
82. `[~]` Проверить account deletion sessions/contacts.
83. `[~]` Проверить account deletion vehicles/chats/media.
84. `[~]` Проверить account deletion reviews/bonuses/links.
85. `[~]` Прогнать cancel-vs-complete interleaving.
86. `[~]` Проверить storage partial-failure retry.
87. `[~]` Проверить restored backup deletion invariants.
88. `[E]` Провести independent security review.
89. `[E]` Провести incident tabletop.
90. `[E]` Провести rollback rehearsal.
91. `[~]` Провести booking/quote race matrix multi-process.
92. `[~]` Провести reschedule/cancel/no-show race matrix.
93. `[~]` Провести complete/retry race matrix.
94. `[~]` Проверить capacity conflict 409 в staging.
95. `[~]` Проверить measured discovery p95/p99.
96. `[E]` Проверить SMTP setup/reset/notification delivery.
97. `[E]` Проверить production HTML/OG/robots/sitemap.
98. `[E]` Провести deployed Lighthouse run.
99. `[~]` Собрать signed operations evidence envelope.
100. `[E]` Передать блок на external approval/go/no-go.

## BLOCK-03 — manual, pilot и final acceptance (100 шагов)

Основание: `V2-MANUAL-01…02`, `V2-PILOT-01…08`, `V2-MVP-09…10` и manual checklist.
Все шаги требуют владельца продукта, реальных устройств, согласившихся участников
или внешнего legal/operations evidence и стартуют как `[E]`.

1. `[E]` Назначить владельца visual/keyboard приёмки.
2. `[x]` Открыть чистое окно браузера.
3. `[x]` Проверить home на 360 px, light theme.
4. `[x]` Проверить home на 360 px, dark theme.
5. `[~]` Проверить services на 390 px.
6. `[~]` Проверить services на 414 px.
7. `[~]` Проверить services на 540 px.
8. `[~]` Проверить provider на 682 px.
9. `[~]` Проверить owner pages на 768 px.
10. `[~]` Проверить admin pages на 790 px.
11. `[~]` Проверить protected pages на 1024 px.
12. `[~]` Проверить public pages на 1280 px.
13. `[~]` Проверить super-admin на 1440 px.
14. `[x]` Проверить placeholder услуги.
15. `[x]` Проверить floating labels.
16. `[x]` Проверить loading shell.
17. `[~]` Проверить light/dark skeletons.
18. `[x]` Проверить карту и карточки.
19. `[x]` Проверить gallery dialog.
20. `[x]` Проверить mobile menu.
21. `[x]` Пройти public Tab order.
22. `[x]` Пройти protected Tab order.
23. `[x]` Проверить focus-visible в light theme.
24. `[x]` Проверить focus-visible в dark theme.
25. `[x]` Проверить Enter на primary actions.
26. `[~]` Проверить Space на buttons/toggles.
27. `[x]` Проверить Escape dropdown.
28. `[x]` Проверить Escape dialog/gallery.
29. `[x]` Проверить focus return.
30. `[x]` Проверить disabled controls.
31. `[E]` Запустить VoiceOver на macOS/iOS.
32. `[E]` Проверить VoiceOver public search.
33. `[E]` Проверить VoiceOver provider profile.
34. `[E]` Проверить VoiceOver request form.
35. `[E]` Проверить VoiceOver quote/booking.
36. `[E]` Проверить VoiceOver cancellation/error.
37. `[E]` Проверить VoiceOver labels RU/EN.
38. `[E]` Проверить VoiceOver error announcements.
39. `[E]` Проверить VoiceOver overlay back/focus.
40. `[E]` Проверить VoiceOver portrait/landscape.
41. `[E]` Запустить TalkBack на Android.
42. `[E]` Проверить TalkBack public search.
43. `[E]` Проверить TalkBack provider profile.
44. `[E]` Проверить TalkBack request form.
45. `[E]` Проверить TalkBack quote/booking.
46. `[E]` Проверить TalkBack cancellation/error.
47. `[E]` Проверить TalkBack labels RU/EN.
48. `[E]` Проверить TalkBack loading/disabled states.
49. `[E]` Проверить TalkBack Back overlay behavior.
50. `[E]` Проверить TalkBack portrait/landscape.
51. `[E]` Выбрать pilot city/zones.
52. `[E]` Назначить pilot operator.
53. `[E]` Утвердить support contacts.
54. `[E]` Утвердить jurisdiction/privacy rules.
55. `[E]` Подключить малый сервис.
56. `[E]` Подключить multi-staff service.
57. `[E]` Проверить service prices/hours.
58. `[E]` Проверить service roles/branches.
59. `[E]` Проверить service contacts/photos.
60. `[E]` Получить service consent.
61. `[E]` Пригласить 5–10 клиентов.
62. `[E]` Получить client consent.
63. `[E]` Пройти fixed-price request journey.
64. `[E]` Пройти quote request journey.
65. `[E]` Пройти booking confirmation.
66. `[E]` Пройти reschedule.
67. `[E]` Пройти cancellation.
68. `[E]` Пройти no-show.
69. `[E]` Пройти completion.
70. `[E]` Пройти review/photo.
71. `[E]` Пройти bonus lifecycle.
72. `[E]` Пройти duplicate request.
73. `[E]` Пройти offline retry.
74. `[E]` Пройти timeout retry.
75. `[E]` Пройти expired session.
76. `[E]` Пройти complaint submission.
77. `[E]` Пройти moderation decision.
78. `[E]` Пройти support escalation.
79. `[E]` Пройти recovery after service error.
80. `[E]` Проверить отсутствие duplicate booking.
81. `[E]` Собрать response-time metrics.
82. `[E]` Собрать confirmation metrics.
83. `[E]` Собрать cancel/no-show metrics.
84. `[E]` Собрать duplicate/retry metrics.
85. `[E]` Собрать upload/mail/complaint metrics.
86. `[E]` Проверить anonymization/PII redaction.
87. `[x]` Проверить evidence freshness.
88. `[E]` Проверить evidence participant/journey uniqueness.
89. `[E]` Проверить consent/retention record.
90. `[E]` Подписать pilot evidence envelope.
91. `[~]` Проверить отсутствие P0/P1.
92. `[E]` Назначить owner/date/workaround для P2.
93. `[E]` Подтвердить понятность сценариев сервисами.
94. `[E]` Подтвердить понятность сценариев клиентами.
95. `[E]` Подтвердить support runbook.
96. `[E]` Подтвердить rollback plan.
97. `[E]` Подтвердить recovery/incident contacts.
98. `[E]` Получить legal/privacy approval.
99. `[E]` Получить product-owner visual/keyboard sign-off.
100. `[E]` Зафиксировать итоговый go/no-go.

## Источник статусов

Канонический процент остаётся в [`PILOT_SCOPE_FREEZE.md`](./PILOT_SCOPE_FREEZE.md):
сейчас принято 3/54 обязательных условий. Локальные автоматические результаты
фиксируются в [`PILOT_LOCAL_GATE_EVIDENCE_2026-08-31.md`](./PILOT_LOCAL_GATE_EVIDENCE_2026-08-31.md).
