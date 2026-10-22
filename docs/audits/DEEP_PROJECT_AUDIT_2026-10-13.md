# Углублённый аудит AutoCare Hub — 13 октября 2026

## Последующее подтверждение на реальном окружении

[RUNTIME_VERIFICATION_2026-10-13.md](RUNTIME_VERIFICATION_2026-10-13.md) снимает
ограничения первого прохода по local PostgreSQL/Redis, recovery и live API:
23/88 integration, 10 persisted defect cases, 29/29 real E2E, encrypted restore
76 таблиц, 139 migrations, 30 validated constraints, 17/17 SEO + 17/17 JS и 5 CSP.
Измерен рост request-list 516 → 5016 SQL queries на 102 → 1002 заявках.
Добавлен U21: свежие dependency advisories. Итог дня — 22 находки,
7 P1/12 P2/3 P3. Remote dev подтверждён идентичным source commit.

## Результат и основание первого прохода

Проверена изолированная копия локального `origin/dev`, commit
`8840ae830a641626bcd1d1735d3324bb6f923a77`, ветка
`audit/project-weaknesses-2026-10-13`. Удалённая ветка заново не получалась.
Основной checkout и его незавершённые integrity-файлы сохранены.

Добавлены **18 новых пунктов: 6 P1, 9 P2, 3 P3** — U14–U20 и N24–N34.
Вместе с первым проходом N21–N23 это **21 новая находка** за 13 октября.
N22 расширен на публичный trust score, N23 — на списки заявок и их N+1 hydration.
Каждый новый пункт открыт. Исправления runtime в этой порции не выполнялись.

Рабочий список: [FULL_PROJECT_AUDIT_2026-10-03.md](FULL_PROJECT_AUDIT_2026-10-03.md).
Старые U01/U02/U03 и частичные N09/N10 сохраняют свои статусы.
Исторические числа аудитов и **54 pilot gates / NO-GO** не пересчитывались.

P1 означает высокий риск для доступа, данных или основного сценария;
P2 — существенную ошибку либо пробел проверок; P3 — ограничение конфигурации
или интерфейса. Срочная группа U включает U16/P2: нарушена связь модерации
с её evidence. P0 и факт эксплуатации на рабочем окружении не установлены.

## Что проверено

| Область | Проверка и результат |
| --- | --- |
| Авторизация | Маршруты, participant/branch guards, старый request API и новый chat API; U15 |
| Auth и пользователь | Пароли, refresh/cookie/session lifecycle, reset/change, full-entity saves, browser cleanup; U20, N26/N28/N29 |
| Шифрование и удаление | Entity transformers, raw SQL, blind indexes, outbox и account deletion; U14/U16; U01/U02 остаются отдельными |
| Заявки и сметы | Чтение, DTO, история, решения, уведомления, idempotency; N23/N30/N32 |
| Команда сервиса | Приглашение, доставка и acceptance token, production response; U17 |
| Отзывы и модерация | Revision allowance, повторная очередь, encrypted reference lookup, evidence; U16/N24 |
| Бонусы | Ledger, redemption, expiration, новые начисления после расходования старых; U18 |
| Рейтинг и жалобы | Claim lifecycle, входные счётчики, first response, bounded worker scheduling; U19/N22/N25 |
| Аналитика и масштаб | Полные списки, ограниченные счётчики, SQL vs process aggregation, hydration; N21–N23; нагрузка не измерена |
| Frontend | API transforms, auth state, production real artifact, поиск/вход/guest redirect при отказе API, head metadata; N27/N28/N33/N34 |
| Проверки и поставка | Unit suites, lint, API/Next builds, Node tooling tests, threat/runtime guards, fixture leakage, HTTP CSP/SEO; N27/N31 |

### Выполненные проверки

