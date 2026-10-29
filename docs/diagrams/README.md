# Карта проекта AutoCare Hub

**U03, chat actions 2026-10-29:** `07-auth-session.puml` и
`09-access-privacy.puml` с SVG показывают свежий MFA перед admin/super-admin
действиями с чатами и вложениями. PostgreSQL/staging replay открыты.

**U03, chat index 2026-10-29:** `07-auth-session.puml` и
`09-access-privacy.puml` с SVG показывают свежий MFA перед выдачей списка
тем чатов admin/super-admin. PostgreSQL/staging replay остаются открытыми.

**U03, admin mutations 2026-10-29:** `07-auth-session.puml` и
`09-access-privacy.puml` с SVG показывают свежий MFA для модерации,
provider/catalog/market governance, кабинетов и platform reviews.
PostgreSQL/staging replay открыт.

**U03, admin reads 2026-10-29:** `07-auth-session.puml` и
`09-access-privacy.puml` с SVG показывают свежий MFA перед приватными
admin dashboard/платформенными отзывами. Public market hierarchy остаётся
под role authorization; PostgreSQL/staging replay открыты.

**U03, exceptional reads 2026-10-29:** `07-auth-session.puml` и
`09-access-privacy.puml` с SVG показывают свежий MFA перед приватным чтением
жалоб, чата и вложений admin/super-admin, chat WebSocket с live перепроверкой и
super-admin просмотром заявки. `03-frontend.puml` показывает JSON отказ
вместо Blob для MFA step-up на приватном изображении. Другие sensitive reads
и staging replay открыты.

**U03, operator MFA recovery 2026-10-29:** `05-domain-data.puml` и
`07-auth-session.puml` с SVG показывают замену фактора после двух проверок
MFA независимых super-admin, отзыв сессий, tokenVersion и аудит. Внешняя
проверка личности и break-glass при нехватке подтверждающих лиц остаются
операционными условиями.

**U03, sensitive action step-up 2026-10-29:** `07-auth-session.puml` и
`09-access-privacy.puml` с SVG показывают повторную проверку кода после
пятиминутного окна для user/role, trust-policy, security-center, outbox и
решений по удалению аккаунта. `auth/step-up` обновляет отметку текущей
сессии, интерфейс повторяет исходное действие после подтверждения. Экспорт
журнала аудита и отчёта безопасности также требует свежий MFA; CSV-клиент
сохраняет структурированный код ошибки для диалога. Исключительные чтения и
staging replay ещё открыты.

**U03, privileged password login 2026-10-29:** `05-domain-data.puml`,
`07-auth-session.puml` и `09-access-privacy.puml` с SVG показывают TOTP/одноразовый recovery code,
row-bound секрет фактора и `mfaVerifiedAt` сессии. Старые privileged sessions
отклоняются, удаление аккаунта очищает фактор. [Порядок включения](../operations/PRIVILEGED_MFA_ROLLOUT.md).
Reset/step-up и staging replay остаются открытыми.

**U03, privileged OAuth 2026-10-29:** `07-auth-session.puml` и SVG
показывают отказ в OAuth callback/link для admin/super-admin до создания
сессии. Password MFA и одноразовые recovery codes подготовлены локально;
сброс фактора и step-up открыты.

**U02, fleet vehicle 2026-10-28:** `05-domain-data.puml` и `09-access-privacy.puml` с SVG показывают HMAC label/vehicleSnapshot по vehicle/fleet UUID. Migration 178680, bounded checkpoint, full verify и opt-in strict reader подготовлены.


**U02, fleet account 2026-10-28:** `05-domain-data.puml` и `09-access-privacy.puml` с SVG показывают HMAC name/notes по fleet/owner UUID. Migration 178679, bounded checkpoint, full verify и opt-in strict reader подготовлены.


**U02, expert question 2026-10-28:** `05-domain-data.puml` и `09-access-privacy.puml` с SVG показывают HMAC vehicleSnapshot/symptoms/answer по question/client UUID. Migration 178678, bounded checkpoint, full verify и opt-in strict reader подготовлены.


**U02, guarantee claim 2026-10-28:** `05-domain-data.puml` и `09-access-privacy.puml` с SVG показывают HMAC summary/resolution по claim/request/client/provider UUID и claimType. Migration 178677, bounded checkpoint, full verify и opt-in strict reader подготовлены.


