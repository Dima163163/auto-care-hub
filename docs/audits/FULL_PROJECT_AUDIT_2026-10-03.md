# Дополнительный полный аудит AutoCare Hub — 3 октября 2026

Рабочий реестр: пополняется сразу после подтверждения каждой находки. Анализ текущей рабочей копии, а не только исторических аудитов. После завершения аудита пользователь разрешил выполнять срочные исправления партиями по 1–2, каждое отдельным коммитом; результаты записываются рядом с исходными находками.

Исходный аудит: **29 пунктов — 13 срочных (9 P1, 4 P2) и 16 несрочных**. У каждого ниже есть подтверждение, последствия, вариант улучшения и критерий приёмки. После U09/U11/U12/U13/U07/U06/U10/U04 и PostgreSQL-приёмки U05 остаются **4 срочных / 20 несрочных**; выполнены 9 программных исправлений, добавлены N17–N20. U05 опубликован через PR #9 в `main` (`0830e40`), обе Quality-проверки PASS на `14afc34`; fetched main tree совпадает точно. U09/U11/U12/U13 опубликованы в `main` через PR #6 (`a81749b`). U07/U06 — отдельные коммиты `6845517` / `676f22a`, обе Quality-проверки PASS на `fde2d05`, PR #7 слит в `main` (`2f99bf1`); fetched main tree точно совпадает с проверенным dev. Владелец снял только обязательный approval; PR, Application CI и остальные ограничения сохранены. U10 (`977f927`) и U04 (`3abded7`) опубликованы через PR #8 в `main` (`5b6d36e`): обе Quality-проверки PASS на `0969405`, fetched main tree совпадает точно. В реестре теперь 33 исторических пункта; открытые production/pilot evidence не считаются закрытыми локальными тестами.

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

**Уточнение следующей порции 03.10:** TypeORM `SubjectChangedColumnsComputer` вызывает transformer.to ещё до beforeUpdate subscriber; простая передача row ID только в subscriber не покрывает этот путь. Admin account-deletion также шифрует redaction values для прямых SQL UPDATE (`account-deletion-admin.service.ts:80-85`); новый AAD требует отдельного envelope для каждого record ID. Поэтому rollout должен включать versioned envelope/backfill, проверку ожидаемого row/parent scope при ORM-чтении, scoped insert/update и прямую redaction, identity↔HMAC consistency, outbox, partial selects, rollback/restore и отрицательные swap tests. Выбор production KMS (U01) определяет ключевую границу: controlled preload/cache для существующего синхронного интерфейса либо asynchronous repository/service encryption. Вопрос о KMS направлен владельцу и остаётся без ответа; готовый U05 не выбирает эту архитектуру за него. Изменения формата/БД U02 ещё не начаты, закрытие не заявляется.

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

**Подготовленное решение следующей порции:** сохранить существующий формат `h1_` и его HMAC-ключ, вынести ключ поиска в отдельный `getIndexKey()` contract, независимый от `activeKeyId`. Старые local keyring v1 остаются совместимыми при одинаковом indexKey у всех KEK; несогласованный keyring и замена установленного HMAC-ключа должны отклоняться до работы с ORM. Приёмка выбранного варианта: после переключения KEK читается старый ciphertext, работают фактический password login и ORM OAuth lookup, PostgreSQL по-прежнему отклоняет дубликат email, приглашения используют тот же HMAC. Ротация самого HMAC и удаление historical KEK требуют отдельной миграции/перешифрования и сверки backup retention; эта порция их не выполняет и старые ключи не удаляет.

**Приёмка:** зарегистрированный пользователь входит и сохраняет OAuth/приглашения после ротации; дубликат email не появляется; старый ключ можно убрать после сверки. Статус: открыто, новая находка.

**Реализация U05 03.10:** KEK и HMAC разделены в provider interface. HMAC копируется при установке; горячая замена на другой HMAC и legacy keyring с разными indexKey отклоняются. `activeKeyId` захватывается один раз на шифрование, поэтому keyId envelope соответствует использованному KEK. Формат h1/ciphertext/keyring v1 сохранён; данные и historical keys не переписываются. Шесть regression cases падали до исправления; теперь **8 rotation unit cases**, всего **17 focused cases PASS**, полный `quality:backend` с synthetic env **314 files / 1249 unit tests**, 18 tooling и build PASS, полный lint и strict types всех четырёх изменённых test-файлов (включая noUncheckedIndexedAccess) PASS. Новый PostgreSQL case проверяет реальный password login, OAuth, email uniqueness, invitation lookup/409 и запись с новым keyId после KEK rotation; он прошёл live CI, локального disposable PostgreSQL/Redis нет. Статус: выбранный stable-HMAC вариант исправлен, принят в CI и опубликован в main через PR #9; U05 снят с очереди срочных исправлений. Производственный adapter обязан сохранять identity HMAC между рестартами (U01); полная замена внешнего источника ключей не обнаруживается process-level guard. HMAC rotation/backfill и retirement KEK остаются отдельным rollout/restore scope (N09), поддержка этих операций не заявляется.

**Live приёмка U05 03.10:** на `14afc34`, PR Quality `37143037677`, backend job `111261237103` PASS. Оба `field-encryption.integration.test.ts` cases прошли в integration и полном suite, включая настоящий password login и OAuth после смены KEK, PostgreSQL unique conflict, invitation lookup/409 и новый keyId после save. Integration **16 files / 76 PASS / 1 old skip**; full **405 files / 1479 PASS / 1 old skip**; unit **314 / 1249 PASS**. Push backend также PASS. Производственная Next-проверка, frontend build/lint/tests и scanning обеих Quality-проверок PASS. U05 программное исправление прошло приёмку выбранного stable-HMAC варианта. После полного browser/aggregate PASS опубликован в main (доказательство ниже). Реестр: 4 срочных / 20 несрочных.

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

