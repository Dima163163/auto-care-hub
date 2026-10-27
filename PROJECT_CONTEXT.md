# AutoCare Hub Project Context

## U02 contact snapshot binding preparation — 2026-10-27

Новые `autocare_service_requests.contactSnapshot` получают HMAC по JSON,
request UUID и client/provider/location/definition UUID. ORM отвергает перенос
контактов или смену owner/service scope после AES-GCM расшифровки. Migration
178657, bounded compare-write backfill, полный verify и opt-in strict reader
готовят старые строки. Анонимизация очищает binding вместе со снимком.
До PostgreSQL CI, staging KMS/restore и strict cutover U02 и pilot NO-GO
остаются открытыми.

## U02 estimate snapshot binding preparation — 2026-10-27

Новые `autocare_service_requests.estimateSnapshot` получают HMAC по JSON,
request UUID и client/provider/location/definition UUID. ORM отвергает перенос
сметы или смену owner/service scope после AES-GCM расшифровки. Migration
178656, bounded compare-write backfill, полный verify и opt-in strict reader
готовят старые строки. Частичная выборка аналитики теперь выбирает binding
и все UUID контекста. Анонимизация очищает binding вместе со снимком.
PR #34 прошёл PostgreSQL/browser CI и объединён в `dev` как `7a7224e`.
До staging KMS/restore и strict cutover U02 и pilot NO-GO
остаются открытыми.

## U02 accepted quote binding preparation — 2026-10-27

Новые `autocare_service_requests.acceptedQuoteSnapshot` получают HMAC по JSON,
request UUID и client/provider/location/definition UUID. ORM отвергает перенос
котировки или смену owner/service scope после AES-GCM расшифровки. Migration
178655, bounded compare-write backfill, полный verify и opt-in strict reader
готовят перенос старых строк. Анонимизация очищает binding вместе со снимком.
PR #33 прошёл PostgreSQL/browser CI и объединён в `dev` как `2edb1b6`.
До staging KMS/restore и strict cutover U02 и pilot NO-GO
остаются открытыми.

## U02 booking snapshot binding preparation — 2026-10-26

Новые `autocare_service_requests.bookingSnapshot` получают HMAC по JSON,
request UUID и client/provider/location/definition UUID. ORM проверяет его
после AES-GCM и отвергает перенос ciphertext или смену owner/service scope.
Migration 178654, bounded compare-write backfill, полный verify и opt-in
strict reader готовят legacy перенос. Анонимизация очищает binding вместе
со снимком; invariant дополнительно проверяет остаточные финансовые поля.
PR #32 прошёл PostgreSQL/browser CI и объединён в `dev` как `c4035a9`.
До staging KMS/restore и strict cutover U02 и pilot NO-GO
остаются открытыми.

## U02 private chat subject binding preparation — 2026-10-26

Новые `autocare_chat_threads.subject` получают HMAC по plaintext, thread UUID,
type и связям request/provider/client/creator. ORM проверяет его после AES-GCM
и отвергает перенос ciphertext или изменение связей доступа. Migration 178653,
bounded compare-write backfill, полный verify и opt-in strict reader готовят
legacy перенос. Анонимизация аккаунта пересчитывает binding каждой темы после
обнуления client/creator ID. PR #31 прошёл PostgreSQL/browser CI и объединён
в `dev` как `ec6e2df`. До staging KMS/restore и strict cutover U02 и pilot
NO-GO остаются открытыми.

## U02 encrypted service offer binding preparation — 2026-10-26

Новые `autocare_service_messages.offer` получают HMAC по JSON, message UUID,
request/thread UUID, sender UUID и kind. ORM проверяет его после AES-GCM и
отвергает перенос ciphertext между строками или изменение связей доступа.
Migration 178652 добавляет nullable `offerBinding` и checkpoint; bounded
compare-write backfill, полный verify и opt-in strict reader готовят перенос
старых предложений. Raw SQL account deletion очищает binding вместе с offer.
PR #29 прошёл PostgreSQL/browser CI и объединён в `dev` как `6ce7be0`;
promotion PR #30 открыт для защищённого `main`. До staging KMS/restore и
включения флага U02 и pilot NO-GO остаются открытыми.

## U02 private message body binding preparation — 2026-10-26

Новые `autocare_service_messages.body` получают отдельный HMAC по plaintext,
полю, message UUID, request/thread UUID, sender UUID и kind; ORM проверяет его после
AES-GCM и обнаруживает подмену ciphertext другой строки или связей доступа.
ORM insert материализует default kind=`text` до вычисления HMAC, чтобы старые
вызовы сохранения без явного kind остались совместимы.
Migration 178651 добавляет nullable
`bodyBinding` и checkpoint; bounded compare-write команда переносит legacy
сообщения, полный verify и opt-in strict reader готовят cutover. Удаление
сообщения и raw SQL account deletion обнуляют binding. PR #28 прошёл
PostgreSQL/browser CI и объединён в `dev` как `f3d06a4`. До staging
KMS/restore и включения флага старые строки читаются; остальные поля U02 и
pilot NO-GO открыты.

PR #27 (имя/телефон) прошёл полный CI и объединён в `dev` как `ba04e68`;
защищённый promotion PR #19 ждёт независимого code-owner review.

## U02 user name/phone binding preparation — 2026-10-25

Новые users.name/phone получают отдельный HMAC по plaintext, полю и user UUID;
после AES-GCM расшифровки ORM сверяет его и обнаруживает перестановку
корректных ciphertext между пользователями. Migration 178650 добавляет nullable
binding-поля и checkpoint; команда ограниченно переносит legacy строки с
compare-write, а полный verify и opt-in strict reader готовят cutover. До
staging KMS/restore и включения флага старые строки читаются, остальные поля
U02 и pilot NO-GO открыты.

## U02 OAuth subject binding expansion — 2026-10-25

Новые OAuth subject envelopes связаны с identity UUID, user UUID и провайдером.
ORM-чтение сверяет MAC и blind index, сохраняя чтение старых envelopes до
отдельного backfill и strict cutover. Перенос полной пары index+ciphertext
между строками теперь выявляется. Следующая порция добавляет миграцию
checkpoint-таблицы 178649, пакетный compare-write backfill, полный verify и
`DATA_ENCRYPTION_REQUIRE_OAUTH_RECORD_BINDING=true` для opt-in strict reader.
PR #25/#26 прошли полный CI и объединены в `dev` как `8351f89`/`109b07e`.
Без staging KMS/restore это лишь подготовка; U02 и pilot NO-GO остаются открытыми.

## U02 outbox backfill preparation — 2026-10-25

PR #23 прошёл полный CI и объединён в `dev` как `ff48fda`.
Новая порция добавляет checkpoint-миграцию 178648, пакетную команду с
JSONB compare-write, полный verify-проход и флаг
`DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING=true`. До staging переноса с
реальным KMS, restore и переключения флага старые outbox envelopes продолжают
читаться. PR #24 прошёл полный CI/PostgreSQL/browser E2E и объединён в `dev`
как `2407982`; U02 и pilot NO-GO остаются открытыми.

## U02 outbox record binding expansion — 2026-10-25

Новые outbox email/toEmail и recipientName envelopes получают MAC по UUID
события. ORM и атомарный raw INSERT создают UUID до шифрования; при чтении
проверяются MAC и соответствие UUID строки. Режим совместимости читает старые
события до отдельного пакетного переноса и строгого переключения. PostgreSQL
worker flow должен пройти CI; U02 и pilot NO-GO остаются открытыми.

## U02 email backfill preparation — 2026-10-25

PR #21 прошёл полный Quality CI, включая PostgreSQL integration и browser E2E,
и объединён в `dev` как `d66007c`. Promotion PR #19 обновлён на этот SHA;
защищённый `main` ждёт нового CI и независимого code-owner review.

Следующая локальная порция добавляет миграцию checkpoint-таблицы, пакетную
команду для users/invitations с compare-write транзакциями, полный verify-проход
и `DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING=true` для строгого чтения после
cutover. До настоящего KMS/staging backfill, проверки restore и переключения
production это только подготовка; остальные поля U02 и U03 ещё открыты.

## U02 email binding expansion — 2026-10-25

Новые `users` и `autocare_provider_invitations` email envelopes получают HMAC,
связывающий ciphertext с row UUID; invitation также с provider UUID. ORM-чтение
проверяет MAC и HMAC blind index. Старый reader игнорирует новое поле, а новый
временно читает legacy envelopes для rolling deployment. Поэтому backfill,
strict switch и остальные поля U02 ещё открыты; удаление MAC пока допускает
downgrade. Unit/build проверены локально; PostgreSQL integration ждёт CI.
`09-access-privacy.puml` и SVG отражают этот этап.

## U02 outbox identity integrity — 2026-10-24

Outbox transformer при чтении сверяет расшифрованный email/toEmail с
сохранённым HMAC blind index; несовпадение или отсутствие пары index/ciphertext прерывает
доставку. Добавлены negative unit и PostgreSQL integration cases. Перенос
согласованной пары между событиями и recipientName без record/owner AAD
остаётся открытым. `08-outbox-maintenance.puml` и SVG обновлены.

## CI dependency gate — 2026-10-24

PR #17 выявил новые advisory в web lockfile; минимальный npm audit fix
обновляет fast-uri 3.1.8→3.1.9, serialize-javascript 7.0.5→7.1.4,
undici 7.30.0→7.30.1 и zod 4.4.3→4.6.7 без изменения прямых диапазонов
версий. Локально npm audit показывает 0; web unit 661/661, ESLint, Next и
Vite production builds прошли. PR #17 прошёл Application CI и объединён
в dev как `0186aa5`; push Quality и защищённое продвижение в main выполняются.
Следующий CI обнаружил отдельные advisories API: server lockfile обновляет
fast-uri до 3.1.9/4.2.3 и zod до 4.6.7, а прямой nodemailer — до 10.2.1.
`npm --prefix server audit` показывает 0; повторный backend quality прошёл
1472/1472 unit, миграционные/контрактные проверки и TypeScript build.

## U02 partial identity integrity — 2026-10-24

ORM read сверяет users/provider-invitations email ciphertext с сохранённым
HMAC blind index; несоответствие прерывает чтение. Unit и PostgreSQL
integration negative paths добавлены для подмены одного ciphertext. Перенос
согласованной пары и прочих encrypted columns по-прежнему возможен без
row/owner AAD; U02 и pilot NO-GO остаются открыты. `09-access-privacy.puml`
и SVG обновлены.

## U01 production KMS code path — 2026-10-23

API/worker и TypeORM CLI теперь загружают KMS-encrypted keyring до работы с
шифрованными полями. Отсутствие конфигурации, malformed ciphertext и отказ
Decrypt останавливают startup; локальный keyring по-прежнему запрещён в
production. Provisioning создаёт случайные KEK/HMAC только для новой пустой БД;
существующую базу нельзя переключать на новый keyring. AWS KMS/IAM, staging
restart/restore и U02 row-bound envelope ещё не приняты. Runtime PlantUML/SVG
и 134 source anchors обновлены.

## CI secret scan, 2026-10-22

PR #16 обнаружил один false positive: Gitleaks принял сохранённый SHA-256
`npm-api-audit.json` за API key. Хэш побайтно сверён с evidence-файлом;
`.gitleaksignore` исключает только fingerprint конкретной находки старого
коммита. Проверка нового CI ожидается.

## Локальное исправление N23 — 2026-10-22

Клиентские и owner списки заявок используют cursor pages (50 на странице),
SQL scope филиала до лимита и пакетную загрузку связей. Старый array-контракт
ограничен 100 записями и возвращает `X-Next-Cursor`. Owner/admin аналитика
обрабатывает заявки блоками по 500, сообщения — блоками по 1000 metadata;
счётчики lifetime сохраняются, SQL считает сумму бонусов/отзывов и наличие
смет. Unit 1465/1465, web 659/659, API/Next builds, ESLint и
API runtime boundary PASS.
Queue counters on paginated screens now show `+` and an explanation until
older pages are loaded, avoiding false totals. Active older requests still
require explicit pagination; prioritised server filtering is a pilot follow-up.
PostgreSQL измерение latency/памяти и проверка большой истории после
исправления ещё не выполнены. `03-frontend`/`04-backend` схемы обновляются.

## Локальное исправление N22 — 2026-10-22

Owner analytics, admin quality и public trust теперь используют единое
правило первого ответа сервиса с проверкой автора, active membership,
филиала и времени. Историческая семантика доступа основана на текущем
membership до появления audit intervals. Targeted unit и API build PASS;
PostgreSQL HTTP flow ожидает среды с БД. Обновлены `04-backend.puml` и SVG.

## Локальное исправление N21 — 2026-10-22

