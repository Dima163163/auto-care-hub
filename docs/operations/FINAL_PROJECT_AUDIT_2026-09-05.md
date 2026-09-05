# Финальная ревизия AutoCare Hub — 05.09.2026

Канонический план: [PILOT_SCOPE_FREEZE.md](./PILOT_SCOPE_FREEZE.md), v2.0.
Результат: **NO-GO для пилота с реальными данными**. Подготовка изолированного
staging и демонстрация на synthetic data могут продолжаться.

## Объём и достоверность

Проверены frontend/backend entrypoints, API/role boundaries, ключевые сценарии
заявок, quote и account lifecycle, media/retention/recovery tooling, migrations,
CI, конфигурация, продуктовые и security-документы, структура старых plans.
Это аудит путей с повышенным риском и evidence, не формальное доказательство
отсутствия ошибок в каждой строке и не независимый production pentest.

На старте: HEAD `2c6e401590af`, ветка main, 109 modified и 158 untracked файлов.
Рабочее дерево содержит накопленные изменения: результаты проверок относятся к
этому дереву, их нельзя приписать одному HEAD. Документация аудита подготовлена
в `codex/final-pilot-plan-2026-09-05`; commit/push/deploy в этом проходе не делались.
Runtime-код и прежние изменения сохранены.

Получены три содержательных read-only отчёта: release/test consistency,
backend security и frontend correctness. Первые две попытки специализированных
аудитов завершились лимитом и не засчитывались; завершившие отчёты учтены ниже.
Backend/frontend/design-system инструкции использованы для выбора проверяемых
границ, состояний и критериев доказательства. Новые skills не устанавливались.

## Подтверждённые findings и критерии закрытия

### CHANGE-C001 — P1: приватная WS-delivery после отзыва доступа

`server/src/modules/autocare/autocare.routes.ts:426,489`: JWT и участие
проверяются при подключении. `service-chat.gateway.ts:37` хранит открытые sockets
по channelId и отправляет новые события без проверки текущей сессии/membership.
Истечение JWT, блокировка и отзыв доступа сами по себе не удаляют этот listener.

Закрытие: оба WS маршрута прекращают private delivery после revoke, block,
deletion, membership revoke и expiry. Проверить уже подключённый socket, две
реплики, локальную и Redis-delivery. При недоступной проверке доступа — fail
closed. Статический путь подтверждён; реальный WS replay в аудите не запускался.

### CHANGE-C002 — P1: клиент может принять не ту версию quote

`autocare.routes.ts:549` передаёт только requestId; обработчик в
`autocare-request.service.ts:799` выбирает latestQuote. Между показом v1 и нажатием
«Принять» provider может создать v2. Row lock сериализует запись, но не связывает
её с условиями, которые видел клиент.

Закрытие: quoteId/version либо If-Match обязателен от UI до транзакции; v1 после
создания v2 возвращает 409, не создаёт accepted v2/booking/reservation. UI
показывает новые условия для отдельного согласия; повтор того же intent
идемпотентен. Нужны route/service/PostgreSQL и UI regressions.

### CHANGE-C003 — P1: cancel-vs-complete удаления аккаунта

`server/src/modules/users/account-deletion.service.ts:123` читает Pending без
FOR UPDATE, затем сохраняет Cancelled. Админский путь
`server/src/modules/admin/account-deletion-admin.service.ts:406` блокирует строку
и анонимизирует аккаунт. Cancel может прочитать прежний Pending, дождаться commit
completion и записать Cancelled поверх Completed; stale reason также рискует
вернуться после очистки. Существующий integration test проверяет cancel/cancel.

Закрытие: общая блокировка/CAS, проверка актуального terminal status и согласованный
audit. PostgreSQL interleavings в обоих порядках; Completed необратим через cancel,
анонимизированные поля не восстанавливаются. Возможность гонки подтверждена по
коду; SQL interleaving ещё требуется воспроизвести тестом.

