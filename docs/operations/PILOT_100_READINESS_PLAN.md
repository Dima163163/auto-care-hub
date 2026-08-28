# AutoCare Hub — план готовности к пилоту 100%

**Статус:** канонический release-план
**Обновлён:** 28 августа 2026 — тройная сверка кода, проверок и операционных документов
**Владелец плана:** команда AutoCare Hub
**Заменяет как go/no-go источник:** разрозненные статусы в `PROJECT_PLAN.md`. Исторические документы остаются доказательствами, но не меняют этот план.

Состояние фиксируется только после доказательства: команды, результата, даты, окружения и commit SHA. Формулировка «контракт есть» не равна «подтверждено на staging» и не может закрыть инфраструктурный или пилотный пункт.

## 0. Граница продукта зафиксирована

AutoCare Hub — бесплатная платформа поиска, сравнения и связи водителей с автосервисами.

- Клиент оплачивает ремонт **напрямую сервису** вне платформы.
- Платформа не принимает деньги, не удерживает комиссию, не проводит выплаты, не хранит платёжные данные и не является посредником расчёта.
- В MVP и пилоте нет Stripe, checkout, тарифов, подписок, платного продвижения, платного доступа, счетов, payout или subscription-промокодов.
- Скидка сервиса — это только предложение конкретного сервиса клиенту на следующую услугу; она не является деньгами платформы и не меняет цену уже подтверждённой записи.
- Исторические TypeORM-миграции с прежними названиями платежей сохраняются неизменными: это техническая история уже применённых БД, не runtime и не доступная функция.

## Статусы и правило изменения плана

- `[x]` — реализовано и есть проверка/доказательство.
- `[~]` — есть основа, но требуется проверка в реальном окружении или завершение сценария.
- `[ ]` — не закрыто.
- `[E]` — невозможно закрыть без инфраструктуры или участия владельца продукта.

Новая задача не изменяет разделы 1–3 молча:

- `ADD-Cxx` — критичная: блокирует безопасность, данные, запись или основной UI. Исправляется сразу, если ломает текущий продукт; иначе — до открытия пилота.
- `ADD-Nxx` — некритичная: не снижает безопасность и не блокирует закрытый пилот. Рассматривается после пилота.

### Иерархия источников и проверка противоречий

1. Этот файл — единственный источник статуса local MVP, пилота и go/no-go.
2. `PROJECT_PLAN.md` — исторический продуктовый roadmap; он не подтверждает release readiness.
3. Датированные evidence-документы — снимки конкретного запуска. Они могут подтверждать только указанную дату и окружение.
4. Если старый документ и этот план расходятся, приоритет у этого плана до появления нового воспроизводимого доказательства.
5. Immutable TypeORM-миграции не переписываются ради очистки терминов. Их наличие не означает доступность прежней функции.

## Текущая оценка после ревизии

| Контур | Оценка | Пояснение |
| --- | ---: | --- |
| Локальный MVP на mock/локальном API | **≈ 86%** | Основные пользовательские сценарии и Next.js shell есть; нужны финальные runtime проверки, auth и state matrix. |
| Техническая готовность к закрытому пилоту | **≈ 58%** | Кодовая основа есть, но не подключены обязательные production-подобные инфраструктурные контуры. |
| Защита и сохранность данных для пилота | **≈ 45%** | Авторизационная модель продвинута, но медиа-хранилище, AV, backup/restore, Redis rehearsal и независимый review не закрыты. |

Эти проценты не являются разрешением на публичный запуск. Разрешение определяется закрытием всех пунктов раздела 2 и `ADD-C`.

### Результат тройной сверки 27.08.2026

| Проход | Результат | Что это доказывает |
| --- | --- | --- |
| Инвентарь runtime | `check:next-runtime-boundary`, route inventory, route contract — PASS | Next.js является production boundary; документировано 56 маршрутов; сохранённые Vite-пакеты всё ещё имеют source references и требуют финальной классификации. |
| Контракты API | API contract, OpenAPI shape/structure и mock/API parity — PASS | 227 mock-маршрутов покрыты backend; contract checks не подтверждают авторизацию и конкуренцию на real PostgreSQL. |
| Legacy/scope | legacy cleanup, no-Bookly и legacy-provider runtime guards — PASS | Legacy provider runtime отсутствует; historical migrations сохранены. Платформенные subscription/commission/payout типы и тексты удалены из активного runtime в локальном наборе `ADD-C16`. |
| Production gates | `check:production-operations` — BLOCKED/MANUAL | Нет текущих production-like secrets, PostgreSQL/Redis/JWT, SMTP, S3/AV, bootstrap super-admin, Docker daemon и staging evidence. Это не ошибка проверки, а незакрытые внешние gates. |
| Security/SEO contracts | security headers и repository SEO/media budget — PASS | Структурные контракты существуют; production Lighthouse/Open Graph и staging security evidence всё ещё не подтверждены. |

---

# 1. Локальный MVP: mock API и локальный Next.js/Fastify/PostgreSQL

Цель: любой основной сценарий воспроизводим локально без белого экрана, потери введённых данных или обхода роли.

## 1.1 Runtime, маршруты и очистка наследия

- `[x]` Next.js является основным `dev`, `build` и `start` runtime.
- `[x]` Vite сохранён только как совместимый PWA/test runtime, а не production entrypoint.
- `[x]` Основные прямые URL, 404, protected redirect и динамические provider routes имеют Next route contract и smoke-тесты; 15/15 Next route smoke прошли 27.08.2026 на локальном Next release.
- `[x]` Удалены неиспользуемые legacy page families: home/cabinet/provider-owner legacy UI и скрытая `/pricing` страница.
- `[x]` Dev seed больше не создаёт legacy wellness-кабинеты, услуги и бронирования — только пользователей для AutoCare fixtures.
- `[x]` Platform payment/monetization routes, provider SDK, webhooks и UI entrypoints удалены; активные subscription/commission/payout типы и тексты очищены по `ADD-C16`. Сервисная скидка для решения конкретного отзыва сохранена как отдельная неплатформенная функция.
- `[x]` Полная таблица URL и владельцев runtime содержит 56 route constants; inventory и route contract прошли 27.08.2026.
- `[x]` Перепроверить каждый dynamic URL: provider, request, legacy redirect, owner provider/reviews — с mock API и с real API; real Chromium matrix закрыта в 20/20 тестах, визуальная приёмка остаётся отдельным gate.
- `[~]` `check:next-runtime-boundary` подтвердил Next.js production boundary и наличие source references у Vite-пакетов; финально классифицировать каждый reference как PWA/test либо удалить.
- `[ ]` Рефакторинг `demo:reset`: убрать оставшийся legacy fixture cleanup только после безопасного AutoCare reset сценария и real-DB smoke.
- `[ ]` Провести file-level legacy audit: удалить только файлы без import/runtime/docs replacement references; исторические migrations/evidence сначала перенести в архив или пометить как historical.

## 1.2 Основные сценарии клиента