**CI replay на `ba8d843`:** backend quality, schema/migrations и все новые cache probes PASS. Integration профиль: 74 PASS / 1 failed / 1 skipped; единственный отказ — старое буквальное ожидание `no-store` у private user export, тогда как ответ теперь `private, no-store`. Согласованы именно final HTTP assertions для user export и admin session revoke; их source header helpers по-прежнему корректно содержат `no-store`. Security policy не ослаблена. Полный integration/full replay повторяется на новом head.

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

**Исправление 04.10:** N01: AGENTS и tracked docs/agent-rules теперь описывают одну политику feature/dev → protected dev/main PR с exact-candidate Quality, сохранением branches/dirty files и существующего разрешения пользователя. Устранены ссылки на отсутствующие в clean checkout ignored rules и старое Bookly/Vite-only описание. Agent profiles/skills и primary ignored rules не изменялись; explicit human frontend ownership/no-subagents policy закреплены по приоритету. Проверены tracked links и diff; docs-only изменение.

### N02 · P2 · Актуализировать состояние старых аудитов и security baseline

**Подтверждение:** `SECURITY.md` всё ещё перечисляет исправленные WS/quote/deletion-ошибки как open; security audit 26.09 описывает отсутствие шифрования полей, хотя сейчас есть migration `1786410000000`, transformer/subscriber. Product audit отмечает A21/A29 partial, но текущий chat service уже имеет cursor/search/filter, а provider route использует `PublicProviderFirstPaint`.

**Последствия:** старый документ нельзя использовать как текущий backlog без сверки; история успешных локальных проверок смешана с текущим состоянием и внешними воротами.

**Улучшение:** сохранить исторические отчёты, добавить краткую таблицу актуального disposition с датой/SHA/доказательством и ссылкой на этот реестр. Отдельно подтвердить поведение A21/A29; наличие реализации не равно свежему end-to-end PASS.

**Приёмка:** новый участник за один переход находит действующие open/fixed/external статусы без чтения сотен строк хронологии. Статус: открыто.

**Исправление 04.10:** N02: добавлена текущая disposition table с source/evidence/pending acceptance для WS/quote/deletion/runtime/logout, A21/A29, field/backup encryption, cache и MFA. Исторические отчёты сохранены и помечены ссылкой на актуальное состояние; security baseline больше не требует трактовать старое «нет шифрования» как текущий факт. Source presence не выдаётся за свежую production/browser приёмку и не меняет 54 pilot gates. Docs diff/links reviewed.

### N03 · P2 · Перенести PWA-контур на production runtime

**Подтверждение:** `NextApp.tsx` не монтирует `PwaLifecycle`; компонент использует Vite-only `virtual:pwa-register/react`. Manifest и service worker создаёт только VitePWA. Production HTTP на собственном Next server возвращает 404 для `/sw.js` и `/manifest.webmanifest`; initial HTML не содержит `rel=manifest`. `check-pwa-update-contract.mjs` проверяет только `dist/sw.js`.

**Последствия:** PWA-install/offline/update safeguards, проверенные для compatibility Vite, не подтверждают эти возможности у выпускаемого Next-приложения.

**Улучшение:** отдельная Next-совместимая регистрация/manifest/service worker и privacy cache policy, либо явно снять обещание PWA до реализации. Сохранить защиту несохранённых форм при обновлении.

**Приёмка:** проверка install/offline/update/logout cache выполняется против production Next artifact. Статус: открыто, новая находка. Любые видимые изменения требуют соблюдения design lock; реализация не выполнялась.

**Исправление 04.10:** N03: выбран явно разрешённый аудитом вариант снятия неподтверждённого PWA обещания. README и runtime status теперь прямо говорят: production Next не поддерживает install/offline/update PWA; Vite Workbox/12 preview tests — только compatibility evidence. Новая UI-композиция/SW/private cache не добавлялись. Будущий Next PWA остаётся отдельной задачей с собственной artifact/browser приёмкой; pilot gates не закрываются Vite evidence.

### N04 · P2 · Ограничить объём чтения чатов и вложений

**Подтверждение:** `autocare-chat.service.ts:298-325` загружает все доступные threads без cursor; `toThreadResponse:253-291` на каждый thread читает все messages с расшифровкой ради unreadCount и отдельные provider/sanction/appeal queries. `getAutoCareChatMessages:405-406` ограничивает сообщения, но получает все attachments thread.

**Последствия:** N+1 и объём данных растут с полной историей переписки; пагинация сообщений не ограничивает общий запрос. Нагрузочное время на production не измерялось.

**Улучшение:** cursor для threads, SQL aggregation unread counts, batch provider/sanction lookup, attachments только для текущей страницы сообщений; не расшифровывать message body для счётчика.

**Приёмка:** фиксированный верхний предел строк/queries на страницу, стабильная память на 10k+ сообщений при сохранении permissions/read receipts. Статус: открыто, новая находка.

**Исправление 04.10:** N04: chat thread list фильтрует роль/assigned moderation/branch scope в SQL до bounded limit (legacy ≤100; optional cursor pages ≤100). Unread count агрегируется SQL без body/offer decryption; providers, latest sanctions и pending appeals грузятся batches вместо N+1. Attachment read ограничен существующей квотой 20+1; сверхлимитная legacy беседа явно отклоняется для review, а не читается целиком/молча обрезается. 36 focused cases PASS, включая synthetic 10000 unread aggregate, cursor и branch predicate; backend build/lint/API contract/parity PASS. Cursor UI и legacy attachment cleanup не внедрялись; production нагрузочная приёмка остаётся внешней.

