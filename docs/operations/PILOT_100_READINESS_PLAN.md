# AutoCare Hub — план готовности к пилоту 100%

**Статус:** канонический release-план
**Обновлён:** 30 августа 2026 — тройная сверка кода, проверок и операционных документов
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
- `[x]` `check:next-runtime-boundary` подтвердил Next.js production boundary; каждый оставшийся Vite-reference классифицирован: PWA (`@tailwindcss/vite`, `vite-plugin-pwa`), тестовый runtime (`vite`, `@vitejs/plugin-react`, `vite-tsconfig-paths`) или lint (`eslint-plugin-react-refresh`). Эти пакеты не участвуют в `next build/start` и удалению не подлежат до отдельного PWA/test migration.
- `[~]` Рефакторинг `demo:reset`: reset теперь собирает только demo users и известные fixture providers, удаляет их AutoCare-зависимости до provider rows и сохраняет общий каталог markets/zones/definitions; real-DB smoke после чистого запуска остаётся gate.
- `[~]` Провести file-level legacy audit: manifest, migration inventory и runtime guards сверены; безопасных файлов для удаления без потери replacement/coverage не найдено, финальная классификация и архивирование historical migrations остаются gate.

## 1.2 Основные сценарии клиента

- `[x]` Поиск, фильтры, карта, сортировка, сравнение и пустой результат города.
- `[x]` Страница сервиса: услуги, карта, галерея, отзывы, фото отзывов и placeholder.
- `[x]` Garage: марка, модель, год, госномер, VIN и внутренний номер; booking snapshot хранит исторические данные.
- `[x]` Заявка, quote, accept/decline и booking snapshot имеют API/mock контракты.
- `[x]` Отзывы: пустое состояние, один/много отзывов, фотографии и отдельная страница отзывов.
- `[~]` Реальный API: vehicleId в заявке, сохранение всех полей snapshot, удалённый автомобиль и недоступный сервис.
- `[~]` Реальный API: unavailable/removed provider подтверждён retry-состоянием; edit review, review photo и отдельное suspended evidence остаются.
- `[x]` Все публичные режимы связи сервиса подтверждены на mock и real API: online booking, request + callback и phone-only; seed-каталог содержит по одному провайдеру каждого режима.
- `[x]` Бонусы в кабинете клиента: списание с идемпотентностью, история операций с фильтром, суммы возвратов/истечений и ближайший срок действия отображаются на mock API; real API/staging lifecycle остаётся внешней проверкой.

## 1.3 Кабинеты и branch permissions

