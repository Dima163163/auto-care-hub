# Дополнительный полный аудит AutoCare Hub — 3 октября 2026

Рабочий реестр: пополняется сразу после подтверждения каждой находки. Анализ текущей рабочей копии, а не только исторических аудитов. После завершения аудита пользователь разрешил выполнять срочные исправления партиями по 1–2, каждое отдельным коммитом; результаты записываются рядом с исходными находками.

Исходный аудит: **29 пунктов — 13 срочных (9 P1, 4 P2) и 16 несрочных**. У каждого ниже есть подтверждение, последствия, вариант улучшения и критерий приёмки. После U09/U11/U12/U13/U07/U06/U10/U04 остаются **5 срочных / 19 несрочных**; исправлены 8 пунктов, добавлены N17–N19. U09/U11/U12/U13 опубликованы в `main` через PR #6 (`a81749b`). U07/U06 — отдельные коммиты `6845517` / `676f22a`, обе Quality-проверки PASS на `fde2d05`, PR #7 слит в `main` (`2f99bf1`); fetched main tree точно совпадает с проверенным dev. Владелец снял только обязательный approval; PR, Application CI и остальные ограничения сохранены. U10 (`977f927`) и U04 исправлены локально следующей отдельной партией; их собственный live CI и публикация ещё впереди. В реестре теперь 32 исторических пункта; открытые production/pilot evidence не считаются закрытыми локальными тестами.

## Основание и границы

- Исходный commit: `bb3fa47`, ветка `codex/pilot-recommended-hardening-2026-09-23`.
- До аудита уже изменён `server/src/scripts/check-autocare-integrity.ts`, добавлены неотслеживаемые `autocare-integrity-manifest.ts` и его тест. Эти изменения сохраняются; результат проверки рабочей копии не равен результату commit.
- Node.js: `v24.13.1`; зависимости frontend/backend установлены. Docker daemon недоступен; изолированная PostgreSQL/Redis integration-проверка не выполнена. Порт 5173 занят другим приложением; AutoCare проверялся на собственных временных Next servers 3187/3188.
- Срочные: подтверждённые ошибки безопасности, целостности данных, основных сценариев или блокирующие проверки. Несрочные: управляемые ограничения, поддерживаемость и улучшения без доказанного немедленного ущерба. `P1` — высокий риск, `P2` — средний, `P3` — низкий.
- Повторная находка получает ссылку на старый ID; исправленная проблема не возвращается в открытый список. Недоступная внешняя проверка отмечается как отсутствие доказательства, а не как установленный дефект.
- Этот реестр не добавляет условия к 54 каноническим воротам пилота и не изменяет их проценты.

## Срочные исправления

### U01 · P1 · Подключить production-провайдер ключей шифрования

**Подтверждение:** `server/src/server.ts:24` вызывает `assertDataEncryptionProviderReady()` до запуска приложения. `field-encryption.ts:128-135` всегда отклоняет production без `configureDataEncryptionKeyProvider()`. Во всём `server/src` нет вызова configure: только объявление. Изолированная проверка с `NODE_ENV=production` воспроизводит `Production field encryption requires an external KMS key provider.`

**Последствия:** текущий production entrypoint не запускается; это программный блокер, который не снимается заполнением существующих env-переменных.

**Улучшение:** реализовать и подключить выбранный внешний провайдер до ORM/migration/API/worker; согласовать lifecycle и недоступность KMS, подготовить конфигурацию и контролируемый startup smoke. Не разрешать local keyring в production как обход.

**Приёмка:** production startup с тестовым адаптером доходит до слушающего API/worker; отсутствие/отказ KMS даёт понятный контролируемый отказ; production migration и restore используют тот же согласованный ключевой контур. Статус: открыто, новая находка.

### U02 · P1 · Привязать шифротекст к конкретной записи и владельцу

**Подтверждение:** `field-encryption.ts:44-46` строит AAD только из table/column. Encrypt/decrypt не принимают ID записи/tenant. Синтетическая проверка подтверждает, что envelope одного пользователя читается в контексте той же колонки другого пользователя. `sensitive-data-subscriber.ts:30-34` также не сверяет email с blind index; для OAuth такая сверка есть.

**Последствия:** при наличии записи в БД можно переставить корректные зашифрованные телефоны, сообщения, snapshot или email между записями без ошибки аутентификации. Это сценарий атакующего с доступом на запись; возможность такого доступа через публичный API в аудите не доказана.

**Улучшение:** включить стабильные record ID, tenant/owner и имя поля в AAD, для идентификаторов сверять ciphertext с HMAC-индексом; пересмотреть subscriber/transformer, где нет контекста строки. Выпускать новую версию envelope и мигрировать старую.

**Приёмка:** перестановка envelope между двумя записями/провайдерами отклоняется; корректное чтение, удаление и восстановление сохраняются. Статус: открыто, новая находка.

### U03 · P1 · Закончить MFA/step-up для привилегированных ролей

**Подтверждение:** текущие auth/OAuth/session modules не содержат обязательного второго фактора и проверки свежей step-up аутентификации для admin/super-admin. Проблема остаётся в `docs/operations/MVP_PILOT_IMPROVEMENT_PLAN_2026-09-23.md:26`.

**Последствия:** привилегированный доступ защищён паролем/обычной сессией; компрометация открывает административные действия и чувствительные материалы.

**Улучшение:** выбрать IdP/SSO или MFA, обязательную политику для обеих ролей, recovery и повторную проверку перед чувствительным чтением/экспортом/изменением полномочий.

**Приёмка:** пароль без второго фактора не даёт привилегированной сессии; step-up expiry, recovery, отзыв и аудит проходят негативные сценарии. Статус: открыто, повтор security audit 26.09, V2-SEC-02.

### U04 · P1 · Аутентифицировать backup до передачи SQL на исполнение

**Подтверждение до исправления:** `server/scripts/backup.sh` использовал AES-256-CBC и соседнюю SHA-256 сумму. `restore.sh:89-95` расшифровывает напрямую в `gzip`, затем `psql --single-transaction`. Неподписанная сумма не защищает от подмены архива и checksum вместе. Финальная ошибка upstream может возникнуть уже после получения SQL процессом psql.

**Последствия:** целостность архива не подтверждается криптографически; single transaction у psql не связывает commit с успешным завершением всех upstream-процессов. Не утверждается, что старый архив уже был подменён.

**Улучшение:** аутентифицированный формат (AEAD или зрелое backup-решение), полная проверка и распаковка в защищённый временный файл до запуска SQL, удаление временного файла; репетиция повреждённого/подменённого/неполного архива.