### N05 · P2 · Ужесточить CSP именно web HTML

**Подтверждение:** `next.config.ts:8-22` и проверенный production HTTP разрешают `script-src 'unsafe-inline'` и `connect-src ws: wss:` для любых WebSocket origins. API Helmet имеет более строгую политику, но не защищает HTML Next.

**Последствия:** web CSP слабее доступного защитного контура при появлении XSS; конкретная XSS-уязвимость этим не доказана.

**Улучшение:** nonce/hash для разрешённых inline bootstrap/Next scripts, точные HTTP/WebSocket origins; внедрение сначала через report-only с проверкой карт/медиа/SSR. [Рекомендация OWASP по строгой CSP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html).

**Приёмка:** production HTML запрещает произвольный inline script/посторонний WS, штатные bootstrap/theme/chats продолжают работать. Статус: открыто.

**Исправление 04.10:** N05: Next `src/proxy.js` выдаёт новый CSPRNG nonce на каждый HTML request, заменяет caller nonce/CSP headers и передаёт policy в SSR. Next framework scripts и theme bootstrap получают nonce; production script-src больше не содержит unsafe-inline/eval. Connect-src ограничен точными frontend/API HTTP/Ws origins; HTML private/no-store не переиспользует nonce. Inline CSS пока разрешён для существующих UI style props. Runtime проверка обнаружила, что Next 16.3.6 молча игнорирует `proxy.page.ts` при composite pageExtensions: root discovery использует только последнее расширение. Узкий JS adapter и расширение `js` исправляют обнаружение, не включая legacy TSX Pages Router. Финальная production build содержит Proxy; 7 HTTP samples public/services/provider/client/owner/admin PASS, включая fresh nonce, caller override и все executable SSR/theme scripts. 3 policy tests и 3 runtime-checker negative/positive tests PASS. CI проверяет реальные headers/HTML собранного Next, а не только source fragments. Browser hydration/theme/reload работают без CSP errors; live chat WebSocket остаётся real-full-stack/external приёмкой.

### N06 · P2 · Измерять производительность production Next

**Подтверждение:** `check-performance-budget.mjs` и `check-bundle-splitting.mjs` читают Vite `dist/assets`. `check-seo-release.mjs` действительно имеет Next total/max budgets (5.5 MB / 600 kB), но всегда читает фиксированный `.next/static`, игнорируя `NEXT_DIST_DIR`, и не ограничивает initial route JS. В свежем real Next artifact 86 JS chunks, всего 4 231 090 bytes raw; крупнейший `3035-...js` — 562 959 bytes и включён в начальный HTML. Существующий общий SEO-бюджет он не превышает.

**Последствия:** зелёный Vite budget или общий Next total/max budget не означает контролируемую первую загрузку production; кастомная build directory проверяется по старому `.next`. Raw размер не равен сетевому gzip и не доказывает плохой Core Web Vitals.

**Улучшение:** согласовать initial JS/gzip/route budgets для Next, анализ общих chunks и lazy boundaries, измерить LCP/INP/CLS на устройстве/сети пилота. Проверять тот же артефакт, который публикуется.

**Приёмка:** CI обнаруживает ухудшение начальной загрузки Next; до/после есть измерения, разделённые на public/client/owner/admin routes. Статус: открыто.

**Исправление 04.10:** N06: initial JavaScript измеряется по distinct script entries каждого HTTP route и только выбранному NEXT_DIST_DIR; missing/external/mismatched artifacts блокируются. Raw/gzip budgets 1600000/460000 bytes действуют независимо и проверяются на живом CI production Next. Локальные 17 metadata + 17 initial-route checks PASS: 1398858 raw / 403302 gzip, 9 entries на public/provider/client/owner/admin. SEO checker 10 tests PASS, включая обе oversized regressions. Измеренный baseline и ограничения — docs/operations/NEXT_INITIAL_JAVASCRIPT_BASELINE.md. Payload не уменьшался; production real-mode Lighthouse/LCP/INP/CLS остаются внешней приёмкой.

### N07 · P2 · Включать strict-проверки frontend постепенно

**Подтверждение:** `tsconfig.app.json` не включает `strict`/`strictNullChecks`/`noUncheckedIndexedAccess`; references в корневом config не наследуют backend strict. Backend включает strict и проверку индексного доступа.

**Последствия:** nullable DTO и индексы массива допускают часть некорректных предположений во frontend без ошибки компиляции; текущий `tsc -b` PASS не проверяет строгий режим.

**Улучшение:** начать с API/schema/auth/model границ, включать strictNullChecks и остальные strict-проверки по слоям, без подавления через any/assertions.

**Приёмка:** строгий отдельный профиль покрывает чувствительные границы и постепенно становится основным; malformed/null DTO дают управляемые ошибки UI. Статус: открыто.

**Исправление 04.10:** N07: strict включён для всего frontend tsconfig.app.json, а не только нового пилотного профиля. Полный tsc -b PASS; existing CI/build type gate автоматически применяет strict nullability/function checks. Sensitive response-schema, refresh lifecycle и automotive DTO malformed/null regressions: 3 files / 14 PASS. any/assertion suppressions и osлабление validators не добавлялись.

### N08 · P2 · Убрать неограниченный перебор пользователей при admin search