Административные счётчики статусов отзывов теперь берутся из полной SQL
агрегации, а последние 1000 отзывов используются только для аномалий и
калибровки. API возвращает границы выборки, интерфейс показывает их при
усечении. Server unit 1457/1457, API/Next builds, focused web test и ESLint
PASS. Повторный сценарий PostgreSQL >1000 после исправления остаётся открытым:
локальная БД недоступна. Обновлены `05-domain-data.puml` и SVG.

## Локальное исправление N28 — 2026-10-22

`markSessionExpired`/`hasSessionExpired`/`clearSessionExpired` безопасно
обрабатывают отказ `sessionStorage` и хранят короткий fallback во вкладке.
`baseApi` очищает token, CSRF и API cache до записи optional expiry hint.
Targeted unit, ESLint и TypeScript PASS; реальный browser denial/deployed flow
не проверен. `07-auth-session.puml`, SVG и 79 anchors актуальны.

## Локальное исправление N26 — 2026-10-22

Новые пароли и проверяемые login/change-password inputs ограничены 72 UTF-8
байтами, как фактически обрабатывает bcrypt. Тест воспроизводит совпадение
двух разных 73-byte secrets на старом bcrypt hash и подтверждает их отказ
новой политикой; проверен Unicode. Targeted unit и API build PASS. Существующие
длинные пароли требуют email reset; production recovery flow и реальная база
локально не проверены. Обновлены `07-auth-session.puml`, SVG и 79 anchors.

## Локальное исправление U16 — 2026-10-22

Для `autocare_trust_evidence.reference` добавлен отдельный HMAC blind index.
Review moderation и dedup приватных документов ищут по индексу; исходный
reference остаётся случайно зашифрованным. Миграция 178644 строит индекс
для старых записей из расшифрованного значения. Targeted unit и API build
PASS, PostgreSQL migration/query integration без server PostgreSQL/Redis
локально не выполнена. Обновлены `05-domain-data.puml`, SVG и 77 anchors.

## Локальное исправление U21 — 2026-10-22

Web/API зависимости и lockfiles обновлены по текущим advisories. Оба
`npm audit` вернули 0 вместо 8 web и 6 API entries. После `npm ci` прошли
web 647/647, API 1436/1436, lint, Vite/API/Next production real builds,
fixture leakage 193 файлов и Next route/runtime checks. Прямые версии:
Next 16.4.2, sharp 0.35.5, Vitest 4.1.12; полный список и ограничения:
`docs/audits/DEPENDENCY_UPGRADE_2026-10-22.md`. PostgreSQL/Redis integration,
real E2E, published migration manifest и staging acceptance открыты.
Диаграммы не менялись; 74 anchors актуальны.

## Локальное исправление U19 — 2026-10-22

Создание guarantee claim блокирует связанную заявку и допускается только для
подтверждённой записи/завершённого визита, а no-show — после соответствующего
статуса. Повтор того же payload возвращает существующий case; иной claim
получает 409. `caseKey` и уникальный PostgreSQL index ограничивают один
канонический case на request. Миграция сохраняет старые дубликаты без caseKey;
trust score считает только канонический открытый case, а claim type сам по себе
не увеличивает счётчик доказанных moderation violations. Unit 1436/1436,
API build и migration filename check PASS. Локально не выполнена реальная
PostgreSQL migration/concurrency; published acceptance открыта. Обновлены
`05-domain-data.puml`, SVG и 74 source anchors.

## Локальное исправление U18 — 2026-10-22

Истечение бонусов теперь восстанавливает остаток каждого начисления из полного
журнала account. Списание распределяется по ближайшему сроку годности, затем
по времени начисления; возврат отменённой записи образует новый бессрочный
credit. Уже потраченное старое начисление не забирает более поздние баллы.
Unit 1429/1429 и API build PASS; PostgreSQL regression для реального ledger
добавлен, но локально не выполнен без server PostgreSQL/Redis. Обновлены
`05-domain-data.puml`, SVG и 70 source anchors. Старые ошибочные списания,
если они были в production, требуют отдельной сверки/компенсации.

## Локальное исправление U17 — 2026-10-22

Создание provider invitation теперь в одной DB transaction ставит `email.send`
с encrypted одноразовым токеном. Worker строит ссылку на
`/owner/invitations/accept`, отправляет письмо и удаляет token из завершённого
outbox payload. Existing user получает также уведомление с указанием проверить
почту; незарегистрированный адрес получает письмо. Production API по-прежнему
возвращает `inviteToken: null`. Unit и API build PASS; реальный PostgreSQL,
worker и SMTP локально не проверены. Обновлены `08-outbox-maintenance.puml`, SVG
и 68 source anchors. Pilot production acceptance остаётся открытой.

## Локальное исправление U15 — 2026-10-22

Новый `chat-write-policy.ts` задаёт единое правило для chat и request API:
admin/superadmin могут писать только в support/escalation, но не в private
service-request thread. Legacy message/attachment routes проверяют правило до
чтения данных и загрузки объекта; `lockRequestChatThreadForWrite` повторяет
его до создания thread и после row lock. Новый chat API использует тот же
export. Targeted unit 45/45, полный backend unit 1419/1419 и API build PASS;
локального PostgreSQL+Redis
HTTP integration нет. `09-access-privacy.puml`, SVG и manifest обновлены;
pilot production acceptance остаётся открытой.

## Локальное исправление U20 — 2026-10-22

Preferences и login counter reset теперь обновляют только разрешённые поля с
условиями актуального status/tokenVersion/password/attempts. Смена пароля
повторно читает User под row lock, проверяет версию и текущий hash, меняет
hash/version и отзывает сессии в одной транзакции. Reset/verification token
обновляют узкие поля; OAuth profile, bootstrap и account anonymization
читают User под row lock до full save. Unit `users.service.test.ts` 3/3 и API
build PASS. Добавлен PostgreSQL concurrency integration test, но локально
не запущен: `initdb` есть, серверного `postgres` и Redis нет. Обновлены
`07-auth-session.puml`, SVG и source anchors. Полный backend unit 1410/1410
PASS. Это локальный code fix;
production/CI race acceptance и остальные pilot blockers не закрыты.

## Повторная проверка файлов — 2026-10-21

В checkout `fix/request-chat-state-isolation-2026-10-20` механически проверены
все 2 585 tracked files на исходном срезе `365e087`: форматы, 195 PNG/WebP,
JS/shell/YAML syntax и ссылки. Повторно PASS frontend 647/647, backend Quality
1408/1408, lint, TypeScript/Vite/production Next builds, API/design/interaction
contracts и 62 PlantUML anchors. 15/15 прежних synthetic defect cases
воспроизвелись на текущем коде (кроме закрытого U14). Новых подтверждённых
code defects нет; U15/U17–U21 и pilot blockers открыты. Исправлены неверные claims в SECURITY.md,
YAML syntax и абсолютная ссылка на внешний отчёт. Полная semantic review всех
исторических документов и каждого source file не заявляется; нет нового
PostgreSQL+Redis integration/staging evidence. Отчёт и точное покрытие:
`docs/audits/REPOSITORY_FILE_RECHECK_2026-10-21.md`.

## Итоговая локальная проверка пилота — 2026-10-21

Ветка `fix/request-chat-state-isolation-2026-10-20`, HEAD `26da803`, содержит
пять локальных исправлений U22/UX17/UX18/UX16/U14. Полный frontend unit:
197 файлов / 647 tests PASS; backend Quality с тестовым окружением: 388 файлов /
1408 tests PASS. Lint, production Next real build, mock leakage, contract checks
и 62 PlantUML source anchors PASS. U14 отдельно проверен на чистой disposable
PostgreSQL16 с 140 миграциями. Pilot readiness, operations, anonymized evidence
и published migration manifest не закрыты; U15/U20/U17/U18/U19/U21/U01–U03
остаются открыты. Решение NO-GO для реальных данных, синтетический staging/demo
допустим в рамках 54 gate. Полная semantic сверка документации не завершена.
Подробности: `docs/audits/PILOT_READINESS_RECHECK_2026-10-21.md`.

## Локальное исправление U14 — 2026-10-21

`enqueueOutboxEvent` теперь явно применяет `outboxPayloadEncryptionTransformer`
перед raw INSERT; атомарный `ON CONFLICT` сохраняется. Миграция 178642
шифрует прежние plaintext email/toEmail/recipientName, включая смешанные
payload, не расшифровывая данные при откате. На собственной disposable
PostgreSQL16 применены 140 миграций; новый raw JSONB и backfill не содержат
открытых email/name, повтор enqueue оставляет одну строку, blind index
совпадает с запросом удаления аккаунта. Unit 13/13, API build и migration
filename check PASS. Обновлены `08-outbox-maintenance.puml`, SVG и anchors.
Production backfill, реальный mail worker и внешнее управление ключами
не проверялись; U15/U20/U21 и прочие pilot blockers открыты.

## Локальное исправление UX16 — 2026-10-20

На `fix/request-chat-state-isolation-2026-10-20` `ConfirmDialog` ограничен
высотой viewport, прокручивает длинное содержимое и расположен выше нижней
мобильной навигации. Кнопки переносятся на сверхузком экране. Production Next
mock browser: 320×568, 360×568, 390×844, 568×320 и стрессовый 180×284;
обе кнопки полностью в viewport и получают hit в центре. Axe dialog 0,
Escape закрывает окно и возвращает фокус; targeted unit 26/26, lint, tsc и
production build PASS. [Доказательство](docs/audits/evidence/2026-10-20/report-dialog-fix-verification.json).
Это локальная проверка; реальное устройство, browser zoom, real API и
deployed приёмка ещё не выполнены. Ранее найденные security issues открыты.

## Локальное исправление UX18 — 2026-10-20

На `fix/request-chat-state-isolation-2026-10-20` сравнение, карточка и карта
используют общий `formatProviderPreviewPrice`; сравнение/карточка используют
общие availability/warranty helpers. `bookingMode=request` и `quote_required`
не обещают фиксированное время. Из карты убран придуманный priceTo +20%.
На мобильном 360px `min-w-0` в grid item даёт таблице собственный horizontal
scroll (wrapper 326px, scrollWidth 640px, крайний столбец достижим).
Unit 9/9 для price/availability/warranty RU/EN и browser quote offer
`Prime Wheels`: Quote required / confirmation by service / текст гарантии.
Frontend map 60 anchors PASS. Локально, не опубликовано; real-API/deployed
приёмка не выполнена. UX16 и прежние security findings остаются открытыми.

## Локальное исправление UX17 — 2026-10-20

На `fix/request-chat-state-isolation-2026-10-20` после U22 форма заявки
восстанавливает `selectedTime` из сохранённого draft при отсутствии URL time;
URL date/time имеют приоритет. Новый draft дополнен абсолютной датой в timezone
сервиса. После смены дня относительное «сегодня» восстанавливается на исходную
дату. Исчезнувший слот снимает выбор, блокирует submit и показывает существующее
локализованное сообщение `SLOT_UNAVAILABLE`. Legacy draft без абсолютной даты
восстанавливается по старой относительной дате best effort: исторический день
из старого JSON узнать невозможно. Browser production Next mock подтвердил
20:00→20:00 после reload и сохранение appointmentDate; targeted unit 12/12.
Frontend diagram, SVG и source anchors обновлены. Не опубликовано; real-API
и production acceptance не выполнены. UX16/UX18 остаются открытыми.

## Локальное исправление U22 — 2026-10-20

Ветка `fix/request-chat-state-isolation-2026-10-20` от dev `8840ae8`.
`ServiceRequestChat` теперь монтирует внутреннее состояние по ключу
`viewer.id + requestId` во всех местах использования. При смене адресата или
пользователя очищаются черновик, retry key, offer, cursor, preview и открытые
действия; старый запрос к API продолжает относиться к исходному requestId.
Регрессионные unit tests: A→B→A, одинаковый текст после failed send,
identity switch, позднее завершение отправки A. Production Next mock browser:
черновик B пуст, POST с новым текстом направлен в B, при возврате A пуст.
Обновлены `03-frontend.puml`, SVG и anchor map. Это локальная проверка;
real-API / deployed privacy acceptance и публикация не выполнены. UX16–UX18
и другие security findings остаются открыты.

## UI/security recheck — 2026-10-20

Branch `audit/ui-security-recheck-2026-10-20`, dev `8840ae8`; remote dev/main
rechecked unchanged. Four new open findings in
`docs/audits/UI_SECURITY_RECHECK_2026-10-20.md` and working FULL registry:
U22 P1 request-chat draft carries into another provider's request; UX16 P2
report dialog actions clipped at 360×568; UX17 P2 stored 20:00 becomes 11:30
after reload; UX18 P2 comparison drops priceType/booking confirmation semantics.