**Приёмка:** неверный тег/ключ/усечённый gzip не запускает psql и не изменяет тестовую БД; корректный backup восстанавливается.

**Исправление 03.10:** новый формат `ACHBKP01` использует AES-256-GCM с 16-byte tag, случайными salt/nonce и полным header в AAD. PBKDF2-SHA256: 600000 iterations по умолчанию, принимаемый диапазон 600000–2000000. Restore сначала завершает аутентификацию, проверяет весь gzip и распаковывает полный SQL в private temp directory (700, файлы 600); только затем запускает psql. Stage удаляется при любом исходе, существующий output не перезаписывается. Production plaintext restore и старый CBC формат отклоняются. Старые архивы не изменяются: до перехода нужен свежий backup из доверенного источника; legacy recovery требует отдельного контролируемого offline процесса. Нужны Node.js и место для gzip + полного SQL.

**Доказательство:** до исправления испорченный gzip запускал fake psql; regression воспроизведён. После — **13 новых offline cases PASS**, включая header/ciphertext/tag с пересчитанным checksum, неверный ключ, truncation, legacy CBC, valid AEAD с неверным gzip, production plaintext denial и round-trip реальных shell scripts на synthetic SQL. Ни один негативный case не запускает SQL consumer; успешный получает полный точный SQL, stage очищен. Server tooling **18 PASS**, root backup/ops contract tests **7 PASS**, contract checks, shell syntax и lint PASS. Это тесты процесса с fake pg_dump/psql, без подключения к обычной БД. Внешняя PostgreSQL restore rehearsal и RPO/RTO evidence остаются открытыми. Статус: программное исправление выполнено локально отдельным коммитом; повтор security audit 26.09.

**Первый CI и коррекция контракта:** backend на `0b0defc` остановился до DB smoke: прежний operations preflight требовал строку `openssl enc -aes-256-cbc`. Контракт обновлён на ACHBKP01/GCM/AAD/tag и полное SQL staging, защита не отключена. Локально воспроизведены оба failed preflight cases; после исправления все **15 ops harness tests PASS** и весь `quality:backend` PASS, включая 18 tooling, 313 files / 1241 unit tests и build. PR #8 получает обновлённый candidate и повторный полный CI. U10/U04 пока не опубликованы в main.

### U05 · P2 · Не терять идентификаторы при ротации ключей

**Подтверждение:** `field-encryption.ts:219-228` вычисляет blind index ключом текущего `activeKeyId`, но индекс `h1_...` не содержит key ID и поиск не пробует старые ключи. При переключении на ключ с другим `indexKey` синтетическая проверка получает другой индекс для того же email. `openProviderSubject` дополнительно сверяет старую OAuth-запись текущим ключом.

**Последствия:** смена пары ключей делает существующие email недоступными для поиска/входа, ломает OAuth и дедупликацию. Ротация только KEK с сохранением indexKey не вызывает этого эффекта, но такой контракт в коде не закреплён.

**Улучшение:** разделить lifecycle KEK и HMAC-ключа; поддержать version/key ID индекса, dual lookup и повторяемое обновление индексов или явно запрещать несогласованную смену indexKey.

**Приёмка:** зарегистрированный пользователь входит и сохраняет OAuth/приглашения после ротации; дубликат email не появляется; старый ключ можно убрать после сверки. Статус: открыто, новая находка.

### U06 · P2 · Исправить поиск повторного приглашения после шифрования email

**Подтверждение:** `provider-membership.service.ts:143-149` сравнивает `invitation.email = :email` с открытым адресом; колонка теперь содержит HMAC (`provider-invitation.entity.ts:32`). String SQL QueryBuilder не применяет transformer к произвольному параметру. Уникальный индекс pending scope остаётся в migration `1786080000000`; общий error handler не обрабатывает SQL `23505` как ожидаемый конфликт.

**Последствия:** уже отправленное приглашение не обнаруживается предварительной проверкой; повторная отправка упирается в уникальность и возвращает 500 вместо 409. Уникальный индекс предотвращает дубль, поэтому это не утечка и не двойное приглашение.

**Улучшение:** object where с transformer либо явный blind index; отдельно классифицировать конфликт уникального scope. Проверить истёкшее pending-приглашение и гонку двух отправок.

**Приёмка:** повтор действующего приглашения возвращает 409; конкурентная отправка создаёт один объект; истёкший scope можно перевыпустить.

**Исправление 03.10:** поиск использует object where TypeORM с email transformer внутри транзакции и row lock. Истёкший pending объект переводится в expired перед сохранением замены; partial unique index разрешает гонку отсутствующей строки, только его `23505` классифицируется как 409. Уведомление выполняется после успешного commit. Четыре regression cases падали до исправления; после него **5 новых unit cases PASS**, включая фактическую генерацию SQL TypeORM с HMAC вместо открытого email, NULL scope и FOR UPDATE без подключения к БД. Три HTTP/PostgreSQL cases проверяют повтор с uppercase email, перевыпуск истёкшего scope и две конкурентные отправки. Backend **312 files / 1213 tests**, build, full lint, строгие типы нового unit-теста и типы integration-файла в обычном strict режиме PASS. HTTP/PostgreSQL cases локально не запускались: disposable DB/Redis отсутствуют. Статус: исправлено локально отдельным U06 коммитом; live replay ожидает CI этой партии.

**Live CI 03.10:** PR #7 `fde2d05`, Quality run `37122629168`, backend job `111201602299` PASS. Все 11 branch-access HTTP cases, включая три новых invitation cases, прошли. Integration: **16 files / 68 tests PASS, 1 skipped**; полный backend suite: **403 files / 1435 tests PASS, 1 skipped**. Пропущенный прежний admin concurrency case также пропускался на `14c04ba` и записан в N14; он не заменяет доказательство трёх новых U06 cases.

### U07 · P1 · Изолировать интеграционные тесты от рабочей БД и Redis

**Подтверждение:** `server/src/test/setup.ts:7-12` открывает общий `AppDataSource` из обычной конфигурации, комментарий допускает ту же БД «with care». `test:integration` вызывает Vitest напрямую, setup не требует отдельной test DB или подтверждения; отдельная команда prerequisite-check не вызывается автоматически.

**Дополнительное подтверждение 03.10:** `src/test/rate-limit-cleanup.ts` сканирует `ratelimit:*` и удаляет все найденные ключи в настроенном Redis перед каждым тестом. Даже отдельный PostgreSQL target не изолирует такой cleanup от обычного Redis URL/DB.