- `[x]` Поиск, фильтры, карта, сортировка, сравнение и пустой результат города.
- `[x]` Страница сервиса: услуги, карта, галерея, отзывы, фото отзывов и placeholder.
- `[x]` Garage: марка, модель, год, госномер, VIN и внутренний номер; booking snapshot хранит исторические данные.
- `[x]` Заявка, quote, accept/decline и booking snapshot имеют API/mock контракты.
- `[x]` Отзывы: пустое состояние, один/много отзывов, фотографии и отдельная страница отзывов.
- `[~]` Реальный API: vehicleId в заявке, сохранение всех полей snapshot, удалённый автомобиль и недоступный сервис.
- `[~]` Реальный API: unavailable/removed provider подтверждён retry-состоянием; edit review, review photo и отдельное suspended evidence остаются.
- `[x]` Все публичные режимы связи сервиса подтверждены на mock и real API: online booking, request + callback и phone-only; seed-каталог содержит по одному провайдеру каждого режима.
- `[~]` Бонусы: UI списания, expiry, refund и история клиента.

## 1.3 Кабинеты и branch permissions

- `[x]` Client, owner, manager, staff, admin и super-admin роли существуют.
- `[x]` Owner видит все назначенные точки; scoped membership ограничивает staff/manager конкретными locationId в основных AutoCare service/request/review/chat paths.
- `[x]` Владелец может задать режим связи филиала: чат, телефон, callback, фото проблемы и response window.
- `[x]` Для маленького сервиса поддержан сценарий «заявка + звонок» без обязательства мгновенно отвечать в чате.
- `[~]` Exhaustive endpoint matrix: staff/manager A не получает B на requests, offers, reviews, chats, media, discounts, bonuses, analytics и capacity.
- `[~]` Полный owner onboarding/change-request workflow.
- `[~]` Calendar/work queue и capacity UI — базовые экраны есть, нужна сценарная проверка с ресурсами.
- `[~]` Evidence viewer, moderation queues и audit viewer — контракт/часть UI есть; mock Chromium smoke проверяет обязательную причину решения, а полный workflow и real/staging evidence остаются.
- `[~]` CRUD страна → город → зона и market policy в super-admin — UI/API foundation есть; mock Chromium smoke открывает редакторы страны, города и зоны, а сохранение и real/staging smoke остаются.

## 1.4 UI states, responsive, accessibility, locale

- `[x]` Header/footer и форма/карта там, где данные для них не нужны, отображаются сразу; Next boot-shell рендерит статические публичные ссылки и controls сразу, оставляя skeleton только для auth-аватара и серверных блоков.
- `[x]` Skeleton применяется к серверным блокам, имеет светлую/тёмную тему, и не должен заменять весь экран текстовым loader.
- `[x]` Есть базовые loading, empty, error, stale, retry, permission-denied и suspended контракты.
- `[~]` Пройти real API state matrix: offline, expired session, partial response, retry и повторная отправка в PostgreSQL. Offline/timeout retry теперь подтверждены реальным Chromium + PostgreSQL flow; ручная проверка устройства и staging evidence остаются.
- `[x]` Автоматическая Chromium matrix на 360, 390, 414, 540, 682, 768, 790, 1024, 1280 и 1440px: 30 route/width checks без horizontal overflow; header/footer/map/gallery и Escape в галерее проверены 27.08.2026.
- `[~]` Ручная визуальная приёмка форм, модалок и таблицы автомобилей на тех же ширинах остаётся перед пилотом.
- `[~]` Полный keyboard/Axe pass: automated public/workspace Tab order, Escape, listbox города, custom select и profile tabs покрыты; upload/form-errors и ручной проход устройств остаются.
- `[x]` Автоматически проверены все 20 зарегистрированных локалей, включая RU/EN/ES/RO, длинные города/услуги/языки и отсутствие overflow; ручная проверка plural/date/currency/timezone остаётся отдельным external gate.
- `[E]` VoiceOver/TalkBack и реальные телефоны требуют ручной проверки на устройствах.

## 1.5 Локальные quality gates

До отметки «локальный MVP готов» должны быть зелёными:

```bash
npm run lint -- --max-warnings=0
npm test
npm run build
npm --prefix server run build
npm run check:api-parity
npm run check:next-route-inventory
npm run check:legacy-cleanup
npm run check:no-bookly-runtime
npm run check:no-legacy-provider
npm run check:design-tokens
npm run check:interaction-contract
npm run check:responsive
npm run check:e2e:browser
```

Текущий локальный evidence от 28.08.2026: frontend lint/build и 109 файлов / 385 тестов; backend build, unit-suite 179 файлов / 550 тестов и полный backend suite 275 файлов / 781 тестов; API parity 227/227, route inventory 56, Next route smoke 15/15 и responsive matrix 30/30. Полный real API Chromium smoke 20/20 также проходит; staging и ручные проверки остаются отдельными gates.

Дополнительно обязательны локальные login smoke для **MSW** и **real API**. `CSRF_ORIGIN_MISMATCH` при корректной локальной конфигурации — `ADD-C01`.

## 1.6 Порядок закрытия local MVP

Это исполняемая очередь без инфраструктуры. Каждый пункт завершается отдельным evidence-запуском и не помечается автоматически из старого отчёта.

1. `[x]` Исправить `ADD-C01`: origins `localhost:4175` и `127.0.0.1:4175` добавлены только для non-production в `server/src/config/env.ts`, `.env.example` синхронизирован, а регрессионные tests подтверждают, что production не получает loopback origins (`39e7711` + follow-up test). Mock login/me/logout smoke **1/1** и real API login/logout/session-expiry smoke внутри полного real suite **20/20** подтверждены 28.08.2026; production origin policy не ослаблена.
2. `[x]` Пройти dynamic URL matrix для provider, request, legacy redirect, owner provider/reviews через mock и real API. Mock/Next route smoke, route inventory (56 constants), route contract и API parity проходят; real API public/client/owner/staff/admin/super-admin matrix и варианты public provider/request URL закрыты в полном Chromium smoke **20/20**. Все семь legacy-алиасов проверяются HTTP smoke, а hydrated redirect evidence для public/owner/admin legacy routes — **3/3** (14 URL-вариантов); ручная визуальная проверка остаётся отдельным gate.
3. `[~]` Пройти state matrix на real PostgreSQL: локальные миграции, `demo:reset`, `demo:seed`, `autocare:seed` и `/health/live` проходят; loading, empty, API error, stale, offline, expired session, partial response, permission denied, suspended и безопасное сохранение незавершённых полей подтверждаются по частям. Полный real-API Chromium smoke **20/20** подтвердил public/client/owner/staff/admin/super-admin shell и injected error/offline/stale/permission/suspended/expired/partial states; duplicate-click idempotency в PostgreSQL подтверждена отдельным browser flow (оба ответа `200`, один ID, одна persisted-запись), mock и real offline/timeout retry также подтверждены; staging evidence и ручная проверка устройств остаются.
4. `[~]` Закрыть весь client path: vehicleId/snapshot и три communication modes покрыты unit/schema tests и mock/real Chromium evidence; unavailable/removed provider подтверждён real retry-state, edit review и bonuses redemption/expiry/refund/history остаются для полного маршрута.
5. `[~]` Закрыть owner/admin/super-admin local workflows: mock Chromium smoke добавляет coverage onboarding/change request, branch scope controls, evidence/moderation decision reason и editors countries/cities/zones; остаются execution smoke, submit/decision assertions, capacity/calendar/work queue, exhaustive permissions и real/staging API.
6. `[~]` Завершить route-wide loading audit: shared search form/theme bootstrap и themed skeleton-поведение зафиксированы в `70532d2`, focused loading tests проходят; boot-shell test подтверждает статическую навигацию без skeleton; ни на одном маршруте не должно быть white screen или полноэкранного text loader — route-wide evidence ещё не собрано.
7. `[~]` Выполнить supported-width visual/interaction matrix и устранить все блокирующие overlap/focus/modal/dropdown дефекты. Automated Chromium matrix **30/30** (360–1440px) прошла без overflow и с корректной mobile navigation; ручная visual- и device-проверка остаётся.
8. `[~]` Выполнить keyboard/Axe/localization matrix RU/EN/ES/RO; automated public/workspace keyboard, Axe, city listbox, 20 locales и ES/RO mobile matrix проходят. Upload/form errors и ручные VoiceOver/device checks остаются. Semantic design-token contract теперь также проходит, включая светлую/тёмную поверхность floating-label.
9. `[~]` Выполнить полный local quality gate из §1.5 одним воспроизводимым запуском; frontend 109 files/385 tests, backend unit 179 files/550 tests, builds, API parity, route/legacy/security checks проходят. Combined real-API gate **20/20** пройден 28.08.2026; единый redacted evidence с итоговым commit SHA ещё не сохранён.
10. `[~]` Провести финальный legacy scope pass: классифицировать каждый Vite/legacy file; активные legacy financial/monetization strings and types удалены из runtime по `ADD-C16`; остаётся file-level классификация и безопасное удаление неиспользуемых legacy-файлов.