**U02, broadcast offer 2026-10-28:** `05-domain-data.puml` и `09-access-privacy.puml` с SVG показывают HMAC offerSnapshot по offer/broadcast/provider/location UUID. Migration 178676, bounded checkpoint, full verify и opt-in strict reader подготовлены.


**U02, broadcast request 2026-10-28:** `05-domain-data.puml` и `09-access-privacy.puml` с SVG показывают HMAC issueDescription/vehicleSnapshot по broadcast/client/definition UUID. Migration 178675, bounded checkpoint, full verify и opt-in strict reader подготовлены.


**U02, repair event 2026-10-28:** `05-domain-data.puml` и `09-access-privacy.puml` с SVG показывают HMAC title/notes/metadata по event/request UUID и eventType. Migration 178674, bounded checkpoint, full verify и opt-in strict reader подготовлены.


**U02, catalog gap requests 2026-10-28:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают HMAC четырёх полей по gap/requester
UUID, provider UUID и параметрам каталога. Migration 178673, bounded
checkpoint, full verify и opt-in strict reader подготовлены.

**U02, appeal text 2026-10-28:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают HMAC reason/decisionReason по
appeal/submitter/subject UUID, subject и nullable provider UUID. Migration
178672, bounded checkpoint и opt-in strict reader подготовлены.

**U02, provider change requests 2026-10-28:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают HMAC payload/reviewReason по
request/provider/requester UUID и kind. Migration 178671, bounded checkpoint,
full verify и opt-in strict reader подготовлены. Staging KMS/restore открыты.

**U03, privileged session 2026-10-28:** `07-auth-session.puml` и SVG
показывают отказ admin/super-admin при access/refresh без persisted session.
Текущий password MFA указан выше; step-up и staging acceptance открыты.

**U02, trust evidence 2026-10-28:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают HMAC reference/notes по evidence/
provider UUID и kind, проверку reference blind index, очистку старых index
после удаления. Migration 178670, bounded checkpoint и opt-in strict reader
подготовлены. Staging KMS/restore остаётся открытым.

**U02, chat block reason 2026-10-28:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают HMAC причины блокировки по block/
thread/blocker/blocked UUID. Migration 178669, bounded checkpoint и opt-in
strict reader подготовлены. Staging KMS/restore остаётся открытым.

**U02, chat report text 2026-10-28:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают HMAC четырёх текстов жалобы по
report/thread/reporter UUID. Migration 178668, bounded checkpoint и opt-in
strict reader подготовлены. Staging KMS/restore остаётся открытым.

**U02, service quote snapshot 2026-10-28:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают HMAC сметы по quote/request/provider
UUID и version. Анонимизация пересчитывает подпись каждой строки. Migration
178667, bounded checkpoint и opt-in strict reader подготовлены. Staging
KMS/restore остаётся открытым.

**U02, AutoCare reschedule text 2026-10-28:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают HMAC причин предложения и решения.
Migration 178666, bounded checkpoint и opt-in strict reader подготовлены.
Staging KMS/restore остаётся открытым.

**U02, booking reschedule resolution 2026-10-28:** `05-domain-data.puml`
и `09-access-privacy.puml` с SVG показывают HMAC причины по reschedule/
booking/requester/resolver UUID и status. Migration 178665, bounded checkpoint
и opt-in strict reader подготовлены. Staging KMS/restore остаётся открытым.

**U02, booking text fields 2026-10-28:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают HMAC комментария, причины отмены
и заметки владельца по booking/client/cabinet/service UUID. Migration 178664,
bounded checkpoint и opt-in strict reader подготовлены. API скрывает binding;
другие поля U02 и staging KMS/restore остаются открытыми.

**U02, booking status history reason 2026-10-28:** `05-domain-data.puml`
и `09-access-privacy.puml` с SVG показывают HMAC причины по history/booking
UUID и status, bounded checkpoint и opt-in strict reader. API не отдаёт
binding. Staging KMS/restore и другие поля U02 остаются открытыми.
**U02, service request outcomes 2026-10-28:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают HMAC причин отмены и неявки и
заметки завершения по request/client/provider/location/definition UUID.
Migration 178662, bounded checkpoint и opt-in strict reader подготовлены.
Staging KMS/restore, strict cutover и другие поля U02 остаются открытыми.