Production Next mock 240/240 closed-page cases, 120 screenshots, 0 axe
violations plus incomplete; four extra interactions reproduce defects.
104/104 security unit tests (11 files), 5 source contracts, 5 HTTP CSP samples,
Next/API builds PASS. Initial unit env failure preserved, final run used fake
DB port 1 and temp storage. U14/U15/U20 reproduced again with synthetic
repositories/ORM metadata; no actual DB commit run on 20 Oct. npm audit U21
still web5/API2 package entries, applicability not equated to exploitable RCE.
No runtime/design/dependency edits. Prior dirty audit/map files preserved.

`docs/INDEX.md` and docs-coverage.json enumerate scoped startup review and
unread/unverified documents; this was not a complete semantic audit of all
151 original text/spec documents. All 51 map anchors match; existing previews
remain from 15 Oct, no fresh PlantUML renderer available. No fresh production
pentest/KMS/MFA, DB/Redis integration, native/screen-reader/200%-zoom acceptance.
Own loopback preview/temp artifacts only; source fixes and 54 pilot gates remain
open. Primary checkout's three integrity files preserved.

## PlantUML navigation — 2026-10-15

Start targeted project reading at `docs/diagrams/README.md`: 9 `.puml` diagrams
with SVG previews cover context/runtime/frontend/backend/data/requests/auth/
outbox/privacy. `sources.json` records 51 source anchors and 4 structural
inventories against dev `8840ae8`. `node docs/diagrams/check-map.mjs --scope auth`
checks a selected area; use `--repo <checkout>` for another branch copy.
Update affected diagrams/anchors/previews when code responsibilities or flows
change. Open the actual task function/tests after the map; fingerprints do not
prove semantic completeness. Workspace `../AGENTS.md` and `../docs/diagrams/`
route future sessions here. Existing primary checkout remains older/dirty;
preserve it. Branch `docs/plantuml-project-map-2026-10-15` carries the map and
preserves the earlier uncommitted audit documentation in this worktree.

## Дополнение аудита — 2026-10-13

На изолированной ветке `audit/project-weaknesses-2026-10-13` от локального
`origin/dev` (`8840ae8`, remote dev проверен GitHub compare и идентичен) добавлены
22 находки: N21–N23, U14–U21/N24–N34, всего 7 P1/12 P2/3 P3.
Рабочий реестр: `docs/audits/FULL_PROJECT_AUDIT_2026-10-03.md`;
полные proof/приёмка/границы: `docs/audits/DEEP_PROJECT_AUDIT_2026-10-13.md`;
последующее runtime evidence: `docs/audits/RUNTIME_VERIFICATION_2026-10-13.md`.

Высокие риски: raw outbox обходит encryption; superadmin private write через
request API; production invite не доставляет token; expired spent earn съедает
свежие бонусы; duplicate claims влияют на public trust; stale UserEntity save
включает прежние hash/status/tokenVersion в ORM diff. N22 расширен на trust,
N23 — на unbounded request lists/N+1. Ничего из этого ещё не исправлено.

16 synthetic воспроизведений подтвердили дефекты; evidence script ручной,
asserts текущее ошибочное поведение, не является green release gate.
Frontend 196/635, backend unit 387/1406, lint и API/Next real builds PASS.
Общий Node tooling suite: 188/190 PASS, два stale positive fixtures FAIL (N31).
Own loopback browser при unavailable API подтвердил raw error text и stale
auth metadata. Продолжение: 23/88 PostgreSQL integration, 10 real persisted
defect cases, 139 migrations/30 VALIDATE, PG/Redis multi-process smoke,
encrypted restore с matching 76 tables, 29/29 real production E2E без retries,
17/17 metadata + 17/17 JS + 5 CSP. N21 counter=0 при DB pending=3;
N23 list 1002 → 5016 queries. HTTP discovery 80/0fail, p95=118.8ms на loopback.
Свежий полный npm audit: web5/API2 entries; U21, применимость отделена от severity.
GitHub PR Quality run 37226572467 action_required/jobs=[], не CI PASS.
Hosted Node22/PG16 и production/native/CWV условия остаются внешними.
Использовались только собственные disposable PG29442/Redis29389 и synthetic
test/real/restore targets. Главная DB не менялась.

Workspace: `../autocare-hub-weakness-audit`; runtime изменения отсутствуют.
Три исходных незавершённых файла основной копии сохранены.
Новые пункты не закрывают и не расширяют 54 pilot gates; NO-GO сохраняется.

## Последнее дополнение: UX15 / QA02 — публикация возобновлена 2026-10-04

Основная порция опубликована PR #14: main `6d1e6b6`, dev `13c0fcb`, trees равны.
Push/PR Quality и promotion PASS; оба 204/204 mock + 12/12 PWA без retries,
frontend 635/backend 1494. Единственный atomic push уже выполнен.

После публикации дополнительный authenticated onboarding audit нашёл UX15
(aria-label на progress div без разрешающей роли); исправлен named group.
QA02 расширяет audit до 60 route/role cases × 4: обычный admin/superadmin,
client/owner onboarding, фактические login role/DOM locale/theme, выбор языка
через UI на каждом route и ожидаемый guest onboarding → login redirect.
240/240 и 120 screenshots, 8/8 authenticated onboarding, full axe 0 violations;
production build, strict types/full lint и 196/635 unit PASS.

UX15 и QA02 — отдельные проверенные коммиты на текущей ветке. После нового
указания пользователя «доделывай» разрешена следующая порция: один atomic push
feature/dev и protected dev→main PR с обязательными exact-candidate CI checks.
Фактическая публикация и hosted CI фиксируются в PR/Actions/publication.json;
локальные PASS не означают, что новая порция уже слита в main.
Preview `http://127.0.0.1:5198`; артефакт, patch и publication metadata:
`/Users/a1/Desktop/my-projects/AutoCareHub/ui-ux-audit-2026-10-04/`.
Primary integrity files сохранены; собственные synthetic API/PG/Redis убраны.
KMS/MFA/pilot/native-device/screen-reader/CWV и deferred designs сохраняются.

## Автономные UI/UX исправления — 2026-10-04

Пользователь поручил закончить доступное без его решений и проверить весь UI/UX.
Основной агент работает напрямую, субагенты не запрошены. Изолированная worktree
`/private/tmp/autocare-hub-urgent-audit-batch-2`, branch
`codex/autonomous-ui-ux-fixes-2026-10-04` от dev `a8ac107`, sync main `3ab9661`.
14 runtime/test findings (U08, UX01–UX10, UX12–UX14) закрыты отдельными commits.
Реестр: `docs/audits/UI_UX_AUTONOMOUS_2026-10-04.md`; audit script
`scripts/audit-ui-ux.mjs`, loopback production mock preview only.

U08 исключает mock runtime/server getter, login credentials и fallback providers
из real Next/Vite graphs; direct compile-time guarded dynamic imports обязательны
(early return или IS_MOCK_API оставляли chunks). Guard проверяет complete Next
static/server artifact, HTML/RSC/maps; Vite требует explicit --format/--dist-dir.
CI/release evidence включают real Next guard. 192 Next / 91 Vite files чисты,
8 positive/negative guard tests PASS. Guest real favorites разрешают только UUID
и public profile, удаление недоступного сервиса доступно после query failure.

UI/UX: 200/200, 100 full-page screenshots, 0 full axe violations/overflow/clipped
header controls/duplicate referenced IDs/missing media/keys/JS exceptions.
Mock full 192/192 без retries; после финальных SVG/header fixes targeted 18/18
без retries. Current hosted suite — 204 cases. Real production frontend
29/29 с isolated synthetic PostgreSQL 17 / Redis 7 и development test API,
Vite PWA 12/12, responsive 30/30, unit 196/635, strict types/full lint/builds PASS.
17 metadata + 17 initial JS и HTTP/browser CSP PASS.

Mobile Security Center drawer — portal above workspace main stacking context,
semantic div dialog, inert siblings/body lock, Tab/Shift+Tab/Escape/return focus.
Open-state axe catches aside role=dialog; closed-page audit did not. Clipped
header controls требуют bounds/hit-test, root scrollWidth недостаточен; compact
ThemeSwitcher reset должен сбрасывать individual CSS translate, не только transform.
Date-layout test uses future working day; не менять production slot rules.
UX01 placeholder не событие; mobile menu readiness нельзя семплировать isVisible
сразу после route change. Exact historical PR #13 failure trace отсутствует.

UX11 touch area 44px — optional improvement; spacing/native exceptions и deferred
D11/D19 сохраняются. KMS U01/U02, mandatory privileged MFA U03, N09 production
adapter/rollout, native devices/screen readers/CWV/legal/pilot evidence не закрыты.
Отложенные 10 дизайнов не реализованы. Primary 3 integrity files hashes unchanged.

Пакет использует один atomic push feature/dev и protected main PR. Actual hosted
publication/CI/source/main evidence сохраняется в PR/Actions и локальном
`/Users/a1/Desktop/my-projects/AutoCareHub/ui-ux-audit-2026-10-04/publication.json`,
без второго status-only push. Preview/evidence — synthetic, не production pilot GO.

## Опубликованный пакет выбранного дизайна — 2026-10-04

Пользователь просмотрел конкретные пары и явно поручил применить 36 вариантов:
D03–D08, D12–D17, D20–D21, D23–D36, D38–D42, D44–D46.
D01/D02/D09/D10/D11/D18/D19/D22/D37/D43 отложены.
Это прямое разрешение на реализацию выбранной визуальной области; дополнительное
согласование по локальному design lock не запрашивается. Frontend принадлежит
основному агенту по ранее явному решению пользователя; субагенты не запрошены.
Ветка `codex/selected-design-improvements-2026-10-04` от dev bdb2db7, обычная
синхронизация main 955b12a. Отдельные коммиты, один общий push, protected PR.
N11 опубликован PR #12, оба Quality events PASS, деревья main/dev совпали.


## Локальная приёмка выбранного дизайна

36 / 36 вариантов реализованы; TypeScript / ESLint / production builds PASS.
Frontend 196 / 635; real API production 27 / 27; Vite PWA compatibility 12 / 12;
responsive 30 / 30. Браузерные исходные 171 сочетание закрыты общей и целевой
приёмкой; selected interactions 18 PASS, moderation repeat 3 PASS.
Реестр: `docs/audits/SELECTED_DESIGN_IMPLEMENTATION_2026-10-04.md`.
При проверке закрыты D21 (обрезанная форма предложения), D32 (ссылки на скрытые
очереди), D17 (второй h1). Три исходных пользовательских dirty-файла сохранены.
Пакет опубликован: PR #13 merged `3ab9661`, source/dev `a8ac107`.
Оба exact-candidate Quality events PASS (push 37197468733, PR 37197513447);
push browser 189 first-attempt, PR 188 first-attempt + 1 mobile Security Center
retry; Vite PWA 12/12. Promote 37197468732 PASS; деревья main/dev совпали.
Mobile first-attempt instability вынесена в UX01 автономной порции; original
failure trace не опубликован. Post-merge main CI не заявляется: runs отсутствуют.

## История — N11 и дизайн-обзор, 2026-10-04

Владелец поручил закончить N11, затем проверить весь дизайн и показать пары
«текущий скриншот / предложение», чтобы выбрать будущие изменения. Основной
агент работает напрямую; субагенты не запрошены. Product UI/styling не менялись.
N11 выполнен в изолированной CLI worktree `/private/tmp/autocare-hub-urgent-audit-batch-2`,
ветка `codex/n11-responsibility-refactor-2026-10-04`, исходный dev `bb108e1` и
no-content sync main `3559ad7` (`e243634`). Первичные 3 dirty-файла сохранены.

Request use cases, provider/discovery/review workflows и chat/moderation теперь
имеют 39 самостоятельных backend responsibilities; прежние public facades и
transaction bodies сохранены. Frontend API: 212 DTO/schema declarations и 136
endpoint bodies в доменных файлах, одна RTK registration и прежние hooks.
MSW: 244 callbacks в 18 families, общая fixture initialization, прежний порядок
регистрации; contract guards читают именно зарегистрированные modules.
Карта: `docs/architecture/AUTOCARE_RESPONSIBILITIES.md`.

Локальная приёмка: frontend 189/609, backend unit 387/1406, PostgreSQL integration
23/88 без skip, полный backend 410/1494, миграции/seed/integrity/transition smoke,
Next production build, TypeScript/ESLint/route guards PASS. Полный mock browser
suite: 171 PASS с первого запуска, 18.8m, desktop/tablet/mobile. Hosted publication
фиксируется по фактическому PR/Actions результату, без второго status-only push.

Предыдущий пакет N01–N20 уже опубликован: PR #11 merged `3559ad7`, оба Quality
events на `bb108e1` PASS attempt 1, required-only promotion PASS; tree main/dev
совпал. Эта новая N11 порция тоже использует отдельные коммиты и один push,
обычный protected dev→main PR; обход защиты не разрешён.