### Результат первой исполняемой порции (27.08.2026)

- `[x]` Локальный CORS allow-list для Next release-порта 4175 добавлен в non-production конфигурацию; production-ветка по-прежнему принимает только явно заданные origins.
- `[x]` Проверены сборка сервера (`npm --prefix server run build`), TypeScript (`npx tsc --noEmit`) и unit-suite сервера: **179 файлов / 549 тестов**.
- `[x]` Повторно подтверждены route inventory, route contract, API parity, security headers, legacy cleanup, no-Bookly и repository SEO/performance checks.
- `[~]` Фактический login smoke через запущенные PostgreSQL/API и браузерный MSW не закрыт: на момент порции API на `127.0.0.1:4000` и Next на `127.0.0.1:4175` не были запущены одновременно.
- `[~]` Поэтому первая порция не объявляет локальный MVP готовым: остаются real API state matrix, dynamic URL matrix и финальная классификация legacy/Vite.

### Результат второй исполняемой порции (27.08.2026)

- `[x]` Добавлен regression-тест CORS-политики: development/test принимают локальные Next origins `localhost:4175` и `127.0.0.1:4175`, production принимает только явно заданные HTTPS origins.
- `[x]` Повторно пройдены server build, TypeScript, lint и server unit-suite: **179 файлов / 549 тестов**.
- `[x]` Next route smoke на локальном release-сервере: **15/15** (публичные, динамические, 404, hydration/reload и protected redirect на desktop/mobile/tablet).
- `[x]` Responsive Chromium matrix: **30/30** на ширинах 360–1440 px; проверка overflow и mobile navigation не выявила ошибок.
- `[x]` Повторяемый real prerequisite проверен: `demo:reset` → `demo:seed` → `autocare:seed` проходят, включая очистку новых AutoCare request/message/attachment/report/appeal зависимостей без ослабления production `RESTRICT`-связей; `/health/live` отвечает `ok`, demo login возвращает 200.
- `[~]` Полная real API state matrix, ручные device/VoiceOver-проверки, production-инфраструктура и legacy monetization cleanup остаются незакрытыми.

### Результат третьей исполняемой порции (28.08.2026)

- `[x]` Real-API browser smoke запускается параллельно с интерактивным mock Next runtime через изолированный `NEXT_DIST_DIR=.next-real-e2e`; runner восстанавливает `next-env.d.ts` и удаляет только свой generated dist directory.
- `[x]` Локальные PostgreSQL и Redis подтверждены real-API browser smoke: health/market/discovery без MSW, контракт selected market и boundary истёкшей сессии. Отдельные smoke для direct client vehicle + request и owner provider + reviews routes также проходят 28.08.2026.
- `[x]` Базовые route smoke в mock shell повторно прошли: **15/15** на desktop, mobile и tablet для public, dynamic, 404, reload/hydration и protected redirect.
- `[x]` Единый floating-field pattern поддерживает `floatLabelWhenEmpty` и для text input: во вкладке «По автосервису» подпись фиксируется над рамкой, а внутри остаётся читаемая подсказка; focused Vitest: **8/8**.
- `[~]` Полная real API state matrix с fault injection и сценарии изменения данных остаются в очереди §1.6; конкретные smoke owner provider/reviews URL закрыты выше.

### Результат четвёртой исполняемой порции (28.08.2026)

- `[x]` Real-API Chromium smoke подтверждает доступ admin и super-admin к их рабочим пространствам через локальные Fastify/PostgreSQL/Redis: **2/2**.
- `[x]` Добавлены role-regressions: client перенаправляется из `/admin/dashboard` в свой кабинет; branch-scoped staff получает owner workspace, но перенаправляется из admin. Real Chromium: **2/2**.
- `[x]` Generated каталоги из изолированных real-Next запусков исключены из ESLint и Git через `.next-real-*`, поэтому они не создают ложные ошибки lint и не могут попасть в коммит.
- `[~]` Fault injection для offline/error/stale/partial response, сохранение незавершённых форм и real PostgreSQL retry/idempotency остаются следующей частью state matrix.

### Результат пятой исполняемой порции (28.08.2026)

- `[x]` Fault injection на реальном API shell покрывает endpoint клиентских заявок: `500 error`, `offline`, `403 permission-denied` и `423 suspended`. Каждый сценарий сохраняет header/footer и `<main>`, показывает доступное состояние ошибки; Chromium: **4/4**.
- `[x]` Добавлен единый тестовый helper для контролируемого отказа `/api/v1/service-requests/my`; он не меняет PostgreSQL-данные и остаётся применимым при real-API режиме.
- `[~]` Stale/partial response, session-expiry после действующей сессии, сохранение введённой формы и real PostgreSQL retry/idempotency остаются в следующей порции.

### Результат шестой исполняемой порции (28.08.2026)

- `[x]` Real discovery partial response проверен: ответ discovery содержит реальные карточки сервисов и `partial: true`; UI оставляет карточки видимыми и показывает non-blocking состояние `data-state="partial"`. Chromium: **1/1**.
- `[x]` Истечение уже активной сессии проверено отдельно: после client login инъецированный terminal `401 SESSION_EXPIRED` для `/api/auth/me` и `/api/auth/refresh` не показывает защищённую страницу, а переводит на `/login?reason=session-expired`. Chromium: **1/1**.
- `[~]` Stale response после успешного cache-fill и сохранение текстовых полей формы при сбое остаются отдельной задачей. У helper `useFormDraft` есть размерный лимит и защита от невалидных данных, но формы создания сервиса требуют controlled migration без сохранения файлов.