### CHANGE-C004 — P1: часовой пояс браузера сдвигает запись

`src/pages/autocare-request/ui/RequestForm.tsx:72` создаёт browser-local Date,
вызывает setHours и отправляет ISO. Backend уже отдаёт slot.startsAt
(`autocare-request.service.ts:1260`), но frontend schema/type его не сохраняет
(`src/entities/automotive-service/api/autocareApi.ts:900,985`).

Детерминированный probe той же операции: 05.09.2026 10:00 в браузере
America/New_York становится 14:00Z, тогда как 10:00 сервиса в Москве — 07:00Z.
Закрытие: валидировать и отправлять серверный startsAt; отдельно отображать
timezone сервиса. Тесты разных browser/provider zones, полуночи и DST; реальный
booking API должен подтверждать именно выбранный slot.

### CHANGE-C005 — release evidence не воспроизводится по HEAD

`scripts/check-local-mvp.mjs:201` записывает HEAD, но проверяет изменённые и
untracked файлы. `git diff --check` проверяет пробелы, а не чистоту дерева.

Закрытие: dev report явно содержит dirty status + manifest/hash; release evidence
допускается только на immutable clean SHA и artifact hash. Проверить staged,
unstaged, untracked и отсутствие git metadata. Прохождение тестов в dirty tree
остаётся полезным dev evidence, но не разрешением выпуска.

### CHANGE-C006 — отсутствует обязательный release promotion gate

`scripts/check-release-summary.mjs:108` намеренно возвращает
environment=local, productionClaims=false; strict оценивает только local checks.
Команда с внешними незакрытыми gates возвращает exit 0. Это допустимо для local
diagnostic, но опасно принимать её за release sign-off. Workflow проверяет
источник PR dev, а отдельного обязательного общего evidence gate нет.

Закрытие: отдельный release mode/job проверяет все обязательные IDs, SHA/config,
evidence freshness, signatures и dependencies; missing/fail/stale → nonzero.
Local mode не обязан ломать ежедневную разработку. В RELEASE_EVIDENCE_TEMPLATE
убрать возможность waiver для обязательной безопасности/данных/legal/restore.

### CHANGE-C007 — immutability guard не покрывает опубликованные AutoCare migrations

`scripts/check-release-summary.mjs:23,41` ограничен boundary 1785700000000 и
рабочим diff; staged и уже committed изменения не сравниваются с published
checksums. При этом 1786310000000-AddAutoCareAppealPendingUniqueIndex.ts изменена.

Закрытие: сначала установить по release/applied inventory, была ли версия
развёрнута. Если да — восстановить опубликованный вариант с сохранением нужной
коррекции отдельным forward release step/migration. Если нет — документировать
это перед первой публикацией. Закрепить checksums всех опубликованных migrations,
fresh install и upgrade предыдущего release. Нельзя вслепую откатывать пользовательские
изменения или объявлять committed файл уже применённым на сервере.

### CHANGE-C008 — real full-stack CI запускает другой frontend runtime

`playwright.real.config.ts:15,33` при REAL_E2E_PREVIEW=true запускает Vite preview;
`.github/workflows/quality.yml` использует этот режим. Основной build — Next.

Закрытие: воспроизводимый production Next build/start + real Fastify/PostgreSQL/
Redis, совпадающие build env/proxy/ports и прямые URL. Проверить auth/CSRF/404,
hydration/loading, mutations и отсутствие runtime errors. Vite compatibility
не заменяет production execution.

### CHANGE-C009 — P1: logout failure и поздний refresh

`LogoutButton.tsx:35` сбрасывает RTK cache только после успешного logout.
`authApi.ts:195` чистит tokens/PWA, но не RTK state; `baseApi.ts:338` после await
refresh устанавливает token без проверки поколения сессии.