| Проверка | Результат текущего запуска |
| --- | --- |
| Frontend unit | **196 файлов / 635 тестов PASS** |
| Backend unit | **387 файлов / 1406 тестов PASS** |
| Full ESLint | PASS |
| Backend TypeScript build | PASS |
| Next production build, `NEXT_PUBLIC_API_MODE=real` | PASS, собственный `.next-deep-audit-real` |
| Real-artifact fixture leakage guard | PASS, 192 файла |
| `node --test scripts/*.test.mjs server/scripts/*.test.mjs` | **188 PASS / 2 FAIL из 190**, N31 |
| Threat-surface checker на настоящем source | PASS; его собственная positive fixture устарела, N31 |
| Frontend runtime-boundary checker | PASS: 120 endpoints / 12 modules; доменные AutoCare factories пропущены, N27 |
| HTTP nonce/CSP | 5 samples PASS: свежий nonce, caller override, SSR/theme, no-store |
| HTTP initial JavaScript budgets | 17/17 PASS |
| HTTP metadata | 14/17 PASS; 3 provider probes BLOCKED при недоступном API и demo-ID defaults |
| Изолированные воспроизведения | **16/16 подтвердили текущее ошибочное поведение** |
| Browser, own loopback frontend | Поиск показывает retry/error; guest bookings → login; ошибка входа не ломает форму; N33/N34 |

Production frontend проверялся с намеренно недоступным upstream API
`http://127.0.0.1:1`, чтобы исследовать отказ и SSR fallback.
Три BLOCKED provider metadata probes не объявлены дефектами метаданных:
дефолтные `api-proservice-moscow`/`api-autolux-moscow`/`api-formula-moscow` не UUID;
для real-проверки нужны существующие UUID через SEO configuration и здоровый API.
Полный hosted CI, authenticated real E2E и актуальный dependency advisory scan
в этой порции не выполнялись.

### Воспроизводимые доказательства

- [reproduce.mjs](evidence/2026-10-13/reproduce.mjs) вызывает собранные реальные
  функции, подставляя synthetic repositories; для U16/U20 использует настоящие
  TypeORM metadata/transformer/diff, для N26 — установленный bcryptjs.
- [results.json](evidence/2026-10-13/results.json) содержит результаты 16 cases.
- [browser-results.json](evidence/2026-10-13/browser-results.json) содержит
  наблюдения из браузера для N33/N34.
- [verification.json](evidence/2026-10-13/verification.json) фиксирует scope и
  результаты запусков. Это журнал аудита, не release attestation.

Запуск из корня изолированного repository:

```sh
npm --prefix server run build
node docs/audits/evidence/2026-10-13/reproduce.mjs
node --test scripts/*.test.mjs server/scripts/*.test.mjs
```

Assertions в `reproduce.mjs` намеренно доказывают **дефект**, поэтому их PASS
не означает исправность. Этот manual evidence не включён в обычный CI.
Скрипт не подключается к БД/Redis/mail/storage; ключи, ID, адреса и пользователи
синтетические. SQL-параметры, ORM diff и repository fixtures не заменяют
интеграционную проверку persistence, locks и конкурентности на PostgreSQL.

## Статус исправления U14 — 21 октября 2026

Raw enqueue шифрует payload до INSERT; migration 178642 backfill обрабатывает
прошлые plaintext recipients. Disposable PostgreSQL16: 140 migrations,
raw JSONB без email/name, retry idempotency и account-deletion blind index
PASS. Production/deployed приёмка остаётся открытой; ниже — исходная находка.

## Новые срочные пункты

### U14 · P1 · Outbox enqueue обходит шифрование персональных полей

**Доказательство.** `server/src/modules/outbox/outbox.service.ts:158` выполняет
raw `manager.query` с `JSON.stringify(input.payload)`. Transformer объявлен
в `server/src/entities/outbox/outbox-event.entity.ts:21`, но raw INSERT его
не вызывает. Case U14 перехватывает параметры настоящего enqueue: email и
recipientName остаются открытым текстом. Поздний ORM save worker может изменить
формат; pending event до worker уже хранит plaintext.