### Результат седьмой исполняемой порции (28.08.2026)

- `[x]` Real-API fault injection для `503 STALE_DATA` в панели клиентских заявок подтверждает, что shell остаётся доступным и пользователь видит announced stale-state вместо white screen; Chromium: **1/1**.
- `[x]` Форма добавления автомобиля владельца сохраняет только безопасный allow-list черновика: марку, модель и год. Госномер, внутренний номер и VIN намеренно не пишутся в browser storage; восстановленный черновик можно отбросить, а после успешного создания он очищается.
- `[~]` Для закрытия state matrix остаются stale response после реального cache-fill, controlled draft для форм без файлов и PostgreSQL retry/idempotency после фактической сетевой ошибки.

### Результат восьмой исполняемой порции (28.08.2026)

- `[x]` RTK Query browser listeners подключены централизованно: `refetchOnFocus` и `refetchOnReconnect` у разговора по заявке теперь фактически работают, а не остаются декларативной настройкой.
- `[x]` Vehicle booking snapshot вынесен в pure-функцию и покрыт тестами: сохраняются марка, модель, год, топливо, двигатель, цвет, госномер, внутренний номер и VIN; неполный/удалённый автомобиль не формирует snapshot.
- `[x]` Safety allow-list черновика автомобиля покрыт отдельно: в browser storage не могут попасть госномер, внутренний номер или VIN. Focused Vitest: **7/7**; lint, TypeScript и production Next build проходят.
- `[~]` Для закрытия state matrix остаются real stale после cache-fill, controlled draft для иных форм без файлов и PostgreSQL retry/idempotency после фактической сетевой ошибки.

### Результат девятой исполняемой порции (28.08.2026)

- `[x]` PostgreSQL integration matrix подтверждает повторную идемпотентную заявку без дубля, capacity филиала и специалиста, serializable reschedule, quote expiry/requote/repeated accept/race, перенос принятой сметы, retry отмены и race `no-show`/`complete`: server Vitest **18/18**.
- `[x]` Три режима связи сервиса подтверждены на schema/UI уровне: `online`, `request_then_confirm` и `phone_only`; малый сервис без чата не обязан обещать время ответа, а phone-only требует телефонной записи. Frontend Vitest: **3/3**.
- `[~]` Для полного client path остаются browser evidence удалённого автомобиля/сервиса, редактирование отзыва и весь UI-flow бонусов; real stale после cache-fill также остаётся отдельно.

### Результат десятой исполняемой порции (28.08.2026)

- `[x]` Mock E2E получил изолированный runner с собственным `.next-mock-e2e`: он не конкурирует с открытым интерактивным Next-сервером, восстанавливает generated `next-env.d.ts` и удаляет только свой build output.
- `[x]` Chromium smoke галереи сервиса и comparison table прошёл в этом изолированном режиме; Playwright report: `passed`.
- `[~]` Полная matrix public/client E2E запускается небольшими группами из-за ограничения длительности внешней среды; это не меняет продуктовый runtime и не блокирует локальную работу пользователя.

### Результат одиннадцатой исполняемой порции (28.08.2026)

- `[x]` Automated Chromium public keyboard audit прошёл **1/1** для home, discovery и provider routes; статичный dashboard preview не ошибочно считается интерактивной формой.
- `[x]` Axe, discovery filters/sort и city listbox (Arrow/Home/End/Escape) прошли **3/3**.
- `[x]` Все 20 зарегистрированных локалей прошли **1/1**: `html[lang]`, отсутствие missing translation keys и horizontal overflow; ES/RO long-label mobile smoke — **1/1**.
- `[x]` Полный responsive matrix повторно прошёл **30/30** на 360, 390, 414, 540, 682, 768, 790, 1024, 1280 и 1440px без overflow.
- `[~]` В этой порции изменён только release-аудит: тест не требует больше трёх tabbable элементов от статичного landing preview и ждёт lazy locale hydration. Реальные устройства, VoiceOver/TalkBack и upload/form-error остаются ручными/следующими проверками.
- `[x]` Workspace keyboard smoke прошёл **1/1** для owner/client/admin/super-admin маршрутов; profile communication, tabs, privacy и notification controls дополнительно прошли **5/5**.

### Результат двенадцатой исполняемой порции (28.08.2026)

- `[x]` Real-API Chromium smoke после чистого `demo:reset` → `demo:seed` → `autocare:seed` прошёл **16/16** за 54.7s на PostgreSQL/Redis без MSW: health/markets/discovery, partial discovery, client cabinet/dynamic request, client→admin redirect, injected error/offline/stale/permission-denied/suspended, expired session, owner provider/reviews, branch-scoped staff, admin и super-admin workspaces.
- `[x]` Целевой повтор admin/super-admin login прошёл **2/2**. В тестовый helper добавлено уважение `Retry-After` при легитимном `429`, production login rate limit не изменён и не ослаблен.
- `[~]` Остались отдельные gates: полный dynamic URL/legacy redirect inventory, PostgreSQL duplicate-click/offline replay idempotency, stale после cache-fill, ручная device/VoiceOver-проверка и production infrastructure.

### Результат тринадцатой исполняемой порции (28.08.2026)

- `[x]` Real API public route variants прошли Chromium: provider profile, trailing slash, request, request trailing slash и request с query-параметром услуги — **5/5** в одном smoke-тесте.
- `[x]` Повторная заявка в реальном PostgreSQL проверена через браузерный API flow без параллельной ротации UI-сессии: одинаковый `Idempotency-Key` дал `200/200`, один и тот же request ID и ровно одну запись в `/v1/service-requests/my`.
- `[x]` Полный real-API набор после добавления тестов прошёл **18/18** за 1.5 минуты: seed/reset, health, markets, discovery, public/client/owner/staff/admin/super-admin routes и fault-injection states.
- `[~]` В local state matrix остаются offline replay/timeout retry для создания заявки, stale после cache-fill, полный dynamic/legacy inventory и ручные проверки устройств/VoiceOver; production infrastructure gates не менялись.

### Результат четырнадцатой исполняемой порции (28.08.2026)

- `[x]` Mock state-test проверяет stale-after-cache-fill: первая выдача discovery заполняет кэш, повторный поиск получает `STALE_DATA`, сохранённые карточки остаются видимыми, а предупреждение имеет `data-state="stale-error"` и доступный alert-контент.
- `[x]` Полный public/client state-suite повторно прошёл Chromium **13/13** (gallery, comparison, review fixtures, removed provider, garage/attachments, five recoverable states, stale cache-fill и mobile); для холодной компиляции динамического provider route увеличен timeout только у двухмаршрутного теста, глобальные таймауты не изменены.
- `[x]` Production `next build --webpack` после изменений прошёл: TypeScript, статические страницы и динамический `/services/[providerId]` сгенерированы без ошибок.
- `[~]` Offline replay/timeout retry для создания заявки, полный dynamic/legacy inventory и ручные device/VoiceOver проверки остаются отдельными gates.

### Результат пятнадцатой исполняемой порции (28.08.2026)