Закрытие: немедленно очистить локальную identity/private cache независимо от
ответа logout, явно обработать неудавшийся серверный revoke; late response от
старой identity не устанавливает credentials и не возобновляет запрос/действие.
Browser offline/500 logout, delayed refresh, A→B и Back tests. Control-flow gap
подтверждён; cross-account browser exploitation не воспроизводилось в аудите.

### CHANGE-C010 — P2: malformed date вызывает render exception

`RequestForm.tsx:53,117` получает date из URL без календарной проверки; форматирование
`new Date('garbageT12:00:00')` вызывает RangeError, что подтверждено Date probe.
Закрытие: bounded canonical date parser до render/query, impossible/leap-date
проверки, recoverable error/URL normalization, back/forward/reload regressions.

### CHANGE-C011 — валидный обезличенный evidence отвергается

`scripts/pilot-metrics-tools.mjs:76` применяет PII regex к целому JSON, включая
ключи plateCaptured/vinCaptured/reviewPhotoCount из опубликованного template.
Полезные metadata keys дают pii-like-value; сокращённый unit fixture этого не ловит.

Закрытие: schema-aware validation значений и безопасных keys, полный пример из
template принимается, реальные email/phone/VIN/plate/message/secret отклоняются;
duplicate IDs, stale timestamps, malformed/nonnumeric/negative metrics тоже
отклоняются. Source regex checker не является regression этого поведения.

### CHANGE-C012 — reliability data и release thresholds не связаны

`server/src/scripts/check-pilot-reliability.ts` фильтрует message.senderId по
provider IDs, хотя request messages записывают user.id
(`autocare-request.service.ts:501`). Нужна авторство-проверка по provider membership
и request, иначе реальные ответы сотрудников могут исключаться из samples.
`pilot-evidence-policy.ts` проверяет форму/минимум samples, но не thresholds
отдельного reliability checker; totals не должны расходиться с journeys.

Закрытие: реальные fixtures разных providerId/ownerId/staffId, client/system
messages и out-of-order dates; единая семантика response/confirmation/duplicates/
cancel/no-show, проверка totals и заданных до сбора данных SLO. Существующие
defaults — p95 30 min и confirmation reliability 95%, минимум 5 samples.
Это минимальный pilot check, а не статистическая гарантия надёжности.

### CHANGE-C013 — P2: расходятся политики suspended-provider

`provider-access.service.ts:81,134` не проверяет provider.status, тогда как
canManageProvider его проверяет. Через первый helper идут private request reads
и quote mutations. Закрытие: определить разрешённые действия по существующим
визитам при suspension, применить одну политику в HTTP/services/WS и добавить
negative tests owner + branch-member. Не запрещать support/recovery действия
без явно описанного исключения и audit.

### CHANGE-C014 — draft и async completion теряют владельца

`AutoCareRequestPage.tsx:32,75`, `RequestForm.tsx:57` и
`src/app/routes/route-groups.tsx:119`: state/async completion не привязаны к
identity/provider/service; late create продолжает setState/uploads после смены
контекста. Статически подтверждено отсутствие guards; полный browser replay открыт.

Закрытие: определить draft key (account/provider/location/offering/vehicle),
reset/preserve policy, session/request-generation checks для completion/uploads,
duplicate-submit guard. Проверить slow create → navigation/logout/новый provider,
retry idempotency и partial upload failure без переноса чужого черновика.

### CHANGE-N001 — содержание и документация

На момент аудита в `src/shared/config/translations/ru-part-4.ts:546` оставалось
обещание подписок, а часть `marketing.owners` сохраняла legacy cabinet/monetization
copy. В follow-up порции 306 активные EN/RU owner-тексты и partner point очищены;
тест переводов это фиксирует. Публичные contacts всё ещё требуют подтверждения;
внешняя принадлежность контактов не проверялась. Product/architecture/design maps
и отдельные ADR по-прежнему описаны по старому commercial scope. Runtime SDK
removal не доказывает очистку всех пользовательских текстов. Исторические
migrations и Redis subscriptions — не billing.