Дизайн-артефакты сохраняются вне production checkout:
`/Users/a1/Desktop/my-projects/AutoCareHub/design-review-2026-10-04/`.
Все текущие экраны — локальная production mock-сборка с synthetic accounts.
Выявлено уточнение N10: footer исправлен, но `/contacts` и help mailto по прежнему
содержат неподтверждённые каналы; onboarding упоминает кабинеты. Это записывается
в очередь выбора, а не маскируется предыдущим closed статусом. U01/U02/U03/U08,
N09 adapter/rollout и внешний pilot NO-GO сохраняются.

## Текущая работа — несрочный пакет 2026-10-03

Пользователь попросил исправить N01–N20 отдельными коммитами с одним итоговым
push, явно разрешил основному агенту прямую frontend-работу и подтвердил отсутствие
публичных контактных каналов. Это разрешение относится к текущему пакету;
субагенты не запрошены, design lock сохраняется. Рабочая ветка
`codex/nonurgent-audit-fixes-2026-10-03` от `main a29b361` с no-content sync dev.
Основная dirty-копия сохранена по SHA-256 (3/3). N01–N20 получили отдельные
implementation commits: 18 программных пунктов реализованы, N09 backfill DB
adapter/rollout и N11 дальнейшая вертикальная декомпозиция остаются частичными.
Полная таблица текущих статусов/evidence —
`docs/audits/FULL_PROJECT_AUDIT_2026-10-03.md`; исторические open-формулировки
ниже неё не являются новым backlog. U01/U02/U03/U08 и external pilot NO-GO открыты.

Локальная приёмка: frontend 189/609; backend unit 387/1406; backend full с
isolated DB 410/1494; integration 23/88 без skip; migration/seed/integrity и
двухпроцессный transition smoke PASS. Docker Desktop удалось запустить;
использованы только собственные temporary PostgreSQL 17/Redis 7 containers,
fresh synthetic DB/keyring, не developer DB. Hosted CI использует PostgreSQL 16.
Mock E2E 171 first-attempt PASS; strict-MSW city 9 PASS; production Next real API
26 existing cases + 1 parser-inserted CSP case PASS; Vite PWA compatibility 12 PASS.
Next mock/real, Vite, strict types, lint, backend build и contract checks PASS;
17 metadata + 17 initial-route JS probes PASS; полный root/server audit 0.

N05 uses `src/proxy.js`: Next 16.3.6 silently ignores composite `proxy.page.ts`
despite its local docs; production HTTP guard catches missing Proxy/CSP. N16
vendors identical MIT shadcn CSS without its vulnerable CLI graph. N04's list
schema has no default limit, preserving the legacy array unless pagination is
requested; N12 explicitly quotes camelCase SQL references (real DB regressions).

Пакет публикуется одним push в feature/dev, затем protected dev→main PR. N19 live
required-only promotion и оба exact-candidate Quality events нужно проверять по
PR/Actions; не принимать локальные PASS за hosted/pilot acceptance. Отдельный
status-only push не нужен. Tracked docs/agent-rules — canonical; ignored старые
правила не требуют повторного ownership approval. Проценты 54 gates не менялись.

This is the compact handoff for future Codex sessions. Read `AGENTS.md`, this
file, `ARCHITECTURE.md`, and
`docs/operations/PILOT_SCOPE_FREEZE.md` before changing the project.
The freeze v2.0 (05.09.2026) is the sole current release plan. `PROJECT_PLAN.md`
and numbered batch logs are historical; their old commercial phases and
percentages do not define current requirements.

## Final audit handoff — 2026-09-05

Read `docs/operations/FINAL_PROJECT_AUDIT_2026-09-05.md` for findings, exact paths,
acceptance criteria and verification limits. There are 54 fixed V2 gates;
CHANGE-C findings are subtasks, not new denominator entries. Current decision:
NO-GO for real user data; synthetic staging/demo preparation may proceed.

Execution view: `docs/operations/PILOT_TASK_ALLOCATION.md` classifies all 54 IDs
once by urgency and SELF/JOINT/USER. Do not add gates or count CHANGE subtasks
twice. Report cumulative evidenced completion separately from current GO/NO-GO;
regressions block release without erasing history. Necessary work outside scope
uses separate fixed EXT batches; optional features never enter readiness percentages.
This classification closed no product gate. Purchases, account ownership,
participant consent and independent review require the owner or a third party.

Latest verification (2026-09-07, current published feature branch): the branch is
published and the worktree is clean; frontend unit tests pass at **151 files /
480 tests**, backend pilot-focused unit tests pass at **291 files / 1051 tests**,
and both autonomous-plan contracts pass (main plan **93 complete / 7 partial**,
next plan **100/100**). These are local repository results only; the seven
partial items still require staging, production, deployed-URL, participant or
owner evidence as described below.

The staging compatibility probe also passes against the running local real API
(`http://127.0.0.1:4000`): OpenAPI 3.1, security headers, cache policy and both
discovery variants are verified with redacted SHA-256 evidence. This is a local
runtime check, not staging evidence; `STAGING_API_BASE_URL` remains required for
the external gate.

The local PostgreSQL transition smoke also passes across two worker processes
with one committed winner and one controlled conflict; temporary state tables
are removed after the run. This strengthens local lock evidence for the
transition matrix but does not close the external staging replay gate.

The Docker-backed server integration profile remains green at **14 files / 63
tests**, including AutoCare discovery, route guards, authorization and account
deletion replay; these fixtures are synthetic and local.

Fresh `VITE_API_MODE=real npm run build:vite` plus
`check:production-fixture-leakage` passes across the generated JS assets with no
demo contact markers. The Chrome spot-check showing synthetic provider contact
data was intentionally running the local MSW/mock surface, not the real API
bundle.

The Vite config now uses the ESM-native `import.meta.dirname`; the real build no
longer emits the upcoming Vite `configLoader: native` `__dirname` warning.

The GitHub Quality workflow now runs the real-mode Vite build and
`check:production-fixture-leakage` after the Next build, so the local artifact
boundary is enforced in CI as well as during handoff verification.

The backend Quality job also runs the two-process PostgreSQL transition smoke
against its service container, preserving the local lock/conflict contract in
CI.

Fresh `npm run check:local-mvp` on `2201da15f186` completed with exit 0: all 43
checks passed, including the ephemeral Next production server and responsive
Chromium matrix.

Both frontend and backend `npm audit --omit=dev --audit-level=high` checks also
report zero vulnerabilities, matching the dependency gates in Quality CI.

The current Chrome accessibility-tree spot-check of the synthetic provider
profile shows the primary booking/request CTAs, 18 service rows, booking slots,
language/theme controls, legal/footer links, and visible OpenStreetMap
attribution. This remains local mock-mode evidence, not real API or production
acceptance.

The provider map container now exposes a localized `region` name, preserving
the visual map and external map link while making the location landmark
discoverable to assistive technology.

The post-fix canonical `npm run check:local-mvp` replay on `2af350756dd6` also
passes all 43 checks, including the responsive Chromium matrix.

An HTTP SEO replay with `npm run check:seo -- --url http://127.0.0.1:3000
--json` passes all local rendered metadata/robots routes; only Lighthouse
remains manual because the CLI is not installed.

The owner providers map now exposes a localized named `region` as well, so the
protected map surface has the same assistive-technology landmark contract as
the public provider map.

The post-owner-map canonical `npm run check:local-mvp` replay on `e03d0a34eec3`
passes all 43 checks, including the responsive Chromium matrix.

Next code work: external staging evidence, applied-migration reconciliation and
manual/legal acceptance; local release provenance, checksums, suspended-provider
policy, truthful pilot metrics and production Next full-stack CI are prepared.
The provider-timezone booking and malformed-date URL slices from the audit are
implemented in the current working tree with regression coverage, but still
need release-candidate replay evidence. The working tree contains accumulated
follow-up work documented below; local PASS must not be attributed to production
or staging evidence.

Autonomous pilot follow-up (2026-09-06): quality metrics now scope catalog and
supply coverage to active providers, locations, definitions and attached offers,
and reject invalid price ranges. Twelve pilot-focused pure suites are included
in the backend unit profile (**290 files / 1049 tests PASS**); the complete
backend suite is now **371 files / 1246 tests PASS**. Canonical V2 gate counts and
external NO-GO conditions are unchanged.

Data-export follow-up (2026-09-06): attachment `objectKey` and content checksum
are omitted from the self-service export; only the distinct export-level
integrity checksum remains. This improves the local V2-SEC-13 contract but does
not replace a deployed ownership/retention rehearsal.

Sensitive self-service data exports now also write the append-only
`user_data_exported` audit action with actor/target/request provenance only;
the audit row never contains export payload, attachment metadata or content.
The local route integration verifies both the no-store response and audit row.

Reliability aggregation follow-up (2026-09-07): provider response samples now
accept only the provider owner or an active membership scoped to the request
location, ignore client/system/revoked/other-branch and pre-request messages,
and select the earliest valid response independently of input ordering. The
full backend suite passes **371 files / 1246 tests**; real pilot SLO evidence
and staging replay remain external gates.

Timezone replay follow-up (2026-09-07): a real Chrome context with
`America/New_York` opened the mock request form for a `Europe/Moscow` provider;
the selected 10:00 service-local slot was submitted as
`2026-09-08T07:00:00.000Z` with HTTP 201. The local browser replay confirms the
CHANGE-C004/C010 contract; staging and production evidence remain external.

Identity replay follow-up (2026-09-07): local browser replay logged out client
Emily, confirmed mock session cleanup, logged in owner Sophia in the same
context, and verified two Back navigations did not restore Emily's private
profile. This is local C009 evidence; real API/staging/device replay remains
external.

Bundle follow-up (2026-09-07): explicit Rolldown group priorities restored the
separate Redux/RTK `state-runtime` chunk that the bundle contract expected. Vite
build, bundle-splitting and performance checks pass; deployed artifact/CDN and
Lighthouse evidence remain external.

Runtime boundary follow-up (2026-09-07): Bookly and legacy payment runtime guards,
legacy-file classification, Render production config and fixture-scoped demo reset
all pass. This confirms repository boundaries only; deployed artifact contacts,
images and owner acceptance remain external.

Production fixture boundary follow-up (2026-09-07): neutral service catalog and
preview fixtures were split from mock provider profiles; home, favorites and MSW
consumers no longer pull profile-only contact fixtures. The full generated-asset
scan now finds neither `service@example.com` nor the demo phone marker in the
initial entry or any lazy JS chunk. Deployed artifact inventory and production
release evidence remain external.

Mock E2E follow-up (2026-09-07): after the provider fixture boundary refactor,
the complete mock suite produced 166/168 on its first mobile-inclusive run; both
failures were cold-start readiness timeouts and the exact two tests passed on a
targeted mobile rerun. Treat this as local harness evidence, not a claim of a
single-run 168/168 release result.

Mobile harness follow-up (2026-09-07): gallery hydration and release-audit shell
checks now use bounded route-readiness waits. The exact two mobile scenarios pass
2/2 after the harness-only adjustment; assertions remain strict and do not skip
layout/accessibility checks.

Review-label boundary follow-up (2026-09-07): featured reviews now carry an
API-native `providerName` in real and mock responses. Admin/profile review routes
no longer import mock provider profiles; the full fixture scan covers every JS
asset with no lazy-chunk exception. Frontend tests remain 151/480 and backend
unit profile is 288/1043.

Post-split browser replay (2026-09-07): production Next build passed; the full
mock browser suite produced 167/168 on the first run, with one mobile
Spanish/Romanian long-label cold-start timeout. The exact test passed 1/1 on
rerun; this remains a runner-variance caveat rather than a single-run 168/168
release claim.

Local contract follow-up (2026-09-07): interaction (16 invariants), discovery
form (8 source checks plus 2 tests), PWA update, route inventory (57 constants),
Next runtime/route contracts and repository SEO budgets all pass. Lighthouse and
rendered production HTML remain manual deployed-URL evidence gates.

PWA/visual replay follow-up (2026-09-07): production PWA preview is 12/12 PASS
across desktop/mobile, and visual regression is 18/18 PASS across desktop,
tablet and mobile baselines. These are local browser evidence; real-device AT,
deployed URL and owner sign-off remain external.

Clean browser matrix follow-up (2026-09-07): the mobile long-label audit received
a harness-only 120-second test budget for cold lazy routes. The subsequent full
mock suite completed 168/168 PASS in 15.6 minutes across Chromium, mobile and
tablet; product assertions and design baselines were unchanged.

Canonical local MVP follow-up (2026-09-07): `npm run check:local-mvp` passed all
local checks on commit `59b2675e829c`, including lint/tests/builds, API parity,
migrations, media, backup/restore, security, accessibility, concurrency, SEO and
responsive browser matrix. The worktree is dirty and deployment evidence remains
external, so this does not change the pilot NO-GO decision.