- `[x]` Client, owner, manager, staff, admin и super-admin роли существуют.
- `[x]` Owner видит все назначенные точки; scoped membership ограничивает staff/manager конкретными locationId в основных AutoCare service/request/review/chat paths.
- `[x]` Владелец может задать режим связи филиала: чат, телефон, callback, фото проблемы и response window.
- `[x]` Для маленького сервиса поддержан сценарий «заявка + звонок» без обязательства мгновенно отвечать в чате.
- `[~]` Exhaustive endpoint matrix: staff/manager A не получает B на requests, offers, reviews, chats, media, discounts, bonuses, analytics и capacity.
- `[~]` Полный owner onboarding/change-request workflow; приглашение manager/staff в выбранный филиал и branch-scoped error feedback закрыты локально, но acceptance/revoke и exhaustive permissions остаются.
- `[~]` Компактный календарь филиала показывает дату, подтверждённые записи и загрузку точки; подробное управление специалистами/постами/подъёмниками/оборудованием вынесено в отдельный post-MVP ресурсный workspace `ADD-N02`. Нужна сценарная проверка календаря с конкурентными ресурсами.
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
npm run check:legacy-files
npm run check:no-bookly-runtime
npm run check:no-legacy-provider
npm run check:threat-surface
npm run check:owner-route-auth
npm run check:migration-validation
npm run check:loading-shell
npm run check:state-matrix
npm run check:client-path
npm run check:design-tokens
npm run check:interaction-contract
npm run check:responsive
npm run check:e2e:browser
```

Текущий локальный evidence от 29.08.2026: frontend lint/build и 110 файлов / 388 тестов; backend build, unit-suite 179 файлов / 559 тестов и полный backend suite 275 файлов / 781 тестов; API parity 227/227, route inventory 56, Next route smoke 15/15 и responsive matrix 30/30. Полный real API Chromium smoke 20/20 также проходит; staging и ручные проверки остаются отдельными gates.

Дополнительно обязательны локальные login smoke для **MSW** и **real API**. `CSRF_ORIGIN_MISMATCH` при корректной локальной конфигурации — `ADD-C01`.

## 1.6 Порядок закрытия local MVP

Это исполняемая очередь без инфраструктуры. Каждый пункт завершается отдельным evidence-запуском и не помечается автоматически из старого отчёта.

1. `[x]` Исправить `ADD-C01`: origins `localhost:4175` и `127.0.0.1:4175` добавлены только для non-production в `server/src/config/env.ts`, `.env.example` синхронизирован, а регрессионные tests подтверждают, что production не получает loopback origins (`39e7711` + follow-up test). Mock login/me/logout smoke **1/1** и real API login/logout/session-expiry smoke внутри полного real suite **20/20** подтверждены 28.08.2026; production origin policy не ослаблена.
2. `[x]` Пройти dynamic URL matrix для provider, request, legacy redirect, owner provider/reviews через mock и real API. Mock/Next route smoke, route inventory (56 constants), route contract и API parity проходят; real API public/client/owner/staff/admin/super-admin matrix и варианты public provider/request URL закрыты в полном Chromium smoke **20/20**. Все семь legacy-алиасов проверяются HTTP smoke, а hydrated redirect evidence для public/owner/admin legacy routes — **3/3** (14 URL-вариантов); ручная визуальная проверка остаётся отдельным gate.
3. `[~]` Пройти state matrix на real PostgreSQL: локальные миграции, `demo:reset`, `demo:seed`, `autocare:seed` и `/health/live` проходят; loading, empty, API error, stale, offline, expired session, partial response, permission denied, suspended и безопасное сохранение незавершённых полей подтверждаются по частям. Полный real-API Chromium smoke **20/20** подтвердил public/client/owner/staff/admin/super-admin shell и injected error/offline/stale/permission/suspended/expired/partial states; duplicate-click idempotency в PostgreSQL подтверждена отдельным browser flow (оба ответа `200`, один ID, одна persisted-запись), mock и real offline/timeout retry также подтверждены; staging evidence и ручная проверка устройств остаются.
4. `[~]` Закрыть весь client path: vehicleId/snapshot и три communication modes покрыты unit/schema tests и mock/real Chromium evidence; `npm run check:client-path` фиксирует snapshot, booking history, bonus lifecycle и review resolution wiring. Unavailable/removed provider подтверждён real retry-state, а staging/real execution edit review и bonuses redemption/expiry/refund/history остаётся внешним gate.
5. `[~]` Закрыть owner/admin/super-admin local workflows: mock Chromium smoke добавляет coverage onboarding/change request, branch scope controls, evidence/moderation decision reason и editors countries/cities/zones; остаются execution smoke, submit/decision assertions, capacity/calendar/work queue, exhaustive permissions и real/staging API.
6. `[~]` Завершить route-wide loading audit: shared search form/theme bootstrap и themed skeleton-поведение зафиксированы в `70532d2`, focused loading tests проходят; boot-shell и новый static layout contract проверяют общие public/workspace/auth Suspense-fallbacks и доступный loading landmark; ни на одном маршруте не должно быть white screen или полноэкранного text loader — browser transition evidence ещё не собрано.
7. `[~]` Выполнить supported-width visual/interaction matrix и устранить все блокирующие overlap/focus/modal/dropdown дефекты. Automated Chromium matrix **30/30** (360–1440px) прошла без overflow и с корректной mobile navigation; ручная visual- и device-проверка остаётся.
8. `[~]` Выполнить keyboard/Axe/localization matrix RU/EN/ES/RO; automated public/workspace keyboard, Axe, city listbox, 20 locales и ES/RO mobile matrix проходят. Upload/form errors и ручные VoiceOver/device checks остаются. Semantic design-token contract теперь также проходит, включая светлую/тёмную поверхность floating-label.
9. `[~]` Выполнить полный local quality gate из §1.5 одним воспроизводимым запуском. Добавлен `npm run check:local-mvp`: static-only запуск проходит все 21 source/build/test checks и выдаёт redacted summary с commit SHA; полный режим также запускает responsive matrix через ephemeral Next release server. В текущем sandbox единственный runtime-шаг получил `listen EPERM` при выделении loopback-порта, поэтому device/runtime evidence остаётся отдельным gate.
10. `[x]` Провести финальный legacy scope pass: добавлен fail-closed file-level классификатор `npm run check:legacy-files`, который сверяет 1 889 tracked files и явно классифицирует 75 legacy/compatibility кандидатов (архив, immutable migrations, Vite/PWA tooling, snapshots, compatibility entities и один `candidate_review` asset). Безопасных файлов для удаления без подтверждения внешних ссылок не найдено; удаление исторических миграций и архивов запрещено.

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
- `[E]` Реализовать и подтвердить эксплуатационный backup/restore: encrypted backups, внешнее хранилище, documented RPO/RTO и restore rehearsal; локального harness недостаточно.
- `[E]` Worker/reminder-outbox/dead-letter + Redis/WebSocket multi-process smoke.
- `[E]` Rollback rehearsal и staging API compatibility check на каждом release candidate.

## 2.2 Медиа и персональные данные

- `[x]` Ограничение размера/MIME, normalized media и базовая авторизация вложений есть; выдача ограничена только `Ready`-строками.
- `[ ]` Private object storage adapter в фактическом staging окружении.
- `[~]` Quarantine → decode/re-encode → EXIF strip → AV scan → Ready workflow реализован локально и защищён Ready-only выдачей; внешние S3/ClamAV доказательства остаются.
- `[~]` Ограничения pixel/animation/decompression bomb реализованы и покрыты content-тестами; quota race и staging нагрузка остаются.
- `[~]` Короткоживущие signed URLs с проверкой membership/location/subject реализованы; фактическая выдача и TTL в staging остаются.
- `[~]` Retention/delete jobs: локальная политика orphan quarantine, private retention и account deletion покрыта; production retention rehearsal остаётся.
- `[~]` Реальное доказательство: пользователь A не получает media B по ID и rejected media не выдаётся локально; production S3 и удаление объекта после аккаунта требуют staging evidence.

## 2.3 Надёжность записи и quote

- `[x]` Branch capacity и базовые PostgreSQL race tests для слотов существуют.
- `[x]` Quote version history и price snapshot существуют.
- `[~]` Полная multi-actor concurrency matrix: create, accept quote, reschedule, cancel, no-show, complete и retry покрыта PostgreSQL integration suite; staging multi-client replay остаётся.
- `[x]` Локальный quote lifecycle: expiry, repeated accept, reschedule after accepted quote и stale version handling покрыты backend concurrency suite; staging race-проверка и все переходы real API остаются внешним gate.
- `[~]` Подтверждённый capacity policy: branch capacity обязательно; компактный MVP-календарь не монтирует resource-level UI. Specialist/bay/lift/equipment reservations и production-like проверки остаются в `ADD-N02`.
- `[~]` Проверить idempotency с real PostgreSQL при duplicate click, offline replay и timeout retry: duplicate click подтверждён browser evidence (один ID/одна запись), mock и real offline/timeout retry подтверждены сохранением исходного ключа и успешной второй отправкой; staging multi-client replay и ручная проверка остаются.

## 2.4 Discovery, map and trust

- `[x]` Keyset pagination, filters, multi-brand, duplicate protection и synthetic local benchmark foundation.
- `[~]` Trust score учитывает visits, reviews, cancellation/no-show и response signals.
- `[~]` Production-like benchmark: local PostgreSQL concurrent run now passes p95/p99 and the 5/25/100/500 km radius matrix; staging traffic, 10k/100k provider snapshot and production statement-timeout evidence remain.
- `[ ]` Compare current SQL with PostGIS/GiST; choose one by measured evidence, not assumption.
- `[ ]` Discovery IP/route rate limit, cache policy and fail-closed behaviour confirmed in staging.
- `[~]` Trust snapshots after actual completed visit, badge removal/recovery, appeals and evidence moderation; local trust/moderation regressions pass, while completed-visit and staging evidence remain.
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

### Результат двадцать девятой исполняемой порции (29.08.2026)

- `[x]` Marketplace/broadcast paths больше не используют broad membership как достаточное условие: рабочая область, timeline, broadcast list/detail и создание offer требуют явное branch-aware разрешение `requests`; direct owner сохраняет provider-wide доступ.
- `[x]` Добавлен единый PostgreSQL/Fastify HTTP integration replay для manager/staff/owner с двумя филиалами одного сервиса. Он доказывает branch isolation для aggregate catalog и requests, direct request/chat, reviews, analytics, capacity resources и offer mutation: филиал A доступен только в пределах разрешения, филиал B возвращает `403`/`404` и не попадает в списки.
- `[x]` Permission-negative regressions отдельно подтверждают, что отсутствие `analytics`, `calendar` или `reviews` не инициирует чтение соответствующих repository и не раскрывает aggregate данные. Focused authorization suites: **4 файла / 24 теста**.
- `[x]` Полный backend regression после изменения проходит: **279 файлов / 798 тестов**, backend TypeScript build и `git diff --check` — успешно.
- `[~]` Локальная endpoint-матрица `ADD-C06` теперь покрывает catalog, requests, offers, reviews, chats, discounts, bonuses, analytics и capacity. До перевода gate в `[x]` остаются staging replay и ручное evidence; private media authorization/storage/retention учитываются отдельно в `ADD-C07`, а не маскируются branch-scope статусом.

### Результат тридцатой исполняемой порции (29.08.2026)

- `[x]` Private attachment reads now expose only `Ready` rows. Conversation, chat lists and direct attachment endpoints exclude pending/rejected records, while branch-aware participant checks remain mandatory; a manager from branch A cannot read branch B media by ID.
- `[x]` Uploads preserve the validated MIME type and checksum through S3 quarantine → private promotion, set inline/private response metadata, and issue short-lived signed URLs with `private, no-store` cache policy. Filesystem development storage keeps atomic `0600` writes.
- `[x]` Orphan cleanup distinguishes `private` and `quarantine` tiers: stale quarantine is removed even if its promoted private counterpart is referenced, while referenced private objects are preserved. Traversal, cleanup policy and filesystem round-trip tests were added.
- `[x]` ClamAV scanning is bounded by `AUTOCARE_ATTACHMENT_SCAN_TIMEOUT_MS` (default 30s, max 120s) in both runtime uploads and production preflight; timed-out scanners are killed and fail closed with a 503.
- `[x]` Focused attachment/authorization/account-deletion suites: **5 files / 22 tests**; full backend regression: **280 files / 803 tests**; root lint and server TypeScript build pass.
- `[~]` `ADD-C07` local enforcement and regression proof are complete. Actual staging/production S3, ClamAV, signed-access and retention rehearsal still require external infrastructure and credentials; they remain an explicit pilot gate.

### Результат тридцать первой исполняемой порции (29.08.2026)

- `[x]` Сверена PostgreSQL concurrency matrix: локальная integration suite покрывает создание заявки с idempotency race, instant booking с branch/resource capacity, конкурентные reschedule proposal/decision, quote accept/repeat/decline/expiry, accepted-quote reschedule, cancellation retry и no-show/complete terminal race.
- `[x]` В матрице зафиксированы обязательные свойства каждой гонки: транзакционная блокировка, один committed winner для конфликтующих переходов, идемпотентный повтор там, где он разрешён, и проверки отсутствия двойных repair events/reservations в покрытых сценариях.
- `[x]` Полный backend regression после проверки: **280 файлов / 803 теста**, server TypeScript build, root lint и `git diff --check` проходят.
- `[~]` `ADD-C08` закрыт на локальном PostgreSQL уровне. Остаются staging multi-client replay, production-like contention/p99 и проверка внешней инфраструктуры; они не могут быть достоверно подтверждены без staging/production среды.

### Результат тридцать второй исполняемой порции (29.08.2026)

- `[x]` Redis rate-limit path теперь допускает явную инъекцию клиента в `checkRateLimitRedis`, а получение клиента выполняется внутри защищённого блока. Ошибка инициализации или pipeline не может обойти failure policy.
- `[x]` В режиме `fail-closed` отказ Redis возвращает `503` и не создаёт process-local bucket; это исключает обход лимита переключением между репликами. Тест дополнительно проверяет, что после отказа локальный bucket остаётся нетронутым.
- `[x]` В режиме `fail-open` fallback разрешён только для локальной разработки/тестов и по-прежнему ограничивается process-local bucket; второй запрос блокируется обычным `429`.
- `[x]` Redis outage policy suite: **13/13**; root lint, server TypeScript build и `git diff --check` проходят.
- `[~]` `ADD-C09` локальная fail-closed политика и regression доказаны. Реальный multi-process Redis outage/reconnect rehearsal и staging telemetry требуют доступного Redis-кластера и остаются обязательным инфраструктурным gate.

### Результат тридцать третьей исполняемой порции (29.08.2026)

- `[x]` Санитизация логов теперь скрывает PII, попавший непосредственно в текст сообщений: email, форматированные телефоны и VIN заменяются типизированными redaction-маркерами, при этом IP-адреса, migration IDs и request IDs сохраняются для диагностики.
- `[x]` Ошибки отправки verification/reset-писем в auth-маршрутах проходят через `serializeError`, поэтому необработанное исключение не может записать в лог исходный контактный или автомобильный PII.
- `[x]` CSRF-контракт отклоняет любой массив заголовка `X-CSRF-Token`, включая порядок attacker→valid и повтор одинакового токена; security headers и существующие origin-проверки регрессии сохранены.
- `[x]` Focused observability/CSRF suite: **19/19**; root lint, server TypeScript build и `git diff --check` проходят.
- `[~]` `ADD-C11` локальная защита PII, duplicate CSRF и security headers подтверждена. Staging-проверка фактических лог-синков, прокси-заголовков и retention логов остаётся обязательным gate.

### Результат тридцать четвёртой исполняемой порции (29.08.2026)

- `[x]` Инварианты удаления аккаунта расширены на provider/branch-профили, media, reviews, bonuses, trust policy, appeals, catalog gaps, repair events, security actions и legacy booking-совместимость. Проверяются не только внешние ссылки на удалённого пользователя, но и чувствительные transition/reviewer/resolver-поля.
- `[x]` Account-deletion cleanup теперь отсоединяет actor/reviewer/resolver/assignee references, очищает свободный текст заявок, бронирований, reschedule, жалоб и moderation payloads, а repair events и audit metadata редактируются без раскрытия исходного PII.
- `[x]` Добавлена интеграционная regression-проверка: переходы заявки и repair event, связанные с удаляемым пользователем, после удаления сохраняют только безопасный анонимизированный след; медиа, бонусный ledger, memberships, suspension и provider invariants также проходят.
- `[x]` Проверки C12: targeted account-deletion integration **1/1**, полный backend regression **280 файлов / 809 тестов**, root lint, server TypeScript build и `git diff --check` проходят.
- `[~]` `ADD-C12` закрыт на локальном PostgreSQL уровне. Staging/production retention rehearsal, проверка фактических backup/restore и независимое подтверждение deletion policy остаются обязательными внешними gates.

### Результат тридцать пятой исполняемой порции (29.08.2026)

- `[x]` Backup/restore harness повторно проверен: encrypted archive использует AES-256-CBC с PBKDF2, checksum проверяется до восстановления, restore в текущую базу блокируется без явного разрешения, а `psql` работает с `ON_ERROR_STOP=1`.
- `[x]` Ops contract, production-operations preflight, migration inventory и legacy cleanup прошли локально: **6/6 ops-тестов**, inventory **124 миграции**, legacy/Bookly/payment guards — PASS.
- `[x]` Runbook и alert manifest содержат изолированное восстановление, RPO/RTO evidence и критические правила API/outbox/backup; секреты в preflight-выводе не раскрываются.
- `[~]` `ADD-C13` получил локальное доказательство контрактов и защитных guard'ов. Фактический encrypted backup/restore на staging, timed rollback, внешний alert delivery и подтверждение RPO/RTO требуют доступной инфраструктуры и остаются pilot gates.

### Результат тридцать шестой исполняемой порции (29.08.2026)

- `[x]` Введены отдельные audit actions для чувствительных AutoCare-операций: просмотр заявки с контактами, просмотр evidence/вложений, изменение цены услуги, изменение режима связи, выдача скидки по отзыву и изменения membership/invitation.
- `[x]` HTTP-маршруты записывают audit только после успешной авторизованной операции и сохраняют технические идентификаторы, роль и безопасные флаги; телефоны, содержимое заявок, фото, токены и PII в metadata не попадают.
- `[x]` Существующие moderation, bonus, market, security и account-deletion audit actions сохранены; полный backend regression после расширения enum/маршрутов проходит **280 файлов / 809 тестов**, root lint, server build и focused branch/account-deletion suites — PASS.
- `[~]` `ADD-C15` локальная трассировка ключевых sensitive read/write действий закрыта. Нужно дополнительно подтвердить staging log delivery, retention, покрытие новых endpoint'ов при ручном replay и независимый security review.

### Результат тридцать седьмой исполняемой порции (29.08.2026)

- `[x]` Расширен audit trail для чтения чувствительных админских очередей: appeals, moderation evidence, provider change requests, catalog gaps, chat reports и platform reviews. В журнал попадают только роль/статус/количество записей и технический тип очереди; тексты жалоб, имена, телефоны, фото и payloads не копируются.
- `[x]` Загрузка логотипа и фотографий сервиса, а также просмотр списка сотрудников теперь оставляют безопасное audit-событие после успешной авторизованной операции. Для медиа фиксируются только тип и размер исходного буфера, без URL/содержимого.
- `[x]` Проверки порции: server TypeScript build, root lint, полный backend regression **280 файлов / 810 тестов** и `git diff --check` — PASS.
- `[~]` `ADD-C15` локальное покрытие audit read/write расширено; staging-доставка/retention логов, ручной replay каждого endpoint и независимый security review остаются внешними gates.

### Результат тридцать восьмой исполняемой порции (29.08.2026)

- `[x]` Добавлен воспроизводимый `npm run check:threat-surface`: source-level gate проверяет глобальную границу body/CSRF/security headers, discovery rate limit и cache policy, upload limits, origin/auth/payload controls обоих WebSocket-маршрутов, platform-review rate limit/idempotency и auth/audit moderation queues.
- `[x]` Для threat-surface gate добавлены node-тесты на зелёный контракт и точное сообщение о пропущенном control; скрипт включён в `quality:backend`, чтобы регрессия не обходила общий локальный quality gate.
- `[x]` Проверки порции: `npm run check:threat-surface`, node-тест **2/2** и `git diff --check` — PASS.
- `[~]` `ADD-C14` получил локальный автоматический source-level guard. Независимый threat review, staging replay, multi-process Redis/WebSocket и production evidence остаются обязательными внешними gates.

### Результат тридцать девятой исполняемой порции (29.08.2026)

- `[x]` Добавлен `npm run check:migration-validation`: он находит **28** исполняемых AutoCare-ограничений, созданных с `NOT VALID`, игнорируя комментарии, и проверяет уникальность имён.
- `[x]` Gate подтверждает, что `pg_constraint.convalidated` читается integrity-checker'ом, `--validate` вызывает `ALTER TABLE ... VALIDATE CONSTRAINT`, а `server`-скрипт `release:migrate` и release checklist требуют этот шаг.
- `[x]` Добавлены node-тесты миграционного контракта: **3/3**; `check:migration-validation` и `git diff --check` — PASS.
- `[~]` Локальный release-контракт закрыт. Фактическая валидация удалённой staging/production БД и запись результата миграционного job остаются инфраструктурным gate `ADD-C13`.

### Результат сороковой исполняемой порции (29.08.2026)

- `[x]` Добавлен воспроизводимый `npm run check:loading-shell`: source-level gate подтверждает, что публичные header/footer/main и workspace header/sidebar остаются видимыми до готовности route tree.
- `[x]` Gate проверяет, что главная карта берётся из bundled asset, remote-секции резервируют место skeleton-компонентами, а страница автоуслуг сохраняет форму с отключёнными полями, заголовком, описанием и единой поверхностью карты.
- `[x]` Проверена тема skeletons: базовый компонент использует `bg-muted`, map shimmer — `var(--muted)`/`var(--card)`, а parser-blocking theme bootstrap устанавливает dark tokens до первого paint.
- `[x]` Добавлены node-тесты loading-контракта: зелёный контракт и точное обнаружение отсутствующего `BootFooter` — **2/2**; `npm run check:loading-shell` и `git diff --check` — PASS.
- `[~]` `ADD-C04` получил локальный source-level guard для статической оболочки, disabled-формы и тематических skeletons. Полный real API state matrix, ручные device checks и staging evidence остаются обязательными.

### Результат сорок первой исполняемой порции (29.08.2026)

- `[x]` Повторно выполнены `check:next-route-inventory` (**56 route constants**), `check:next-runtime-boundary` и `check:next-route-contract` (**5/5**); прямые, динамические и legacy URL остаются в едином Next.js contract.
- `[x]` Runtime boundary закреплён в `quality:backend`: production `build/start` остаются Next.js, а Vite-пакеты имеют документированные PWA/test/lint consumers и не являются скрытым production entrypoint.
- `[x]` File-level legacy scope сверён с manifest, migration inventory, no-Bookly и payment guards: безопасных файлов для удаления без потери replacement/coverage не найдено; historical migrations и retained compatibility paths сохранены намеренно.
- `[x]` Проверки порции: route inventory, runtime boundary, route contract, root lint и `git diff --check` — PASS.
- `[~]` Локальный runtime/legacy scope закрыт. Фактический `next start` deployment replay и безопасный `demo:reset` на staging/production остаются внешними gates; удаление retained compatibility возможно только после утверждённой миграции данных.

### Результат сорок второй исполняемой порции (29.08.2026)

- `[x]` Добавлен воспроизводимый `npm run check:state-matrix`: guard фиксирует mock и real browser coverage для error, stale, offline, permission-denied, suspended, expired-session и partial-response состояний.
- `[x]` В тот же контракт включены empty/one/photo review fixtures, attachment viewer, online/request-then-confirm/phone-only режимы, mobile shell, offline/timeout retry и PostgreSQL idempotency replay.
- `[x]` Node-тесты state matrix — **2/2**; `npm run check:state-matrix`, root lint и `git diff --check` — PASS. Gate добавлен в `quality:backend`.
- `[~]` Source coverage зафиксирована локально, но фактический запуск всей matrix в рабочем real API/staging и ручная проверка устройств остаются обязательными; gate не маскирует внешние evidence.

### Результат сорок третьей исполняемой порции (29.08.2026)

- `[x]` Клиентский путь получил отдельный source-level gate `npm run check:client-path`: сохранённые марка/модель/год и дополнительные поля автомобиля (топливо, объём, мощность, цвет, госномер, внутренний номер и VIN) проверяются перед формированием snapshot заявки.
- `[x]` В контракт включены booking snapshot с исторической ценой и данными автомобиля, бонусный баланс с операциями earn/redeem/refund/expire и идемпотентным списанием, а также review resolution flow с промокодом, одноразовым редактированием и retryable error state.
- `[x]` Страница отзывов больше не заменяет содержимое текстовым loader: навигация и заголовок остаются видимыми, а загрузка использует shape-matched `ReviewsSkeleton`; пустой результат явно помечен как `empty`. Ошибка AutoCare-отзывов сохраняет retry-карточку.
- `[x]` Chromium source smoke расширен проверкой списания бонусов по подтверждённой записи и повторного клика без второй операции в ledger; `node --test scripts/check-client-path.test.mjs` — **2/2**.
- `[~]` Фактический real API/staging запуск review edit, bonus redemption/expiry/refund и проверка удалённого автомобиля/сервиса остаются внешним evidence; source gate не подменяет ручной и production-like прогон.

### Результат сорок четвёртой исполняемой порции (29.08.2026)

- `[x]` Календарь владельца больше не скрывает управление ресурсами при пустом ответе API: филиал без ресурсов показывает понятное empty-состояние и форму создания первого специалиста, поста, подъёмника или оборудования.
- `[x]` Добавлены отдельные состояния ошибок для списка ресурсов и занятости, индикатор фонового обновления reservations и безопасный fallback `resources.data ?? []`; при ошибке чтения кнопка создания блокируется, чтобы не создавать неконсистентные записи.
- `[x]` Регрессионный `npm run check:capacity-ui` и node-тест **2/2** фиксируют отсутствие старого раннего `return null`, наличие формы создания и отображение occupancy/error-состояний.
- `[x]` Frontend lint, полный Vitest **109 файлов / 385 тестов**, production Next build и `git diff --check` проходят.
- `[~]` Полный календарь/work queue и resource-level capacity всё ещё требуют сценарного real API/staging прогона с конфликтующими ресурсами; подъёмники и оборудование остаются опциональным расширением после пилота.

### Результат сорок пятой исполняемой порции (29.08.2026)

- `[x]` Форма команды филиала больше не проглатывает ошибку приглашения: конфликт уже ожидающего приглашения, отказ доступа и сетевые ошибки отображаются отдельным `role="alert"`, а успешная отправка очищает предыдущую ошибку и сохраняет success-status.
- `[x]` Добавлен Chromium-сценарий владельца для приглашения `manager` в конкретный филиал и повторного запроса того же scope: первый invite появляется в списке, duplicate возвращает понятную ошибку вместо тихого сброса формы. Email генерируется уникально на запуск, поэтому smoke не загрязняет последующие прогоны.
- `[x]` Локальные проверки порции: `npm run lint -- --max-warnings=0`, полный Vitest **109 файлов / 385 тестов**, production `npm run build`, `check:capacity-ui` **2/2** и `git diff --check` — PASS.
- `[~]` Реальное принятие приглашения, отзыв membership/invitation и exhaustive manager/staff permission replay по всем endpoint остаются частью `ADD-C06` и требуют real API/staging evidence; запуск Playwright в изолированном sandbox на `127.0.0.1:4173` заблокирован системным `listen EPERM`, поэтому этот внешний smoke не отмечается как production-доказательство.

### Результат сорок шестой исполняемой порции (29.08.2026)

- `[x]` Mock/API-контракт кабинета клиента теперь явно проверяется для полного бонусного lifecycle: баланс, история, фильтры `refund`/`expire`, суммы возвратов и истечений, а также ближайший срок действия бонусов.
- `[x]` Добавлен Chromium-сценарий `shows refund and expiry balances with filterable bonus history`; он проверяет видимые counters и переключение истории между возвратами и истечениями без изменения утверждённой верстки.
- `[x]` Проверки порции: полный Vitest **109 файлов / 385 тестов**, ESLint, Next production build, `check:capacity-ui`, node contract tests и `git diff --check` — PASS.
- `[~]` Реальный API/staging redemption, refund, expiry и удаление бонусных данных после account deletion остаются внешним evidence в `ADD-C12` и client-path gate; браузерный smoke требует окружения, где разрешён запуск локального web-сервера.

### Результат сорок седьмой исполняемой порции (29.08.2026)

- `[x]` В mock-каталоге добавлена отдельная заявка с истёкшей сметой: клиент видит причину истечения, историю версии и не получает повторно доступную кнопку принятия.
- `[x]` Chromium-контракт расширен сценариями принятия pending quote один раз с сохранением booking snapshot и отображения expired quote в режиме read-only; source-level client-path gate теперь защищает обе ветки.
- `[x]` Проверки порции: `node --test scripts/check-client-path.test.mjs` **2/2**, `npm run check:client-path`, ESLint, Next production build и `git diff --check` — PASS.
- `[~]` Полный браузерный прогон заблокирован sandbox-ограничением `listen EPERM` на `127.0.0.1:4173`; staging multi-client replay и real API quote transitions остаются внешними доказательствами.

### Результат сорок восьмой исполняемой порции (29.08.2026)

- `[x]` Страница результатов больше не заменяет весь блок на map-skeleton во время первого запроса: форма и основной layout остаются смонтированными, реальная карта `AutoCareMapPreview` создаётся сразу с пустым набором маркеров, а ожидание discovery ограничено заголовком и карточками сервисов.
- `[x]` Добавлен отдельный `AutoCareResultsDataSkeleton` без вложенного map-placeholder; он повторяет форму данных списка и сохраняет стабильную высоту сетки.
- `[x]` Loading-shell source contract теперь проверяет этот split (`Mounted discovery map`), а unit-покрытие подтверждает отсутствие map skeleton внутри data-only placeholder (**7/7** loading tests, `check:loading-shell` — PASS).
- `[x]` Проверки порции: focused loading tests, `npm run check:loading-shell`, ESLint, Next production build и `git diff --check` — PASS.
- `[~]` Фактическая проверка визуального первого paint на реальном API и устройствах остаётся частью ручного responsive/staging gate; tile network errors по-прежнему отображаются inline и не скрывают карту.

### Результат сорок девятой исполняемой порции (29.08.2026)

- `[x]` `demo:reset` расширен на AutoCare-зависимости: заявки, чаты и вложения, quotes, reschedule, reviews/promos, appeals, moderation, capacity, бонусы, membership/invitations, metrics и provider branches удаляются до удаления demo users/providers.
- `[x]` Reset выбирает только известные mock-provider names, если provider не принадлежит реальному владельцу; общий каталог markets, countries, zones, service definitions и benchmark rows не затрагивается.
- `[x]` Все новые удаления используют параметризованные PostgreSQL `uuid[]`-предикаты, а для старых booking/cabinet fixtures сохранены существующие связи и порядок удаления.
- `[x]` Добавлен `npm run check:demo-reset` и 2 node-теста: safety guard, защита shared catalog и проверка отсутствия broad `TRUNCATE`/catalog deletes — PASS.
- `[x]` Проверки порции: demo-reset contract, server TypeScript build и `git diff --check` — PASS.
- `[~]` Реальный прогон `demo:reset → demo:seed → autocare:seed` требует доступной PostgreSQL; staging/production reset выполняется только по runbook с backup и подтверждением окружения.

### Результат пятидесятой исполняемой порции (29.08.2026)

- `[x]` Локальный PostgreSQL discovery benchmark выполнен с concurrency **8**, радиусами **5/25/100/500 км** и обходом application-cache: **40/40** запросов успешны, p95 **31.4 ms**, p99 **32.9 ms**, max **32.9 ms** — бюджет 350/700 ms пройден.
- `[x]` Supply-density для seeded рынка **Москва** подтверждён: на радиусе 25 км — **3** активных сервиса, **3** точки и **22** активных предложения; покрыты 18 категорий, проверка minimum provider/offer пройдена.
- `[x]` Synthetic baseline повторно прогнан для **10 000** и **100 000** точек: p95/p99 **1.9/1.9 ms** и **15.5/15.5 ms**, ошибок нет.
- `[x]` Trust/moderation regression подтверждён локально: trust-score **7/7**, admin evidence/appeals integration **9/9**; решения без причины и публичная граница evidence остаются защищёнными.
- `[x]` `check:autocare-integrity -- --validate` подтверждён на локальном PostgreSQL: manifest из **42** критичных таблиц проверен, все ownership/context-инварианты равны **0**, pending constraints — **0**.
- `[~]` PostGIS/GiST сравнение корректно завершилось `skipped`: локальный PostgreSQL не содержит расширение PostGIS. Staging с geography GiST индексом необходим перед архитектурным выбором; supply density для фактического пилотного города и production-like traffic остаются внешними gates.

### Результат пятьдесят первой исполняемой порции (29.08.2026)

- `[x]` Единый frontend quality gate повторно пройден локально: Vitest **109 файлов / 386 тестов**, ESLint с `--max-warnings=0`, Next production build, API parity **227/227**, threat-surface и operations harness — PASS.
- `[x]` Migration/integrity validation повторно пройдена на локальном PostgreSQL: `check:autocare-integrity -- --validate` проверил manifest из **42** критичных таблиц, все ownership/context-инварианты равны **0**, pending constraints — **0**.
- `[~]` Responsive Chromium execution в текущем shell не закрыт: target `127.0.0.1:4175` недоступен, а запуск против dev-сервера 3000 не завершает loading shell/серверные блоки. Ранее подтверждённая matrix **30/30** остаётся evidence; новый прогон требует стабильного Next+API runtime и не переводится в `[x]` без него.

### Результат пятьдесят второй исполняемой порции (29.08.2026)

- `[x]` Экран владельца упрощён до компактного календаря филиала: остаются дата, подтверждённые записи и branch capacity; подробный resource-level блок больше не загружается и не занимает место в основном MVP-сценарии.
- `[x]` Управление специалистами, постами, подъёмниками и оборудованием выделено в `OwnerCapacityResourcesPanel` с отдельным `data-testid` и сохранёнными loading/empty/error/retry/create/toggle-контрактами; компонент не подключён к компактному календарю до post-MVP `ADD-N02`.
- `[x]` Обновлён `check:capacity-ui`: проверяет отсутствие resource queries на компактном экране и целостность изолированного post-MVP панели.
- `[x]` Проверки порции: `npm run check:capacity-ui`, TypeScript, ESLint и `git diff --check` — PASS.
- `[~]` Полный календарь, рабочая очередь и ресурсные резервации требуют отдельного real API/staging прогона; это не блокирует компактную MVP-верстку.

### Результат пятьдесят третьей исполняемой порции (29.08.2026)

- `[x]` Экран заявок владельца больше не скрывает компактный календарь филиала, пока список заявок загружается: календарь и его дата/загрузка точки монтируются сразу, а серверные счётчики вместо misleading нулей показывают тематические skeleton-значения.
- `[x]` Добавлен release smoke-контракт для owner requests: проверяется видимость `owner-capacity-calendar`, заголовок и подсказка выбора даты, отсутствие post-MVP `owner-capacity-resources`, а также отсутствие горизонтального overflow.
- `[x]` `check:capacity-ui` и node-тесты дополнительно защищают loading-поведение календаря и summary cards; `check:loading-shell`, TypeScript, ESLint, полный Vitest **109 файлов / 386 тестов**, production Next build и `git diff --check` проходят.
- `[x]` Единый `npm run quality:backend` повторно прошёл локально: миграционные/legacy/operations/API/threat/loading/state/client/capacity gates зелёные, server unit **179 файлов / 559 тестов**, server build — PASS.
- `[x]` Добавлен unit smoke `OwnerCapacityCalendar.test.tsx`: ветка с записью проверяет occupancy и appointment label, пустая дата — понятное empty-state; focused test — **2/2**, полный frontend suite обновлён до **110 файлов / 388 тестов**.
- `[~]` Playwright execution новой проверки в текущей sandbox-среде не стартует из-за `listen EPERM` на локальном порту; staging/real API и ручная визуальная проверка календаря остаются отдельным evidence-gate.

### Результат пятьдесят четвёртой исполняемой порции (29.08.2026)

- `[x]` Вкладки режима поиска получили симметричное скругление внешних углов формы: «По услуге» — верхний левый, «По автосервису» — верхний правый; внутренний стык вкладок остаётся прямым и не создаёт двойной рамки.
- `[x]` Тот же контракт применён к boot-shell, чтобы первый paint и загруженная форма не расходились по геометрии.
- `[x]` Проверки порции: полный Vitest **110 файлов / 388 тестов**, ESLint `--max-warnings=0`, TypeScript, production Next build и `git diff --check` — PASS.
- `[~]` Pixel-level визуальная проверка в Chromium остаётся частью ручного responsive gate: текущая sandbox-среда блокирует запуск локального browser server (`listen EPERM`); поведение классов покрыто source/build проверками.

### Результат пятьдесят пятой исполняемой порции (29.08.2026)

- `[x]` В interaction-state contract добавлена регрессия геометрии вкладок поиска: активный режим «По услуге» обязан использовать внешний левый радиус, а «По автосервису» — внешний правый; обе проверки также применяются к boot-shell.
- `[x]` Порция не меняет утверждённую компоновку и не добавляет runtime-логику: защищена только согласованность загруженной формы и первого paint.
- `[x]` Проверки порции: interaction-state contract **16 invariants**, его node-тест и `git diff --check` — PASS.
- `[~]` Реальная pixel-level проверка в браузере остаётся ручным responsive gate из-за ограничения sandbox на локальный browser server.

### Результат пятьдесят шестой исполняемой порции (29.08.2026)

- `[x]` Backup/restore harness перепроверен без воздействия на рабочую базу: зашифрованный backup требует secret-файл, создаёт SHA-256 checksum, а restore проверяет checksum и блокирует восстановление поверх текущей базы без явного разрешения.
- `[x]` Контракт эксплуатационных операций подтверждён: `check:ops-harness`, 6 node-тестов operations/legacy и проверка `check:production-operations` показывают, что backup, alerts, worker, outbox и rollback-документы присутствуют.
- `[x]` Production preflight не маскирует отсутствие инфраструктуры: backup/restore rehearsal остаётся `MANUAL`, а PostgreSQL/Redis/JWT, SMTP, persistent storage, super-admin и Docker корректно отмечены как заблокированные.
- `[~]` Реального зашифрованного архива в удалённом backup vault, WAL/PITR, автоматического расписания, доставки alert и timed restore пока нет; старый локальный gzip-дамп в `server/backups/` не считается защищённым backup и не закрывает gate.

### Результат пятьдесят седьмой исполняемой порции (29.08.2026)

- `[x]` Повторно пройден единый локальный quality gate `npm run quality:backend`: migration order/inventory/validation, legacy cleanup, demo-reset, API/OpenAPI parity, Next route/runtime contracts, threat surface, loading/state/client/capacity contracts, server tooling, **179 файлов / 559 тестов** backend unit и server build — PASS.
- `[x]` Legacy-аудит подтвердил пять legacy-семейств с явными статусами и replacement/coverage gates; Bookly и payment-provider runtime guards проходят, исторические миграции сохранены с inventory checksum, AutoCare migrations проходят границу замены.
- `[x]` Next runtime boundary подтвердил, что production `next build/start` не зависит от Vite; оставшиеся Vite-пакеты имеют классифицированные PWA/test/lint consumers и не являются безопасными кандидатами для удаления в этой порции.
- `[x]` Demo reset остаётся fixture-scoped: shared markets/zones/countries/service definitions защищены; migration validation обнаруживает и промоутит все 28 `NOT VALID` constraints после миграций.
- `[~]` Безопасных неиспользуемых файлов для удаления не найдено. Финальное архивирование исторических миграций и удаление совместимых Vite/PWA/test-инструментов возможно только после отдельного подтверждения replacement coverage и не должно выполняться вслепую.

### Результат пятьдесят восьмой исполняемой порции (29.08.2026)

- `[x]` Branch-scope HTTP regression расширен для чувствительных операций, ранее не входивших в endpoint matrix: менеджер филиала A не может выпустить скидку по отзыву филиала B (`404`) и не может читать bonus liability без provider-wide `bonuses` permission (`403`).
- `[x]` Focused PostgreSQL/Fastify integration `provider-branch-access.integration.test.ts`: **6/6 тестов PASS**; существующие проверки catalog, requests, chats, reviews, analytics, media, offers и capacity продолжили проходить.
- `[x]` `git diff --check` и локальный `quality:backend` остаются зелёными после расширения матрицы; production/staging replay для всех endpoint-категорий по-прежнему не подменяется локальными тестами.
- `[~]` `ADD-C06` теперь закрывает локальными HTTP-доказательствами ещё review-discount и bonus-liability boundaries; staging multi-client replay и ручное подтверждение остаются обязательными до пилота.

### Результат пятьдесят девятой исполняемой порции (29.08.2026)

- `[x]` В branch regression добавлены мутации по заявке и чату: менеджер филиала A не может отправить сообщение, quote или chat-message для заявки/чата филиала B — все три прямых HTTP-вызова возвращают `403` до изменения данных.
- `[x]` Повторный focused PostgreSQL/Fastify прогон `provider-branch-access.integration.test.ts` подтвердил **6/6 тестов PASS**; каталог, списки заявок, прямой доступ, отзывы/аналитика, скидки/бонусы, capacity/offers и attachments остаются покрыты.
- `[x]` `git diff --check` проходит; тест не создаёт постоянных фикстур и удаляет временные provider/branch/request/chat/media записи в `afterAll`.
- `[~]` Осталось собрать единый endpoint-by-endpoint replay для всех ролей в staging и доказать поведение при нескольких параллельных клиентах; локальный branch boundary теперь покрывает read и mutation пути.

### Результат шестидесятой исполняемой порции (29.08.2026)

- `[x]` Матрица branch-scoped мутаций расширена: для заявки и чата филиала B менеджер филиала A получает `403` на отправку сообщения, создание quote и chat-message; прямые проверки выполняются через Fastify HTTP с реальной PostgreSQL.
- `[x]` После расширения регрессия `provider-branch-access.integration.test.ts` остаётся зелёной: **6/6 тестов PASS**; проверены и чтение, и запись без появления чужих строк/сообщений.
- `[x]` Повторно прошли TypeScript, ESLint `--max-warnings=0` и `git diff --check`; полный локальный quality gate из порции 57 не нарушен.
- `[~]` `ADD-C06` закрыт локальными доказательствами для catalog/requests/offers/reviews/chats/media/discounts/analytics/capacity и bonus boundary; staging replay с несколькими ролями и параллельными клиентами остаётся обязательным перед пилотом.

### Результат шестьдесят первой исполняемой порции (29.08.2026)

- `[x]` Security/media preflight повторно прошёл в окружении с разрешённым локальным IPC: production policy требует Redis fail-closed, private S3 и ClamAV, отклоняет filesystem attachments, проверяет безопасные object keys и наличие deletion-invariant inventory (**5/5 checks**).
- `[x]` Account-deletion retention checker успешно запустился на локальной PostgreSQL и просмотрел все завершённые deletion requests (**0 записей, нарушений не найдено**); проверка не подменяет production rehearsal.
- `[x]` `autocare-attachment-storage` и integration coverage подтверждают private object key namespace, Ready-only выдачу, quarantine cleanup и signed URL boundary; `provider-branch-access.integration.test.ts` — **6/6**.
- `[~]` Фактическая S3/ClamAV загрузка, retention после реального удаления аккаунта, object-store lifecycle и multi-process media replay требуют staging/production secrets и остаются частью `ADD-C07`.

### Результат шестьдесят второй исполняемой порции (29.08.2026)

- `[x]` Конкурентная матрица синхронизирована с фактическим API-контрактом: отмена заявки моделируется повторной попыткой клиента (одна фиксация, повтор идемпотентен), а quote теперь явно входит в набор операций.
- `[x]` Добавлен сценарий `quote-accept-decline`: параллельные решения по одной смете дают одну успешную фиксацию и один конфликт; сценарии требуют database lock и проверяют повторяемость безопасных retry.
- `[x]` Focused PostgreSQL integration прогон `concurrency-matrix.test.ts autocare-capacity.integration.test.ts`: **2 test files / 13 tests PASS**; покрыты booking, quote, reschedule, cancellation, no-show/complete, capacity и idempotency.
- `[x]` После изменения пройдены `npx tsc --noEmit`, ESLint `--max-warnings=0` и `git diff --check`.
- `[~]` `ADD-C08` закрыт локальными race-доказательствами; staging multi-client replay, production-like contention/p99 и timed rollback остаются обязательными внешними gates перед пилотом.

### Результат шестьдесят третьей исполняемой порции (29.08.2026)

- `[x]` Повторно проверена fail-closed политика Redis: конфигурационный resolver принудительно выбирает `fail-closed` для production и отклоняет явный `fail-open`; локальная regression suite `rate-limit.test.ts` и platform-review rate-limit — **2 файла / 14 тестов PASS**.
- `[x]` При недоступном Redis в `fail-closed` режиме `checkRateLimitRedis` возвращает контролируемый `503` и не изменяет process-local bucket; fallback остаётся только явно разрешённым вне production.
- `[x]` Synthetic discovery benchmark повторён на 10 000 и 100 000 записей: **0 failed samples**, p99 **1.7 ms** и **17.6 ms** соответственно (3 итерации на размер).
- `[~]` `ADD-C09` и discovery production gate не закрываются локальным прогоном: отсутствуют Redis-кластер для multi-process outage/reconnect, staging telemetry и PostGIS/GiST-сравнение; production/staging replay остаётся обязательным.

---

# 3. Безопасность, сохранность данных и критичные баги

## Исправлять сразу, если проявляются в локальном MVP

- `[x]` **ADD-C01** Local Next origin configuration is fixed in `39e7711`: `localhost:4175` and `127.0.0.1:4175` are accepted only in non-production, while production remains explicit. Config assertion, server build, mock auth boundary **1/1** and real API auth/logout/session-expiry smoke in the full Chromium suite **20/20** pass; no production CSRF/origin relaxation was introduced.
- `[~]` **ADD-C02** Any white screen, Runtime ReferenceError, unhandled rejection or missing route on public/auth/owner/admin screens. Next route smoke 15/15, route contract, mock auth and real authenticated owner/admin/super-admin route proof pass; a route-wide manual audit and staging evidence are still required.
- `[~]` **ADD-C03** Any header, burger, floating-label, modal, gallery or filter overlap that blocks input/click on supported viewport. Automated supported-width matrix 30/30 без overflow проходит; ручная проверка фокуса/модалок/устройств ещё требуется.
- `[~]` **ADD-C04** A static shell/form/map disappears during loading instead of preserving layout while data-only blocks show themed skeletons. Shared search form and theme bootstrap were aligned at `70532d2`; `npm run check:loading-shell` now guards public/workspace chrome, bundled home map, disabled search form and light/dark skeleton tokens. Full route audit, real API states and device/staging evidence remain.
- `[x]` **ADD-C05** Duplicate request/booking after retry, offline recovery or repeated click. Duplicate-click и real offline/timeout retry с тем же ключом закрыты 28.08.2026: повторная отправка возвращает успешный результат без нового request ID; mock и real Chromium smoke, плюс PostgreSQL regression для переставленных JSONB-ключей. Staging multi-client replay остаётся частью ADD-C08.
- `[x]` **ADD-C16** Active platform subscription/commission/payout vocabulary and types removed from runtime translation registries, notification/audit UI contracts and current product documents. Immutable historical migrations remain untouched; user-facing text now states that repairs are paid directly to the service. The service-owned review-resolution discount remains intentionally available and is not a platform promo program. Evidence: frontend lint, Next production build, backend build and focused notification/admin authorization tests passed 28.08.2026.

## Обязательны до открытия пилота

- `[~]` **ADD-C06** Branch-scoped authorization regression matrix (owner/manager/staff, all sensitive categories and direct API). Local policy, mixed-role/mock parity and PostgreSQL HTTP replay now cover catalog, requests, offers, reviews, chats, discounts, bonuses, analytics and capacity; staging replay and manual evidence remain before this gate can be closed.
- `[~]` **ADD-C07** Private media, AV/quarantine, signed access, EXIF removal and retention. Local enforcement and tests pass; staging/production storage, scanner and retention rehearsal remain.
- `[~]` **ADD-C08** PostgreSQL concurrency matrix for every booking/quote transition. Local create/instant booking, quote accept/decline/expiry, reschedule, cancellation, no-show/complete and idempotent retry races pass; staging multi-client replay and production-like contention remain.
- `[~]` **ADD-C09** Redis rate limit must fail closed for login/upload/mutation; local outage regression proves no process-local fallback in `fail-closed` mode, while multi-process outage/reconnect rehearsal remains a staging gate.
- `[x]` **ADD-C10** Separate platform-review rate limit and idempotency abuse tests. The create endpoint uses a dedicated user/IP-aware budget, validates `Idempotency-Key`, persists a per-client unique key and returns the original review on an identical retry while rejecting payload reuse.
- `[~]` **ADD-C11** Локальная PII-redaction, duplicate CSRF rejection и security headers закрыты тестами; обязательны staging-проверка лог-синков, прокси-заголовков и retention логов.
- `[~]` **ADD-C12** Локальные invariants и cleanup для provider, branch, media, review, bonus, moderation, security actions и historical compatibility tables закрыты regression-тестами; staging/production retention rehearsal и внешнее evidence остаются.
- `[~]` **ADD-C13** Локальные encrypted backup/restore, checksum, same-database guard, migration inventory и rollback contracts подтверждены; фактические staging/production recovery, alert delivery, RPO/RTO и timed rollback остаются внешними gates.
- `[~]` **ADD-C14** Source-level threat-surface guard покрывает auth/request boundary, discovery, attachments, WebSocket, platform reviews и admin queues; независимый threat review, staging replay и production evidence остаются.
- `[~]` **ADD-C15** Локальные audit events для phone/contact, evidence, discount, price, membership/permission и communication mode добавлены; staging log delivery/retention, endpoint replay и независимое подтверждение остаются.

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

### Результат шестьдесят четвёртой исполняемой порции (29.08.2026)

- `[x]` Форма создания автосервиса получила bounded draft: текстовые поля, режим связи, мультибренд и удобства восстанавливаются после перезагрузки/ошибки, а успешное сохранение и ручной сброс очищают черновик.
- `[x]` Draft parser использует allow-list, лимиты строк/массивов и enum для режима связи; телефоны, email, приватные ссылки документов и файлы намеренно не сохраняются в `localStorage`, чтобы не оставлять PII и private evidence в браузере.
- `[x]` Async market remount через `key={market?.id ?? 'new'}` гарантирует, что черновик читается для фактического рынка, а не только для первого пустого рендера; discard также сбрасывает uncontrolled контактные/file inputs.
- `[x]` Добавлены parser-регрессии **2/2**; полный frontend Vitest — **111 файлов / 390 тестов PASS**, `check:state-matrix`, `check:loading-shell`, TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` — PASS.
- `[~]` Реальные API retry/stale/offline сценарии, ручные device/VoiceOver проверки и staging evidence остаются внешними gates; телефонные и файловые значения восстанавливаются только в текущей сессии и должны вводиться/выбираться повторно.