**Подтверждение:** `admin.service.ts:273-300` ищет substring имени/email после расшифровки, перебирая батчи по 200 до полного конца или заполнения страницы. Есть предел батча, но нет предела всего запроса.

**Последствия:** редкий/несуществующий запрос просматривает и расшифровывает всех пользователей; время и доступ к данным растут с размером БД. Запрос требует admin access; публичный DoS не доказан.

**Улучшение:** для email отдельный exact HMAC lookup; для partial search — согласованный защищённый индекс либо bounded async/search job с лимитом времени и честной индикацией неполного результата.

**Приёмка:** поиск отсутствующего значения на большой выборке ограничен по времени/строкам, privacy leakage выбранного индекса описан. Статус: открыто.

**Исправление 04.10:** N08: полный email ищется одним SQL запросом по stable HMAC blind index с сохранением role/status/cursor filters. Частичный поиск ограничен 1000 расшифрованных строк и проверкой elapsed budget между batches; при неполном сканировании возвращается явный ADMIN_SEARCH_TOO_BROAD (422), а не ложный пустой/полный список. UI error translation объясняет, как уточнить поиск. 4 tests PASS (index, 5-batch bound, exhausted empty, page+one/cursor), backend build, frontend types, lint PASS. Hard database statement timeout не заменяется elapsed check; production load evidence остаётся внешним.

### N09 · P2 · Сделать migration шифрования управляемой на большом объёме

**Подтверждение:** migration `1786410000000` выбирает все значения каждой колонки/таблицы в память и выполняет отдельный UPDATE для каждой строки; всё выполняется в одной migration transaction (`migrationsTransactionMode: each`). Она также расширяет обрабатываемый объём за счёт snapshot/messages/outbox.

**Последствия:** память, время блокировок и длительность rollback растут с реальной БД; локальная маленькая fixture не доказывает безопасную миграцию объёма production.

**Улучшение:** до первого применения разработать expand/backfill/verify/switch план с keyset batches, restart checkpoints, проверками counts/decoding и сохранённым ключевым контуром. Уже опубликованную migration не переписывать; использовать последующие миграции/согласованный job.

**Приёмка:** повторяемый прогон на размере целевой БД, измеренные окно/RAM/lock time и восстановление; неизвестное состояние не помечается complete. Статус: открыто.

**Частичное исправление 04.10:** N09: опубликованная migration/checksum сохранена. Подготовлен bounded keyset backfill engine с budgets ≤500 rows/batch, atomic compare-write/checkpoint adapter contract, failure/restart semantics и UUID/progress validation. 3 tests PASS, включая 5000 rows по 25 и interrupted commit; build/lint PASS. Runbook задаёт expand/dual write/backfill/verify/switch/rollback/restore/HMAC-retirement. Production DB adapter и фактический масштабный rollout остаются открытыми до U01 KMS/U02 envelope решения и scale/recovery приёмки; real DB/keys/backups не менялись.

### N10 · P2 · Согласовать публичные контакты и локализацию с текущим продуктом

**Подтверждение:** `Footer.tsx:24` содержит фиксированные `8 (800) 550-35-35` / `support@autocarehub.ru`; в браузере и переводах footer © 2024. `translations/landing-popular.ts` для ES/RO и других языков всё ещё описывает аренду кабинетов/помещений; приложение предлагает эти locales.

**Последствия:** тексты противоречат AutoCare, контакт может не принадлежать оператору; принадлежность этих контактов не проверена, неверность контакта не утверждается.

**Улучшение:** утверждённая public contact config, актуальный год, вычитка доступных locales по автомобильным сценариям и статусам доступности mobile apps.

**Приёмка:** все предлагаемые языки описывают AutoCare; публичные каналы подтверждены владельцем; недоступная функция не выглядит действующей. Статус: открыто, связано с V2-MVP-10.

**Исправление 04.10:** N10: по подтверждению владельца публичных контактных каналов пока нет. В существующих footer slots заменены вымышленные телефон/email на честные локализованные статусы; copyright использует текущий год. ES/RO launch landing copy исправлен на автосервисы. Native app уже обозначено In development, store badges не являются download links; это состояние сохранено. Translation contract: 12 PASS, TypeScript и targeted lint PASS; visual layout/style не менялись.

### N11 · P2 · Разделить крупные production-модули по ответственностям

**Подтверждение:** request service — 1670 строк, provider/discovery service — 1388, chat service — 1112, frontend `autocareApi.ts` — 2235, mock handlers — 6924. В них совмещены несколько workflow и DTO/authorization/storage concerns.

**Последствия:** изменения на границах данных труднее проверять; новая encryption-реализация уже потребовала согласования запросов, transformers, удалений и миграций в разных больших модулях. Сам размер файла не является ошибкой исполнения.

**Улучшение:** выделять вертикальные use cases booking/quote/chat/moderation и DTO/schema endpoints, сохраняя единый authorization/transaction boundary. Refactor небольшими шагами с existing regression tests; не дробить только ради числа строк.

**Приёмка:** критичный workflow прослеживается от route до transaction/DTO без поиска по нескольким мегамодулям; контракт и поведение не меняются. Статус: открыто.

**Частичное исправление 04.10:** N11: выделен самостоятельный chat-read.service (permissions/cursor SQL, bounded batch read model, DTO), mutations/moderation остаются в facade без изменения публичных imports. Mock broadcast authorization/offer visibility вынесены в pure broadcast-access-policy, handler отвечает за fixtures/HTTP. Trace route→read use-case→SQL→DTO теперь отдельный; tests 36 backend + 3 MSW PASS, types/build PASS, targeted lint PASS. Это ответственная постепенная декомпозиция; прочие крупные request/provider/API модули остаются дальнейшим refactor scope, без косметического дробления по числу строк.