**Последствия.** Политика encryption at rest не соблюдается для свежих событий.
Удаление email-only событий без userId также рискует пропустить их:
`account-deletion-admin.service.ts:56` сравнивает payload email с blind index
в параметре `:66`, а fresh raw insert содержит обычный адрес.

**Исправление.** Сериализовать payload согласованным encryption transformer до
raw upsert либо использовать ORM с сохранением atomic idempotency. Учесть
существующие форматы при account deletion и backfill.

**Приёмка.** Прочитанный raw JSONB после enqueue не содержит email/name plaintext;
email-only pending/completed event правильно обрабатывается удалением; retry
и ON CONFLICT остаются идемпотентными. Нужна PostgreSQL integration.

### U15 · P1 · Superadmin может писать в частную переписку через request API

**Доказательство.** `request-access.service.ts:37` и `:60` разрешают participant
access superadmin без условия. `request-conversation.service.ts:113` использует
эти guards для отправки. Case U15 сохраняет сообщение superadmin в чужой заявке;
аналогичный вызов нового chat API получает 403 благодаря
`chat-access.service.ts:62`. Старый message route не требует emergency reason
для записи. Аналогичный guard использует request attachment flow; именно
message write воспроизведён, attachment отмечен по source.

**Последствия.** Запрет административного вмешательства в private chat зависит
от выбранного API. Сообщение отправляется участнику без режима support/escalation.
Это новая write-ошибка, а не повтор уже исправленного U11 emergency read.

**Исправление.** Общая политика private conversation write для обоих API и
attachments; административное emergency read отделить от права отправки.

**Приёмка.** Admin/superadmin не пишут и не прикрепляют файлы в private thread
через любой entrypoint; допустимые support/escalation и client/owner flows работают.

### U16 · P2 · Exact lookup по рандомно зашифрованному reference не находит evidence

**Доказательство.** `server/src/entities/automotive/marketplace-enhancements.entity.ts:41`
шифрует `reference` randomized transformer. `review-moderation.service.ts:132`
ищет `reference: savedReview.id`, `moderation-evidence.service.ts:159` — `In`.
Case U16 генерирует параметры реального TypeORM query: один исходный UUID
даёт разные ciphertext при save и каждом lookup.

**Последствия.** Решение по отзыву не переводит связанную evidence-запись из
pending; document dedup по reference также ненадёжен. Чтение/дешифрование
значения работает, его equality search — нет.

**Исправление.** Явный review FK для неперсонального UUID либо отдельный blind
index для приватного reference; обновить все lookup/dedup paths и старые записи.

**Приёмка.** Save → повторный exact lookup на encrypted PostgreSQL находит
запись; moderation синхронно закрывает правильную evidence; document repeat
не создаёт дубликат. Не делать encryption детерминированным как общий обход.

### U17 · P1 · Production приглашение не доставляет необходимый acceptance token

**Доказательство.** `provider-membership.service.ts:174` сохраняет только hash,
`:189` возвращает token=null в production. Единственное уведомление `:63–73`
ведёт на `/profile/notifications`, содержит invitationId, но не acceptance link
или token. Accept требует token, альтернативный авторизованный accept по ID
не найден. Case U17 вызывает create с production response branch: token null,
notification есть, секрета/ссылки в нём нет. Для ещё не зарегистрированного
email эта функция вообще не отправляет уведомление.

**Последствия.** Нормальный production путь вступления в команду обрывается.
Dev UI с возвращаемым токеном скрывает дефект. Полный production startup не
запускался из-за отдельного U01; проверена именно функция доставки.

**Исправление.** Доставлять одноразовый token в intended-recipient flow через
encrypted transactional outbox/acceptance link либо реализовать безопасный
verified-email accept по invitationId с явной политикой.

**Приёмка.** Existing и new invitee получают пригодное приглашение в production;
другой email, expired/revoked/replayed invitation отвергаются; токен не попадает
в журналы и общий owner list.

### U18 · P1 · Истечение потраченного начисления списывает свежие бонусы