**U02, user secondary fields 2026-10-28:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают HMAC аватара, публичного имени и
города по user UUID, bounded checkpoint и opt-in strict reader. Частичные
выборки включают binding; strict cutover и KMS/restore остаются открытыми.

**U02, client vehicle field binding 2026-10-28:** `05-domain-data.puml`
и `09-access-privacy.puml` с SVG показывают HMAC четырёх полей по vehicle/owner
UUID, bounded checkpoint и opt-in strict reader. API не возвращает binding.
Другие поля U02, staging KMS/restore и strict cutover остаются открытыми.

**U02, service request note binding 2026-10-27:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают HMAC по request/client/provider/
location/definition UUID, bounded checkpoint и opt-in strict reader.
Анонимизация очищает note и binding. Остальные поля U02, staging KMS/restore
и strict cutover открыты.

**U02, vehicle snapshot binding 2026-10-27:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают HMAC по request/client/provider/
location/definition и nullable vehicle UUID, bounded checkpoint и opt-in
strict reader. Анонимизация очищает snapshot и binding. Остальные поля U02,
staging KMS/restore и strict cutover открыты.

**U02, contact snapshot binding 2026-10-27:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают HMAC по request/client/provider/
location/definition UUID, bounded checkpoint и opt-in strict reader.
Анонимизация очищает snapshot и binding. Остальные поля U02, staging
KMS/restore и strict cutover открыты.

**U02, estimate snapshot binding 2026-10-27:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают HMAC по request/client/provider/
location/definition UUID, bounded checkpoint и opt-in strict reader.
Частичная выборка аналитики получает полный контекст для проверки подписи.
Анонимизация очищает snapshot и binding. Остальные поля U02, staging
KMS/restore и strict cutover открыты.

**U02, accepted quote binding 2026-10-27:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают HMAC по request/client/provider/
location/definition UUID, bounded checkpoint и opt-in strict reader.
Анонимизация очищает snapshot и binding. Остальные поля U02, staging
KMS/restore и strict cutover открыты.

**U02, booking snapshot binding 2026-10-26:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают HMAC по request/client/provider/
location/definition UUID, bounded checkpoint и opt-in strict reader.
Анонимизация очищает snapshot и binding. Остальные поля U02, staging
KMS/restore и strict cutover открыты.

**U02, private chat subject binding 2026-10-26:** `05-domain-data.puml`
и `09-access-privacy.puml` с SVG показывают HMAC темы по thread UUID,
type и request/provider/client/creator UUID, bounded checkpoint и opt-in
strict reader. Анонимизация пересчитывает binding после очистки client/creator.
Остальные поля U02, staging KMS/restore и strict cutover открыты.

**U02, encrypted service offer binding 2026-10-26:** `05-domain-data.puml`
и `09-access-privacy.puml` с SVG показывают companion HMAC предложения по
message/request/thread/sender UUID и kind, nullable binding, bounded checkpoint
и opt-in strict reader. Остальные поля U02, staging KMS/restore и strict cutover
открыты.

**U02, private message body binding 2026-10-26:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают HMAC по message/request/thread/sender UUID и kind, nullable
binding, bounded checkpoint и opt-in strict reader. Остальные поля U02,
staging KMS/restore и включение strict открыты.

**U02, user name/phone binding 2026-10-25:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают HMAC по user UUID, nullable
binding-поля, checkpoint и opt-in strict reader. Реальный KMS/restore и
включение strict остаются открытыми; source anchors обновлены.

**U02, OAuth subject expansion 2026-10-25:** `09-access-privacy.puml` и SVG
показывают MAC по identity/user UUID и провайдеру, с проверкой HMAC index при
чтении. `05-domain-data.puml` и SVG показывают checkpoint-таблицу для
ограниченного compare-write backfill. Полный verify и opt-in strict reader
подготовлены; staging KMS/restore и включение strict ещё открыты.

**U02, outbox backfill/cutover подготовка 2026-10-25:**
`05-domain-data.puml` и `08-outbox-maintenance.puml` с SVG показывают
checkpoint-таблицу, пакетную JSONB compare-write и opt-in strict reader.
Staging KMS/restore и включение флага остаются открытыми; anchors обновлены.

**U02, outbox expansion 2026-10-25:** `08-outbox-maintenance.puml` и SVG
показывают UUID события до шифрования, MAC email/toEmail/recipientName и
проверку строки при чтении. Legacy события пока читаются; backfill и strict
cutover остаются открытыми. Source anchors обновлены.