### N12 · P2 · Фильтровать очередь broadcast до ограничения количества строк

**Подтверждение:** `getOwnerAutoCareBroadcastRequests:536-557` берёт 100 последних открытых заявок по всем рынкам, затем фильтрует рынок/филиал/услугу и expiry в памяти.

**Последствия:** 100 новых нерелевантных заявок вытесняют подходящую более старую; owner получает пустую очередь, хотя подходящий запрос открыт. Проявление зависит от количества заявок; это ограничение полноты, а не доказанный сбой текущего пилота.

**Улучшение:** permissions/market/service/expiry predicates в SQL до cursor/limit; отдельная bounded pagination для владельца. UI dashboard может показывать первые 4 с переходом к полной очереди после согласования видимого scope.

**Приёмка:** релевантная заявка находится при 100+ более новых нерелевантных; другой филиал/рынок не попадает в результат. Статус: открыто.

**Исправление 04.10:** N12: permissions/active provider branch/market/service/expiry eligibility теперь находится в SQL EXISTS до ORDER/LIMIT 100. Дополнительная detail authorization сохраняется. Existing 12 market/access cases и backend build PASS; добавлен PostgreSQL replay с session-local temp shadow tables: 120 новых нерелевантных записей, older match, wrong branch, private market и expiry. Его запуск ожидает isolated CI. Bounded cursor UI/full inbox остаётся отдельным продуктовым улучшением после согласования визуального scope; исправление полноты SQL не меняет текущий array API.

### N13 · P2 · Исправить SEO-проверку для динамических Next routes

**Подтверждение:** успешная свежая Next-сборка показывает динамические public routes; root layout читает request headers, provider route задаёт `force-dynamic`. `checkLocalHtmlMetadataReport()` требует файлы `.next/server/app/*.html` для этих маршрутов, включается даже при переданном HTTP URL. Локальная `npm run check:seo` завершилась blocked на missing routes при успешно собранном frontend.

**Последствия:** проверка смешивает отсутствие статического файла с отсутствием metadata у динамического HTTP render; корректная динамическая страница может не пройти общий release check.

**Улучшение:** проверять статические файлы только для реально prerendered routes из build manifest; для dynamic routes использовать HTTP candidate server. Учитывать `NEXT_DIST_DIR` и exact artifact.

**Приёмка:** корректный dynamic route с нужными metadata проходит; missing title/robots/canonical и неверный status на HTTP по-прежнему блокируют. Статус: открыто, новая находка. Повтор через HTTP: все 17 metadata probes PASS, итоговый exit 1 остаётся из-за проверки отсутствующих локальных HTML.

**Исправление 04.10, N13:** SEO runner использует `NEXT_DIST_DIR` и фактический prerender manifest. Только объявленные static routes требуют локальный HTML; динамические маршруты требуют HTTP evidence через `--url`. Missing/invalid static HTML, noindex и неуспешный HTTP по-прежнему блокируют проверку. 7 synthetic runner tests PASS; свежая проверка конечного Next artifact/HTTP ожидает завершения пакета.

### N14 · P2 · Согласовать состав локальных unit и integration suites

**Подтверждение:** из 401 backend test files текущей рабочей копии `vitest.unit.config.ts` включает 309, `vitest.integration.config.ts` — 16; 76 не входят ни в один специализированный список. Среди них чистые `secure-production-config`, `redis-rate-limit-policy`, OAuth callback/identity, email/password/session-version и outbox retry/idempotency/payload policies. В отдельной конфигурации без DB setup 12 таких файлов / 26 тестов прошли.

**Дополнительное подтверждение 03.10:** test-файлы исключены из production backend build. Отдельная проверка существующего `provider-branch-access.integration.test.ts` с `strict` проходит, но добавление `noUncheckedIndexedAccess` выявляет прежние nullable array-destructuring fixtures (users, locations, offerings, requests, chats, reviews до новых U06 cases). Это ограничение покрытия типов тестов, а не ошибка новой service-сборки; новый U06 unit-файл проходит и этот усиленный режим.

**Дополнительное подтверждение CI 03.10:** admin-user-status-concurrency integration case пропускается и на `14c04ba`, и на `fde2d05`. У теста есть safe-CI/pristine-fixture/session prerequisites с silent skip; конкретный невыполненный prerequisite не записан в logs. Общий green нельзя выдавать за доказательство этого admin race. В дальнейшем сделать изолированный fixture и явную диагностику prerequisites, не разрешая запись в обычную БД.

**Последствия:** локальный `test:unit` PASS не проверяет эти политики. CI также запускает общий `npm test`, который включает все файлы с DB setup: это **не доказанный пропуск всех этих тестов в CI**, а несогласованность быстрых локальных проверок и специализированных suites. Часть исключённых файлов действительно требует БД или относится к legacy; не следует включать всё в unit автоматически. Один из 76 файлов — заранее существовавшая незавершённая локальная работа, это отдельно не считается дефектом.

**Улучшение:** явно разделить pure/unit/integration/legacy tests; автоматически обнаруживать unit tests по соглашению, проверять необъяснимые исключения и сохранять DB isolation guard. Не присоединять DB setup к чистым тестам.

**Приёмка:** критичные pure policies запускаются обычной локальной unit-командой; новый тест не требует ручного добавления в огромный whitelist; остальные исключения документированы и проверяются подходящим suite. Статус: открыто, новая находка.