Production readiness follow-up (2026-09-07): local preflight confirms startup,
worker, outbox, backup, alert, rollback and Redis fail-closed contracts. It
remains blocked by missing integration secrets, SMTP, persistent media/S3,
bootstrap admin, staging URL and external smoke/rehearsal evidence; no secrets
were fabricated or written.

Autonomous plan follow-up (2026-09-07): both pilot autonomous-plan contracts
pass; the main 100-item execution plan reports 93 complete and 7 partial, while
the separate strict next-plan reports 100/100 complete. This is intentionally
tracked separately from the 54 canonical gates, which still require staging,
manual, security and real-participant evidence.

Backend unit follow-up (2026-09-07): the server unit profile is freshly green at
288 files / 1043 tests. Redis-unavailable logs are expected fail-closed coverage;
the result does not claim a real two-replica outage or restored production-like
database/media evidence.

Boundary contract follow-up (2026-09-07): security headers, Render production
configuration, fixture-scoped demo reset, Bookly/payment runtime guards and the
legacy cleanup/migration inventory all pass. Historical migrations remain intact;
deployed traffic and independent security review are still external.

Real API/reset follow-up (2026-09-07): demo reset now removes only outbox events
whose payload references the current synthetic user/booking/request IDs or demo
emails. Static reset checks are 4/4, server build and backend unit profile remain
green, and the fresh real API browser replay is 25/25 PASS. The post-replay
window contains only four completed notification events and no new dead-letter
events. A fresh `check:local-mvp` also reports all local checks passed. Readiness
remains 503 because Redis is not configured and 106 historical dead-letter rows
remain; no manual backlog deletion or production GO is claimed.

Dependency-surface follow-up (2026-09-07): build/CLI-only packages moved to
`devDependencies`, `react-router`/Vite were patched, and the obsolete router
transition prop was replaced by supported `useTransitions={false}` in the Vite
and Next entry points. Web and server production audits are both zero, lockfile
dry-run is reproducible, and the fresh local MVP gate is green. Thirteen
dev-only tooling advisories remain without critical severity; this does not
change the external staging/security gates.

Router real-replay follow-up (2026-09-07): the transition compatibility repair
passed targeted logout/owner legacy coverage 3/3 and the final full real API
browser replay 25/25. `/health/ready` remains 503 only because Redis is not
configured and 106 historical dead-letter rows remain; the replay produced no
new dead-letter rows and no manual backlog deletion was performed.

Router guard follow-up (2026-09-07): `check:router-compatibility` and its
negative regression test now enforce the supported transition prop in both
production entrypoints and are part of `check:local-mvp`.

Visual follow-up (2026-09-07): current visual regression is 18/18 PASS across
desktop, tablet and mobile Chromium; baselines are unchanged after the Router
guard. This is local screenshot evidence only, not real-device sign-off.

Request-date follow-up (2026-09-07): real Chromium now covers a malformed
request-date query and passes 1/1; the page remains usable and normalizes the
invalid URL value. The subsequent full real replay is 26/26 PASS; after the
worker interval outbox returned to pending=0 with 106 historical dead letters.
Full booking/timezone and staging evidence remain open.

Performance follow-up (2026-09-07): the frontend performance budget initially
reported 92 JS assets against the existing limit of 90. Vendor splitting was
consolidated without raising the 300 kB chunk limit, and login plus OAuth
callback now share one deferred auth route bundle. The rebuilt artifact is
90/90 JS assets, 152.0 kB entry, 230.0 kB largest non-entry chunk, 75.5 kB
largest locale and 166.3 kB CSS; performance and bundle-splitting contracts
pass. Real browser replay remains 26/26 PASS; deployed CDN/Lighthouse evidence
is still external.

Operations evidence follow-up (2026-09-07): fresh production preflight passes
Docker and all six repository operations contracts, plus the pilot evidence
toolkit and SEO repository contracts. It reports eight missing configuration
gates and six external rehearsal gates. Pilot evidence/metrics commands remain
fail-closed because no anonymized real-pilot source file/rows exist; synthetic
fixtures are not promoted to real evidence. Deployed Lighthouse, rendered HTML,
staging and production credentials remain external.

Pilot evidence tooling follow-up (2026-09-07): server-side evidence validation
now resolves its default relative path from the repository root even when
invoked through `npm --prefix server`, while preserving explicit absolute paths.
The three path-resolution regressions and server build pass; the regression is
now included in the curated backend unit profile, freshly green at 290 files /
1049 tests. The command still fails closed without anonymized real-pilot
JSON/CSV rows, as required.

Docker integration follow-up (2026-09-07): the local synthetic PostgreSQL/Redis
stack is up on ports 5433/6379. Schema check and idempotent migration smoke pass
through migration 216; AutoCare integrity validates 42 critical tables with no
ownership/context violations, and deletion retention finds no completed rows to
check. This is local synthetic evidence only; Redis fail-closed production
rehearsal, S3/SMTP, staging and real pilot journeys remain external.

Redis configuration follow-up (2026-09-07): a process-only synthetic production
configuration with HTTPS loopback origins, S3/ClamAV policy and SMTP-shaped
values passed the Redis probe against local Docker Redis: `status=pass`,
`mode=fail-closed`. No synthetic secrets were persisted; multi-process outage,
reconnect and external worker/alert evidence remain open.

Integration profile follow-up (2026-09-07): the root
`npm run test:server:integration` wrapper now executes the Docker-backed server
profile from the repository root. The fresh run passes **14 test files / 63
tests**, including AutoCare discovery bounds (`limit=51` and `radiusKm=0` return
400); staging, production credentials and real-participant evidence remain
external.

Final local-gate follow-up (2026-09-07): a fresh `npm run check:local-mvp`
completed with **all local MVP checks passed**, including frontend tests, Next
production build, backend build, contracts, security/media/backup checks,
responsive Chromium matrix and SEO/runtime boundaries. This does not change the
canonical pilot NO-GO while external infrastructure and participant evidence are
missing.

Redis multi-process follow-up (2026-09-07): added a root wrapper for the
synthetic limiter smoke. Two separate worker processes sharing one local Redis
bucket produced exactly **1 allowed / 1 denied**, and cleanup left no smoke keys;
the existing two-subscriber realtime smoke also passes. Staging outage/reconnect
and production Redis evidence remain external.

Post-harness local gate follow-up (2026-09-07): a fresh
`npm run check:local-mvp` after the Redis smoke addition passed every local check,
including responsive Chromium. This confirms no local regression, but does not
convert clean-SHA, staging, real-device or owner acceptance gates into local
evidence.

Deletion replay follow-up (2026-09-07): the Docker PostgreSQL retention fixture
now also repeats terminal `Completed` after purge and re-runs all account-deletion
invariants; targeted integration is **1/1 PASS** with zero counters. This is
stronger local idempotency evidence, not a substitute for staging restore/storage
replay or real operational retention evidence.

Provider-review UI follow-up (2026-09-07): review cards use an internal flex
column so the service label and date are consistently anchored to the lower
edge with or without photos. The review-score summary no longer has an
artificial maximum width. This is a presentation-only correction; it does not
change pilot gates, API contracts or production evidence.

Provider-page layout follow-up (2026-09-07): the public provider-page `main`
now uses the public-wide container and gutter tokens already used by the
desktop header. Its content no longer expands to the larger operational layout
width; section and booking component behavior are unchanged.

Map-theme follow-up (2026-09-07): all Leaflet surfaces use the keyless
OpenStreetMap default, keep a one-shot fallback for configured tile failures,
and apply a normal light profile or a moderated night profile to tile pixels
based on the active theme. Markers, controls and booking content remain
outside the tile filter.

Map-attribution follow-up (2026-09-07): results, owner-provider,
provider-location and cabinet Leaflet surfaces now keep the OpenStreetMap
attribution control visible. The control uses a compact light or dark surface
with readable contrast; map zoom controls remain intentionally hidden where
the existing interaction design requires it.

## Current objective

AutoCare Hub is a web-first aggregator for
automotive service businesses and locations. The current task is the approved
AutoCare web vertical slice. Replacing the inherited Git metadata was approved
and is complete. `main` is production and must never receive a push or merge
without explicit user approval. Normal work is performed on `dev` or a feature
branch created from `dev`.

Git state:

```text
active branch: inspect git branch --show-current; the audit uses codex/final-pilot-plan-2026-09-05
production branch: main
remote: origin (GitHub AutoCare Hub repository)
```

The inherited legacy `.git` directory was removed from the active project and
moved to the recoverable archive
`/Users/a1/Desktop/my-projects/AutoCareHub/.legacy-git/legacy-booking.git-2026-08-12`.
Push implementation work to `origin/dev`; only merge or push to `main` after
the user explicitly approves the reviewed commit.

Machine-readable planning maps live under `docs/architecture`: domain model,
phase dependencies, and legacy migration/reuse/deletion gates.

## Confirmed direction

- Product name: AutoCare Hub.
- Responsive browser application first.
- iOS and Android only after the stable-web/mobile-readiness gate.
- Marketplace value: standardized automotive services, geospatial search,
  honest price/inclusion/rating/availability comparison, booking and reviews.
- Complex services use a service-specific inquiry/messenger with private photo
  attachments and versioned provider quotes.
- Providers can offer provider-scoped customer bonuses.
- The platform is free; platform payments, tariffs, subscriptions, commissions,
  payouts and paid promotion are excluded, including from post-pilot backlog.
- Super admin manages markets, trust, moderation, privileged access and security.
- Launch coverage includes Russia (first million-plus city), Spain and
  Moldova/Transnistria; country/city data must be extensible.
- Interface locale is independent of provider location. Priority packs are
  Russian, Spanish, Romanian and English, with extensible world locales.
- The five supplied reference screens are the approved design baseline;
  improvements and implementation are authorized, while logo alternatives are
  proposed for owner selection.
- Booking confirmation is two-sided: provider confirms requested/quoted work;
  customer confirms appointment/terms.
- The first catalog includes all major and minor automotive services with
  service-specific comparison attributes.
- Legacy files may be removed only inside
  `/Users/a1/Desktop/my-projects/AutoCareHub` and only through reviewed,
  validated migration steps.
- User reviews local diff/commit before any push.

## Architecture decision

Do not rewrite the project to the proposed Next.js/FastAPI/Alembic greenfield
stack by default. The real repository already has a mature compatible stack:

- Next.js production shell, React 19, TypeScript, React Router, Redux Toolkit/RTK
  Query, MSW; retained Vite tooling is compatibility, not production acceptance;
- Fastify, TypeScript, PostgreSQL, TypeORM migrations, Zod;
- JWT/refresh sessions, OAuth, CSRF, Redis rate limiting;
- outbox/notifications/email, uploads, audit/security, health/metrics;
- unit/integration/E2E/CI and production runbooks.

Reuse those platform capabilities. Replace the cabinet-rental domain with new
modules for catalog, providers, locations, memberships, vehicles, offerings,
search, automotive bookings, inquiries/messages/quotes and provider-scoped bonuses.

## Legacy conflicts

The copied baseline still implements:

- `Cabinet` and provider-owned free-text `Service`;
- global `owner` assumptions;
- cabinet booking routes/pages/mocks;
- historical customer-booking payment and commission schemas retained only in
  migrations;
- legacy translations, assets, seeds, deployment names and docs.

These are current-code facts, not AutoCare product requirements. Do not extend
new AutoCare code through legacy cabinet/payment contracts.

Recommended migration:

1. build the new domain beside reusable platform infrastructure;
2. replace one vertical customer/provider journey at a time;
3. verify real API, mock contract, migrations and tests;
4. remove exact legacy paths only after their replacement is accepted.

D-002 chose a fresh AutoCare database. This is not permission to reset any live
or shared database. Preserve migration history and audit applied versions before
changes; use isolated disposable databases for reset/seed/rehearsals.

## Product/domain rules

- Platform owns `ServiceCategory` and `ServiceDefinition`.
- Each location owns `ServiceOffering` data against a definition.
- Price types: `FIXED`, `FROM`, `RANGE`, `QUOTE_REQUIRED`.
- Compare only compatible service definitions/schema/vehicle contexts.
- `ServiceProvider` is a business; `ServiceLocation` is a physical search and
  scheduling location.
- Provider access uses `ProviderMembership` with scoped permissions.
- Booking/accepted quote preserves immutable service, price, vehicle, provider,
  timezone and policy snapshots.
- Messages/photos are private and conversation access is participant-scoped.
- Bonus accounts and ledgers are provider-scoped, non-transferable and not cash.
- Repair settlement is directly between customer and provider, outside the
  platform. Provider-scoped bonuses remain non-cash; paid ranking is excluded.

## Design references

Five user-supplied images show intended direction for:

1. homepage search/map/recommendations;
2. search results with list/map and comparison;
3. service-location profile;
4. booking wizard;
5. customer bookings dashboard.