**U02, backfill/cutover подготовка 2026-10-25:** `05-domain-data.puml` и
`09-access-privacy.puml` с SVG показывают checkpoint-таблицу, пакетный перенос
email MAC и opt-in strict reader. Реальный KMS/staging перенос, restore и
остальные encrypted поля не приняты. Source anchors обновлены.

**U02, expansion 2026-10-25:** `09-access-privacy.puml` и SVG показывают
MAC для новых user/invitation email envelopes по row UUID и invitation provider
UUID. Legacy envelopes временно читаются; backfill, strict switch и остальные
зашифрованные поля остаются открытыми. Source anchors обновлены.

**U02, следующий частичный шаг 2026-10-24:** `08-outbox-maintenance.puml`
и SVG отражают сверку outbox email/toEmail с HMAC blind index при чтении.
Перенос согласованной пары index+ciphertext между событиями остаётся открытым.

**U02, частичная проверка 2026-10-24:** `09-access-privacy.puml` и SVG
показывают сверку расшифрованного email с HMAC blind index для users и
provider invitations. Проверка отвергает подмену одного ciphertext;
перенос согласованной пары и остальных зашифрованных полей остаётся риском
до versioned row/owner AAD и миграции. Добавлен source anchor subscriber.

**U01, кодовая подготовка 2026-10-23:** `02-runtime.puml` и SVG показывают
загрузку зашифрованного набора ключей через AWS KMS до API/worker startup и
TypeORM migrations. Схема пересобрана локальным PlantUML 1.2026.2; 135 source
anchors совпадают. Настоящий KMS, staging restart/restore и production доступ
к данным ещё не проверены; U02 row-bound encryption остаётся открытым.

**Проверка anchors, 2026-10-23:** после обновления Fastify обновлён fingerprint
`server/package.json`; все 129 source anchors соответствуют текущему коду.
Рёбра PlantUML и SVG не менялись. Поле `baseline` и footer схемы сохраняют
исторический исходный срез `8840ae8`; актуальность anchors проверяется отдельно.

**N23, локальная реализация, 2026-10-22:** `03-frontend.puml` и
`04-backend.puml` с SVG показывают cursor pages заявок с SQL scope и batch
hydration, bounded legacy array и streaming owner/admin analytics.
PostgreSQL budget/latency после исправления ещё не измерены.

**Локальное исправление N22, 2026-10-22:** `04-backend.puml` и SVG показывают
общую политику первого ответа для owner/admin/trust. Она использует текущее
membership и scope филиала; PostgreSQL HTTP flow пока не проверен.

**Локальное исправление N21, 2026-10-22:** `05-domain-data.puml` и SVG
отражают полный SQL счётчик статусов отзывов и ограниченное окно 1000
для аномалий/калибровки. Контракт и экран администратора показывают
границу анализа; PostgreSQL сценарий >1000 после исправления не выполнен.

Начинать новую задачу здесь после `AGENTS.md` и краткого `PROJECT_CONTEXT.md`.
Выбрать одну схему, проверить её актуальность и открыть указанные исходники.
Полное повторное чтение `src/` и `server/src/` для навигации не требуется.

**Срез:** реализованный код `dev` / `8840ae830a641626bcd1d1735d3324bb6f923a77`.
**Дата проверки:** 2026-10-15. Удалённый `dev` сверён через `git ls-remote`.
Ветка документации: `docs/plantuml-project-map-2026-10-15`.

**Повторная проверка 2026-10-20:** все 51 source anchors / 4 inventories совпали.
Новые UI/privacy findings и границы semantic review описаны в
[повторном аудите](../audits/UI_SECURITY_RECHECK_2026-10-20.md).
Покрытие документации, включая непроверенные файлы: [INDEX.md](../INDEX.md).
Схемы/SVG не пересобирались; исходный render evidence остаётся от 15 октября.

**Локальные исправления U22/UX17, 2026-10-20:** `03-frontend.puml` и SVG
обновлены для изоляции `ServiceRequestChat` по `userId + requestId` и
восстановления абсолютной даты/времени в `RequestForm`. Добавлены три source
anchor; теперь карта проверяет 54 файла. Остальные восемь SVG сохраняют render
от 15 октября. Свежий syntax/render frontend выполнен локальным PlantUML
1.2026.2; подробности в [verification.json](verification.json).