### Результат шестьдесят пятой исполняемой порции (29.08.2026)

- `[x]` Форма изменения публичного профиля владельца получила такой же безопасный draft-flow: после ошибки или перезагрузки восстанавливаются только профильные поля и режим мультибренда, показывается notice с действием сброса, а успешная отправка очищает черновик.
- `[x]` Телефоны, email, приватные ссылки документов и файловые handles в profile change draft не сохраняются в браузере; discard сбрасывает uncontrolled contact/document/file inputs перед повторным вводом.
- `[x]` Добавлены parser-регрессии profile draft **2/2**; полный frontend Vitest — **112 файлов / 392 теста PASS**, TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` — PASS.
- `[~]` Точечный mock Chromium smoke owner/admin/super-admin не стартовал в текущем sandbox: Next webServer получил `listen EPERM` на `127.0.0.1:4173`; это ограничение среды, а не изменение статуса workflow-контрактов.
- `[~]` Реальный API/staging submit и review decision, ручная device/VoiceOver проверка и production retention остаются внешними gates; локальный draft не считается доказательством этих этапов.

### Результат шестьдесят шестой исполняемой порции (29.08.2026)

- `[x]` В панели команды владельца завершён локальный revoke-flow: отзыв приглашения и отзыв активного membership выполняются через ожидаемую mutation state, блокируют повторный клик на время запроса и показывают доступное success/error-сообщение.
- `[x]` Участники с уже отозванным доступом больше не отображаются как активные; для них показывается статус «Доступ отозван», а destructive-кнопка не возвращается. Кнопки действий получили `aria-label`, `title`, `data-testid` и disabled-состояние.
- `[x]` Mock/API parity сохранена: обе мутации используют существующие branch/provider параметры и RTK Query `MEMBERS_${providerId}` invalidation, поэтому после успешного действия список повторно загружается с актуальным статусом.
- `[x]` Добавлены frontend-регрессии панели: active/revoked отображение, revoke membership, revoke invitation и ошибка mutation — **3/3**; полный frontend suite после порции — **113 файлов / 395 тестов**, TypeScript, ESLint `--max-warnings=0`, Next build и `git diff --check` проходят.
- `[x]` PostgreSQL/Fastify integration расширен реальным owner-flow: owner создаёт branch-scoped invitation, приглашённый пользователь принимает её, затем owner отзывает membership; branch access suite — **7/7**.
- `[~]` Реальный staging multi-user replay, ручная проверка подтверждения приглашения на устройстве и exhaustive permission matrix для всех ролей остаются частью `ADD-C06`; локальный integration не подменяет production evidence.

### Результат шестьдесят седьмой исполняемой порции (29.08.2026)

- `[x]` Добавлен отдельный authenticated-экран `/owner/invitations/accept`: токен берётся из ссылки или вводится вручную, пустой токен валидируется локально, поле блокируется на время запроса, а ошибка показывает отдельные состояния для истёкшего, отозванного/использованного и приглашения на другой email.
- `[x]` После успешного принятия экран показывает роль и область доступа без раскрытия токена и даёт безопасную ссылку в рабочее пространство конкретного автосервиса; маршрут намеренно остаётся в `PublicLayout`, чтобы новый manager/staff не упирался в owner workspace guard до создания membership.
- `[x]` Ответ mutation типизирован как `AutoCareProviderInvitationAcceptResponse`; после принятия инвалидируются `OWNER_LIST` и `WORKSPACE_ACCESS`. Mock API сохранён в parity и содержит детерминированное branch-scoped приглашение для seeded staff-аккаунта `ilya.orlov@proservice.test`.
- `[x]` Маршрут добавлен в `ROUTES`, lazy route group, Next exact-route contract, route inventory и Chromium direct-route smoke; `check:next-route-inventory` (**57 constants**) и `check:next-route-contract` (**5/5**) проходят.
- `[x]` Добавлены UI-регрессии приглашения: успешное принятие и provider-link, обязательный токен, expired-состояние — **3/3**; полный frontend Vitest — **114 файлов / 398 тестов PASS**, TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` — PASS. Playwright Chromium найден в `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
- `[~]` Полный Next browser smoke в текущем sandbox не стартует из-за `listen EPERM` на `127.0.0.1:4173`; ручное подтверждение приглашения на реальном устройстве, отправка email и staging multi-user replay остаются внешними gates `ADD-C06`.

### Результат шестьдесят восьмой исполняемой порции (29.08.2026)

- `[x]` Публичная страница сервиса теперь различает отсутствие профиля и временную приостановку: пустой ответ показывает empty-state профиля, а `423/ACCOUNT_SUSPENDED` — отдельное сообщение о временной недоступности без раскрытия внутренних причин.
- `[x]` Для сетевой/серверной ошибки сохраняется retry с тем же маршрутом, а `401/SESSION_EXPIRED` отображается как отдельное состояние с предложением повторно войти; добавлены регрессии для empty, suspended, retry и expired-session — **4/4**.
- `[x]` API-профиль поддерживает маркер `partial`; mock-профиль возвращает его для сценария `partial`, а страница показывает неблокирующее предупреждение с повторной загрузкой поверх уже доступных данных.
- `[x]` Mock availability использует общий `mockState` контракт (`offline`, `error`, `stale`, `permission-denied`, `suspended`, `expired-session`), поэтому форма записи и публичный профиль проверяются одинаковыми UI-state сценариями.
- `[x]` Quality gate: полный frontend Vitest — **115 файлов / 402 теста PASS**, focused provider/state tests — **4 файла / 35 тестов PASS**, TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` — PASS.
- `[~]` Полный real API/staging state replay, ручные device/VoiceOver проверки и доказательство фактической session-expiry/offline доставки остаются внешними gates `ADD-C02…C04`; локальные mock-регрессии не переводят эти пункты в production `[x]`.