**Доказательство.** `autocare-bonus.service.ts:86–117` вычитает expired earn
из текущего общего balance, не учитывая расход именно этого начисления.
Case U18: earn 100 → redeem 100 → новый неистёкший earn 100; чтение счёта
создаёт expire -100 для уже потраченного старого earn и возвращает 0.

**Последствия.** Клиент теряет действующие баллы. При нулевом balance expired
entry пропускается без marker, поэтому последующие начисления также уязвимы.

**Исправление.** Явный remaining amount по lots/распределение redemption,
определённые FIFO/expiry/refund правила и reconciliation ledger.

**Приёмка.** Описанная цепочка сохраняет 100 свежих баллов; частичный расход,
несколько lots, refund и повторная/конкурентная expiration не списывают лишнее.

### U19 · P1 · Повторные неподтверждённые жалобы искусственно снижают trust score

**Доказательство.** `autocare-marketplace.service.ts:593–599` проверяет владение
request, но не допустимый visit state, case uniqueness или idempotency.
`trust-score.service.ts:61` считает все unresolved claims; `:79–81` treats
claimType safety/fraud/identity/critical как вход moderation penalty ещё до
решения. Case U19 создаёт 4 safety claims для одной AwaitingReply заявки;
по действующей score policy счётчики меняют synthetic score **92.8 → 30.8**,
включая moderation penalty 40. Число — для fixture, не универсальная величина.

**Последствия.** Один клиент с одной заявкой может многократно повлиять на
репутацию сервиса. Complaint signal не отделён от доказанного нарушения.

**Исправление.** Case identity/unique constraint и retry idempotency; определить
eligible interaction и resolution workflow. В рейтинг передавать осмысленные
уникальные complaints; proven violations учитывать только после adjudication.

**Приёмка.** Повтор одной жалобы создаёт один case, включая concurrency;
неподтверждённая safety жалоба не становится доказанным moderation violation;
resolved/rejected cases корректно снимают влияние.

### U20 · P1 · Сохранение устаревшего UserEntity может вернуть старые security fields

**Доказательство.** `users.service.ts:29–74` получает полный auth user и сохраняет
его при изменении preferences. `auth.service.ts:134`/`:736` содержит аналогичные
full-entity saves. В U20 текущая database fixture уже blocked/new passwordHash/
tokenVersion=2, а auth snapshot active/old hash/version=1. Настоящий TypeORM
SubjectChangedColumnsComputer при preference save включает все три старых
security поля в update diff.

**Последствия.** Завершение запроса с прежним snapshot после concurrent block
или password reset способно отменить блокировку, смену пароля или отзыв токенов.
Доказан ORM update diff, не выполнен live PostgreSQL race или захват аккаунта.

**Исправление.** Narrow updates только разрешённых preferences; чувствительные
переходы через row lock/compare-and-set с актуальной версией. Проверить все saves
полной сущности, поступающей из requireAuthUser.

**Приёмка.** Paused preference/login request после block/reset не изменяет
status/hash/tokenVersion; конкурентные password changes не возвращают старое
состояние; проверки на PostgreSQL подтверждают порядок транзакций.

## Новые несрочные пункты

### N24 · P2 · Одноразовое редактирование отзыва не защищено от гонки

**Доказательство.** `provider-reviews-write.service.ts:77–91` выполняет
read → isReviewEditable → save без lock/conditional update. Два параллельных
вызова UOW в case N24 оба успешно расходуют один revision allowance.
Редактирование ставит pending, но не создаёт новую review moderation evidence;
initial creation это делает. Ранее decided evidence не представляет новую версию.

**Последствия.** Одноразовое право используется дважды, последний save заменяет
первый; evidence очередь может показывать уже рассмотренный старый текст.
Обычный review status list остаётся альтернативой — не вся модерация недоступна.

**Исправление/приёмка.** Atomic consume allowance, content revision ID и новая
evidence для правки. Два concurrent edit → один успех/один 409; moderation
решение не применяется к другой revision. Нужен DB race test.