**Локальное исправление UX18:** карточка, таблица сравнения и карта используют
общие правила отображения цены; карточка и таблица одинаково показывают режим
подтверждения времени и текст гарантии. Для мобильной таблицы ограничена
ширина grid column, чтобы работала внутренняя горизонтальная прокрутка.
Добавлены шесть source anchors, всего 60.

**Локальное исправление UX16:** `ConfirmDialog` ограничен высотой viewport,
прокручивается над мобильной навигацией, действия переносятся на сверхузком
экране. Добавлен frontend source anchor, всего 61. Архитектурные связи
`03-frontend.puml` не менялись, поэтому SVG остался прежним; layout поведение
проверено браузерной геометрией в отчёте UI/security recheck.

**Локальное исправление U14, 2026-10-21:** `08-outbox-maintenance.puml` и SVG
обновлены для явного шифрования raw outbox INSERT и backfill migration 178642.
Добавлен anchor миграции; точное количество и свежие хэши в `sources.json`.
Схема отражает локальный код, не production acceptance.

**Локальное исправление U20, 2026-10-22:** `07-auth-session.puml` и SVG
отражают условные preference/login updates и транзакционную смену пароля.
Добавлен anchor `users.service.ts`; синтаксис и SVG проверены локальным
PlantUML 1.2026.2. PostgreSQL race test добавлен, но локально не запущен.

**Локальное исправление U15, 2026-10-22:** `09-access-privacy.puml` и SVG
показывают общую политику записи для chat/request message и attachment API.
Добавлены три source anchors; теперь карта проверяет 66 файлов.

**Локальное исправление U17, 2026-10-22:** `08-outbox-maintenance.puml` и SVG
отражают постановку invitation и `email.send` с зашифрованным одноразовым
токеном в одной транзакции; после доставки токен удаляется из payload.
Добавлены два source anchors; карта проверяет 68 файлов. Реальная SMTP/worker
доставка ожидает интеграционной проверки.

**Локальное исправление U18, 2026-10-22:** `05-domain-data.puml` и SVG
отражают восстановление остатка бонусных начислений из журнала. Расход идёт
по ближайшему сроку истечения; возврат формирует новый бессрочный lot.
Добавлены два source anchors; карта проверяет 70 файлов. PostgreSQL integration
добавлен, но локально не запускался.

**Локальное исправление U19, 2026-10-22:** `05-domain-data.puml` и SVG
показывают `caseKey` с одним каноническим claim на заявку. Существующие
дубликаты остаются в истории, но не увеличивают trust penalty; claim type не
считается доказанным нарушением до появления adjudication. Добавлены четыре
source anchors; карта проверяет 74 файла. PostgreSQL migration не запускалась
локально.

**Локальное исправление U21, 2026-10-22:** обновлены версии и lockfiles web/API;
комментарий `next.config.ts` приведён к текущему Next. Три существующих source
anchor получили свежие fingerprint; схема и SVG не менялись. Детали в
[dependency upgrade](../audits/DEPENDENCY_UPGRADE_2026-10-22.md).

**Локальное исправление U16, 2026-10-22:** `05-domain-data.puml` и SVG
показывают HMAC blind index для equality lookup зашифрованного evidence
reference. Миграция заполняет индекс по существующим encrypted values;
добавлены три source anchors, всего 77. Реальная PostgreSQL проверка миграции
и lookup остаётся открытой.

**Локальное исправление N26, 2026-10-22:** `07-auth-session.puml` и SVG
показывают предел 72 UTF-8 bytes для bcrypt при создании и проверке пароля.
Добавлены два source anchors, всего 79. Старым паролям свыше предела нужен
email reset; production recovery flow предстоит проверить.

**Локальное исправление N28, 2026-10-22:** `07-auth-session.puml` и SVG
отражают безопасный fallback для session expiry hint при denied
`sessionStorage`; in-memory token/cache очищаются раньше optional hint.
Source anchors остались 79; browser denial flow на production не проверен.

**Локальное исправление N25, 2026-10-22:** `05-domain-data.puml` и
`08-outbox-maintenance.puml` с SVG показывают due queue пересчёта trust,
раздельные timestamps успешной и неудачной попытки и backoff. Добавлены
anchors миграции и policy editor; PostgreSQL worker passes ещё не проверены.