### Результат шестьдесят девятой исполняемой порции (30.08.2026)

- `[x]` Добавлен единый `npm run check:local-mvp`: он последовательно запускает lint, frontend tests, Next/backend builds, API/route/state/security/loading/design/interaction contracts, legacy guards, Chromium availability и `git diff --check` без shell-интерпретации аргументов.
- `[x]` Static-only evidence прошёл **20/20** проверок; redacted summary содержит только короткие хвосты вывода и короткий commit SHA, а credentials, Bearer-токены и email автоматически заменяются на `[REDACTED]`/`[EMAIL]`.
- `[~]` Полный gate после успешной сборки пытается поднять Next release server на ephemeral loopback-порту и выполнить responsive matrix. В текущем sandbox выделение порта отклонено `listen EPERM`; это ограничение окружения, поэтому runtime/device evidence не объявляется зелёным.
- `[x]` Добавлен `docs/architecture/legacy-file-classification.json` и `npm run check:legacy-files`: 1 889 tracked files сверены, 75 legacy/compatibility кандидатов получили disposition и причину сохранения; неизвестные кандидаты fail-closed.
- `[x]` `check:legacy-cleanup` и `check:no-bookly-runtime` интегрируют новый классификатор; regression checks **4/4** (legacy classification 1/1, local gate 3/3) и `git diff --check` проходят.
- `[~]` Единственный `candidate_review` — неиспользуемый wellness-asset в `public/images/cabinets`; он не удалён автоматически, так как требуется подтверждение внешних ссылок/исторических документов. Immutable migrations и архивы намеренно сохранены.