## Матрица охвата и оставшиеся доказательства

| Область | Что проверено | Что ещё требуется |
| --- | --- | --- |
| Auth/RBAC/WS | Role/branch/session code paths, конкретный WS revoke gap | HTTP/WS replay после revoke/suspension, MFA/step-up, независимый review |
| Workflow/data | Quote version и deletion race, booking timezone | PostgreSQL interleavings, bonus/review/idempotency matrix, clean/upgrade schema |
| Media/privacy | Storage/EXIF/quarantine/deletion contracts и локальные checks | Реальный private S3/ClamAV, ACL/URL expiry, partial failures и deletion replay |
| Recovery | Encryption/checksum/isolated restore harness | Backup schedule/vault/WAL, восстановление DB+media+ключей, RPO/RTO, purge после restore |
| Frontend | Routes/build/tests, auth/cache, booking state/URL logic | Production Next browser regression, responsive/themes/a11y и real devices |
| Ops/CI | Preflight, workflows, alerts/outbox/runbooks | Credentials, SMTP, две реплики, alert delivery, rollback, protected deployment |
| Supply chain | Lockfiles/CI scan declarations, assets/license contract documents | Свежий vulnerability/secret scan точного release, hosting/map/image/font evidence |
| Product/legal | Scope/decisions/consent/retention draft status | Один pilot jurisdiction packet, оператор/контакты, согласие и реальные участники |

## Проверки этого прохода

- `npm run check:local-mvp -- --static-only --json`: 39 PASS, 1 whitespace issue
  в редактируемом документе, 1 MANUAL responsive. Frontend **145/461**, Next build,
  backend build, parity **227/257**, route inventory **57** прошли. Пробелы исправлены
  и финальный `git diff --check` выполнен отдельно. Повтор полного gate после
  runtime fixes и freeze release SHA остаётся обязательным.
- Targeted frontend: **4 файла / 11 tests PASS**; найденные новые race/timezone
  сценарии в этих существующих tests не покрыты.
- `check:pilot-autonomous-plan`: **93 complete / 7 partial**; strict блокируется.
  `check:pilot-autonomous-next`: **100/100 по структуре локального списка**.
  Ни одна из этих численностей не является pilot readiness.
- `check:release-summary -- --json`: **8 local PASS**, productionClaims=false.
  Это не внешний release gate.
- `check:mvp-readiness`: **4 конфигурационных блока**, внешний manual gate.
- `check:production-operations`: **9 блоков / 6 manual** в доступной конфигурации.
- `check:pilot-evidence`: после разрешённого запуска IPC — ожидаемый ENOENT,
  отсутствует обезличенный real-pilot evidence file.
- PostgreSQL/Redis/S3/staging/real-device/pentest/restore и актуальный сетевой
  vulnerability scan в этом проходе не выполнены. Отсутствие credentials в
  рабочей среде не доказывает отсутствие инфраструктуры где-либо ещё.

## Как использовать результаты

Закрывать существующие V2 gates исправлением поведения и проверкой real execution.
Не создавать новые сотни source-only tasks ради роста числа галочек. После
каждого блока — diff, focused regression, evidence и статус затронутых строк;
пуш только после подтверждения пользователя. Изменять обязательный знаменатель
54 можно лишь отдельной версией с явным решением владельца.

## Follow-up после аудита — порция 303

После фиксации baseline локально закрыты наблюдения mock browser-аудита: выбор
конкретной idempotency-записи бонуса, revoke-приглашения по email, выбор только
видимого theme-switcher и доступная клавиатурная область fleet-таблицы. После
этого затронутая выборка release-аудита прошла **120/120** на Chromium, mobile и
tablet; long-label ES/RO сценарий — **3/3**. Последующий полный mock-аудит
`npm run test:e2e` прошёл **156/156** на Chromium, mobile и tablet. Полный frontend unit — **149/470**,
`OwnerFleetPanel` unit — **1/1**, а TypeScript, lint и `git diff --check` — PASS.