**Локальное исправление N24, 2026-10-22:** `05-domain-data.puml` и SVG
показывают content revision отзыва и version-scoped moderation evidence.
Старая pending версия становится `superseded`; решение проверяет номер
версии под lock. Добавлены anchors реализации, миграции и UI статуса.
PostgreSQL race integration test написан, но локально не запущен.

**Локальное исправление N27, 2026-10-22:** `03-frontend.puml` и SVG
отражают AST проверку всех 10 зарегистрированных AutoCare endpoint factories.
Checker покрывает 256 endpoint declarations (136 доменных) и отказывает при
нулевом coverage, незарегистрированном factory или отсутствующем transform.
CI step и negative tests добавлены; опубликованный CI ещё не запускался.

**Локальное исправление N31, 2026-10-22:** полный набор root tooling tests
включён в обязательный backend quality job. Обновлены fixture contracts для
WebSocket connection-rate limit и Render readiness/origin. Архитектурные
связи схем не изменились; обновлены только source anchors для quality scripts.

**Локальное исправление N29, 2026-10-22:** `07-auth-session.puml` и SVG
показывают абсолютный срок новых refresh сессий. Настройка задаёт DB expiry,
JWT `exp` и оставшийся cookie `Max-Age`; rotation не продлевает сессию.
OAuth использует тот же расчёт. Unit 1h/7d/30d и build прошли локально,
PostgreSQL integration ожидает среды с БД.

**Локальное исправление N30, 2026-10-22:** `06-request-workflow.puml` и SVG
показывают последние 50 версий сметы в возрастающем порядке. Последняя запись
соответствует актуальной версии и её status; решение по устаревшей версии
получает 409. PostgreSQL integration на 51 версию добавлен, но локально не запущен.

**Локальное исправление N32, 2026-10-22:** `08-outbox-maintenance.puml` и SVG
показывают версионный ключ уведомления о смете по сохранённому quote ID.
Тип события не меняется; retry одной версии дедуплицируется. PostgreSQL
integration и настоящая доставка локально не проверены.

**Локальное исправление N33, 2026-10-22:** `03-frontend.puml` и SVG
показывают безопасное отображение parsing/timeout/5xx ошибок. Технический
текст ответа не попадает в UI; локализованный текст и retry проверены тестами.
Единая клиентская telemetry для таких сбоев остаётся открытой.

**Локальное исправление N34, 2026-10-22:** `03-frontend.puml` и SVG
показывают `SeoHead` над всеми layouts и общую server/client политику
auth title/noindex. Переход `/services → /login` проверен компонентным тестом;
production browser chain после публикации ещё не проверялся.

## Выбрать схему

| Задача | PlantUML | Просмотр | Первые исходники от корня repo |
| --- | --- | --- | --- |
| Общий контекст | [01-system-context.puml](01-system-context.puml) | [SVG](rendered/01-system-context.svg) | `server/src/app.ts`, `next.config.ts` |
| Запуск / deployment / worker | [02-runtime.puml](02-runtime.puml) | [SVG](rendered/02-runtime.svg) | `server/src/server.ts`, `server/src/config/runtime-mode-policy.ts` |
| Frontend / endpoint / routing | [03-frontend.puml](03-frontend.puml) | [SVG](rendered/03-frontend.svg) | `src/app/routes/route-groups.tsx`, `src/entities/automotive-service/api/autocare/` |
| Backend / поиск use case | [04-backend.puml](04-backend.puml) | [SVG](rendered/04-backend.svg) | `server/src/modules/autocare/autocare.routes.ts`, concrete domain service |
| Данные / миграции | [05-domain-data.puml](05-domain-data.puml) | [SVG](rendered/05-domain-data.svg) | `server/src/entities/automotive/`, `server/src/database/migrations/` |
| Заявка / смета / запись | [06-request-workflow.puml](06-request-workflow.puml) | [SVG](rendered/06-request-workflow.svg) | `request-create`, `request-quote`, `request-transition`, `request-lifecycle-policy` в AutoCare module |
| Login / refresh / сессия | [07-auth-session.puml](07-auth-session.puml) | [SVG](rendered/07-auth-session.svg) | `src/shared/api/baseApi.ts`, `server/src/modules/auth/require-auth.ts` |
| Доставка / outbox / maintenance | [08-outbox-maintenance.puml](08-outbox-maintenance.puml) | [SVG](rendered/08-outbox-maintenance.svg) | `server/src/modules/outbox/outbox.service.ts`, `server/src/modules/jobs/maintenance-jobs.service.ts` |
| Права / приватные сообщения / media | [09-access-privacy.puml](09-access-privacy.puml) | [SVG](rendered/09-access-privacy.svg) | `provider-access`, `request-access`, `chat-access`, `autocare-attachment-storage` в AutoCare module |