The implementation brief and state contract now live in
`docs/design/autocare-design-brief.md` and
`docs/design/autocare-interaction-state-contract.md`. Missing designs include
the provider profile, vehicle garage, inquiry/chat/photo/quote, bonuses,
provider portal, catalog/moderation and the remaining
loading/empty/error/offline/permission states. Consult the final audit before
treating these older implementation notes as current missing features.

The first AutoCare frontend mock slice now covers `/`, `/services`, and
`/services/:id`. The homepage hero now also includes a self-contained map
preview with approximate roads, search-radius context, provider price markers,
and market-aware currency; this is intentionally a preview, not a substitute
for the geocoded catalog map. The public shell now owns one shared footer and
uses a flex column layout so short pages keep the footer at the viewport bottom;
the desktop header follows the dark navy AutoCare reference direction. The first
homepage implementation now follows the full supplied composition, including
comparison cards, services/locations/partner discovery, process/trust content,
reviews and the mobile-app promotion. The partner banner uses the project asset
`public/images/autocare/partner-handshake.webp`, generated specifically for this
layout. The first isolated backend schema slice is in
`server/src/database/migrations/1785700000000-CreateAutoCareCatalogFoundation.ts`
with `autocare_` entities for markets, definitions, providers, locations, and
offerings. A second migration adds service requests, messages and private photo
attachment metadata. The foundation has since been expanded into routed,
seeded AutoCare services with requests, booking snapshots, reviews, bonuses,
membership scopes and moderation evidence.

## Current open decisions

- Exact first Russian pilot city and pilot locations in Spain and
  Moldova/Transnistria.
- Conversation/photo retention and whether all authenticated customers may
  start a pre-booking inquiry.
- Provider verification documents/badge meaning.
- Final legal retention terms and notification wording per launch jurisdiction.

Do not guess an open decision if it changes schema, legal behavior, money,
privacy, ranking or destructive migration.

## Next approved work sequence

1. Resolve CHANGE-C findings and complete local/manual MVP acceptance.
2. Configure synthetic-data staging, private media, SMTP, distributed Redis,
   workers, alerts and encrypted off-site backup/PITR.
3. Run role, concurrency, deletion, restore and rollback rehearsals; obtain
   applicable legal/privacy approval and independent security review.
4. Authorize the exact release for real data only after these gates pass.
5. Run consented pilot journeys and metrics, then obtain written pilot go/no-go.

The mock catalog asset contract is now explicit: `server/src/scripts/seed-autocare-mock-data.ts`
inserts generated provider images when the corresponding public asset exists and
uses the placeholder path otherwise. The frontend `AutoCareImage` component
keeps the same fallback for runtime load failures.

The public AutoCare API is implemented at `/v1/*` inside the backend (exposed
as `/api/v1/*` through the Next.js proxy). RTK Query and MSW use the same typed
resources for markets, service definitions, discovery and provider profiles,
so mock and real mode share the same screen-level data flow.

The results screen keeps the public flex shell and footer in normal document
flow. Provider results now use ordinary client pagination (8 cards per page)
until cursor-backed discovery pagination is wired to the screen; cards are
rendered in normal flow with no artificial virtual spacer rows.
Provider previews and discovery responses also carry `brandSpecializations`
and `isMultibrand`; the brand filter uses stable vehicle-brand codes and keeps
universal multibrand providers in every selected-brand result.

## Current implementation baseline

- Next.js App Router is the production web runtime. The retained Vite command
  is a temporary development compatibility path only and must not be deployed.
- The bonus policy is fixed in `docs/product/BONUS_POLICY.md`: a provider-funded,
  non-cash, provider-scoped ledger supports typed earn/redeem/expire/refund and
  audited adjustments. PostgreSQL concurrency tests protect redemption,
  cancellation refunds and expiry.
- Production media is private by design: S3-compatible storage, quarantine and
  ClamAV are mandatory under production configuration; signed attachment access
  and deletion retention are enforced by the backend. Real credentials and
  operational evidence remain deployment gates.
- Account deletion removes private attachment objects and metadata, automotive
  bonus accounts/ledger, provider memberships and invitations; owned providers
  are suspended/detached for super-admin review.
- Release-mode staging compatibility uses
  `REQUIRE_STAGING_API=true STAGING_API_BASE_URL=… npm run check:staging-api`;
  backups require an encryption password file and external alert routing,
  managed backup storage and restore evidence remain production requirements.

## Identity and legacy naming boundary

- The active workspace is `/Users/a1/Desktop/my-projects/AutoCareHub/autocare-hub`.
- Root package names are `autocare-hub-web` and `autocare-hub-api`.
- Runtime service, cookie, storage, PWA cache, mock-account, and deployment
  namespaces use the AutoCare Hub identity.
- PWA runtime caching is limited to anonymous public AutoCare discovery data
  (`markets`, zones, service definitions, provider search/profile and platform
  reviews); authenticated and mutating requests never enter that cache. The
  production-preview suite verifies this contract offline in desktop and mobile
  Chromium. The retired legacy public cache is removed automatically after an
  app update, without touching private identity-scoped caches.
- Translation bundles are loaded for the active locale only; the production
  entry remains independent from the full world-language catalog and each
  locale family is emitted as a separate deferred chunk. The largest shared
  locale module remains tracked for a later split pass.
- The former Git metadata is recoverable only at
  `/Users/a1/Desktop/my-projects/AutoCareHub/.legacy-git/legacy-booking.git-2026-08-12`.
- `src/pages/cabinets`, `src/entities/cabinet`, `server/src/modules/cabinets`,
  and related booking modules remain a quarantined compatibility layer until
  provider/location/admin replacements and their migration tests are accepted.
  They are not part of the public AutoCare navigation or domain contract.

## Verification expectations

For docs-only work, inspect the full diff and validate internal links/terminology.
For implementation, follow the quality gates in `AGENTS.md` and
`.codex/rules/workflow.md`. Preserve unrelated user changes and always use
explicit `git add <file>` paths.

## MVP/pilot review follow-up — 2026-09-23

The pre-existing booking-date, calendar-contrast, locale-deep-link and E2E-wait
changes were committed as `30d688e fix(mvp): specify booking and locale
acceptance`; they were first pushed to the current feature branch and later
fast-forwarded into `dev`. The audit plan is
`docs/operations/MVP_PILOT_IMPROVEMENT_PLAN_2026-09-23.md`; it preserves the
54-gate freeze and NO-GO for real user data. Commit
`5eee151 fix(pilot): redact OAuth logs and clarify booking errors` strips query
strings from Fastify request logs (protecting OAuth callback `code`/`state`) and
distinguishes failed provider/availability requests from genuine
missing-provider/empty-schedule states. Both commits are now on `dev`; the
repository promotion PR is handling `main`. Automated tests and
browser/staging verification have not been run by this task. The current
follow-up branch implements encrypted release-evidence production, keyless
GitHub artifact attestations and exact source/Quality-run verification. It
cannot be used until the owner configures `RELEASE_EVIDENCE_ENCRYPTION_KEY` on
the protected `production` environment and supplies fresh real gate evidence.
Admin MFA/SSO, infrastructure, legal/privacy approval, pilot participants and
independent security review remain external/owner-dependent. Search-mode tabs
now have keyboard navigation and ARIA panel associations, pending human
accessibility verification.

### Discovery and review-truth follow-up (2026-09-23)

The homepage now reads the live discovery result for its supply count and map
price/rating labels; loading, error and empty results no longer borrow demo
numbers. Discovery returns `totalCount` and `totalCountIsLowerBound`, and result
counts use locale-aware plural forms. Public profile, discovery and favorite
provider ratings are derived from approved `verifiedVisit` reviews linked to
closed requests confirmed by both sides in launch-ready public locations. The
public review list, featured-review API, map markers and provider aggregates
share this eligibility rule; mock mode mirrors it. Review-count labels also
pluralize correctly (including Russian 1/2/5). Owner summaries are computed
from review rows and the locations the signed-in membership may see; approved
but unlinked/unverified demo rows can therefore remain owner-visible while
correctly staying out of public totals. Do not loosen this boundary to make
the numbers match: attach demo rows only to valid, mutually confirmed visits
before making them public.

The existing AutoCare demo seed upserts the staff account's active
ProService/location membership, and branch-scoped integration coverage is in
the repository. This follow-up did not execute the seed or integration flow
against the developer-configured database because its isolation was not
established; the actual local login state still needs a safe verification.
No database data was reset or rewritten. The last recorded local operations
snapshot remains 126 dead-letter events and 208 open incidents (187 critical);
it was not re-read here. Redis, antivirus and persistent object storage still
require owner-approved infrastructure configuration. Pilot remains NO-GO; no
legal, participant, MFA/SSO, infrastructure or release-evidence gate is waived.

Final local checks for this follow-up: frontend **173 files / 539 tests** and
backend **303 files / 1,108 tests** pass, as do frontend/backend builds, lint,
API parity, OpenAPI structural checks and `git diff --check`. These results do
not include live database seeding or role-login validation.

### AutoCare security hardening — 2026-09-24

Implemented the code changes for the 11 findings from the 24 September security
audit (its original report is an external local artifact; current disposition is
in [the repository registry](docs/audits/CURRENT_FINDING_DISPOSITION.md)):
chat block enforcement and lock ordering, restricted/read-only moderation with
access audit, request/quote/reschedule lifecycle checks, private attachment
fetch, WebSocket rate limiting and token refresh, expired-offer rejection, and
generic chat idempotency. Production storage GET CORS still needs exact frontend
origins configured. At that initial security-hardening checkpoint, the
idempotency migration had not been run and PostgreSQL/browser checks remained
open; the later disposable-database and real-browser validation is recorded
below. Pilot remains NO-GO and external release gates stay in force.

The revised AC-02 policy is now implemented locally. Only the SuperAdmin-assigned active moderator can read the complete service-request conversation and its attachments for 24 hours, with one reasoned 24-hour extension; reads are audited and read-only. SuperAdmin assignment/reassignment and emergency access require a reason and audit record. A report requires explicit notice and confirmation; cancellation creates no report or access. Reporters alone see report status, and the other participant cannot see the reporter's identity. A later counter-report is blocked while the case is active; a distinct later urgent threat can be linked only with threat category and at least 20 characters of context. Sender text can be deleted for five minutes; later hiding is local to that user/device. Legacy unanchored reports expose metadata only.

Latest local verification: frontend **175 files / 553 tests**, backend **306 files / 1,139 unit tests**; Vite and Next builds, backend build, full ESLint, API parity (**236/236 mock routes; 2/2 WebSocket routes**), migration-order validation (**134 migrations**) and `git diff --check` pass. Browser checks covered client and service-owner report flows, consent/cancel, status and reporter privacy, anti-retaliation and linked urgent-threat handling, SuperAdmin assignment, and the assigned Admin's scoped read-only chat and unpunished decision. The assigned Admin opened the report conversation; the UI showed no send/upload controls and stated that moderation reads do not mark participant messages as read. A synthetic report was resolved with “violation not confirmed” and no block. For a manual attachment check, a temporary local mock image was added and removed after the assigned moderator rendered it successfully; server and UI tests also cover private attachment authorization and the image viewer. Emergency-access UI was inspected but not activated.

Local real-mode validation then applied all **134 migrations** to a newly created disposable PostgreSQL database, ran the migration smoke check and the full backend integration suite (**15 files / 64 passed / 1 skipped**), and ran **26/26** Chromium E2E scenarios against the local API. The real browser checks covered discovery, request flow/idempotency, expired sessions, recoverable errors, and client, owner, branch-scoped staff, admin and super-admin route access. The first full integration attempt had one transient 401 in an admin authorization case; the isolated file and the repeated full suite passed. The live API run exposed an outbox edge case when a notification recipient had been deleted; notification insertion now locks the user row and completes as a no-op if that recipient no longer exists. Its focused integration test passes, and no failed outbox events remained after the browser run. The disposable database was dropped after verification; the original `autocarehub` database remained at 132 migrations through `1786340000000`.

Production object-storage GET CORS still needs exact frontend origins. Real deployment domains/origins, production secrets and external services, legal/privacy approval, and operator acceptance remain open gates; pilot remains NO-GO. A graduated sanctions proposal is recorded in [`CHAT_REPORT_ENFORCEMENT_POLICY_DRAFT_2026-09-24.md`](docs/security/CHAT_REPORT_ENFORCEMENT_POLICY_DRAFT_2026-09-24.md); thresholds are a product-policy draft and have not been enabled as automatic enforcement.

### Final moderation/UI pass — 2026-09-26

The live SuperAdmin queue contained one local synthetic harassment complaint. After action-time confirmation, it was assigned to `QA Moderator` for 24 hours; the complaint remains pending and no decision or block was submitted. During the owner-path review, the mock conversation response was missing the active-review/evidence flags that the server returns. The mock contract now returns them to both participants, the owner view uses the reporter-history fallback if response flags are stale, delete is blocked thread-wide during a pending case, and mock resolution preserves thread evidence for 90 days. Regression coverage passes (**3 files / 10 tests**), as do targeted ESLint and `npm run build:vite`.