**Последствия:** запуск стандартной команды с рабочим env выполняет создающие/изменяющие/удаляющие данные тесты против выбранной рабочей БД. В этом аудите интеграционная команда не запускалась из-за отсутствия безопасной БД.

**Улучшение:** отдельный `TEST_DATABASE_URL`, обязательный запрет production/рабочего имени, проверка окружения до initialize, выделенный ephemeral database в локальном runner и CI; cleanup только своего namespace.

**Приёмка:** команда без разрешённых test targets завершается до подключения; production URL/name, shared Redis DB и remote hosts отвергаются; тесты проходят на disposable services.

**Исправление 03.10:** общий setup для integration и полного backend `npm test` требует `NODE_ENV=test`, явные `TEST_DATABASE_URL` и `TEST_REDIS_URL`. PostgreSQL — только loopback, имя `*_test` / `*_test_<id>` без prod/production labels; Redis — loopback и явно выбранная DB 1–15. Query/fragment запрещены, чтобы параметры URL не могли изменить уже проверенный host/database. До динамических импортов конфигурации устанавливаются только разрешённые test URLs; обычные dotenv URL не выбирают сервисы для тестов. CI backend использует свои ephemeral services и Redis DB 15; README описывает disposable targets. Политика **24 cases PASS**, строгая проверка типов setup/policy, full lint и backend unit **311 files / 1208 tests PASS**. Фактический integration command без targets завершился до импорта теста/конфигурации, без подключения. Валидный live PostgreSQL/Redis replay локально не выполнялся; новая партия пока не опубликована и ожидает отдельной CI-проверки. Статус: исправлено локально в отдельном U07 коммите.

**Live CI 03.10:** та же новая конфигурация PR #7 `fde2d05` прошла schema/migration smoke, integration профиль и полный backend suite на ephemeral PostgreSQL и Redis DB 15. Положительный запуск разрешённых targets подтверждён CI; обычный developer env не использовался.

### U08 · P2 · Удалить mock-профили из реальной Next-сборки

**Подтверждение:** свежая сборка `NEXT_PUBLIC_API_MODE=real` содержит `service@example.com` и `+7 (495) 645-35-35` в `.next-audit-20261003/static/chunks/1137.f37eb6f308ac493d.js`. Это клиентский lazy chunk с mock-профилями. `scripts/check-production-fixture-leakage.mjs` проверяет только `dist/assets` Vite, а не production Next; CI запускает эту проверку после отдельной Vite-сборки.

**Последствия:** заявленный запрет fixture leakage не покрывает реально выпускаемый frontend. Это попадание синтетических контактов в артефакт, не доказательство показа этих контактов пользователю в real mode и не утечка реальных данных.

**Улучшение:** исключать mock tree на этапе real Next build; проверять все выпускаемые Next client chunks и публичный initial HTML. Сохранить mock build отдельным тестовым профилем.

**Приёмка:** real Next artifact не содержит fixture-маркеры/MSW fixtures, mock build работает; CI намеренно внесённый маркер в Next chunk отклоняет. Статус: открыто, регрессия границы, связана с V2-MVP-10.

### U09 · P1 · Санитизировать необработанные ошибки перед Fastify/Pino logging

**Подтверждение:** `server/src/shared/errors/error-handler.ts`, ветка unhandled, передаёт `err: error` в `app.log.error`; `server/src/app.ts` redaction не скрывает `err.parameters`, `err.query` и `err.driverError.detail`. Синтетический `QueryFailedError` через Fastify с теми же путями redaction сохраняет `synthetic-private-email@example.test` из parameters в журнале. Безопасный `DatabaseLogger` не устраняет второй raw-log этой ошибки.

**Последствия:** ошибки БД могут переносить значения параметров и детали ограничений в обычные журналы. Фактические production-журналы не читались; утечка реальных данных не заявляется.

**Улучшение:** safe serializer для err с allowlist name/code/request ID и очищенным сообщением; убрать parameters/query/detail из общего канала, сохранить необходимую диагностику в закрытом безопасном контуре. Проверить вложенные cause/AggregateError.

**Приёмка:** synthetic email, VIN, текст сообщения и credentials отсутствуют во всех строках логов SQL/error-handler при сохранении кода ошибки и request ID.

**Исправление 03.10:** error handler передаёт allowlisted `serializeError` projection вместо raw Error; incident metadata использует безопасное имя. Общий Fastify `err` serializer использует тот же контур и не сохраняет stack/cause/query/parameters/driver details. SQL diagnostics полностью заменяются на `Database query failed.` с SQLSTATE, поскольку произвольный текст строки нельзя надёжно очистить regex. Aggregate SQL errors обрабатываются с пределами глубины/числа/длины; malformed getters не ломают logger. Сохранены безопасные обычные diagnostics и request ID. Regression tests проверяют реальные Fastify/Pino log lines, external report и HTTP 500 response на synthetic email/phone/VIN/message/password.

**Статус:** исправлено локально, отдельный коммит U09; приёмка unit/HTTP inject выполнена. Production log inspection и реальный SQL replay не выполнялись.

### U10 · P2 · Закрыть cache-policy для остальных приватных API

**Подтверждение:** `app.ts:137-143` устанавливает no-store только для четырёх prefix: owner clients/requests, v1 requests/chats. В `autocare.routes.ts:382-388` приватные broadcast/guarantee/expert/fleet GET не задают cache headers; `requireAuth` тоже этого не делает. Другие приватные projections, например owner members/analytics и бонусные счета, также вне этого списка.

**Последствия:** часть ответов с приватными snapshot/заметками не имеет явного запрета browser cache; это неполное исправление прежней cache-проблемы. Кэширование конкретным браузером/CDN и раскрытие другому человеку пока не воспроизведены.

**Улучшение:** общий no-store contract для authenticated/private routes, публичное кэширование только через явный allowlist; проверить 401/403 и attachment redirects/downloads.

**Приёмка:** route-level проверка каждого private GET подтверждает `Cache-Control: private, no-store`, public discovery сохраняет согласованный cache.

**Исправление 03.10:** общий onSend устанавливает `private, no-store` / `Pragma: no-cache` по умолчанию, включая ошибки, redirects, downloads и новые пути. Исключения только для GET/HEAD discovery и трёх публичных image routes по зарегистрированному route pattern, с явной public cache policy и успешным/304 статусом; credentials или Set-Cookie запрещают public cache. Hook зарегистрирован после cookie plugin, поэтому видит фактический Set-Cookie. Публичные TTL/ETag сохраняются для анонимных запросов. 18 regression cases падали на прежней политике; после исправления **28 actual Fastify cases PASS**. Backend **313 files / 1241 tests**, build, full lint, строгие типы новых tests PASS. В HTTP suites добавлены семь 401 probes и cache assertions для уже существующих authenticated catalog/reviews/analytics и permission-denied responses. Новый live replay пока не выполнялся; PR #7 предыдущей партии уже слит в main. Статус: исправлено локально, отдельная партия U10.