**Локальное исправление 22.10.** Правка блокирует review row в транзакции,
расходует разрешение, увеличивает `contentRevision`, помечает старый pending
evidence как `superseded` и создаёт новый с `reviewRevision`. Обе точки
модерации блокируют review прежде evidence и не применяют решение к старой
версии; public trust не учитывает approved evidence старой версии. Добавлен
PostgreSQL integration race test, но локально он не запускался: БД недоступна.

### N25 · P2 · Worker пересчёта рейтинга может бесконечно пропускать новые сервисы

**Доказательство.** `trust-score.service.ts:175–180` берёт первые 100 по
trustReassessedAt ASC. В PostgreSQL ASC по умолчанию использует NULLS LAST.
[Официальная документация ORDER BY](https://www.postgresql.org/docs/current/queries-order.html).
`:162–166` не обновляет timestamp при неизменном score и ещё действующем snapshot.
Case N25 моделирует этот порядок repositories и вызывает настоящие функции:
три passes выбирают A/B, ни разу C с null. Это модель сортировки, не live SQL replay.

**Последствия.** При достаточном числе ранее assessed providers null providers
не получают первый расчёт; неизменный первый batch повторяется до expiry.

**Исправление/приёмка.** Due predicate, NULLS FIRST/keyset, timestamp успешного
сканирования независимо от score change. Несколько batch проходят весь каталог
в согласованный срок; failed provider не блокирует прогресс остальных.

**Локальное исправление 22.10.** Worker выбирает только due providers по
`trustReassessedAt`, сначала без попытки, затем по старой попытке; ошибка одного
provider фиксирует `trustReassessmentAttemptedAt` и не блокирует следующих.
Успешное сканирование всегда обновляет оба timestamp. Изменение scoring policy
инвалидирует watermarks транзакционно. Unit и TypeScript build проходят;
миграция 178645 и многократные passes на PostgreSQL пока не проверены.

### N26 · P2 · Password policy принимает отличающиеся пароли с одинаковым bcrypt hash

**Доказательство.** `password-policy.ts:27–30` разрешает 128 символов, hashing
использует bcryptjs. Case N26: два допустимых 73-byte пароля различаются после
72-го байта, `compare` другого пароля с hash первого возвращает true.

**Последствия.** Заявленная длина не равна реально проверяемому секрету;
UTF-8 пароли могут достичь byte limit раньше 72 символов.

**Исправление/приёмка.** Согласованный byte bound либо версионированный новый
hashing scheme с migration/compatibility. Два разных допустимых секрета не
аутентифицируются друг за друга; Unicode и legacy hashes покрыты явно.

### N27 · P2 · API runtime-boundary guard пропускает новые доменные endpoint factories

**Доказательство.** `scripts/check-api-runtime-boundaries.mjs:5–18` сканирует
только `*Api.ts` и declarations с ровно 8 пробелами. AutoCare 136 endpoint bodies
находятся в `src/entities/automotive-service/api/autocare/*.endpoints.ts`.
Настоящий checker сообщает 120 endpoints/12 modules. Negative fixture N27
с endpoint без transformResponse получает **PASS, 0 endpoints checked**.

**Последствия.** Зелёный contract не доказывает runtime validation AutoCare DTO.
Нынешние transforms могут быть корректными; finding касается отсутствия защиты.

**Исправление/приёмка.** Discovery от фактической registration/factory inventory,
AST или устойчивый parser; нулевой неожиданный coverage — fail. Удаление одного
реального доменного transformResponse обязано сделать guard красным.

### N28 · P2 · Недоступный sessionStorage прерывает auth cleanup

**Доказательство.** `auth-session-state.ts:47–60` читает/меняет storage без catch.
`baseApi.ts:184–192` вызывает markSessionExpired до clearAccessToken/CSRF/cache.
N28 исполняет исходный transpiled helper в VM: read/write/clear выбрасывают
ошибку denied storage. Полный browser denial flow не выполнялся.

**Последствия.** Завершение сессии может оставить клиентский token/cache и
некорректную навигацию при запрещённом хранилище. Серверная авторизация этим
не обходится.

**Исправление/приёмка.** Обязательная очистка in-memory identity выполняется
независимо от optional expiry hint; storage helpers fail safely. SecurityError
для get/set/remove не препятствует очистке и redirect.

### N29 · P3 · Refresh TTL configuration не описывает реальный срок всей сессии

**Доказательство.** `auth.service.ts:202–207`, `server/src/modules/oauth/oauth.service.ts:208–213` и
`auth-cookie.ts:7–17` фиксируют 7 дней, JWT refresh TTL берётся из configuration.
N29 с `jwtRefreshExpiresIn=1h`: JWT 3600 секунд, cookie 604800, DB expiry 7 дней.

**Последствия.** Настройка одного TTL не управляет всеми слоями; значение больше
7 дней ограничивается DB, меньше 7 дней оставляет более долгий cookie/session row.
Это несогласованный/неописанный configuration contract, не доказанный auth bypass.

**Исправление/приёмка.** Явно определить absolute/sliding session TTL и token TTL,
согласовать поля или документировать отдельные настройки; 1h/7d/30d дают
предсказуемые expire/refresh/cleanup результаты, включая OAuth.

### N30 · P2 · Первые 50 смет скрывают актуальную 51-ю версию

**Доказательство.** `request-read.service.ts:19–22` version ASC + take 50;
`request-response.ts:16` выводит latest status из history.at(-1).
`AutoCareRequestsPanel.tsx:134` выбирает тот же quote ID/version для решения.
N30: current snapshot содержит сумму 5100/version 51 pending, history оканчивается
version 50 superseded; DTO выдаёт свежую сумму со старым status.

**Последствия.** Исчезают accept/decline controls либо решение отправляется
по устаревшей версии. 51 версия — synthetic boundary, наличие в рабочей БД неизвестно.

**Исправление/приёмка.** Отдельный current quote и paginated history либо последние
50 с гарантированным current. На 51+ revisions UI и API используют одну pending
version; старое решение получает 409 без изменения новой.

### N31 · P2 · Два tooling test contracts устарели и отсутствуют в стандартной цепочке

**Доказательство.** Полный Node tooling запуск: 190 tests, 188 PASS, 2 FAIL.
`scripts/check-threat-surface.test.mjs:45` positive fixture не содержит нового
WebSocket connection-rate prehandler; настоящий checker PASS.
`scripts/check-mvp-readiness.test.mjs:44` positive deployment fixture неполна
для текущего production config contract. Root Vitest их не обнаруживает;
quality:backend вызывает checker, но не эти `.test.mjs`. Server test:tooling
покрывает только server/scripts.

**Последствия.** Устаревшие checker tests создают ложное впечатление покрытия,
поскольку main chain их не исполняет. Это не установленный runtime сбой продукта.

**Исправление/приёмка.** Актуализировать positive/negative fixtures и включить
root tooling inventory в обязательную автоматическую проверку. Полный suite
PASS; намеренное удаление required controls ловится fixture тестом.

### N32 · P2 · Уведомление о следующей смете подавляется idempotency key первой

**Доказательство.** `request-quote.service.ts:77` всегда event='estimate-shared';
`request-effects.service.ts:31` key=requestId/event/userId. Case N32 вызывает
реальный notify для двух разных смет: key одинаков, ON CONFLICT даёт одну запись.

**Последствия.** Клиент не получает событие о пересмотренной смете; idempotency
повторной доставки смешана с разными бизнес-событиями.

**Исправление/приёмка.** Включить quote ID/version в event identity. Retry одной
версии создаёт одно уведомление, две версии — два; transaction rollback не
отправляет недействующую смету.

### N33 · P3 · Parsing error API показывается как технический текст пользователю

**Доказательство.** Production real frontend с недоступным API показывает в
поиске, login-form-error и toast `SyntaxError: Unexpected token 'I', "Internal S"...
is not valid JSON`. `getApiErrorMessage.ts:166–172` возвращает raw transport/error
message; `QueryStateCard.tsx:67` использует его в UI. Case N33 подтверждает
такой же результат исходного helper для RTK PARSING_ERROR/500.

**Последствия.** Пользователь получает внутреннюю причину вместо понятного
сообщения и действия; выводится фрагмент upstream response. Секреты или XSS
в этом наблюдении не обнаружены.

**Исправление/приёмка.** Локализованный fallback для parsing/internal transport
failures; диагностический текст сохранять в согласованной telemetry. HTML/text
500 и malformed JSON на поиске/входе дают понятное сообщение и доступный retry.

### N34 · P3 · Client переход в AuthLayout оставляет метаданные предыдущего маршрута

**Доказательство.** Browser chain `/services` → footer «Мои бронирования» →
guest redirect `/login`: title остаётся «… | Поиск», canonical `/services?lang=ru`,
robots `index,follow,max-image-preview:large`. Reload `/login` возвращает canonical
`https://autocare-audit.example.test/login` и `noindex, follow`.
`PublicLayout.tsx:43` монтирует SeoHead, `AuthLayout.tsx` его не содержит;
`SeoHead.tsx:140` обновляет document head только пока он mounted.
Server metadata policy `src/app/metadata.ts:62–63` для login корректна.

**Последствия.** Client navigation и direct SSR дают разные title/canonical/robots;
пользователь и клиентские инструменты видят предыдущий маршрут. Доступ к
приватным данным этим не открывается; фактическая crawler индексация не проверена.

**Исправление/приёмка.** Route metadata lifecycle для всех layouts с общей
server/client policy. Public → auth и guest protected → login после hydration
дают те же canonical/robots, что direct visit, без потери provider-specific SEO.

## Расширенные существующие пункты

- **N22:** first response policy нужна также в `trust-score.service.ts:72–77`:
  любой sender != client считается ответом, без system/branch/time validation.
  Это влияет уже на публичный rating, а не только owner/admin аналитический экран.
- **N23:** `request-read.service.ts:46–61` читает весь client/owner список,
  фильтрует branch после SQL и выполняет `Promise.all(hydrateRequest)`;
  `:12–27` делает 5–6 запросов на заявку. Требуются SQL scope до limit, pagination
  и batch hydration. Фактическая нагрузочная деградация не измерялась.

## Порядок следующих исправлений

1. **U14/U15/U20:** storage privacy и согласованные права записи/защита security state.
2. **U18/U19:** целостность бонусов и защита рейтинга от повторных claims.
3. **U16/U17:** работающая moderation linkage и production onboarding команды.
4. **N24–N28/N30/N32:** гонки, worker coverage, пароль, cleanup, текущая смета и уведомления.
5. **N21–N23/N27/N31:** полнота агрегатов, bounded queries и доказуемое test coverage.
6. **N29/N33/N34:** configuration contract и ошибки/метаданные интерфейса.

U01/U02/U03 остаются самостоятельными ранее установленными production рисками.
Указанный порядок — backlog аудита; исправления требуют отдельной implementation
порции с проверкой каждого изменения.

## Границы первого прохода до runtime-продолжения

Снятые ограничения и оставшиеся внешние условия перечислены в актуальном
[runtime-отчёте](RUNTIME_VERIFICATION_2026-10-13.md). Следующие строки сохраняют
границы первоначального запуска, не переопределяют его последующее продолжение.

Docker daemon недоступен; локальный postgres server binary отсутствует.
Чужая developer DB не использовалась. Fresh migrations/restore, реальный
Redis coordination, PostgreSQL races/query plans и нагрузка не проверялись.
Synthetic proofs показывают конкретные ветви кода и контракты, но не частоту
дефектов, фактические потери или incidents на deployed окружении.

Нет нового evidence по внешнему KMS, privileged MFA rollout, production backup,
deployed proxy/TLS, hosted CI, native devices, screen readers или Core Web Vitals.
Старые PASS от 4 октября не выданы за текущие запуски. Аудит широкого scope
не доказывает отсутствие других ошибок во всех состояниях проекта.