Proposal **01** captures the Users page header over the detailed backdrop and a generated opaque-card concept; the after image and short review note are in [`docs/design/proposals/2026-09-26-final-pass/`](docs/design/proposals/2026-09-26-final-pass/). The concept is not implemented pending the user's choice. The final browser step—signing in as the assigned QA Moderator and opening this exact synthetic report/attachments—still needs the current QA Moderator credential, which is not in the workspace. No password reset or further credential guesses were attempted.

### Product audit follow-up — 2026-09-26

See [`docs/audits/PRODUCT_AUDIT_2026-09-25.md`](docs/audits/PRODUCT_AUDIT_2026-09-25.md) for the 40 findings and current disposition. The code-fixable scope is implemented locally. Fresh frontend verification: **179 files / 569 tests**, full ESLint, TypeScript, Vite and Next production builds pass; the backend remains at its earlier verified **306 files / 1150 unit tests**, and root/backend `npm audit` both reported **0 vulnerabilities**. Remaining partial findings are A21 (complete complaint-history/search/filter) and A29 (full profile HTML, gated by the three-approval design lock in `AGENTS.md`); their visual proposal and acceptance criteria are in [`docs/design/proposals/2026-09-26-a21-a29/README.md`](docs/design/proposals/2026-09-26-a21-a29/README.md). A34 shows owner-visible preferred and confirmed visit times in the service timezone. The latest browser pass verified the client booking summary, owner request inbox and moderator access boundary. A mock-only request was used; its service timezone now survives the client-to-owner mock API contract, and the owner sees Moscow local time rather than UTC. External domain/database/mail/storage checks remain pending; local readiness is not production approval.

### Additional full audit — 2026-10-03 (latest verification)

The current working-copy audit is
[`docs/audits/FULL_PROJECT_AUDIT_2026-10-03.md`](docs/audits/FULL_PROJECT_AUDIT_2026-10-03.md):
**13 urgent / 16 nonurgent** open items with evidence and acceptance criteria.
Field encryption now exists, but production startup has no configured key-provider
adapter; record binding and blind-index rotation also need work. Other urgent
findings include raw SQL error parameters in logs, an unconditional admin broadcast
read bypass, MFA/step-up, backup authentication, integration DB isolation and fresh
dependency advisories. Old statements that encryption is absent or audits are zero
must not be used as current evidence; A21/A29 disposition needs review against the
newer implementation rather than automatic reopening of the old scope.

Fresh local PASS: frontend **187 files / 603 tests**, backend unit **309 files /
1165 tests**, additional pure policies **12 files / 26 tests**, full lint and
TypeScript, backend build, isolated real/mock Next production builds, API parity
**244/244 mock routes; 2/2 WebSocket contracts**, migration inventory/order checks
**139 files**. Production npm audit now fails: web **1 critical**; API **2 high /
2 moderate**. Advisory reachability is qualified per finding, not presumed.
The SEO command still blocks on static HTML expectations for dynamic routes even
though **17/17 local HTTP metadata probes pass**. Guest mock-browser checks covered
discovery, provider/service selection and login redirect on desktop/mobile.

No fresh DB integration/E2E or production infrastructure evidence: Docker is
unavailable, ordinary developer DB isolation was not established, and no DB was
used/reset. No runtime/dependency changes, installation, commit, push or merge was
performed. Pre-existing integrity-script changes were preserved. Temporary Next
servers and browser tab were stopped. Pilot remains **NO-GO**; the 54 canonical
gates and their percentages were not changed.

### Urgent fix U09 — 2026-10-03

User authorized urgent fixes in batches of 1–2, each in a separate commit.
U09 is fixed locally: the global request handler logs only `serializeError`
output; Fastify's `err` serializer also excludes raw stacks and attached values.
SQL error messages are replaced entirely rather than regex-redacted, preserving
SQLSTATE and request correlation. External reporting and incident error names
use safe projections; AggregateError depth/count/length is bounded and unsafe
getters return UnknownError. Non-SQL diagnostics retain existing PII redaction.
Fresh PASS: backend **309 files / 1171 tests**, backend build, full lint and
final targeted lint. HTTP inject/Pino capture verifies synthetic email, phone,
VIN, arbitrary repair text and password do not appear in logs, reporter payload
or the 500 response. No live DB or production logs were used. The audit register
has **12 urgent / 16 nonurgent** remaining; U11 is next. Pre-existing integrity
script/manifest edits remain outside this fix. No push/merge or deployment.

### Urgent fix U11 — 2026-10-03

U11 is fixed in the backend: admin/super-admin roles no longer authorize
broadcast reads or select the complete offers projection. Every non-client
caller must pass ordinary active provider/request/branch/market permissions,
and gets only offers in that scope. The request's client retains all eligible
offers. There is no new unscoped support endpoint; a future broadcast moderation
workflow must define assignment/reason/expiry/audit before granting such reads.
Fresh PASS: backend **309 files / 1177 tests**, focused permissions **4 files /
31 tests**, backend build, targeted lint, API contract/parity/route snapshot and
threat-surface checks. New admin/super-admin denial and branch-projection cases
failed before the fix; owner/client cases preserve legitimate access. No live
PostgreSQL/authenticated browser replay was performed.

The register now has **11 urgent / 17 nonurgent** remaining. N17 captures the
pre-existing mock GET broadcast handler's broader non-client access; it needs
separate frontend/mock ownership and is not a production backend bypass after
U11. This batch changes no frontend or database data. Integrity-script/manifest
files remain byte-for-byte unchanged and excluded from both requested commits.
Pilot remains NO-GO; no push, merge or deployment was performed.

### Dev publication and urgent fix U12 — 2026-10-03

User authorized pushing to dev, then main, then continuing urgent batches.
Current remote dev had newer CI fixes and squash history, so U09/U11 were
cherry-picked cleanly onto it in `/private/tmp/autocare-hub-urgent-audit-batch-2`
and pushed as `6ebd62e` / `de701c6`. The primary checkout remains untouched,
including its three unrelated integrity-script/manifest files. Main promotion
must follow the current README/workflow's protected dev-to-main PR process;
the older local workflow instructions are tracked by N01.

The dependency gate on that dev SHA fails on the known Next advisory. The next
pair is U12/U13 to unblock it. U12 pins Next to `16.3.6`; production audit is
zero, frontend **187 files / 603 tests**, TypeScript, full lint and real/mock
Next production builds pass. Production mock browser catalog/provider/login
redirect and real login hydration pass; authenticated live API/DB replay awaits
isolated CI. U13 is in progress and will receive a separate commit. The register
has **10 urgent / 17 nonurgent** remaining after U12; pilot remains NO-GO.

### Urgent fix U13 — 2026-10-03

U12 is committed as `191bc51`. U13 patches Fastify to `5.12.5`, Nodemailer to
`10.0.13` and brace-expansion to `2.1.7`. The global fast-uri v3 override is
removed: AJV/compiler uses patched `3.1.8`, fast-json-stringify 7 uses `4.2.1`.
Nodemailer now supplies its own types; its obsolete external type dependency is
removed. Node ≥20 is required and current CI uses 22. Full and production backend
audits are zero. Backend **310 files / 1184 tests**, build and full lint pass;
seven actual-SDK offline tests verify RU/EN auth email templates, envelopes and
UTF-8 multipart composition. Live SMTP/TLS and local DB integration were not run.

The earlier U09/U11 dev run has green backend migrations/tests and real full-stack
production Next checks, but its dependency scan fails on the old Next advisory.
The updated candidate must repeat CI before protected main promotion. U12/U13
are separate commits and ready for dev publication. The register now has
**9 urgent / 17 nonurgent** remaining; U06/U07 remain queued. The primary
checkout and unrelated integrity files remain unchanged. Pilot remains NO-GO.

### Promotion PR and history synchronization — 2026-10-03