### U11 · P1 · Убрать безусловный admin-доступ к содержимому broadcast-заявки

**Подтверждение:** `autocare-marketplace.service.ts:417-419` разрешает `assertOwnerBroadcastAccess` любому admin/super-admin без назначения дела/причины; `getAutoCareBroadcastRequest:473-514` возвращает `issueDescription`, `vehicleSnapshot` и все предложения. HTTP route `/v1/broadcast-requests/:broadcastId` требует только requireAuth. Audit/step-up/scoped exception в этом чтении нет.

**Последствия:** знание ID даёт рядовому admin доступ к клиентскому описанию и снимку автомобиля независимо от ограниченного moderation-access, реализованного для обычной заявки/переписки. Массовое получение чужих ID или факт чтения реальных данных в этом аудите не заявляются.

**Улучшение:** убрать доступ по одной роли; новые moderation/support permissions, если они потребуются продукту, должны иметь назначение, причину, срок и audit. Super-admin sensitive read также требует согласованной break-glass/step-up policy.

**Приёмка:** admin/super-admin без participant scope получает 403 без private payload; роль не расширяет доступ. Клиент читает свою заявку, provider participant видит только свои разрешённые филиалы/предложения. Нового административного sensitive read без назначения/audit не появляется.

**Исправление 03.10:** удалены обе role-only ветки: из `assertOwnerBroadcastAccess` и из выбора полного offers projection. Admin/super-admin теперь проходят обычную проверку provider `requests` permission, активного сервиса, branch и market; при наличии такой membership их offers ограничены её филиалами. Client-ID ownership сохраняет доступ к собственному запросу и всем допустимым предложениям. Отдельного scoped broadcast moderation workflow сейчас нет; этот коммит не создаёт administrative bypass или новый support endpoint.

**Статус:** исправлено локально, отдельный коммит U11. До исправления 4 новых regression cases падали; после — admin/super-admin denial, их branch projection, обычный owner и клиент проходят. Mock-режим имеет отдельное расхождение N17; actual PostgreSQL/authenticated browser replay не выполнялся.

### U12 · P1 · Обновить Next.js с critical advisory в production-зависимости

**Подтверждение:** свежий `npm audit --omit=dev --audit-level=high` 03.10.2026 — frontend **1 critical**, установлен Next `16.3.3`. [Advisory владельца Next](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j) / [GitHub Reviewed](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j): затронуты `>=16.2.0 <16.3.6`, patch `16.3.6`.

**Последствия:** production dependency gate сейчас FAIL. Advisory относится к Node `ImageResponse` из `next/og` с контролируемым атакующим SVG-вводом. Поиск по приложению не нашёл `next/og`/реального ImageResponse route: достижимость RCE в этом проекте **не подтверждена**. Установка затронутой версии не равна доказанному эксплойту.

**Улучшение:** обновить Next в пределах согласованной ветки исправлений до версии вне advisory range, обновить lock и перепроверить App Router/metadata/production build. Не выполнять автоматический `audit fix --force` без оценки.

**Приёмка:** production audit больше не содержит advisory; Next production build и mock/real browser checks проходят.

**Исправление 03.10:** Next закреплён на `16.3.6`, обновлены только соответствующие Next/env/SWC lock entries. Production npm audit — **0 vulnerabilities**; frontend **187 files / 603 tests**, TypeScript, полный lint и production builds real/mock PASS. Браузер на production mock проверил каталог → ProService → гостевой login redirect; real production shell гидратирует login с email/password. Live API/DB здесь не использовались: полный real full-stack replay остаётся проверкой CI с изолированным PostgreSQL. Статус: исправлено в отдельном коммите U12, публикация/CI ожидаются. Dev toolchain advisories остаются в N16.

### U13 · P1 · Обновить уязвимые backend-зависимости и пересмотреть overrides

**Подтверждение:** свежий production npm audit — **2 high + 2 moderate**, четыре package entries: `nodemailer@9.1.1`, `brace-expansion@2.1.4`, `fast-uri@3.1.7`, `fastify@5.12.3`. `server/package.json` принудительно удерживает старые brace-expansion и fast-uri через overrides; `npm explain` подтверждает production paths TypeORM/glob/minimatch и Fastify/AJV.

**Последствия:** backend dependency gate FAIL. Advisory охватывают parser/expansion DoS, нормализацию URI, SMTP и HTTP/2 trailer обработку. Приложение ограничивает ввод, использует обычный HTTP Fastify и одну SMTP-конфигурацию: эксплуатация каждого advisory здесь отдельно не доказана.