Конкретные отслеживаемые файлы и принадлежность схемам находятся в
[sources.json](sources.json). Для списка владельцев use cases:
[AUTOCARE_RESPONSIBILITIES.md](../architecture/AUTOCARE_RESPONSIBILITIES.md).

## Рабочий порядок

1. Уточнить checkout/ветку задачи: несколько каталогов workspace относятся к
   разным состояниям кода. Карта привязана к указанному срезу dev.
2. Выбрать схему по таблице и выполнить проверку нужной области:

   ```sh
   node docs/diagrams/check-map.mjs --scope auth
   ```

3. Прочитать схему и только её source anchors; затем проверяемую функцию и
   относящиеся к ней tests/policies. При новом поведении расширять чтение по
   фактическим зависимостям. Карта не заменяет проверку условий безопасности.
4. После изменения связей, ownership, routes, state transitions или schema
   обновить соответствующий `.puml`, источник fingerprint и SVG в той же порции.
5. Проверить карту, links и render; отметить обновление в `PROJECT_CONTEXT.md`.

Области CLI: `context`, `runtime`, `frontend`, `backend`, `data`, `requests`,
`auth`, `outbox`, `security`. Без `--scope` проверяются все anchors.

```sh
node docs/diagrams/check-map.mjs
node docs/diagrams/check-map.mjs --scope requests
node docs/diagrams/check-map.mjs --repo ../autocare-hub --scope auth
```

Последняя команда сверяет эту карту с другим checkout и выдаёт изменённые или
отсутствующие файлы. Она не изменяет другой checkout. Exit 0 — tracked anchors
совпали; exit 1 — найден drift; exit 2 — ошибка конфигурации/аргументов.

## Актуальность

`check-map.mjs` сверяет SHA-256 выбранных исходников и имена файлов/подкаталогов
в нескольких структурных точках. Читает только manifest anchors; новый полный
source scan не выполняется. Hash не подтверждает семантическую полноту диаграммы.
Файл вне manifest может изменить поведение; для самой задачи всегда проверять
нужный код и tests. HEAD может отличаться при неизменных anchors.

При drift открыть перечисленные файлы, проверить влияние на схемы, внести
содержательные изменения, затем обновить hashes/inventories в `sources.json`
и дату проверки. Не принимать новую подпись без просмотра изменений.
Для новой ответственности добавить новый anchor и ссылки в таблицу.

## Смысл и границы карт

- Это сокращённые схемы текущей реализации, не обещание target architecture.
- Next — production shell; React Router остаётся внутри client application.
  Vite используется для compatibility/development. MSW относится к mock mode.
- Backend — один модульный codebase; `api`/`worker`/`all` — runtime modes.
- FK/schema details сверяются с entities и migrations; пунктирные связи ERD
  явно логические. Точные transition guards находятся в domain services.
- Production gates остаются открытыми; локальные исправления auth cleanup,
  private write, encrypted reference и outbox ожидают browser/real-DB/worker
  проверок.
  Актуальный рабочий аудит: [реестр находок](../audits/FULL_PROJECT_AUDIT_2026-10-03.md).
- Production KMS/MFA, deployed topology, native clients и внешняя приёмка
  имеют собственные gates. Billing исключён из действующего pilot scope.

## Локальная сборка SVG

Исходники используют только локальный [_style.puml](_style.puml); данные проекта
не отправляются на online PlantUML server. Нужны Java и официальный PlantUML JAR.
Smetana указан в style, поэтому внешний Graphviz для этих схем не требуется.

Из корня repository, подставив путь к своему JAR:

```sh
java -Djava.awt.headless=true -jar /path/to/plantuml.jar -charset UTF-8 -checkonly docs/diagrams
java -Djava.awt.headless=true -jar /path/to/plantuml.jar -charset UTF-8 -tsvg -o rendered docs/diagrams
```

Проверено локально PlantUML 1.2026.8. JAR хранится вне repository; version и
SHA-256 renderer записаны в [verification.json](verification.json).
Ключи CLI: [официальная документация](https://plantuml.com/command-line).
SVG — пересобираемые previews; `.puml` — редактируемые исходники.