### Результат семидесятой исполняемой порции (30.08.2026)

- `[x]` Для локального client path добавлены компонентные регрессии `AutoCareReviewResolutionPanel`: redemption service code, одноразовое редактирование отзыва, retryable error и loading/skeleton state — **3/3**.
- `[x]` `npm run check:client-path` подтверждает snapshot автомобиля, quote/booking history, bonus earn/redeem/refund/expiry/history и review-resolution wiring; все семь source-контрактов PASS.
- `[x]` `npm run lint -- --max-warnings=0` и `git diff --check` проходят после добавления тестов; production UI и mock contracts не менялись.
- `[~]` Реальный API/staging redemption, expiry/refund lifecycle, edit-review moderation и ручные device/VoiceOver проверки остаются внешним gate раздела 2; локальная component-regression не подменяет его.

### Результат семьдесят первой исполняемой порции (30.08.2026)

- `[x]` Утверждён и применён вариант A типографики: Commissioner используется для display/брендовых акцентов, IBM Plex Sans — для основного текста, форм и данных.
- `[x]` Оба шрифта подключены локально через `@fontsource-variable`; внешний CDN и прежние неиспользуемые зависимости Manrope/Space Grotesk удалены. Обе гарнитуры содержат Cyrillic и Latin glyphs, поэтому язык не переключает display-шрифт.
- `[x]` Обновлены общие `--font-display`, `--font-body`, `--font-heading`, SVG-логотип и заголовок карты результатов; компонентные стили продолжают использовать design tokens.
- `[x]` Добавлен `docs/design/font-license-contract.md` с версиями, правилами обновления и ссылками на OFL; `check:design-tokens` теперь проверяет импорты, токены, зависимости и наличие license contract.
- `[x]` Проверки после изменения: `npm run check:design-tokens`, `npm run lint -- --max-warnings=0`, `npx tsc --noEmit`, `npm run build`, `git diff --check` — PASS.
- `[~]` Визуальную проверку кириллических заголовков и веса шрифта на реальных устройствах нужно подтвердить в ручном responsive/VoiceOver проходе; это не меняет локальный font contract.