U12/U13 were pushed to dev as `191bc51` / `abb7dfb`. PR
[#6](https://github.com/Dima163163/auto-care-hub/pull/6) was created through the
existing signed-in browser because the GitHub connector lacks PR write permission.
Main `24bc8b0` contains the same baseline as the previously squashed dev commits,
but is not an ancestor of dev. Merging it into dev required five conflict
resolutions; preserving the verified dev versions produced an index identical
to `abb7dfb` before this documentation update. No runtime or frontend changes
were introduced by the synchronization. All four urgent commits are preserved.
CI must rerun on the merge candidate. GitHub also displays a required approving
review; that gate must be satisfied without bypassing branch protection.

### Urgent fix U07, next batch — 2026-10-03

PR #6 remains on dev `14c04ba` while a separate `codex/urgent-audit-batch-3`
branch holds subsequent fixes in the same isolated worktree. U07 now rejects
integration/full backend test startup unless NODE_ENV=test and explicit local
disposable TEST_DATABASE_URL / TEST_REDIS_URL are set. URLs are validated before
dotenv/data-source/Redis modules are imported; safe URLs then replace ordinary
connection settings. PostgreSQL names must end in _test / _test_<id> without
production labels; Redis selects DB 1–15. Remote hosts and query overrides are
rejected. The existing ratelimit:* Redis cleanup was confirmed and recorded as
additional U07 evidence; the guard isolates that service too. CI uses its own
ephemeral PostgreSQL/Redis and DB 15, and README documents the explicit targets.

Fresh PASS: 24 target-policy cases, strict setup/policy types, full lint, backend
311 files / 1208 unit tests. A real invocation without targets exits before
configuration/test import or service connection. No local live DB/Redis was
used; this batch still needs its own isolated CI. U06 is next. The register has
8 urgent / 17 nonurgent open findings. Main still requires the independent
approving review displayed by GitHub; no protection was bypassed.

### Urgent fix U06 and green promotion candidate — 2026-10-03

U07 is committed as `6845517`. U06 replaces raw invitation email SQL with
TypeORM object conditions, so the HMAC transformer applies. Lookup and expired
pending replacement run in one transaction with a row lock. The existing partial
unique index resolves missing-row races; only its 23505 becomes a controlled
409. Unrelated database errors remain visible through the safe error handler,
and notification runs after successful commit. No schema change is needed.

Four regression cases failed before the fix. Five new unit cases now pass,
including real TypeORM metadata/SQL proving HMAC binding, NULL scope and FOR
UPDATE without connecting. Three HTTP/PostgreSQL cases cover uppercase repeat,
expired scope replacement and concurrent sends. Fresh backend PASS: 312 files /
1213 tests, build, full lint, new unit types with noUncheckedIndexedAccess and
integration file types under ordinary strict. The stronger integration type
check exposes pre-existing array fixture narrowing errors, recorded under N14.
Live DB/Redis cases await this branch's CI; no ordinary developer DB was used.

Both push and pull-request Quality runs are fully green on PR #6 candidate
`14c04ba`, including browser E2E, real full-stack and aggregate Application CI.
There is no approving review yet; GitHub's independent review gate still blocks
main. U07/U06 remain separate local commits on `codex/urgent-audit-batch-3`,
keeping the green promotion candidate stable. Remaining findings: 7 urgent /
17 nonurgent. The primary checkout is preserved; pilot remains NO-GO.

### Main promotion and next dev candidate — 2026-10-03

The owner removed only Require approvals from the main branch rule. Browser
verification confirms PR and Application CI requirements, up-to-date branches,
conversation resolution, linear history, no bypass, no force push and no
deletion are preserved. PR #6 merged normally as `a81749b`; fetched main's tree
exactly equals Quality-tested dev `14c04ba` (both workflows passed).

U07 `6845517` and U06 `676f22a` are separate commits on the next batch branch.
Synchronizing the new main squash caused only three documentation conflicts;
preserving this branch's audit/handoff documents yielded an index identical to
`676f22a` before this status update. Runtime and each urgent commit are intact.
The next dev candidate must pass its own isolated PostgreSQL/Redis and full
Quality checks before main. The primary checkout remains untouched.

### Published U07/U06 and local U10 — 2026-10-03

Dev `fde2d05` and PR #7 publish U07/U06. PR Quality run `37122629168` backend
job `111201602299` passes unit 312/1213, integration 16 files / 68 pass / 1
skipped and full suite 403 files / 1435 pass / 1 skipped. All three new invitation
HTTP cases pass in the 11-case branch access suite. Ephemeral PostgreSQL/Redis
also verify positive U07 targets. The pre-existing admin race skips on both the
old and new candidates due to undisclosed fixture prerequisites; N14 records
the limitation. Browser/aggregate Quality checks still precede main merge.

`codex/urgent-audit-batch-4` holds U10 while PR #7 remains stable. A common
response cache hook now defaults to private/no-store. Only anonymous successful
GET/HEAD discovery and public image routes with explicit public policy may
cache; credentials, Set-Cookie, errors and all other routes fail closed. Register
after cookie serialization. Public TTL/304/ETag and attachment delivery headers
remain intact. Eighteen cases failed before; 28 actual Fastify cases now pass.
Backend 313 files / 1241 tests, build, full lint and strict focused types PASS.
HTTP suites now assert unauthenticated errors and authenticated owner catalog,
reviews/analytics and permission denial headers. This new live replay remains
pending. Remaining audit: 6 urgent / 17 nonurgent. No frontend/design changes.


### U04 completed locally; PR #7 merged — 2026-10-03

PR #7 merged as `2f99bf1`; both Quality runs on `fde2d05` passed. Fetched main
and tested dev have exactly the same tree `10bc2362e0019448ddd58caccaaaf4235da2944a`.
No reviewer requirement remains; all other protection constraints are preserved.

U04 uses ACHBKP01 AES-256-GCM with authenticated header, bounded PBKDF2 and
private staging. Restore authenticates and validates the entire gzip, prepares
complete SQL, then invokes psql. All failures clean temporary files and do not
start the SQL consumer. Existing outputs, legacy CBC and production plaintext
restore are rejected. Old archives are retained; a fresh trusted-source backup
or controlled offline legacy recovery is required. Node.js and enough private
staging disk space are needed. No production DB/archive was touched.

The old pipeline reproduced a corrupt gzip reaching fake psql. Thirteen new
actual subprocess/crypto cases pass, including tampering with recomputed sums,
wrong key, truncation, invalid gzip, legacy rejection, output preservation and
shell-script round-trip. Server tooling 18 PASS; root backup/ops tests 7 PASS;
contracts, syntax and lint PASS. Real PostgreSQL restore/RPO/RTO remains external.
U10/U04 still need their own exact-head Quality CI and publication dev then main.

N18 records dotenv quoted-space loss proven synthetically without reading .env.
N19 records promotion self-wait: both Quality runs pass while the workflow waits
on all PR checks, including its own pending check; it ultimately cancelled.
These are separate nonurgent items, not bundled into the two urgent fixes.
Remaining audit: **5 urgent / 19 nonurgent**. Primary dirty files and UI are
preserved; pilot remains NO-GO. No skills installed and no subagents spawned.


Main synchronization before U10/U04 publication: origin/main `2f99bf1` is a
squash of tested dev `fde2d05` with exactly the same tree. The merge conflicts
were only audit/handoff documents; after resolving them, the index exactly
matched U04 `3abded7` before this note. Runtime changes and both urgent commits
are preserved. Publish dev normally, run complete candidate CI, then merge main.


PR #8 CI correction: backend on `0b0defc` failed the old production operations
source contract, which still demanded AES-CBC. Updated the contract to require
ACHBKP01/GCM/AAD/tag and completed SQL staging, preserving all restore guards.
Both failed preflight cases reproduced locally; all 15 ops harness tests and
complete `quality:backend` now PASS (18 tooling, 313/1241 unit, build). Publish
this follow-up and require complete CI on the new exact head before main.


U10 CI contract correction: `ba8d843` passes all backend quality, migration and
new cache cases; integration is 74 pass / 1 fail / 1 old skip. The one failure
is an old exact `no-store` expectation for private user export; final HTTP now
correctly returns `private, no-store`. Align user export and admin revoke HTTP
assertions, keeping cache denial intact. Both updated files pass lint. U04
crypto/tooling passes in CI (18 tests). Repeat full Quality on the new head.


PR #8 exact-head evidence `0969405`: push Quality `37137798572` fully PASS.
Both backend jobs pass: unit 313/1241, integration 16 files / 75 pass / 1 old
skip, full 404 files / 1470 pass / 1 old skip; crypto/tooling 18 PASS and real
production Next smoke PASS. PR Quality `37137801742` fails only the tablet
city-listbox 5-second disabled-trigger assertion after all retries (169 pass,
1 flaky, 1 fail). Same frontend SHA passes push; N20 records nondeterminism,
not a proven production defect. One failed-jobs rerun, attempt 2, started on
the unchanged head. Do not merge main until this required run is green.
Remaining audit: 5 urgent / 20 nonurgent. These documentation edits stay local
until the current immutable candidate is published; no new push yet.


03 Oct — U10/U04 published; U05 next urgent batch:
PR #8 is merged into main `5b6d36e`; fetched tree exactly equals tested dev
`0969405` (tree `430a920bc9515c01c1f3606a311abc18ae85ec36`). Both Quality
runs PASS. PR rerun attempt 2 passes 171 E2E and 12 PWA without source changes;
N20 remains open because passing a rerun does not resolve its earlier race.
Batch 5 starts from this main, with a no-content merge of origin/dev to preserve
normal push ancestry. U05 separates stable HMAC getIndexKey() from rotating
KEKs, rejects inconsistent keyrings/provider replacement, and captures envelope
keyId once. Existing h1/keyring/envelope formats are preserved. Local focused
17 tests, strict test types, full lint and complete quality:backend PASS
(314 files / 1249 unit, 18 tooling, build). One new live PostgreSQL case covers
password login/OAuth/email uniqueness/invitation conflict/new KEK writes; its
acceptance is pending CI. Never delete historical keys; HMAC migration and
backup-key retirement remain N09. Cross-restart external HMAC identity must be
pinned by the future U01 adapter. Audit remains 5 open urgent / 20 nonurgent.
Primary dirty-file hashes remain unchanged. No subagents or skill installs.


U05 live backend acceptance on immutable `14afc34`: PR Quality `37143037677`,
backend `111261237103` PASS. Both field-encryption integration cases pass in
integration and full suite, including actual password login, OAuth, uniqueness,
invitation lookup/conflict and writes with the new KEK. Integration 16/76 PASS
with 1 old skip; full 405/1479 PASS with 1 old skip; unit 314/1249 PASS.
Push backend is also green, as are both frontend/real-stack/scanning jobs.
Wait for browser and Application CI before main; do not change candidate SHA.
U05 functional acceptance of stable-HMAC rotation is complete; audit now has
4 remaining urgent / 20 nonurgent, publication still pending. These evidence
notes stay local until publication. U01 service selection, U03 MFA approach,
and U08 frontend ownership questions are pending; no answer/approval inferred.


03 Oct — U05 published and next-batch decisions:
PR #9 merged into main `0830e40d360fe5799026a55a8a637156c24d9a74`.
Fetched main tree exactly equals candidate `14afc34`
(`e612e882e5763b43d4d075fdf2056e2d0563bc6b`). Both Quality runs PASS:
PR `37143037677`, push `37142990185`; 171 E2E / 12 PWA first-run PASS.
U05 is published; remaining audit is 4 urgent / 20 nonurgent. Original primary
dirty-file hashes are unchanged (3/3). The next implementation batch needs:
external KMS selection for U01/U02 and its sync-cache/async encryption boundary;
MFA/SSO and recovery choice for U03; explicit frontend ownership decision for
U08 under the local role rule and user's no-subagents-by-default instruction.
All three questions remain unanswered. No subagent or skill installation is
authorized by silence. Final status-only publication records verified work;
it does not introduce another runtime fix or claim pilot readiness.


22 Oct — N25 local trust queue fix on `fix/request-chat-state-isolation-2026-10-20`:
Migration 178645 adds `trustReassessmentAttemptedAt` and queue index. The worker
selects due active providers with NULLS FIRST, advances success watermarks even
when the score is unchanged, backs off failed providers for 15 minutes and
continues the batch. A scoring policy change invalidates queue watermarks in
the policy transaction. Unit tests and API build pass. PostgreSQL migration,
several real worker passes and deployed maintenance behavior remain open. Local
commit is not yet pushed; accumulated commits will go to dev then main after
the correction batch and release gates.


22 Oct — N24 local review revision fix:
Migration 178646 adds `contentRevision` to reviews and `reviewRevision` to
moderation evidence. Review edits lock the row, consume one allowance and
replace old pending evidence with a new revision-specific item in one
transaction. Both moderation paths check the current revision under locks;
superseded evidence is visible separately in the admin queue. Approved old
evidence no longer inflates the current trust score. Server and frontend unit
tests/build pass; a real PostgreSQL parallel-edit and moderation test is added
but not run locally. Nothing from this batch has been pushed yet.


22 Oct — N27 local API runtime-boundary checker fix:
The checker parses TypeScript AST to discover registered AutoCare endpoint
factories from `autocareApi.ts`, and checks all 256 endpoints including 136
domain endpoints. It fails on zero coverage, an orphan factory and a missing
`transformResponse`. Three positive/negative fixture tests pass and are wired
into the Quality workflow. This is local evidence; published CI has not run.


22 Oct — N31 local tooling-test repair:
Threat-surface and MVP readiness fixtures now match the current WebSocket
connection prehandler and Render readiness/origin contract. A new root test
command runs all 52 tooling test files (172 tests PASS locally) and is the
first command in `quality:backend`, which the Quality workflow invokes.
Published CI confirmation remains open.

22 Oct — N29 refresh lifetime alignment:
`JWT_REFRESH_EXPIRES_IN` now sets the absolute expiry for newly created
password, registration, setup and OAuth sessions. Issued refresh JWTs use the
persisted expiry and cookie Max-Age uses the remaining JWT lifetime. Rotation
retains the original session deadline. Unit cases for 1h, 7d and 30d and the
API build passed locally. A PostgreSQL rotation integration assertion was added
but cannot run without a local database; existing sessions keep their stored
expiry. `07-auth-session.puml` and its preview were refreshed.

22 Oct — N30 quote history boundary:
Request hydration now selects the newest 50 quote versions and returns them in
ascending order, preserving the latest revision as `quoteHistory.at(-1)` for
both client decision views. A PostgreSQL integration case seeds 51 versions,
checks the current status/identity and rejects a stale quote decision with 409.
The API build passed; that database scenario is not locally runnable.
`06-request-workflow.puml` records the read/decision contract.

22 Oct — N32 quote notification identity:
The outbox key for an estimate now includes the persisted quote ID while the
public event type remains `estimate-shared`. The quote and notification enqueue
share a transaction. A PostgreSQL integration case verifies two revisions
produce two events and retrying one revision remains idempotent. The API build
passed; database execution and actual worker delivery remain open.
`08-outbox-maintenance.puml` and preview describe this boundary.

22 Oct — N33 safe transport error presentation:
The shared API error formatter now displays localized neutral text for malformed
JSON, timeout, HTTP 5xx and direct SyntaxError failures instead of response
fragments or exception strings. QueryStateCard still exposes an accessible
retry action. Focused helper/UI tests and the Next build passed locally.
Centralized client telemetry is not present yet; RTK error objects remain
available to callers for diagnostics. `03-frontend.puml` was updated.

22 Oct — N34 route metadata lifecycle:
`SeoHead` now sits above every layout in `AppRouter` so auth and workspace
navigation update title, canonical and robots. Next SSR metadata and the client
share pure auth copy/noindex rules. Auth navigation clears stale alternate links
and structured data; public provider-specific copy remains in place. Tests for
server metadata and `/services` to `/login` client transition and the Next
production build passed. The SEO quality guard now checks the extracted
shared noindex policy and passes its root tooling test. The deployed browser
chain is still unverified.

22 Oct — dependency follow-up:
API Fastify was raised from 5.12.5 to 5.12.7 for the newly reported
GHSA-389g-gv7q-r4x8. Fresh root and API npm audits report zero findings.
Published Quality CI on the final PR candidate remains the release gate.

23 Oct — promotion workflow event selection:
The early Quality wait now accepts only a push-triggered run for the exact dev
SHA. The later required-check gate already requires both push and PR events.
The CI policy contract has a negative test for a missing event filter. Local
checks pass; the published candidate and code-owner review remain open.
# Продвижение dev → main, восстановление общей истории — 2026-10-24

PR #18 прошёл все проверки Quality, включая backend PostgreSQL integration и
browser E2E, и объединён в `dev` как `c51eeb5`. Push Quality для PR #17 на
`dev` `0186aa5` прошёл, но workflow продвижения остановился на PR #19:
предыдущий выпуск PR #15 был squash в `main`. GitHub показывает конфликт,
потому что его commit не является предком `dev`, хотя дерево `main` `49bdf1b`
побайтно совпадает с деревом проверенного `dev` `4a16c2d`.

Ветка исправления объединила этот `main` в текущий `dev` стратегией ours:
проверено, что дерево результата в точности равно дереву исходного `dev`.
Promotion workflow переводится с squash на merge commit, чтобы сохранить
достижимость проверенного SHA в `main` и не повторять конфликт при следующем
выпуске. PR #19 остаётся открытым; новый `dev` и его CI ещё должны пройти,
а защищённый `main` требует независимого code-owner review.