**Исправление 04.10:** N14: backend unit/integration profiles используют auto-discovery вместо 300+ whitelist. Все pure *.test/*.spec включаются; 17 *.integration.test плюс 5 именованных DB fixtures идут в integration с обязательным isolated setup. Известный старый maintenance lease test исправлен на dual-lock mock. Unit: 384 files / 1396 PASS без DB setup (loopback port 9). Admin concurrency создаёт собственные 2 CI fixtures, временно приостанавливает и восстанавливает остальные synthetic CI admins; прежние seed/session prerequisites больше не вызывают silent skip. Свежий PostgreSQL replay расширенных 22 integration files ожидает итогового CI; обычная developer DB не использовалась.

### N15 · P2 · Закрепить GitHub Actions по неизменяемым ревизиям

**Подтверждение:** quality, promotion и release-evidence workflows используют `actions/checkout@v4`, `setup-node@v4`, `dependency-review-action@v4`, `upload-artifact@v4`, `actions/attest@v4` и `gitleaks/gitleaks-action@v2` вместо полного commit SHA.

**Последствия:** код внешнего action может измениться под тем же тегом без изменения repository diff; это дополнительная поверхность supply-chain риска в проверках и выпуске. Компрометация конкретного action не обнаружена.

**Улучшение:** закрепить проверенные полные SHA с читаемыми комментариями версий, завести контролируемое обновление и review permissions/secrets по jobs.

**Приёмка:** внешние actions используют immutable refs, обновление проходит review и CI, release attestation сохраняет рабочий контракт. Статус: открыто.

**Исправление несрочной порции:** все external uses в четырёх active workflows закреплены полными 40-character commit SHA, разрешёнными из официальных прежних major refs (`dependency-review-action v4` — branch, остальные — tags). Версии отмечены комментариями; job permissions/secrets не расширялись. Новая CI-проверка отклоняет tags/branches/short SHA/dynamic refs, а локальные actions и Docker digest допускает. **3 tests и check:action-pins PASS**. Provenance и процедура контролируемого обновления: `docs/operations/GITHUB_ACTION_PINS.md`. N15: immutable-ref исправление завершено; actual release attestation остаётся отдельным внешним evidence.

### N16 · P2 · Отдельно устранить проблемы development toolchain

**Подтверждение:** полный npm audit, включая dev dependencies, показывает frontend **7 entries (6 high, 1 critical)**, backend **8 (3 high, 5 moderate)**. Production subset учтён в U12/U13. Дополнительная frontend-цепочка включает `shadcn → ts-morph/@ts-morph/common → fast-glob/micromatch/braces`; у backend добавляются development paths и зависимые entries. Число entries не равно числу независимых эксплойтов.

**Последствия:** production-only gate не отражает риск инструментов, обрабатывающих вход при генерации/сборке. Эти dev entries не доказывают наличие соответствующего кода в runtime bundle. Для shadcn npm предлагает major downgrade; слепой fix может нарушить toolchain.

**Улучшение:** разобрать реальные dependency paths и необходимость CLI, выбрать поддерживаемые совместимые версии либо убрать неиспользуемый генератор из project dependencies; разделить production и development audit evidence. Не выполнять `audit fix --force` и не маскировать findings blanket overrides.

**Приёмка:** полный audit закрыт либо каждое оставшееся исключение имеет проверенную достижимость, срок и владельца; lint/build/generation работают. Статус: открыто, новое dependency evidence.

**Исправление 04.10:** N16: fresh full npm audit показал 6 frontend high entries только через неиспользуемый shadcn generator; backend уже 0. Generator удалён из devDependencies, вместе с 197 исключительно его transitive packages; остальные версии не изменились. После изменения полный root/server audit: 0 vulnerabilities. CI audit включает dev-зависимости с high threshold; force/downgrade/blanket overrides не применялись. Проверка npm ci конечного lockfile и полный candidate suite впереди.

**Коррекция после clean install:** N16 follow-up: clean npm ci выявил реальный CSS import shadcn/tailwind.css. Статическая MIT CSS 4.21.0 сохранена byte-identical в src/shared/styles/vendor с license/provenance/SHA; import перенаправлен локально. CLI dependency graph не возвращён, визуальные utilities не изменены. Fresh audit остаётся 0; повтор Next build/CSS comparison обязателен перед push.

### N17 · P2 · Согласовать mock broadcast access с backend permissions

**Подтверждение:** при исправлении U11 повторно проверен `src/app/mocks/handlers.ts`, GET `/api/v1/broadcast-requests/:broadcastId`: чужая заявка скрывается только от роли `client`; любой иной mock user получает полную response без provider/branch permission и offers filtering. Это отличается от backend participant policy после U11 и от его прежних owner scope checks.

**Последствия:** демонстрация и frontend mock tests могут показывать доступ, которого real API не разрешает, и скрывать authorization regressions. Это не сохранённый bypass в production backend: исправленный backend отклоняет роль без действующего participant scope.

**Улучшение:** mock current user/membership/branch projections должны повторять правила backend и его 403/404 contract; добавить негативные mock cases для admin, super-admin и чужого филиала. Frontend/mock work выполнять отдельным ограниченным шагом с требуемой ownership; UI composition не менять.

**Приёмка:** те же actor/request fixtures дают одинаковую доступность и видимые offers в mock/real contracts, клиент сохраняет полный доступ к собственной заявке. Статус: открыто, новая несрочная находка при U11.

**Исправление 04.10:** N17: mock broadcast detail/inbox применяют active provider, requests permission, branch/market/service scope, expiry и prior-offer participant policy. Offers скрываются вне разрешённых филиалов; admin/super-admin без membership доступа не имеют. Offer creation больше не зависит от отсутствующих providerId/locationId на broadcast-заявке и проверяет выбранный филиал. 3 MSW HTTP сценария PASS (guest/foreign/privileged denial, scope/inbox, competing offers/prior participant); TypeScript и lint PASS.

### N18 · P3 · Сохранить значения с пробелами при чтении backup-конфига

**Подтверждение:** `server/scripts/backup.sh` загружает `.env` через `export $(grep -v '^#' .env | xargs)`. Изолированная синтетическая строка `DATABASE_PASSWORD="synthetic password"` теряет часть значения после shell word splitting; настоящий `.env` не читался.

**Последствия:** quoted password или path с пробелом может стать другим значением и сорвать backup. Наличие таких значений в production не проверялось; это отдельная проблема конфигурации, не изменение криптографического контракта U04.

**Улучшение:** безопасный dotenv parser с явно разрешёнными переменными и передачей значений без shell splitting; не исполнять произвольный `.env` как shell code и не выводить secrets.

**Приёмка:** quoted spaces, comments и empty values сохраняют ожидаемое значение; отказ не раскрывает пароль. Статус: открыто, новая несрочная находка при U04.

**Исправление несрочной порции:** backup использует Node dotenv parser с allowlist переменных; shell splitting и исполнение `.env` исключены. Явные process values (включая production и пустой пароль) имеют приоритет. Три parser cases и настоящий subprocess backup с synthetic pg_dump, quoted password/path и инертной shell substitution проходят; вместе с U04 regression suite — **17 tests PASS**. Настоящий `.env` не читался, реальная БД не использовалась. N18: программное исправление завершено, общий push ещё не выполнен.

### N19 · P2 · Устранить ожидание workflow публикации собственной проверки

**Подтверждение:** `.github/workflows/promote-dev-to-main.yml` запускает `gh pr checks --watch --fail-fast` без фильтра required checks. PR #7 содержит check самого `Promote verified dev` на том же head. После завершения обеих Quality проверок на `fde2d05` promotion оставался в шаге ожидания PR CI; run `37122587540` в итоге cancelled. Причина self-wait следует из команды и check graph: шаг ждёт завершения workflow, в котором сам выполняется. [Официальные CLI options](https://cli.github.com/manual/gh_pr_checks) подтверждают отдельный `--required` фильтр и ожидание завершения checks через `--watch`.

**Последствия:** автоматическая публикация может зависать до timeout/cancellation при зелёном Application CI; ручное обычное слияние после проверок работает. Не является основанием обходить branch protection.

**Улучшение:** ждать только требуемый Application CI с ограниченным timeout и сверкой точного head SHA; проверить поддерживаемый способ merge с текущими настройками репозитория. Сохранить PR, required checks и запрет bypass.

**Приёмка:** после зелёных required checks promotion завершается без ожидания самого себя; failed/stale candidate не сливается. Статус: открыто, новая несрочная находка при публикации PR #7.

**Исправление несрочной порции:** отдельный bounded runner читает только required checks и требует зарегистрированные успешные Application CI для push и pull_request. Сам promotion check не выбирается. До каждого опроса и после успеха проверяются head SHA, dev→main и OPEN; merge использует `--match-head-commit`, обычный squash/auto и сохраняет ветки. Предел первого Quality wait — 45 минут, PR wait — 45 минут, полный job — 100 минут. Missing/failed/skipped/cancelled/stale checks отклоняются. **12 runner/CI-policy tests PASS**, `check:ci-cd-policy` PASS. N19: код исправлен; реальная публикация проверяется после единственного push всей порции.

### N20 · P2 · Стабилизировать ожидание готовности mock frontend в release E2E

**Подтверждение:** неизменный head `0969405` прошёл весь push Quality run `37137798572`, включая Browser/PWA. PR run `37137801742` на том же SHA завершился: 169 passed, 1 flaky, 1 failed. Tablet city listbox case (`e2e/autocare-release-audit.spec.ts:443`, assertion 448) трижды получил disabled trigger за 5 seconds. Галерея/comparison case (строка 125) проходил только после retry. `gotoStable()` ждёт domcontentloaded, а не завершение hydration/API readiness. Logs также содержат mock-request proxy ECONNREFUSED; точный механизм race не доказан. Frontend tree этой порцией не менялся.

**Последствия:** одинаковый кандидат получает разные release verdicts; ограниченные повторные запуски обходятся десятками минут. Это доказанная нестабильность CI, не доказанный production defect city picker.

**Улучшение:** изолировать mock lifecycle и query fixtures, дождаться явной готовности нужных данных перед keyboard assertions с ограниченным ожиданием. Сохранить сами a11y/assertions; не снимать gate, не добавлять blanket retries/skip и не увеличивать все таймауты без диагностики.

**Приёмка:** cold/warm runs во всех трёх viewport profiles воспроизводимо проходят на одном SHA; реальные disabled/error состояния дают диагностический отказ. Статус: открыто, новая несрочная CI-находка. Один rerun только failed jobs запущен на том же candidate (attempt 2), без изменения source/tests или branch protection.

**Исправление 04.10:** N20: gotoStable теперь ждёт nonvisual Next bootstrap readiness (после MSW/locale initialization), city keyboard case — actual markets data-state=ready до исходных keyboard/assertions. Layout не изменён, global timeouts/retries/skip не увеличены. Локальный изолированный Next dev + strict MSW: 9 повторов до и 9 после PASS на desktop/mobile/tablet, cold/warm. Прежний CI failure локально не воспроизведён; proxy ECONNREFUSED не объявляется доказанной причиной. Финальная first-attempt CI/browser приёмка впереди.

## Рекомендуемый порядок работ

| Очередь | Пункты | Результат следующего шага |
| --- | --- | --- |
| 1 | U01 | Работающий production key adapter; U09/U11/U12/U13 опубликованы |
| 2 | U02, N09 | Versioned AAD и проверяемый rollout/restore шифрования; U05 stable-HMAC KEK rotation опубликован |
| 3 | U03 | MFA/step-up; U07/U04 опубликованы; external restore rehearsal открыта |
| 4 | U08, N03, N13, N14, N20 | Next artifact checks, PWA/SEO и тестовые suites; U06/U10 опубликованы |
| 5 | N04, N06, N08, N12 | Ограниченные queries, полноценная очередь owner и измеренный production performance |
| 6 | N01, N02, N05, N07, N10, N11, N15, N16, N17, N18, N19 | Актуальные инструкции/реестры, CSP/type safety, тексты, модульность, supply-chain hygiene и mock authorization parity |

Пункты одной очереди можно выполнять независимо, если они не затрагивают общий data contract. U02/U05/N09 нужно проектировать вместе: несогласованное изменение индексов/формата может лишить доступа к существующим данным. Закрытие пункта требует его приёмки; один зелёный unit suite не закрывает production/integration evidence. U05 прошёл выбранную live приёмку; HMAC rotation и retirement исторических KEK остаются N09.

## Проверки исходного аудита и последующих порций

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

**Не выполнено локально при исходном аудите:** запуск API с изолированной PostgreSQL/Redis, применение миграций и DB integration/E2E. Последующий disposable CI выполнил migration smoke, role/API integration и E2E; свежие результаты каждой порции приведены в U06/U10/U04/U05 и ниже. **Внешние проверки остаются открытыми:** реальные учётные записи/IdP/KMS, object storage/antivirus/SMTP/OAuth providers, production load/Lighthouse, восстановление backup, юридические/операторские согласования. Docker daemon недоступен, безопасность обычной developer DB для тестов не установлена; она не использовалась и не очищалась. Исторические успешные DB проверки не выдаются за свежие.

**Что уже есть:** unit/build/type/lint и API parity проходят; в проекте реализованы scoped chat moderation, private attachment access, session/WS controls, booking/bonus invariants и часть предыдущих product fixes. Старая формулировка «нет шифрования» больше не точна: реализация есть, но её production wiring и свойства требуют U01/U02; U05 stable-HMAC KEK rotation реализован, полная HMAC migration и key retirement остаются N09. A21/A29 нужно перепроверить и обновить disposition по текущей реализации, а не автоматически возвращать весь старый scope в open.

**Проверки партии U09/U11:** финальный backend suite — **309 files / 1177 tests PASS**, backend build PASS; full lint для U09 и targeted lint после последних изменений PASS. U09 capture проверяет Pino/HTTP/external-report границы, U11 focused suite — **4 files / 31 tests PASS**; API contract/parity/snapshot/threat-surface PASS, `git diff --check` PASS. U09 до исправления воспроизведён 5 падающими regression cases, U11 — 4. U09 коммит `a9fa608`; U11 фиксируется отдельным коммитом `fix(security): restrict broadcast reads to participants (U11)`. Existing integrity-script/manifest files проверены по SHA-256 и не изменены. DB/production ограничения исходного аудита сохраняются.

**Итог исходного аудита:** локальные PASS не снимают production блокеры и внешние ворота. Pilot остаётся **NO-GO**; проценты 54 канонических ворот не пересчитывались. Сам аудит не менял runtime-код, зависимости и БД; последующие разрешённые исправления описаны выше. Ранее существовавшие локальные изменения сохранены. Временные Next servers/браузерный tab остановлены после проверки.


**Публикация U10/U04:** PR #8 на `0969405` — обе Quality-проверки PASS; backend, migration smoke, 75 integration / 1470 full tests PASS (один прежний admin skip), 18 tooling и real production Next smoke PASS. Attempt 2 без изменения кода: 171 E2E и 12 PWA PASS. PR #8 слит обычным squash в `main` (`5b6d36e`); fetched main tree `430a920bc9515c01c1f3606a311abc18ae85ec36` точно совпадает с проверенным dev. N20 остаётся открытым как воспроизведённая нестабильность предыдущего прогона; повторный PASS не исправляет причину.


**Публикация U05:** обе Quality-проверки PASS на `14afc34`: PR `37143037677`, push `37142990185`. PR browser **171 E2E / 12 PWA PASS** с первого запуска. PR #9 слит в `main` (`0830e40d360fe5799026a55a8a637156c24d9a74`); fetched main tree `e612e882e5763b43d4d075fdf2056e2d0563bc6b` точно совпадает с проверенным dev. U05 опубликован; исторические ключи сохранены. Код срочных исправлений остаётся отдельными коммитами в dev, main принимает их через обычные squash PR согласно linear-history policy.

**Следующая порция:** U01/U02 ожидают выбора внешнего KMS и связанной sync-cache/async encryption границы; U03 — варианта MFA/SSO и recovery; U08 — явного решения о frontend ownership. Три кратких вопроса направлены владельцу; ответа пока нет, разрешение на субагента/передачу ownership не предполагается. Локальный `.codex/rules/subagents.md` требует frontend-senior ownership, а глобальные инструкции владельца запрещают агентов без явного запроса. Frontend код этой порции не менялся. Остаток: **4 срочных / 20 несрочных**. Отдельная публикация status-only документов отражает уже проверенные исправления; runtime остаётся опубликованным U05. Первоначальные три dirty-файла повторно проверены по SHA-256: без изменений.