### Результат семьдесят третьей исполняемой порции (30.08.2026)

- `[x]` Исправлен языковой разнобой варианта A: Space Grotesk заменён на Commissioner, у которого есть официальные Cyrillic и Latin subsets; русские заголовки больше не fallback-ятся в другой display-гарнитуре.
- `[x]` Токены `--font-heading`/`--font-display`, SVG-логотип и font-license contract синхронизированы с Commissioner; IBM Plex Sans сохранён для body/form/data ролей.
- `[x]` `check:design-tokens` теперь требует Commissioner import/token и обе локальные font dependencies, поэтому возврат Latin-only display-шрифта будет обнаружен автоматически.
- `[x]` Проверки после замены: `npm run check:design-tokens`, `npm run lint -- --max-warnings=0`, `npx tsc --noEmit`, `npm run build`, `npm test -- --run`, `git diff --check` — PASS.
- `[~]` Финальная pixel-проверка русских/английских заголовков на реальных устройствах остаётся ручным responsive gate; fallback между языками в CSS больше не используется.

### Результат семьдесят второй исполняемой порции (30.08.2026)

- `[x]` Backup script теперь работает с `umask 077`, поэтому архив, checksum и marker создаются закрытыми для других пользователей процесса.
- `[x]` Добавлен fail-closed guard для выделенной backup-директории: корень, `.`/`..` и symbolic-link директории отклоняются; retention cleanup выполняется только после проверки marker-файла.
- `[x]` Архивирование стало атомарным: encrypted output сначала пишется во временный файл и затем заменяется через `mv`; checksum создаётся и заменяется таким же способом.
- `[x]` Для локального backup добавлен preflight обязательных утилит и явная ошибка при отсутствии `pg_dump`, если Docker PostgreSQL недоступен.
- `[x]` Restore отвергает symbolic-link archive/checksum, требует checksum до начала `psql` и проверяет имя целевой БД как безопасный PostgreSQL identifier.
- `[x]` Restore по-прежнему блокирует восстановление поверх текущей БД без явного разрешения и теперь применяет `--single-transaction`/`ON_ERROR_STOP=1`.
- `[x]` Обновлена usage-подсказка restore для `.sql.gz` и `.sql.gz.enc`; unencrypted режим остаётся только с явным local opt-out.
- `[x]` Добавлен `docs/operations/BACKUP_RESTORE_EVIDENCE_TEMPLATE.md` с обязательными полями checksum, изолированная цель, RPO/RTO, migration/media/health smoke и follow-up.
- `[x]` `check:ops-harness` расширен до пяти файлов и проверяет новые backup/restore safety controls; shell syntax, tooling tests и server build проходят.
- `[~]` Внешний encrypted vault, WAL/PITR, расписание, alert delivery и timed staging restore по-прежнему не закрыты локальным кодом и остаются `ADD-C13`/§2.1 infrastructure gates; `check:production-operations` корректно оставляет их blocked/manual.

### Результат семьдесят четвёртой исполняемой порции (30.08.2026)

- `[x]` Исправлены четыре deletion-invariant запроса для вложений, сообщений, жалоб и блокировок: область аккаунта определяется устойчивыми `thread.clientId`/`thread.createdById`, а не изменяемым текстом темы.
- `[x]` Добавлены отдельные проверки удаления actor-ссылок для audit logs, service-request transitions, provider/catalog reviewers, appeal deciders, chat-report reviewers, guarantee resolvers и expert answerers.
- `[x]` Добавлены post-deletion guards для anonymized chat threads: остаточные attachment metadata, message payloads, report payloads и block reasons больше не проходят retention checker незамеченными.
- `[x]` Проверка параметров invariant стала fail-closed regression: chat ownership checks принимают только `userId`, а text-redaction checks явно используют второй параметр.
- `[x]` Unit-конфигурация теперь включает private attachment-storage regression; storage key traversal, quarantine cleanup policy, content validation и deletion-invariant SQL — **3 файла / 17 тестов PASS**.
- `[x]` Backend production build (`tsc -p tsconfig.json`) и `git diff --check` проходят после security/retention изменений.
- `[~]` Реальный PostgreSQL deletion replay с чатами, staging object-store lifecycle и retention после production account deletion требуют инфраструктуры; эти доказательства по-прежнему остаются частью `ADD-C07`, `ADD-C12` и §2.1.

### Результат семьдесят пятой исполняемой порции (30.08.2026)

- `[x]` Исправлена эксплуатационная инструкция Redis: production outage теперь явно описан как fail-closed с `503`, без process-local fallback; локальный fallback разрешён только для development/test.
- `[x]` Production-operations harness получил отдельный контракт, который сверяет incident runbook с кодом rate limiter и не позволит вернуть небезопасную формулировку при следующих изменениях.
- `[x]` Regression `check:production-operations` проходит на полной конфигурации контрактов; секреты и значения окружения не выводятся.
- `[x]` Backend unit suite остаётся зелёной: **181 файл / 566 тестов PASS**; backend build и `git diff --check` проходят.
- `[~]` Реальный multi-process Redis failover, alert delivery и staging telemetry по-прежнему требуют инфраструктуры и остаются внешней частью `ADD-C09`.

### Результат семьдесят шестой исполняемой порции (30.08.2026)

- `[x]` Production preflight теперь принимает `CABINET_UPLOADS_DIR` только как явный абсолютный non-root путь; пустые, относительные и корневые директории блокируются до запуска.
- `[x]` Добавлена regression-проверка безопасного media path (**1/1**) и обновлена operations-документация с тем же требованием.
- `[x]` `check:production-operations` и полный backend unit suite остаются зелёными; секреты окружения в отчёте не раскрываются.
- `[x]` Общий `npm run check:local-mvp -- --static-only` после изменений прошёл **20/20** source/build/security/design checks; единственный оставшийся пункт — ручная responsive browser matrix.
- `[~]` Фактическая durability mount, object-store ACL/lifecycle и multi-process operations rehearsal всё ещё требуют staging/production evidence.

### Результат семьдесят седьмой исполняемой порции (30.08.2026)

- `[x]` В карточках автосервисов на главной зафиксированы одинаковые вертикальные зоны: заголовок, рейтинг, адрес, цена и ближайшая запись больше не зависят от длины названия или адреса.
- `[x]` Длинные названия и адреса ограничены двумя строками, а иконки и бейджи не сжимаются; кнопка и ссылка остаются выровненными по нижнему краю карточек.
- `[x]` Цена/скидка и блок ближайшей записи получили зарезервированную высоту, поэтому карточки с разным контентом не создают визуальный «скачок» текста.
- `[x]` Frontend lint, production build и полный Vitest после изменения проходят: **116 файлов / 405 тестов PASS**.
- `[~]` Ручная pixel-проверка на реальных устройствах и браузерная responsive matrix остаются частью финального `ADD-C03` evidence.

### Результат семьдесят восьмой исполняемой порции (30.08.2026)

- `[x]` Выбор фото в форме заявки переведён на единый helper с allow-list MIME-типов и лимитом 10 МБ на файл; неподдерживаемые и слишком большие файлы не попадают в payload.
- `[x]` Лимит вложений формы заявки зафиксирован на шести изображениях; лишние файлы не теряются молча, а показывают пользователю понятное предупреждение.
- `[x]` Для отклонённых вложений добавлено доступное состояние `role="alert"` с количеством пропущенных файлов и причиной; состояние связано с input через `aria-describedby` и `aria-invalid`.
- `[x]` После нового выбора файлов предупреждение пересчитывается, а при чистом выборе сбрасывается; input reset позволяет повторно выбрать тот же файл после исправления.
- `[x]` Тексты ошибок вложений добавлены для RU и EN; остальные локали используют безопасный fallback без появления ключа в UI.
- `[x]` В owner-очереди отправка сметы больше не завершается без обратной связи при пустой/нулевой/некорректной итоговой сумме.
- `[x]` Поле итоговой суммы сметы получило локализованные placeholder и `aria-label`; ошибки валидации и API объявляются как `role="alert"`.
- `[x]` Добавлены регрессии helper выбора вложений: валидные/невалидные и слишком большие файлы, лимит шести файлов и пустой выбор — **3/3**.
- `[x]` Полный frontend Vitest после порции: **117 файлов / 408 тестов PASS**; TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Реальный AV/S3 pipeline, staging upload и ручная проверка VoiceOver/устройств остаются внешними gates `ADD-C07` и `ADD-C03`; локальная валидация не подменяет их.