- `[x]` В форме заявки после сетевой ошибки сохраняются введённые данные и исходный `Idempotency-Key`; кнопка меняется на «Повторить» и снова становится доступной после завершения неудачной попытки.
- `[x]` Mock Chromium smoke подтвердил восстановление после двух контролируемых сбоев отправки — `offline` и `timeout`: повторная отправка завершается созданием заявки без потери формы или создания нового ключа; **2/2**.
- `[x]` Повторная targeted-проверка запускается в изолированном Next dist без изменения production runtime; временный `.next-retry-e2e-2` каталог удаляется после прогона.
- `[~]` Реальное восстановление после сетевого сбоя в PostgreSQL, полный dynamic/legacy inventory и ручные device/VoiceOver проверки остаются отдельными gates.

### Результат шестнадцатой исполняемой порции (28.08.2026)

- `[x]` Расширен Next dynamic-route smoke: provider/request варианты с terminal slash и query, legacy cabinet/provider edit варианты и owner provider/reviews варианты — HTTP 200 + HTML **14/14**.
- `[x]` Добавлена гидратированная проверка всех legacy redirect-алиасов: public `/cabinets` и `/cabinets/:id`, owner `/owner/cabinets`, `/owner/cabinets/create`, `/owner/cabinets/:id/edit`, `/owner/bookings`, admin `/admin/cabinets`; Chromium подтвердил целевые URL для гостя, owner и super-admin — **3/3 сценария, 14 URL-вариантов**.
- `[x]` Next route smoke на локальном Chromium прошёл **7/7**; lint, TypeScript и `git diff --check` остаются зелёными после изменений.
- `[~]` Dynamic/legacy redirects на реальном API и ручные проверки устройств/VoiceOver по-прежнему требуют отдельного staging/production evidence.

### Результат семнадцатой исполняемой порции (28.08.2026)

- `[x]` Реальная форма заявки восстановилась после контролируемого `offline` сбоя: введённые контакты и тот же `Idempotency-Key` сохранились, повторный POST завершился успешно; Chromium + локальный Fastify/PostgreSQL: **1/1**.
- `[x]` Реальная форма заявки восстановилась после `timeout` сбоя: повторная отправка на завтрашний доступный слот завершилась успешно без дублирования; Chromium + локальный Fastify/PostgreSQL: **1/1**.
- `[x]` Исправлена причина ложного 409 при повторе: сравнение JSONB-снимков заявки стало каноническим и не зависит от порядка ключей; backend capacity integration с переставленными ключами: **11/11**.
- `[~]` Полное state-matrix на staging, ручные real-device/VoiceOver проверки и production infrastructure gates остаются незакрытыми.

### Результат восемнадцатой исполняемой порции (28.08.2026)

- `[x]` Real discovery stale-after-cache-fill проверен: первая выдача получает реальные карточки, повторный запрос получает контролируемый `503 STALE_DATA`, сохранённые карточки остаются видимыми и показывается доступное stale-состояние; Chromium + локальный Fastify/PostgreSQL: **1/1**.
- `[x]` Полный real-API smoke после добавления retry и stale сценариев прошёл **21/21**: health/markets/discovery, partial/stale, client/owner/staff/admin/super-admin routes, session expiry, fault states и offline/timeout recovery.
- `[x]` Для защиты от ложных конфликтов идемпотентности добавлен regression на переставленный порядок ключей JSONB-контакта; backend capacity integration: **11/11**.
- `[~]` Staging state matrix, ручные real-device/VoiceOver проверки и production infrastructure gates остаются незакрытыми.

### Результат девятнадцатой исполняемой порции (28.08.2026)

- `[x]` Mock auth boundary закрыт: login → `/auth/me` → logout → повторный `/auth/me` (200 → 200 → 200 → 401), затем защищённая навигация возвращает на login; Chromium **1/1**.
- `[x]` Real auth boundary закрыт: login, CSRF-защищённый logout, проверка 401 после logout и защищённая навигация; полный real API Chromium smoke **20/20**.
- `[x]` Real dynamic/legacy маршрутный контур закрыт автоматикой: public provider/request, owner provider/reviews, public/owner/admin legacy redirects; **20/20** real tests и **14** legacy URL-вариантов.
- `[x]` Все локальные quality checks этой порции зелёные: frontend Vitest **109 файлов / 384 теста**, backend unit **179 файлов / 549 тестов**, TypeScript, lint, Next/backend build, API parity, route inventory/contract, security headers, interaction/PWA/runtime-boundary, SEO/performance и legacy/no-Bookly guards.
- `[x]` State-matrix тесты объединены в один последовательный real-контур для клиента: это сохраняет все проверки `error/offline/permission-denied/stale/suspended`, но не провоцирует искусственное превышение login rate limit; серверная политика лимита не изменена.
- `[~]` Остаются staging/production evidence, ручные real-device/VoiceOver проверки, route-wide loading audit и инфраструктурные gates; они не закрываются локальным запуском.

### Результат двадцатой исполняемой порции (28.08.2026)

- `[x]` Реальные communication modes закрыты: idempotent seed выставляет `ProService=online`, `AutoLux=request_then_confirm`, `Formula Motion=phone_only`, включая телефоны, callback/chat и response-window поля; read-only API проверил три режима после seed.
- `[x]` Mock и real Chromium подтвердили публичную поверхность каждого режима: online показывает календарь записи, request + callback показывает заявку и звонок без онлайн-слотов, phone-only показывает телефонную запись и не показывает заявку/чат; mock **1/1**, real **1/1**.
- `[x]` Реальный недоступный/удалённый provider route подтверждён: валидный отсутствующий UUID отдаёт recoverable error с кнопкой retry; real Chromium **1/1**.
- `[x]` Добавлен catalog regression: mock seed содержит все три режима, phone-only без чата с обязательной телефонной записью и валидным телефоном; server catalog test включён в общий backend unit gate.
- `[~]` Остаются edit review/review photo/suspended отдельные real evidence, бонусные redemption/expiry/refund/history, staging/production инфраструктура и ручные device/VoiceOver проверки.

### Результат двадцать первой исполняемой порции (28.08.2026)

- `[x]` Полный mock public/client state suite после добавления communication modes прошёл **16/16**; проверены публичная запись, пустые/ошибочные состояния, отзывы, гараж, вложения, бонусы и режимы связи.
- `[x]` Изолированная real-проверка режимов связи и удалённого сервиса прошла **2/2**; отдельный staff branch-scope rerun и idempotency rerun прошли **1/1** каждый.
- `[x]` Полный backend unit gate после расширения mock-каталога: **179 файлов / 550 тестов**; backend build, TypeScript, lint и `git diff --check` зелёные.
- `[x]` Refresh в real idempotency smoke ограничен bounded retry только для `429` и `Retry-After`; production rate-limit/CSRF политика не ослаблялась.
- `[~]` Полный real-suite при длинном последовательном запуске дал **21/22**: единственный сбой — session-expired на staff branch-scope тесте; изолированный повтор прошёл **1/1**. Это остаётся тестовой стабильностью/инфраструктурной задачей, а не основанием переводить авторизацию в `[x]`.

### Результат двадцать второй исполняемой порции (28.08.2026)