Это последующее dirty-tree evidence не переписывает исходные findings и не
закрывает внешние условия: immutable release SHA, production Next+real API,
staging, реальные устройства, MFA/SSO, restore, legal и pilot acceptance всё ещё
требуют отдельного доказательства. Канонический статус остаётся NO-GO;
подробная запись находится в `PILOT_LOCAL_GATE_EVIDENCE_2026-08-31.md`.

## Follow-up после аудита — порция 306

Активные EN/RU owner-маркетинговые тексты приведены к automotive pilot scope:
убраны legacy cabinet-rental и monetization обещания, а partner copy больше не
упоминает подписки. `translations.test.ts` — **9/9 PASS**, TypeScript, ESLint и
`git diff --check` — PASS. V2-MVP-10 остаётся `[~]`: контакты, demo-only данные,
права на контент и legal acceptance требуют отдельного подтверждения.

## Follow-up после аудита — порция 307

Видимые EN/RU landing и owner-dashboard подписи синхронизированы с automotive
scope: убраны beauty/wellness, legacy cabinet и free/no-card обещания из mock
карточек, категорий, onboarding и growth-плашки. Полный frontend unit после
изменения — **149 файлов / 471 тест**, TypeScript, ESLint и `git diff --check` —
PASS. V2-MVP-10 остаётся `[~]` до проверки реальных контактов, demo-only данных,
прав на контент и legal acceptance.

## Follow-up после аудита — порция 308

Owner-dashboard labels `mobileAddSpace`, `mobileMySpaces` и moderation
descriptions переведены с legacy «spaces» на service locations/точки сервиса.
Полный frontend unit — **149 файлов / 471 тест**, TypeScript, ESLint и
`git diff --check` — PASS; внешние staging и legal gates без изменений.

## Follow-up после аудита — порция 309

`validatePilotEvidenceEnvelope` переведён на schema-aware проверку значений:
безопасные metadata-ключи `plateCaptured`, `vinCaptured` и `reviewPhotoCount`
больше не блокируются по имени, а реальные email/phone/VIN/plate/message/secret
values по-прежнему отклоняются. Полный `PILOT_EVIDENCE_TEMPLATE.md` принят
отдельной regression; `pilot-metrics-tools.test.mjs` — **6/6 PASS**,
`check:pilot-evidence-toolkit` и `git diff --check` — PASS. Реальный pilot
evidence и внешний go/no-go gate не создавались; CHANGE-C011 закрыт на уровне
локального validator contract и остаётся внешним evidence condition.

## Follow-up после аудита — порция 310

`buildQualityMetrics` теперь связывает response message с request через
`provider.ownerId` или active `autocare_provider_memberships.userId`; branch
membership допускается только для соответствующего `request.locationId`.
Client/system, revoked и чужие provider/branch senders больше не создают ложные
response samples. Обновлены quality-monitoring и pilot quality/reliability
preflight queries; regression покрывает owner/member, client/system, revoked и
cross-branch cases. Focused reliability — **5/5**, backend unit — **276/1000**,
backend build и local MVP static checks — PASS. CHANGE-C012 закрыт на уровне
локальной attribution-семантики; реальные пять samples, thresholds и staging
multi-user evidence по-прежнему внешние условия.

## Follow-up после аудита — порция 311

В `AutoCareRequestPage` добавлена повторная проверка context generation после
`readFileAsBase64` и перед attachment mutation. Это закрывает локальный late
completion path при navigation/logout/provider change, сохраняя idempotency и
`Promise.allSettled`-изоляцию файлов. Client-path contract и regressions PASS,
targeted RequestForm/RequestPage — **3/3**, local MVP static — **39 PASS** плюс
ожидаемый manual responsive gate. Реальные slow-network identity-switch,
storage rollback и deployed browser evidence остаются внешним условием C014.