### Результат семьдесят девятой исполняемой порции (30.08.2026)

- `[x]` Super-admin market profile теперь нормализует локали и ISO-валюту на клиенте до отправки запроса.
- `[x]` Основная локаль обязана присутствовать в списке поддерживаемых; пустой список и несовпадающие значения блокируются с понятной ошибкой.
- `[x]` Дубли локалей удаляются до формирования payload, чтобы форма не отправляла заведомо некорректную конфигурацию.
- `[x]` Legal links в market profile принимают только абсолютные HTTP(S)-адреса; `javascript:`, `ftp:` и повреждённые значения отклоняются до API.
- `[x]` Локализованные названия стран/зон очищаются от пробелов вокруг ключей и значений перед сохранением.
- `[x]` Формы городов и зон блокируют `NaN`, координаты вне диапазонов, отрицательный радиус и некорректный порядок отображения до отправки.
- `[x]` Координаты города/зоны должны задаваться парой; одиночная широта или долгота показывают ошибку вместо частичного payload.
- `[x]` Добавлены unit-регрессии market hierarchy utils: нормализация, locale mismatch, URL safety, очистка названий и числовые границы — **4/4**.
- `[x]` Полный frontend Vitest после порции: **118 файлов / 412 тестов PASS**; TypeScript, ESLint `--max-warnings=0` и Next production build проходят.
- `[~]` Сохранение CRUD на real API/staging, проверка прав super-admin и ручная accessibility/device-приёмка остаются внешними gates разделов 1–2 и `ADD-C06`.

### Результат восьмидесятой исполняемой порции (30.08.2026)