- `[~]` Добавлен mock Chromium smoke owner-поверхности: onboarding/change-request форма, добавление private-документа в evidence payload, команда филиала, communication switches и быстрый доступ к режимам связи.
- `[~]` Добавлен mock Chromium smoke admin-поверхности: очередь moderation evidence отображается, решение без причины блокируется, после заполнения причины решение помечается сохранённым.
- `[~]` Добавлен mock Chromium smoke super-admin-поверхности: открываются редакторы страны, города и зоны без изменения frontend-кода; проверены соответствующие формы и действия создания.
- `[x]` В server unit gate учтён расширенный mock-каталог: **179 файлов / 550 тестов**; TypeScript, lint и `git diff --check` проходят.
- `[x]` Next boot-shell loading regression подтверждён focused frontend suite **12/12**: public navigation links are rendered immediately, service filters stay disabled but visible, remote result blocks keep themed skeletons, and the map remains a single shimmer surface.
- `[~]` Chromium-запуск новых трёх workflow-тестов в этой среде не выполнен: дополнительный запуск отклонён лимитом окружения. Playwright перечисляет **45 test cases** с тремя проектами; execution остаётся следующим локальным gate. Real API submit/decision и staging evidence также остаются.

### Результат двадцать третьей исполняемой порции (28.08.2026)

- `[x]` Исправлен semantic design-token gate: парсер корректно учитывает объединённый selector `.dark, :root[data-theme="dark"]`, поэтому все 15 семантических ролей проверяются и для светлой, и для тёмной темы.
- `[x]` Floating-label больше не использует raw цвета: светлая тема применяет `bg-background`, тёмная — `bg-hero-overlay` и `text-primary-foreground`; это сохраняет читаемость и исключает светлый фон/вспышку в тёмной теме.
- `[x]` FloatingField regression suite **8/8**, полный frontend suite **109 файлов / 385 тестов**, design-token contract **15/15 semantic roles + 26 foundation tokens**, interaction contract **13 invariants**.
- `[x]` Next build, TypeScript, ESLint и `git diff --check` проходят; SEO/performance/bundle-splitting/Next runtime boundary/legacy guards также зелёные.
- `[~]` Полный responsive browser script в этой среде не стартовал: установленный Chrome завершился с `SIGABRT`/`EPERM` до первого теста. Ранее сохранённое Chromium evidence **30/30** остаётся валидным; повторный запуск и ручная проверка устройств требуют рабочей browser-среды.

### Результат двадцать четвёртой исполняемой порции (28.08.2026)

- `[x]` API/OpenAPI/security/PWA/runtime-boundary contracts прошли: API contract **18 backend + 8 mock paths**, OpenAPI shape **20 operations**, OpenAPI structure **21 operations**, security headers, PWA update и runtime boundary **237 endpoints / 12 modules**.
- `[x]` Next route inventory **56 constants**, ops harness **4 files**, migration order/inventory **123 files**, legacy cleanup и Bookly/payment runtime guards проходят; production operations tests **6/6** также зелёные.
- `[x]` Production SEO/repository budgets проходят: JS **3915.9 kB**, CSS **173.2 kB**, public images **6.37 MB**, map asset **245 kB**; динамические provider routes настроены для prerender/ISR.
- `[~]` `check:production-operations` корректно блокирует локальный запуск без production-like PostgreSQL/Redis/JWT/SMTP/storage/super-admin/Docker и отмечает ручные staging rehearsal gates; секреты в выводе не раскрываются.
- `[~]` Responsive browser script снова не стартовал из-за `SIGABRT` установленного Chrome до первого теста; кодовые и ранее подтверждённые **30/30** проверки не изменены. Нужна рабочая browser-среда для нового execution evidence.

---

# 2. Готовность закрытого пилота

Цель: продукт можно показать реальным сервисам без риска потерять данные, раскрыть вложения или записать двух клиентов в один подтверждённый слот.

## 2.1 Обязательная инфраструктура

- `[E]` Изолированные staging PostgreSQL, Redis и JWT/session secrets.
- `[E]` S3-compatible **private** durable object storage.
- `[E]` ClamAV или одобренный malware scanner, quarantine и monitoring.
- `[E]` SMTP/email provider, sender domain и tested reminder outbox.
- `[E]` bootstrap super-admin без захардкоженного production password.
- `[E]` HTTPS staging API URL, CORS/origin allow-list и секреты вне репозитория.
- `[E]` Alerts/incident channel, encrypted backups, documented RPO/RTO и restore rehearsal.
- `[E]` Worker/reminder-outbox/dead-letter + Redis/WebSocket multi-process smoke.
- `[E]` Rollback rehearsal и staging API compatibility check на каждом release candidate.

## 2.2 Медиа и персональные данные

- `[~]` Ограничение размера/MIME и базовая авторизация вложений есть.
- `[ ]` Private object storage adapter в фактическом staging окружении.
- `[ ]` Quarantine → decode/re-encode → EXIF strip → AV scan → Ready workflow.
- `[ ]` Ограничения pixel/animation/decompression bomb и quota race tests.
- `[ ]` Короткоживущие signed URLs с проверкой membership/location/subject.
- `[ ]` Retention/delete jobs: review/gallery/chat/request media и account deletion.
- `[ ]` Реальное доказательство: пользователь A не получает media B по ID, после удаления аккаунта объект удалён/не читается.

## 2.3 Надёжность записи и quote

- `[x]` Branch capacity и базовые PostgreSQL race tests для слотов существуют.
- `[~]` Quote version history и price snapshot существуют.
- `[ ]` Полная multi-actor concurrency matrix: create, accept quote, reschedule, cancel, no-show, complete и retry.
- `[ ]` Quote expiry, repeated accept, reschedule after accepted quote и stale version handling.
- `[ ]` Подтверждённый capacity policy: branch capacity обязательно; specialists/bays only if a service enables them.
- `[~]` Проверить idempotency с real PostgreSQL при duplicate click, offline replay и timeout retry: duplicate click подтверждён browser evidence (один ID/одна запись), mock и real offline/timeout retry подтверждены сохранением исходного ключа и успешной второй отправкой; staging multi-client replay и ручная проверка остаются.

## 2.4 Discovery, map and trust

- `[x]` Keyset pagination, filters, multi-brand, duplicate protection и synthetic local benchmark foundation.
- `[~]` Trust score учитывает visits, reviews, cancellation/no-show и response signals.
- `[ ]` Production-like benchmark: concurrent traffic, p95/p99, 10k/100k providers, wide radius and statement timeout.
- `[ ]` Compare current SQL with PostGIS/GiST; choose one by measured evidence, not assumption.
- `[ ]` Discovery IP/route rate limit, cache policy and fail-closed behaviour confirmed in staging.
- `[ ]` Trust snapshots after actual completed visit, badge removal/recovery, appeals and evidence moderation.
- `[E]` Supply-density validation requires selected pilot market and real provider addresses.

## 2.5 Pilot people and scenarios

- `[E]` Two real services: one small owner-master, one multi-staff or multi-branch service.
- `[E]` Five to ten pilot clients, real cars and consented contact data.
- `[E]` Each service fills profile, contacts, schedule, offers, prices, photos, connection mode and staff scopes.
- `[E]` Run search → request → quote → confirm → reschedule/cancel/no-show → complete → review/photo → bonus → complaint/support.
- `[E]` Collect response time, confirmation/cancel/no-show/duplicate rate, upload/mail errors, trust outcomes and complaint resolution time.
- `[E]` Pilot has no unresolved P0/P1 issue and has a recorded go/no-go decision.