**Улучшение:** Fastify вне `<5.12.5`; brace-expansion не ниже `2.1.7` для известных записей; fast-uri вне `<3.1.8` с проверкой major-совместимости потребителей вместо общего override; Nodemailer вне всех найденных ranges (audit предлагает `10.0.13`, это major upgrade). Проверить SMTP, URI/schema validation и миграционную tooling. [Nodemailer parser advisory](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-v53p-9fqp-m79j), [brace expansion](https://github.com/advisories/GHSA-qhr7-859c-m2p7), [Fastify HTTP/2](https://github.com/fastify/fastify/security/advisories/GHSA-4mh8-r7rc-xpvc).

**Приёмка:** production audit не содержит high/critical и согласованно закрывает moderate; backend build/unit/integration, email и request schemas проходят.

**Исправление 03.10:** закреплены Fastify `5.12.5`, Nodemailer `10.0.13`, brace-expansion override `2.1.7`; общий fast-uri override удалён. Lock разрешает `3.1.8` для AJV/compiler и `4.2.1` для fast-json-stringify 7 в диапазонах потребителей; `npm ls` подтверждает дерево без invalid dependencies. Nodemailer 10 поставляет собственные типы, прежний `@types/nodemailer` удалён. Его [официальный release](https://github.com/nodemailer/nodemailer/releases/tag/v10.0.0) требует Node ≥20; CI использует Node 22. Полный backend audit, включая dev, и production subset — **0 vulnerabilities**. Backend build, полный lint и unit **310 files / 1184 tests PASS**, включая 7 offline контрактов настоящего SDK для RU/EN verification/reset/setup, envelope и multipart UTF-8. Live SMTP/TLS и новая PostgreSQL integration проверка локально не выполнялись; integration/full-stack проверяются отдельным CI candidate. Статус: исправлено в отдельном коммите U13, публикация/CI ожидаются.

## Несрочные исправления

### N01 · P2 · Согласовать обязательные инструкции проекта

**Подтверждение:** `AGENTS.md:30-38` и `.codex/rules/workflow.md:5-11` требуют ветку от `main`, после подтверждения прямое слияние и push `main`. `README.md`, раздел Git workflow, требует feature от `dev` и защищённый PR `dev → main`; `.github/workflows/quality.yml` отклоняет другой источник PR в `main`. `.codex/rules/project-structure.md` по-прежнему описывает BooklyPro/Vite, хотя production использует Next.js/AutoCare.

**Последствия:** следование одному обязательному документу нарушает другой; новый участник может выбрать неверную ветку или runtime. Это документальная ошибка, не доказательство фактического обхода защиты GitHub.

**Улучшение:** привести AGENTS, workflow, project-structure и README к единому действующему PR-процессу; оставить историю в архиве. Добавить небольшую проверку согласованности только ключевых правил.

**Приёмка:** все активные инструкции называют одинаковые базовую ветку, способ promotion и production runtime; `check:ci-cd-policy` проходит. Статус: открыто, новая находка.

### N02 · P2 · Актуализировать состояние старых аудитов и security baseline

**Подтверждение:** `SECURITY.md` всё ещё перечисляет исправленные WS/quote/deletion-ошибки как open; security audit 26.09 описывает отсутствие шифрования полей, хотя сейчас есть migration `1786410000000`, transformer/subscriber. Product audit отмечает A21/A29 partial, но текущий chat service уже имеет cursor/search/filter, а provider route использует `PublicProviderFirstPaint`.

**Последствия:** старый документ нельзя использовать как текущий backlog без сверки; история успешных локальных проверок смешана с текущим состоянием и внешними воротами.

**Улучшение:** сохранить исторические отчёты, добавить краткую таблицу актуального disposition с датой/SHA/доказательством и ссылкой на этот реестр. Отдельно подтвердить поведение A21/A29; наличие реализации не равно свежему end-to-end PASS.

**Приёмка:** новый участник за один переход находит действующие open/fixed/external статусы без чтения сотен строк хронологии. Статус: открыто.

### N03 · P2 · Перенести PWA-контур на production runtime

**Подтверждение:** `NextApp.tsx` не монтирует `PwaLifecycle`; компонент использует Vite-only `virtual:pwa-register/react`. Manifest и service worker создаёт только VitePWA. Production HTTP на собственном Next server возвращает 404 для `/sw.js` и `/manifest.webmanifest`; initial HTML не содержит `rel=manifest`. `check-pwa-update-contract.mjs` проверяет только `dist/sw.js`.

**Последствия:** PWA-install/offline/update safeguards, проверенные для compatibility Vite, не подтверждают эти возможности у выпускаемого Next-приложения.

**Улучшение:** отдельная Next-совместимая регистрация/manifest/service worker и privacy cache policy, либо явно снять обещание PWA до реализации. Сохранить защиту несохранённых форм при обновлении.

**Приёмка:** проверка install/offline/update/logout cache выполняется против production Next artifact. Статус: открыто, новая находка. Любые видимые изменения требуют соблюдения design lock; реализация не выполнялась.

### N04 · P2 · Ограничить объём чтения чатов и вложений

**Подтверждение:** `autocare-chat.service.ts:298-325` загружает все доступные threads без cursor; `toThreadResponse:253-291` на каждый thread читает все messages с расшифровкой ради unreadCount и отдельные provider/sanction/appeal queries. `getAutoCareChatMessages:405-406` ограничивает сообщения, но получает все attachments thread.

**Последствия:** N+1 и объём данных растут с полной историей переписки; пагинация сообщений не ограничивает общий запрос. Нагрузочное время на production не измерялось.

**Улучшение:** cursor для threads, SQL aggregation unread counts, batch provider/sanction lookup, attachments только для текущей страницы сообщений; не расшифровывать message body для счётчика.

**Приёмка:** фиксированный верхний предел строк/queries на страницу, стабильная память на 10k+ сообщений при сохранении permissions/read receipts. Статус: открыто, новая находка.

### N05 · P2 · Ужесточить CSP именно web HTML

**Подтверждение:** `next.config.ts:8-22` и проверенный production HTTP разрешают `script-src 'unsafe-inline'` и `connect-src ws: wss:` для любых WebSocket origins. API Helmet имеет более строгую политику, но не защищает HTML Next.

**Последствия:** web CSP слабее доступного защитного контура при появлении XSS; конкретная XSS-уязвимость этим не доказана.

**Улучшение:** nonce/hash для разрешённых inline bootstrap/Next scripts, точные HTTP/WebSocket origins; внедрение сначала через report-only с проверкой карт/медиа/SSR. [Рекомендация OWASP по строгой CSP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html).

**Приёмка:** production HTML запрещает произвольный inline script/посторонний WS, штатные bootstrap/theme/chats продолжают работать. Статус: открыто.

### N06 · P2 · Измерять производительность production Next

**Подтверждение:** `check-performance-budget.mjs` и `check-bundle-splitting.mjs` читают Vite `dist/assets`. `check-seo-release.mjs` действительно имеет Next total/max budgets (5.5 MB / 600 kB), но всегда читает фиксированный `.next/static`, игнорируя `NEXT_DIST_DIR`, и не ограничивает initial route JS. В свежем real Next artifact 86 JS chunks, всего 4 231 090 bytes raw; крупнейший `3035-...js` — 562 959 bytes и включён в начальный HTML. Существующий общий SEO-бюджет он не превышает.

**Последствия:** зелёный Vite budget или общий Next total/max budget не означает контролируемую первую загрузку production; кастомная build directory проверяется по старому `.next`. Raw размер не равен сетевому gzip и не доказывает плохой Core Web Vitals.

**Улучшение:** согласовать initial JS/gzip/route budgets для Next, анализ общих chunks и lazy boundaries, измерить LCP/INP/CLS на устройстве/сети пилота. Проверять тот же артефакт, который публикуется.

**Приёмка:** CI обнаруживает ухудшение начальной загрузки Next; до/после есть измерения, разделённые на public/client/owner/admin routes. Статус: открыто.

### N07 · P2 · Включать strict-проверки frontend постепенно

**Подтверждение:** `tsconfig.app.json` не включает `strict`/`strictNullChecks`/`noUncheckedIndexedAccess`; references в корневом config не наследуют backend strict. Backend включает strict и проверку индексного доступа.

**Последствия:** nullable DTO и индексы массива допускают часть некорректных предположений во frontend без ошибки компиляции; текущий `tsc -b` PASS не проверяет строгий режим.

**Улучшение:** начать с API/schema/auth/model границ, включать strictNullChecks и остальные strict-проверки по слоям, без подавления через any/assertions.

**Приёмка:** строгий отдельный профиль покрывает чувствительные границы и постепенно становится основным; malformed/null DTO дают управляемые ошибки UI. Статус: открыто.

### N08 · P2 · Убрать неограниченный перебор пользователей при admin search

**Подтверждение:** `admin.service.ts:273-300` ищет substring имени/email после расшифровки, перебирая батчи по 200 до полного конца или заполнения страницы. Есть предел батча, но нет предела всего запроса.

**Последствия:** редкий/несуществующий запрос просматривает и расшифровывает всех пользователей; время и доступ к данным растут с размером БД. Запрос требует admin access; публичный DoS не доказан.

**Улучшение:** для email отдельный exact HMAC lookup; для partial search — согласованный защищённый индекс либо bounded async/search job с лимитом времени и честной индикацией неполного результата.

**Приёмка:** поиск отсутствующего значения на большой выборке ограничен по времени/строкам, privacy leakage выбранного индекса описан. Статус: открыто.

### N09 · P2 · Сделать migration шифрования управляемой на большом объёме

**Подтверждение:** migration `1786410000000` выбирает все значения каждой колонки/таблицы в память и выполняет отдельный UPDATE для каждой строки; всё выполняется в одной migration transaction (`migrationsTransactionMode: each`). Она также расширяет обрабатываемый объём за счёт snapshot/messages/outbox.

**Последствия:** память, время блокировок и длительность rollback растут с реальной БД; локальная маленькая fixture не доказывает безопасную миграцию объёма production.

**Улучшение:** до первого применения разработать expand/backfill/verify/switch план с keyset batches, restart checkpoints, проверками counts/decoding и сохранённым ключевым контуром. Уже опубликованную migration не переписывать; использовать последующие миграции/согласованный job.

**Приёмка:** повторяемый прогон на размере целевой БД, измеренные окно/RAM/lock time и восстановление; неизвестное состояние не помечается complete. Статус: открыто.

### N10 · P2 · Согласовать публичные контакты и локализацию с текущим продуктом

**Подтверждение:** `Footer.tsx:24` содержит фиксированные `8 (800) 550-35-35` / `support@autocarehub.ru`; в браузере и переводах footer © 2024. `translations/landing-popular.ts` для ES/RO и других языков всё ещё описывает аренду кабинетов/помещений; приложение предлагает эти locales.

**Последствия:** тексты противоречат AutoCare, контакт может не принадлежать оператору; принадлежность этих контактов не проверена, неверность контакта не утверждается.

**Улучшение:** утверждённая public contact config, актуальный год, вычитка доступных locales по автомобильным сценариям и статусам доступности mobile apps.

**Приёмка:** все предлагаемые языки описывают AutoCare; публичные каналы подтверждены владельцем; недоступная функция не выглядит действующей. Статус: открыто, связано с V2-MVP-10.

### N11 · P2 · Разделить крупные production-модули по ответственностям

**Подтверждение:** request service — 1670 строк, provider/discovery service — 1388, chat service — 1112, frontend `autocareApi.ts` — 2235, mock handlers — 6924. В них совмещены несколько workflow и DTO/authorization/storage concerns.

**Последствия:** изменения на границах данных труднее проверять; новая encryption-реализация уже потребовала согласования запросов, transformers, удалений и миграций в разных больших модулях. Сам размер файла не является ошибкой исполнения.

**Улучшение:** выделять вертикальные use cases booking/quote/chat/moderation и DTO/schema endpoints, сохраняя единый authorization/transaction boundary. Refactor небольшими шагами с existing regression tests; не дробить только ради числа строк.

**Приёмка:** критичный workflow прослеживается от route до transaction/DTO без поиска по нескольким мегамодулям; контракт и поведение не меняются. Статус: открыто.

### N12 · P2 · Фильтровать очередь broadcast до ограничения количества строк

**Подтверждение:** `getOwnerAutoCareBroadcastRequests:536-557` берёт 100 последних открытых заявок по всем рынкам, затем фильтрует рынок/филиал/услугу и expiry в памяти.

**Последствия:** 100 новых нерелевантных заявок вытесняют подходящую более старую; owner получает пустую очередь, хотя подходящий запрос открыт. Проявление зависит от количества заявок; это ограничение полноты, а не доказанный сбой текущего пилота.

**Улучшение:** permissions/market/service/expiry predicates в SQL до cursor/limit; отдельная bounded pagination для владельца. UI dashboard может показывать первые 4 с переходом к полной очереди после согласования видимого scope.

**Приёмка:** релевантная заявка находится при 100+ более новых нерелевантных; другой филиал/рынок не попадает в результат. Статус: открыто.

### N13 · P2 · Исправить SEO-проверку для динамических Next routes

**Подтверждение:** успешная свежая Next-сборка показывает динамические public routes; root layout читает request headers, provider route задаёт `force-dynamic`. `checkLocalHtmlMetadataReport()` требует файлы `.next/server/app/*.html` для этих маршрутов, включается даже при переданном HTTP URL. Локальная `npm run check:seo` завершилась blocked на missing routes при успешно собранном frontend.

**Последствия:** проверка смешивает отсутствие статического файла с отсутствием metadata у динамического HTTP render; корректная динамическая страница может не пройти общий release check.

**Улучшение:** проверять статические файлы только для реально prerendered routes из build manifest; для dynamic routes использовать HTTP candidate server. Учитывать `NEXT_DIST_DIR` и exact artifact.

**Приёмка:** корректный dynamic route с нужными metadata проходит; missing title/robots/canonical и неверный status на HTTP по-прежнему блокируют. Статус: открыто, новая находка. Повтор через HTTP: все 17 metadata probes PASS, итоговый exit 1 остаётся из-за проверки отсутствующих локальных HTML.

### N14 · P2 · Согласовать состав локальных unit и integration suites

**Подтверждение:** из 401 backend test files текущей рабочей копии `vitest.unit.config.ts` включает 309, `vitest.integration.config.ts` — 16; 76 не входят ни в один специализированный список. Среди них чистые `secure-production-config`, `redis-rate-limit-policy`, OAuth callback/identity, email/password/session-version и outbox retry/idempotency/payload policies. В отдельной конфигурации без DB setup 12 таких файлов / 26 тестов прошли.

**Дополнительное подтверждение 03.10:** test-файлы исключены из production backend build. Отдельная проверка существующего `provider-branch-access.integration.test.ts` с `strict` проходит, но добавление `noUncheckedIndexedAccess` выявляет прежние nullable array-destructuring fixtures (users, locations, offerings, requests, chats, reviews до новых U06 cases). Это ограничение покрытия типов тестов, а не ошибка новой service-сборки; новый U06 unit-файл проходит и этот усиленный режим.

**Дополнительное подтверждение CI 03.10:** admin-user-status-concurrency integration case пропускается и на `14c04ba`, и на `fde2d05`. У теста есть safe-CI/pristine-fixture/session prerequisites с silent skip; конкретный невыполненный prerequisite не записан в logs. Общий green нельзя выдавать за доказательство этого admin race. В дальнейшем сделать изолированный fixture и явную диагностику prerequisites, не разрешая запись в обычную БД.

**Последствия:** локальный `test:unit` PASS не проверяет эти политики. CI также запускает общий `npm test`, который включает все файлы с DB setup: это **не доказанный пропуск всех этих тестов в CI**, а несогласованность быстрых локальных проверок и специализированных suites. Часть исключённых файлов действительно требует БД или относится к legacy; не следует включать всё в unit автоматически. Один из 76 файлов — заранее существовавшая незавершённая локальная работа, это отдельно не считается дефектом.

**Улучшение:** явно разделить pure/unit/integration/legacy tests; автоматически обнаруживать unit tests по соглашению, проверять необъяснимые исключения и сохранять DB isolation guard. Не присоединять DB setup к чистым тестам.

**Приёмка:** критичные pure policies запускаются обычной локальной unit-командой; новый тест не требует ручного добавления в огромный whitelist; остальные исключения документированы и проверяются подходящим suite. Статус: открыто, новая находка.

### N15 · P2 · Закрепить GitHub Actions по неизменяемым ревизиям

**Подтверждение:** quality, promotion и release-evidence workflows используют `actions/checkout@v4`, `setup-node@v4`, `dependency-review-action@v4`, `upload-artifact@v4`, `actions/attest@v4` и `gitleaks/gitleaks-action@v2` вместо полного commit SHA.

**Последствия:** код внешнего action может измениться под тем же тегом без изменения repository diff; это дополнительная поверхность supply-chain риска в проверках и выпуске. Компрометация конкретного action не обнаружена.

**Улучшение:** закрепить проверенные полные SHA с читаемыми комментариями версий, завести контролируемое обновление и review permissions/secrets по jobs.

**Приёмка:** внешние actions используют immutable refs, обновление проходит review и CI, release attestation сохраняет рабочий контракт. Статус: открыто.

### N16 · P2 · Отдельно устранить проблемы development toolchain

**Подтверждение:** полный npm audit, включая dev dependencies, показывает frontend **7 entries (6 high, 1 critical)**, backend **8 (3 high, 5 moderate)**. Production subset учтён в U12/U13. Дополнительная frontend-цепочка включает `shadcn → ts-morph/@ts-morph/common → fast-glob/micromatch/braces`; у backend добавляются development paths и зависимые entries. Число entries не равно числу независимых эксплойтов.

**Последствия:** production-only gate не отражает риск инструментов, обрабатывающих вход при генерации/сборке. Эти dev entries не доказывают наличие соответствующего кода в runtime bundle. Для shadcn npm предлагает major downgrade; слепой fix может нарушить toolchain.

**Улучшение:** разобрать реальные dependency paths и необходимость CLI, выбрать поддерживаемые совместимые версии либо убрать неиспользуемый генератор из project dependencies; разделить production и development audit evidence. Не выполнять `audit fix --force` и не маскировать findings blanket overrides.

**Приёмка:** полный audit закрыт либо каждое оставшееся исключение имеет проверенную достижимость, срок и владельца; lint/build/generation работают. Статус: открыто, новое dependency evidence.

### N17 · P2 · Согласовать mock broadcast access с backend permissions

**Подтверждение:** при исправлении U11 повторно проверен `src/app/mocks/handlers.ts`, GET `/api/v1/broadcast-requests/:broadcastId`: чужая заявка скрывается только от роли `client`; любой иной mock user получает полную response без provider/branch permission и offers filtering. Это отличается от backend participant policy после U11 и от его прежних owner scope checks.

**Последствия:** демонстрация и frontend mock tests могут показывать доступ, которого real API не разрешает, и скрывать authorization regressions. Это не сохранённый bypass в production backend: исправленный backend отклоняет роль без действующего participant scope.

**Улучшение:** mock current user/membership/branch projections должны повторять правила backend и его 403/404 contract; добавить негативные mock cases для admin, super-admin и чужого филиала. Frontend/mock work выполнять отдельным ограниченным шагом с требуемой ownership; UI composition не менять.

**Приёмка:** те же actor/request fixtures дают одинаковую доступность и видимые offers в mock/real contracts, клиент сохраняет полный доступ к собственной заявке. Статус: открыто, новая несрочная находка при U11.

### N18 · P3 · Сохранить значения с пробелами при чтении backup-конфига

**Подтверждение:** `server/scripts/backup.sh` загружает `.env` через `export $(grep -v '^#' .env | xargs)`. Изолированная синтетическая строка `DATABASE_PASSWORD="synthetic password"` теряет часть значения после shell word splitting; настоящий `.env` не читался.

**Последствия:** quoted password или path с пробелом может стать другим значением и сорвать backup. Наличие таких значений в production не проверялось; это отдельная проблема конфигурации, не изменение криптографического контракта U04.

**Улучшение:** безопасный dotenv parser с явно разрешёнными переменными и передачей значений без shell splitting; не исполнять произвольный `.env` как shell code и не выводить secrets.

**Приёмка:** quoted spaces, comments и empty values сохраняют ожидаемое значение; отказ не раскрывает пароль. Статус: открыто, новая несрочная находка при U04.

### N19 · P2 · Устранить ожидание workflow публикации собственной проверки

**Подтверждение:** `.github/workflows/promote-dev-to-main.yml` запускает `gh pr checks --watch --fail-fast` без фильтра required checks. PR #7 содержит check самого `Promote verified dev` на том же head. После завершения обеих Quality проверок на `fde2d05` promotion оставался в шаге ожидания PR CI; run `37122587540` в итоге cancelled. Причина self-wait следует из команды и check graph: шаг ждёт завершения workflow, в котором сам выполняется. [Официальные CLI options](https://cli.github.com/manual/gh_pr_checks) подтверждают отдельный `--required` фильтр и ожидание завершения checks через `--watch`.

**Последствия:** автоматическая публикация может зависать до timeout/cancellation при зелёном Application CI; ручное обычное слияние после проверок работает. Не является основанием обходить branch protection.

**Улучшение:** ждать только требуемый Application CI с ограниченным timeout и сверкой точного head SHA; проверить поддерживаемый способ merge с текущими настройками репозитория. Сохранить PR, required checks и запрет bypass.

**Приёмка:** после зелёных required checks promotion завершается без ожидания самого себя; failed/stale candidate не сливается. Статус: открыто, новая несрочная находка при публикации PR #7.

## Рекомендуемый порядок работ

| Очередь | Пункты | Результат следующего шага |
| --- | --- | --- |
| 1 | U01 | Работающий production key adapter; U09/U11/U12/U13 опубликованы |
| 2 | U02, U05, N09 | Согласованная схема AAD/индексов/ротации и проверяемый rollout шифрования на реальном объёме |
| 3 | U03 | MFA/step-up; U07 опубликован, U04 исправлен программно, external restore rehearsal открыта |
| 4 | U08, N03, N13, N14 | Next artifact checks, PWA/SEO и тестовые suites; U06 опубликован, U10 исправлен локально |
| 5 | N04, N06, N08, N12 | Ограниченные queries, полноценная очередь owner и измеренный production performance |
| 6 | N01, N02, N05, N07, N10, N11, N15, N16, N17, N18, N19 | Актуальные инструкции/реестры, CSP/type safety, тексты, модульность, supply-chain hygiene и mock authorization parity |

Пункты одной очереди можно выполнять независимо, если они не затрагивают общий data contract. U02/U05/N09 нужно проектировать вместе: несогласованное изменение индексов/формата может лишить доступа к существующим данным. Закрытие пункта требует его приёмки; один зелёный unit suite не закрывает production/integration evidence.

## Проверки и охват

| Проверка | Фактический результат |
| --- | --- |
| Frontend `npm test -- --maxWorkers=2` | PASS: 187 files / 603 tests |
| Backend `test:unit -- --maxWorkers=2` | PASS: 309 files / 1165 tests |
| Дополнительные существующие pure policies без DB setup | PASS: 12 files / 26 tests; обычный unit suite их не включает |
| Full ESLint, `tsc -b`, backend build | PASS, exit 0 |
| Production Next builds, real и mock | PASS; отдельные `.next-audit-20261003` / `.next-audit-mock-20261003` |
| API contract, parity, route snapshot | PASS: 244/244 mock routes, 272 backend routes, 2/2 WebSocket contracts |
| Threat-surface / security-header source checks | PASS; не заменяют runtime penetration test |
| Migration inventory/order/validation | PASS: 139 files; order checker 6/6 tests; checksum `2193756cbbc34d3eba7ab4259b673862bce81b1802009aa9750a52bbc45bdd44` |
| Published migration checksum | BLOCKED: отсутствует `PUBLISHED_MIGRATION_MANIFEST`; внешняя prerequisite, не установленная ошибка migration |
| SEO check, включая собственный HTTP candidate | FAIL/blocked: нет ожидаемых static HTML; 17/17 HTTP metadata probes PASS; Lighthouse не запускался |
| Fresh production npm audit | FAIL: frontend 1 critical; backend 2 high + 2 moderate |
| Полный npm audit с dev | Frontend 7 entries; backend 8; разбор U12/U13/N16 |
| Production Next HTTP headers/assets | CSP подтверждён; `/sw.js` и `/manifest.webmanifest` HTTP 404 |
| Изолированные синтетические проверки | Воспроизведены startup без provider, перестановка envelope, изменение HMAC при ротации, plaintext QueryBuilder параметр invitation и утечка синтетического email из raw SQL error |
| Guest browser, mock Next, desktop и 390×844 | Discovery → профиль ProService с выбранной услугой → гостевой redirect login; профиль/login без горизонтального переполнения на 390 px. Login context сохраняется через router state по коду; возврат после входа не проверялся |

**Просмотренные области:** App Router/Vite production split, SSR/SEO/PWA/i18n; API DTO/mock parity; auth/OAuth/session/role/membership/moderation; booking/request/quote/capacity/broadcast/bonus workflows; chat/WebSocket/private attachments; encryption/migration/search; account deletion/export; outbox/jobs/health/observability; CI/dependency/backup/release evidence. Положительные source/unit результаты не являются гарантией отсутствия других дефектов.

**Не выполнено:** запуск API с изолированной PostgreSQL/Redis, применение миграций и DB integration/E2E, проверки настоящих ролей/учётных записей, реальный KMS, object storage/antivirus/SMTP/OAuth providers, production load/Lighthouse, восстановление backup, внешние юридические/операторские согласования. Docker daemon недоступен, безопасность обычной developer DB для тестов не установлена; она не использовалась и не очищалась. Исторические успешные DB проверки не выдаются за свежие.

**Что уже есть:** unit/build/type/lint и API parity проходят; в проекте реализованы scoped chat moderation, private attachment access, session/WS controls, booking/bonus invariants и часть предыдущих product fixes. Старая формулировка «нет шифрования» больше не точна: реализация есть, но её production wiring и свойства требуют U01/U02/U05. A21/A29 нужно перепроверить и обновить disposition по текущей реализации, а не автоматически возвращать весь старый scope в open.

**Проверки партии U09/U11:** финальный backend suite — **309 files / 1177 tests PASS**, backend build PASS; full lint для U09 и targeted lint после последних изменений PASS. U09 capture проверяет Pino/HTTP/external-report границы, U11 focused suite — **4 files / 31 tests PASS**; API contract/parity/snapshot/threat-surface PASS, `git diff --check` PASS. U09 до исправления воспроизведён 5 падающими regression cases, U11 — 4. U09 коммит `a9fa608`; U11 фиксируется отдельным коммитом `fix(security): restrict broadcast reads to participants (U11)`. Existing integrity-script/manifest files проверены по SHA-256 и не изменены. DB/production ограничения исходного аудита сохраняются.

**Итог исходного аудита:** локальные PASS не снимают production блокеры и внешние ворота. Pilot остаётся **NO-GO**; проценты 54 канонических ворот не пересчитывались. Сам аудит не менял runtime-код, зависимости и БД; последующие разрешённые исправления описаны выше. Ранее существовавшие локальные изменения сохранены. Временные Next servers/браузерный tab остановлены после проверки.