- `[x]` Начисление бонусов владельцем больше не завершается молча при пустом клиенте, дробном/нулевом количестве или короткой причине.
- `[x]` Для формы ручного начисления добавлена единая pure-проверка с диапазоном **1–100 000** баллов и длиной причины **3–240** символов.
- `[x]` Ошибка начисления показывается как доступный `role="alert"`, а после исправления сбрасывается без потери остальных введённых значений.
- `[x]` `aria-invalid` теперь выставляется только на поле, которое не прошло проверку, а не на всю форму целиком.
- `[x]` Валидированный payload нормализует пробелы в причине и не отправляет частичное начисление в mutation.
- `[x]` Добавлены регрессии manual bonus grant: успешная нормализация, первое ошибочное поле и граничные значения — **3/3**.
- `[x]` Полный frontend Vitest после порции: **119 файлов / 415 тестов PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[x]` Локальный бонусный UI остаётся совместимым с существующими idempotency/audit API и не меняет лимиты сервера.
- `[~]` Реальный staging redemption/refund/expiry lifecycle и проверка удаления бонусных данных после account deletion остаются внешними gates `ADD-C12` и раздела 2.

### Результат восемьдесят первой исполняемой порции (30.08.2026)

- `[x]` Правила длины описания для экспертного вопроса и мультизапроса синхронизированы с backend: от **10** до **4 000** символов.
- `[x]` Общий helper нормализует текст до отправки и возвращает явную причину ошибки для пустого, короткого или слишком длинного значения.
- `[x]` Экспертный вопрос больше не отправляет короткий текст в API; пользователь получает доступное inline-сообщение вместо неясной серверной ошибки.
- `[x]` Мультизапрос сервисам получил такую же проверку и предупреждение, включая визуальное состояние поля с ошибкой.
- `[x]` Поля описания получили `required`, `minLength`, `maxLength`, `aria-invalid` и `aria-describedby`.
- `[x]` Ошибка очищается после исправления значения без сброса введённого текста.
- `[x]` Тексты валидации добавлены для RU и EN; остальные локали используют fallback существующей схемы переводов.
- `[x]` Добавлены unit-регрессии пустого, короткого, валидного и слишком длинного описания — **3/3**.
- `[x]` Полный frontend Vitest после порции: **120 файлов / 418 тестов PASS**; TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Реальный API/staging replay и ручная проверка экранных дикторов остаются внешними evidence-gates `ADD-C02…C04`.

### Результат восемьдесят второй исполняемой порции (30.08.2026)

- `[x]` Общий чат и чат заявки используют единый клиентский валидатор вложений с allow-list MIME-типов и лимитом 10 МБ; неподдерживаемые, отсутствующие и слишком большие файлы отклоняются до mutation.
- `[x]` Generic chat теперь обрабатывает reject от upload API/чтения файла, очищает input после каждого выбора и показывает доступную ошибку `role="alert"` через `aria-describedby`.
- `[x]` Чат заявки сохраняет существующее inline-состояние ошибки и также очищает input после невалидного, успешного или ошибочного upload, поэтому повторный выбор того же файла работает предсказуемо.
- `[x]` Payload обоих чатов получает `contentType` только из проверенного allow-list; UI-валидация не позволяет отправить частичное описание файла.
- `[x]` Добавлены регрессии общего attachment helper: webp проходит, missing/unsupported отклоняются, oversized отклоняется — **3/3**.
- `[x]` Полный frontend Vitest после порции: **121 файл / 421 тест PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Private S3/object storage, AV/quarantine, signed URLs, EXIF removal, retention и staging upload evidence остаются критичными внешними gates `ADD-C03…C05`; локальный helper их не заменяет.

### Результат восемьдесят третьей исполняемой порции (30.08.2026)

- `[x]` В общем чате обработан rejected send: временная ошибка API больше не становится необработанным Promise rejection или белым экраном.
- `[x]` Неотправленный текст сохраняется в textarea после сбоя, поэтому пользователь может повторить отправку без повторного ввода сообщения.
- `[x]` Ошибка отправки показывается через доступный `role="alert"`; поле сообщения получает `aria-invalid`/`aria-describedby`, а ошибка очищается сразу после редактирования черновика.
- `[x]` File input общего чата получает локализованную доступную подпись и отключается на время отправки/загрузки; повторный выбор файла остаётся безопасным.
- `[x]` Добавлены компонентные регрессии Generic Chat: сохранение draft + send error и очистка ошибки после редактирования — **2/2**.
- `[x]` Полный frontend Vitest после порции: **122 файла / 423 теста PASS** (запуск с ограничением двух worker-потоков для стабильности окружения).
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Реальный multi-process Redis/WebSocket reconnect, moderation queue, private object storage и staging AV/signed URL/retention остаются внешними критичными gates `ADD-C03…C09`.

### Результат восемьдесят четвёртой исполняемой порции (30.08.2026)

- `[x]` Форма предложения сервиса получила клиентскую проверку, синхронизированную с API: название 2–160 символов, описание до 4 000, скидка 1–100%, купон по allow-list и сумма альтернативы в безопасном диапазоне.
- `[x]` Значения предложения нормализуются до mutation: пробелы удаляются, купон приводится к верхнему регистру, сумма переводится в minor units, пустые необязательные поля отправляются как `null`.
- `[x]` Некорректные предложения блокируются до запроса и показывают локализованную доступную ошибку вместо молчаливого `return` или невалидного `NaN` payload.
- `[x]` Добавлены pure-регрессии для скидки, купона, альтернативной цены, граничных значений и пустых/слишком длинных полей — **5/5**.
- `[x]` Полный frontend Vitest после порции: **123 файла / 428 тестов PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Реальный quote/offer replay, повторное принятие и staging multi-client concurrency остаются внешними gates раздела 2.3 и `ADD-C08`.

### Результат восемьдесят пятой исполняемой порции (30.08.2026)

- `[x]` Ограничения текста отзыва синхронизированы с backend: от **10** до **1 000** символов вместо прежнего клиентского лимита 4 000.
- `[x]` Общая pure-проверка отзыва валидирует рейтинг 1–5, нормализует пробелы и блокирует короткий/слишком длинный текст до create/update mutation.
- `[x]` Форма нового отзыва сохраняет введённый текст при API-сбое, показывает доступную ошибку и связывает ошибочное поле с `aria-describedby`.
- `[x]` Редактор отзыва после решения сервиса использует тот же validator, ограничивает textarea `maxLength=1000` и очищает ошибку после исправления.
- `[x]` Добавлены регрессии review input: нормализация, границы рейтинга и границы длины текста — **3/3**.
- `[x]` Полный frontend Vitest после порции: **124 файла / 431 тест PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Реальный API/staging edit-review, moderation evidence, review photos и VoiceOver/device-приёмка остаются внешними gates раздела 2 и `ADD-C02…C04`.

### Результат восемьдесят шестой исполняемой порции (30.08.2026)

- `[x]` В форму создания автосервиса добавлена единая pure-валидация до любых upload-запросов: обязательные строки, числовые диапазоны и лимиты синхронизированы с `ownerAutoCareProviderSchema` backend.
- `[x]` Нормализованные значения (пробелы, числа, контакты и описания) используются в итоговом payload; дубли телефонов удаляются, а превышение лимита пяти номеров блокируется до mutation.
- `[x]` Приватные документы больше не отбрасываются молча: неполная ссылка, неверный формат или дата отклоняются до загрузки медиа; дата из `input[type=date]` преобразуется в ISO datetime, который принимает backend.
- `[x]` Добавлена проверка URL, email, лимитов документов и специализаций брендов; поля получили `minLength`/`maxLength`/`step`, чтобы браузер и API применяли одинаковые границы.
- `[x]` Ошибка формы объявляется через `role="alert"`, связывается с основными полями через `aria-describedby`, а после редактирования/изменения выбора очищается без потери черновика.
- `[x]` Добавлены локализованные сообщения валидации для RU и EN; остальные локали используют fallback общей схемы переводов.
- `[x]` Добавлены unit-регрессии формы владельца: нормализация и expiry-дата, обязательные поля/целые диапазоны, контакты и evidence — **3/3**.
- `[x]` Полный frontend Vitest после порции: **125 файлов / 434 теста PASS**; TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Реальная проверка owner onboarding на staging, атомарное удаление уже загруженных media при частичном upload-сбое и AV/S3 lifecycle остаются внешними gates `ADD-C03…C05`.

### Результат восемьдесят седьмой исполняемой порции (30.08.2026)

- `[x]` Добавлена компонентная регрессия owner onboarding: невалидные данные после trim показывают доступную ошибку формы и не запускают ни один logo/media upload или создание профиля.
- `[x]` Поведение проверено на mock-совместимом market id, поэтому тест не требует PostgreSQL, storage или внешних secrets и защищает локальный MVP-путь от частично созданных медиа.
- `[x]` Полный frontend Vitest после порции: **126 файлов / 435 тестов PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Повторная отправка после уже успешного частичного upload и атомарная уборка orphan media всё ещё требуют server/storage lifecycle (`ADD-C03…C05`); текущая защита гарантирует отсутствие upload при ошибке базовых полей.

### Результат восемьдесят восьмой исполняемой порции (30.08.2026)

- `[x]` Owner form теперь читает выбранные изображения напрямую из `input.files`; это сохраняет реальные `File`-метаданные и не зависит от сериализации файлов в `FormData`.
- `[x]` Ошибки подготовки/загрузки логотипа, обложки и галереи показываются inline через `role="alert"` и `aria-describedby`; введённые текстовые значения и выбранные файлы остаются доступными для повторной попытки.
- `[x]` Ошибка отмечается только на стадии media upload; обычный отказ создания профиля не маскируется сообщением об изображениях.
- `[x]` Добавлена компонентная регрессия сбоя подготовки логотипа: upload и create не вызываются, alert отображается, черновик формы сохраняется — **2/2** теста owner form.
- `[x]` Полный frontend Vitest после порции: **126 файлов / 436 тестов PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Повторное использование уже загруженных URL и уборка orphan media после частичного server/storage сбоя требуют отдельного private S3 lifecycle и остаются внешним gate `ADD-C03…C05`.

### Результат восемьдесят девятой исполняемой порции (30.08.2026)

- `[x]` Owner onboarding кэширует успешные upload-URL по стабильному ключу файла (имя, размер, дата изменения и MIME), пока профиль не создан.
- `[x]` Повтор после временного отказа `createProvider` переиспользует логотип/обложку и отдельные элементы галереи; уже загруженные файлы не отправляются повторно.
- `[x]` При выборе нового файла соответствующий кэш сбрасывается, а при очистке/успешном сохранении/отбрасывании черновика кэш полностью удаляется.
- `[x]` Загрузка галереи стала последовательной и сохраняет успешные элементы по одному, поэтому retry продолжает с первого незагруженного файла после частичного сбоя.
- `[x]` Добавлен component regression retry-сценария: один upload, две попытки создания профиля, без повторной отправки файла — **3/3** теста owner form.
- `[x]` Полный frontend Vitest после порции: **126 файлов / 437 тестов PASS**; TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Кэш не заменяет server-side cleanup: удаление orphan objects после upload/создания и multi-process storage lifecycle требуют private S3 evidence и остаются `ADD-C03…C05`.

### Результат девяностой исполняемой порции (30.08.2026)

- `[x]` Политика очистки provider logo/cover/gallery теперь выбирает самые старые orphan-файлы первыми, а при одинаковой дате использует стабильный порядок имени; bounded batch больше не зависит от порядка `readdir` и гарантированно сходится к удалению старых объектов.
- `[x]` Добавлена regression-проверка порядка retention-кандидатов и tie-breaker; orphan-media policy: **3/3** теста PASS.
- `[x]` Запись provider logo/cover/gallery стала атомарной и fail-safe: каталог создаётся с `0700`, временный файл открывается эксклюзивно с `0600`, затем заменяется через `rename`; при ошибке временный файл удаляется.
- `[x]` Публичная выдача provider logo/cover/gallery больше не следует symlink и не отдаёт каталог/специальный файл; добавлены regressions для logo/media storage — **4/4** теста PASS.
- `[x]` Изменение не расширяет область удаления: по-прежнему учитываются только валидные `.webp`, отсутствующие в списке ссылок и старше grace period, с жёстким лимитом 200 файлов за запуск.
- `[~]` Реальный S3 lifecycle, multi-process cleanup и staging retention evidence остаются внешними gates `ADD-C03…C05`; локальная политика не подменяет их.

### Результат девяносто первой исполняемой порции (30.08.2026)

- `[x]` Account-deletion flow теперь собирает media-ссылки принадлежащих удаляемому владельцу provider-профилей до anonymization и удаляет logo/cover/gallery объекты через безопасные idempotent storage helpers.
- `[x]` После завершения удаления owner-owned provider остаётся suspended/detached, но его публичные media-ссылки очищены (`logoUrl`, `coverImageUrl`, `galleryImageUrls`), поэтому старые URL не удерживаются БД и не блокируют orphan cleanup.
- `[x]` Удаление media выполняется до DB commit: ошибка storage прерывает транзакцию, сохраняя ссылки для повторного запуска; отсутствующий объект считается успешным idempotent удалением.
- `[~]` Account-deletion integration fixture расширен реальными normalized provider images и проверяет, что после удаления все три объекта недоступны; файл подключён к явному integration test config, но запуск заблокирован отсутствием локальных PostgreSQL/Redis/JWT prerequisites.
- `[x]` TypeScript, root lint, backend build и локальные storage regressions (**7/7**) проходят.
- `[~]` Фактический PostgreSQL account-deletion replay, S3 lifecycle/retention и backup/restore после удаления требуют staging credentials и остаются внешними gates `ADD-C07`, `ADD-C12` и §2.1.

### Результат девяносто второй исполняемой порции (30.08.2026)

- `[x]` Provider logo/cover/gallery read-path теперь отклоняет не только symlink, но и обычный файл, превышающий соответствующий лимит (logo **1 МБ**, media **6 МБ**) до чтения в память или открытия stream.
- `[x]` Oversized-file regressions добавлены для async и stream выдачи; storage/security suite: **9/9** тестов PASS.
- `[x]` Лимит чтения совпадает с лимитом нормализованной записи, поэтому повреждённый файл на persistent volume не превращается в uncontrolled memory allocation.
- `[~]` Проверка S3 object metadata/size и фактическая нагрузка staging остаются внешними media gates `ADD-C03…C05`.

### Результат девяносто третьей исполняемой порции (30.08.2026)

- `[x]` Legacy filesystem storage кабинета теперь пишет изображения атомарно: каталог создаётся с `0700`, временный файл открывается эксклюзивно с `0600`, затем объект заменяется через `rename`.
- `[x]` Чтение legacy cabinet images перед открытием stream проверяет `lstat`, отбрасывает symlink/каталоги и файлы больше **1 МБ**; список объектов также использует `lstat` и не учитывает подменённые ссылки.
- `[x]` Добавлены regressions для symlink и oversized cabinet image; filesystem storage suite: **5/5** тестов PASS.
- `[x]` TypeScript, root ESLint `--max-warnings=0`, backend build, полный backend unit (**183 файла / 574 теста**) и `git diff --check` проходят.
- `[~]` Надёжность persistent cabinet volume, private object storage, AV/quarantine, signed URLs и staging media evidence остаются внешними критичными gates `ADD-C03…C05`.

### Результат девяносто четвёртой исполняемой порции (30.08.2026)

- `[x]` Account deletion теперь обрабатывает legacy cabinets: все кабинеты удаляемого владельца переводятся в `blocked`, их публичные `photos` очищаются, а связанные uploaded image/thumbnail/preview objects удаляются до завершения транзакции.
- `[x]` Добавлен deletion invariant `legacy cabinets are blocked and images removed`; он не позволяет завершить удаление аккаунта, пока старый кабинет остаётся публичным или удерживает фотографии.
- `[x]` Интеграционная retention-fixture расширена legacy cabinet и normalized image, чтобы PostgreSQL replay проверял блокировку кабинета и недоступность исходного объекта после удаления аккаунта.
- `[x]` Regression проверки: account-deletion invariants + filesystem storage **9/9**, полный backend unit **183 файла / 575 тестов**, TypeScript, ESLint, backend build и `git diff --check` проходят.
- `[~]` Реальный PostgreSQL account-deletion replay с legacy cabinet, durable object-store lifecycle и staging retention остаётся внешним gate `ADD-C07`, `ADD-C12`.

### Результат девяносто пятой исполняемой порции (30.08.2026)

- `[x]` Private AutoCare attachment filesystem writes now use dedicated `0700` directories, exclusive `0600` temporary files and atomic `rename`; temporary files are removed on failed writes.
- `[x]` Filesystem attachment reads, listings and deletes reject symlink/non-file objects, parent-directory symlink traversal and files over **10 MB** before content is exposed or loaded.
- `[x]` S3 attachment reads now enforce the same **10 MB** bound from both `ContentLength` and bounded body streaming; signed downloads remain private and use `no-store` cache headers with the stored content type.
- `[x]` Quarantine/private S3 objects keep SHA-256 metadata and server-side encryption through the promotion copy; the existing quarantine cleanup policy remains bounded and idempotent.
- `[x]` Added regressions for filesystem permissions, temporary-file cleanup, symlink reads and oversized objects; AutoCare attachment storage suite: **8/8** tests PASS.
- `[x]` TypeScript, root ESLint `--max-warnings=0`, Next production build, backend build, full backend unit (**183 files / 579 tests**) and `git diff --check` pass.
- `[~]` Actual S3 ACL/bucket-policy verification, multi-process upload/read smoke, ClamAV quarantine and staging retention evidence remain external critical gates `ADD-C03…C05`, `ADD-C07`.

### Результат девяносто шестой исполняемой порции (30.08.2026)

- `[x]` Backup archives now include a per-run suffix (`timestamp + pid + random`) so concurrent jobs cannot overwrite an archive created in the same second.
- `[x]` Backup checksums record only the archive basename; restore verifies the checksum from the archive directory, so an archive and its checksum can be moved together into an isolated restore workspace.
- `[x]` Backup preflight checks the encryption dependency only when encrypted output is requested; unencrypted local exercises no longer require an unused OpenSSL binary. Restore applies the same conditional dependency check.
- `[x]` Added an executable backup/restore regression with fake `pg_dump`/`psql`: two runs produce distinct archives, the checksum remains portable after relocation, and restore validates it before invoking the database client.
- `[x]` Ops harness and regression suite: **9/9** tests PASS; `bash -n` syntax checks pass for both scripts; root ESLint `--max-warnings=0` and `git diff --check` pass.
- `[~]` Real encrypted backup/restore, WAL/PITR, immutable off-site retention, RPO/RTO measurement and restore approval remain external gate §2.1 / `ADD-C07`.

### Результат девяносто седьмой исполняемой порции (30.08.2026)

- `[x]` Добавлен source-level authorization contract для AutoCare owner API: каждый `GET /owner/*` должен пройти `requireAuth` или `requireVerifiedEmail`, а каждая mutation-route — `requireVerifiedEmail`; новый route без auth теперь fail-closed в quality gate.
- `[x]` Контракт охватывает все **42** owner AutoCare endpoints (заявки, цены/предложения, отзывы, чаты, media/evidence, bonuses, members, analytics и capacity).
- `[x]` Добавлены synthetic regressions на unsafe mutation и не-owner route — **3/3** теста PASS.
- `[x]` `npm run check:owner-route-auth`, `npm run test:owner-route-auth`, root ESLint `--max-warnings=0` и `git diff --check` проходят.
- `[~]` Source contract не заменяет real PostgreSQL multi-user branch replay: проверка разделения чужих филиалов и полная endpoint-матрица в staging остаются `ADD-C01`, `ADD-C02` и external gate §1.6.

### Результат девяносто восьмой исполняемой порции (30.08.2026)

- `[x]` Админские moderation/evidence, appeals и provider change-request панели больше не оставляют отказ mutation необработанным: ошибка показывается в `role="alert"`, а кнопки не отмечают решение как успешное.
- `[x]` Ошибки decision в moderation evidence, appeals, provider changes, chat reports и catalog gap queue теперь имеют локализованный retryable feedback; catalog definition save больше не порождает unhandled promise rejection.
- `[x]` Фокусные админские Vitest: **2 файла / 5 тестов PASS**; TypeScript, ESLint `--max-warnings=0` и `git diff --check` проходят.
- `[x]` Повторный `npm run check:local-mvp -- --static-only` прошёл все **21** автоматический check, включая Next/backend build, owner auth, loading/state/client contracts и тесты; единственным оставшимся шагом был намеренно помеченный manual responsive gate.
- `[~]` Реальные admin API отказы, повторное решение и полная moderation/audit цепочка на staging остаются external gate §2.2 и `ADD-C11`.

### Результат девяносто девятой исполняемой порции (30.08.2026)

- `[x]` Generic/home/services boot shell помечает основной loading-region как `aria-busy="true"` с локализованной подписью, поэтому fallback объявляется доступным main-landmark вместо безымянного skeleton.
- `[x]` Loading-shell contract теперь проверяет, что public, workspace, admin и auth layouts используют общие shape-matched `PageContentSkeleton`/`AutoCareResultsRouteSkeleton` с тематическими поверхностями, а не текстовый loader.
- `[x]` `npm run check:loading-shell`, regression suite, TypeScript, ESLint `--max-warnings=0`, Next build и `git diff --check` проходят.
- `[~]` Полный браузерный прогон переходов между всеми layout loading-состояниями и real-device visual verification остаются ручным gate: sandbox не разрешает привязку Playwright loopback-порта (`listen EPERM`).

### Результат сотой исполняемой порции (30.08.2026)

- `[x]` Loading-shell contract разделён по layout-файлам: public, owner, admin и auth fallback теперь проверяются независимо, поэтому отсутствие skeleton-контракта в одном из layout больше не скрывается агрегированной проверкой.
- `[x]` Для public layout отдельно проверяется discovery-shaped `AutoCareResultsRouteSkeleton` и generic `PageContentSkeleton`; workspace и auth layouts обязаны сохранять соответствующую тему (`workspace`/`auth`).
- `[x]` `npm run check:loading-shell`, regression suite и `git diff --check` проходят: **15/15** source controls и **2/2** regression tests.
- `[~]` Реальный браузерный переход с искусственной задержкой для каждого layout и visual/device evidence остаются ручным gate из-за ограничения sandbox (`listen EPERM`).