### Результат пятой исполняемой порции (28.08.2026)

- `[x]` Центральная branch-scoped policy больше не смешивает роли между филиалами: назначение `manager` на филиал B не даёт manager-права на филиал A, где у пользователя только `staff`; provider-wide manager и direct owner сохраняют доступ ко всем филиалам. Focused provider-access suite: **10/10**.
- `[x]` Mock/API parity выровнен для owner analytics, reviews и aggregate owner provider list: requests, reviews, бонусная liability и tracking-метрики фильтруются по назначенной location; resource/reservation/offer mutations проверяют фактический филиал ресурса или предложения.
- `[x]` TypeScript, frontend tests **109 файлов / 385 тестов**, lint, server build и `git diff --check` проходят.
- `[x]` Полный backend suite после фикса завершён: **275 файлов / 781 тест**, duration **147.85 s**; миграционный bootstrap и database-backed тесты завершились успешно.
- `[~]` Полная интегрированная матрица всех endpoint-категорий для staff/manager (requests, offers, reviews, chats, media, discounts, bonuses, analytics и capacity) и staging-доказательства остаются частью `ADD-C06`; центральная политика и mock parity закрыты, но endpoint-by-endpoint proof ещё не собран.

### Результат шестой исполняемой порции (28.08.2026)

- `[x]` Bonus-операции переведены на явную проверку workspace permission `bonuses`: чтение программы и liability, изменение программы и ручная выдача теперь доступны только владельцу с provider-wide scope; manager/staff не получают бонусные полномочия через общий доступ к сервису.
- `[x]` Для транзакционных изменений добавлен manager-aware permission boundary, чтобы проверка роли выполнялась тем же `EntityManager`, что и изменение данных, без обхода через отдельное соединение.
- `[x]` Регрессии branch-role и бонусов подтверждены: provider-access **10/10**, bonus service/integration **10/10**; полный backend suite после фикса — **275 файлов / 781 тест**, exit code **0**.
- `[~]` Полная endpoint-матрица branch scope для остальных чувствительных категорий (requests, offers, reviews, chats, media, discounts, analytics и capacity), staging evidence и production rehearsal остаются в `ADD-C06` и security-разделе.

### Результат седьмой исполняемой порции (28.08.2026)

- `[x]` Создание скидки по отзыву теперь требует `reviews` permission и проверяет `locationId` связанной заявки; staff без права отзывов не может выдать promo через прямой API-вызов.
- `[x]` Appeals используют профильное разрешение: appeal отзыва проверяется по филиалу заявки, а provider/suspension/catalog appeal требует provider-wide `profile` scope; общий membership-доступ больше не является достаточным условием.
- `[x]` Проверки после изменений: provider-access **10/10**, bonus service **8/8**, autocare routes **9/9**, marketplace **3/3**, server build, TypeScript, lint и `git diff --check` — успешно. В route integration-логе зафиксирован transient `Connection terminated` при записи security event после завершения assertion; exit code теста **0**, повторный полный suite требуется в стабильном DB-окружении.
- `[~]` Endpoint-by-endpoint branch matrix для всех остальных request/offer/chat/media/discount/analytics/capacity путей и staging доказательства остаются незакрытыми; это следующий security gate, а не основание ослаблять permissions.

### Результат двадцать пятой исполняемой порции (28.08.2026)

- `[x]` Запрос на добавление provider-specific услуги в общий каталог больше не принимает любой активный membership: backend требует явное workspace-разрешение `catalog`, а staff без него получает `403`. Mock handler синхронизирован с этим контрактом.
- `[x]` Добавлены provider-access регрессии для permission-scoped aggregate views: пользователь с `staff` в филиале A и `manager` в филиале B получает `reviews`/`analytics` только по B; provider-wide назначение остаётся широким. Это предотвращает расширение роли после объединения branch assignments.
- `[x]` Проверки порции: catalog-gap/provider-access **13/13**, полный backend suite **276 файлов / 784 теста**, server build, TypeScript, lint и `git diff --check` — успешно.
- `[~]` Полная endpoint-by-endpoint матрица для всех чувствительных request/offer/chat/media/discount/analytics/capacity путей и staging evidence остаются незакрытыми; ручные device/VoiceOver и production infrastructure gates не изменились.

### Результат двадцать шестой исполняемой порции (28.08.2026)

- `[x]` Platform reviews получили отдельную защиту от abuse: user-scoped rate limit `platform-review:create` (5 запросов/час), в отличие от общих mutation-бюджетов.
- `[x]` Добавлена серверная идемпотентность создания отзыва: `Idempotency-Key` валидируется, хранится в `platform_reviews`, защищён уникальным индексом `(clientId, idempotencyKey)`, одинаковый повтор возвращает исходный отзыв, а другой payload с тем же ключом получает `409 Conflict`. Mock handler и frontend API используют тот же контракт.
- `[x]` Добавлена миграция `1786260000000-AddPlatformReviewIdempotency`; она применена к локальной PostgreSQL (124/124), OpenAPI описывает optional header. Проверки: platform-review service/rate-limit **5/5**, frontend **109 файлов / 385 тестов**, полный backend suite **277 файлов / 788 тестов**, backend build, TypeScript, lint, migration-order, API parity и OpenAPI shape/structure проходят.
- `[~]` Staging multi-instance abuse/retry rehearsal и production Redis evidence остаются в инфраструктурных gates; локальный контракт и race recovery закрыты.

### Результат двадцать седьмой исполняемой порции (29.08.2026)

- `[x]` Owner provider catalog aggregate теперь запрашивает только `catalog`-scopes. Branch-scoped staff с доступом только к заявкам/календарю больше не получает профили, опубликованные услуги и цены через прямой `GET /owner/autocare-providers`; owner и manager с catalog permission сохраняют доступ в назначенных филиалах.
- `[x]` Mock/API parity обновлён: mock owner provider list использует ту же role-to-permission матрицу и branch predicate, поэтому staff-only сценарий не расходится с реальным сервером.
- `[x]` Добавлена regression-проверка `autocare-owner-access`: broad membership scope без `catalog` не вызывает provider projection; provider-access и focused owner access suites **12/12** проходят.
- `[x]` После запуска локальных PostgreSQL и Redis полный backend regression suite проходит: **278/278 файлов, 789/789 тестов**.
- `[~]` Остальные endpoint-by-endpoint доказательства `ADD-C06` (requests/offers/reviews/chats/media/discounts/analytics/capacity), staging replay и ручная проверка доступа остаются незакрытыми; этот фикс закрывает только catalog aggregate leak.

### Результат двадцать восьмой исполняемой порции (29.08.2026)

- `[x]` Заявки и чаты переведены с broad membership checks на явные branch-aware capabilities `requests` и `chats`; list/detail/mutation операции проверяют permission вместе с `providerId` и `locationId`, а транзакционные переходы используют тот же контракт через `EntityManager`.
- `[x]` Mock API приведён к реальной политике: чтение заявки, conversation/messages/read markers, вложения, owner list, quote/confirm/reschedule/no-show/complete больше не полагаются только на роль `owner` и факт членства; чужая ветка отсекается capability predicate.
- `[x]` Regression proof расширен: пользователь без `requests` не получает owner request aggregate, без `chats` не получает provider chat list; staff сохраняет chats/requests только в назначенном филиале. Focused suites **14/14**, frontend **109 файлов / 385 тестов**, полный backend **278 файлов / 791 тест**, backend build и lint проходят.
- `[~]` Для полного закрытия `ADD-C06` ещё нужны endpoint-доказательства offers/reviews/media/discounts/analytics/capacity, единый HTTP integration replay для manager/staff и staging evidence.

---

# 3. Безопасность, сохранность данных и критичные баги

## Исправлять сразу, если проявляются в локальном MVP

- `[x]` **ADD-C01** Local Next origin configuration is fixed in `39e7711`: `localhost:4175` and `127.0.0.1:4175` are accepted only in non-production, while production remains explicit. Config assertion, server build, mock auth boundary **1/1** and real API auth/logout/session-expiry smoke in the full Chromium suite **20/20** pass; no production CSRF/origin relaxation was introduced.
- `[~]` **ADD-C02** Any white screen, Runtime ReferenceError, unhandled rejection or missing route on public/auth/owner/admin screens. Next route smoke 15/15, route contract, mock auth and real authenticated owner/admin/super-admin route proof pass; a route-wide manual audit and staging evidence are still required.
- `[~]` **ADD-C03** Any header, burger, floating-label, modal, gallery or filter overlap that blocks input/click on supported viewport. Automated supported-width matrix 30/30 без overflow проходит; ручная проверка фокуса/модалок/устройств ещё требуется.
- `[~]` **ADD-C04** A static shell/form/map disappears during loading instead of preserving layout while data-only blocks show themed skeletons. Shared search form and theme bootstrap were aligned at `70532d2`; all routes still require an audit.
- `[x]` **ADD-C05** Duplicate request/booking after retry, offline recovery or repeated click. Duplicate-click и real offline/timeout retry с тем же ключом закрыты 28.08.2026: повторная отправка возвращает успешный результат без нового request ID; mock и real Chromium smoke, плюс PostgreSQL regression для переставленных JSONB-ключей. Staging multi-client replay остаётся частью ADD-C08.
- `[x]` **ADD-C16** Active platform subscription/commission/payout vocabulary and types removed from runtime translation registries, notification/audit UI contracts and current product documents. Immutable historical migrations remain untouched; user-facing text now states that repairs are paid directly to the service. The service-owned review-resolution discount remains intentionally available and is not a platform promo program. Evidence: frontend lint, Next production build, backend build and focused notification/admin authorization tests passed 28.08.2026.

## Обязательны до открытия пилота

- `[~]` **ADD-C06** Branch-scoped authorization regression matrix (owner/manager/staff, all sensitive categories and direct API). Central policy, mixed-role regression and mock parity are covered; complete integrated endpoint-by-endpoint proof remains.
- `[ ]` **ADD-C07** Private media, AV/quarantine, signed access, EXIF removal and retention.
- `[ ]` **ADD-C08** PostgreSQL concurrency matrix for every booking/quote transition.
- `[ ]` **ADD-C09** Redis rate limit must fail closed for login/upload/mutation; test outage with multiple instances.
- `[x]` **ADD-C10** Separate platform-review rate limit and idempotency abuse tests. The create endpoint uses a dedicated user/IP-aware budget, validates `Idempotency-Key`, persists a per-client unique key and returns the original review on an identical retry while rejecting payload reuse.
- `[~]` **ADD-C11** PII log redaction, duplicate CSRF rejection and security headers; require staging evidence.
- `[ ]` **ADD-C12** Account deletion invariants across provider, branch, media, review, bonus and historical compatibility tables.
- `[ ]` **ADD-C13** Encrypted backup/restore actual recovery and rollback rehearsal.
- `[ ]` **ADD-C14** Independent threat review of auth, public discovery, attachments, WebSocket and admin/super-admin paths.
- `[ ]` **ADD-C15** Audit events for sensitive reads/changes: phone, evidence, discount, price, permission, communication mode and moderation.

## Некритичные после пилота

- `[ ]` **ADD-N01** PostGIS/GiST if the measured pilot load requires it.
- `[ ]` **ADD-N02** Specialist/bay/lift/equipment UI beyond optional capacity policy.
- `[ ]` **ADD-N03** Chat real-time polish beyond REST/polling baseline.
- `[ ]` **ADD-N04** Lighthouse-driven JS/CSS/media optimisation and full Open Graph audit.
- `[ ]` **ADD-N05** Additional locales beyond RU/EN/ES/RO.
- `[ ]` **ADD-N06** Native iOS/Android and fleet API — explicitly outside the pilot scope. Platform payment, tariff, subscription and paid-promotion functionality are excluded from the product, not backlog.

---

# 4. Решения и доступы, которые нужны от владельца продукта в последнюю очередь

Эти пункты нельзя выдумывать в коде; они не блокируют локальную демонстрацию, но блокируют открытый пилот.

1. `[E]` Первый пилотный город и зоны показа.
2. `[E]` Контакты двух сервисов и 5–10 клиентов, согласие на пилот и обработку данных.
3. `[E]` Политика отмены, переноса, no-show, отзывов, жалоб, appeals и trust badge.
4. `[E]` Кто имеет право видеть номер клиента; кто выдаёт скидки и максимальный процент.
5. `[E]` Обязательные поля/документы для публикации сервиса и какие документы нужны только после роста.
6. `[E]` Сроки retention для фото, заявок, чатов, audit logs и порядок удаления.
7. `[E]` Юридические тексты, legal entity/controller, support contact и SLA поддержки для каждой страны запуска.
8. `[E]` Staging/production доступы: PostgreSQL, Redis, object storage, AV, SMTP, DNS/HTTPS, monitoring and backup vault.
9. `[E]` Incident channel, ответственный за go/no-go, RPO/RTO и дата restore rehearsal.
10. `[E]` Ручная проверка на телефонах и VoiceOver/TalkBack, после чего — принятие/замечания по UX без изменения утверждённой desktop-главной.

## Правило окончания

**Локальный MVP готов** — когда раздел 1 зелёный и `ADD-C01…C05`, `ADD-C16` закрыты.
**Закрытый пилот готов** — когда раздел 2, все `ADD-C06…C15` и раздел 4 закрыты доказательствами.
**Публичный бесплатный MVP готов** — только после успешного пилота, независимого security review, backup/restore, accessibility review и финального go/no-go.

## 5. Правило ведения плана после этой ревизии

- После каждого изменения сначала обновляется его строка в этом плане: статус, commit, команда и окружение.
- Неподтверждённый риск добавляется как `ADD-Cxx` или `ADD-Nxx`, а не маскируется формулировкой «частично готово».
- Проверка проходит три раза: статический аудит/контракты, local runtime, затем staging или ручное evidence там, где это необходимо.
- Ни один инфраструктурный, privacy, legal или real-pilot пункт не переводится в `[x]` без отдельного внешнего доказательства.
