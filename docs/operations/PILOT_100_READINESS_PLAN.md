# AutoCare Hub — план готовности к пилоту 100%

**Статус:** журнал доказательств и история исполнения
**Обновлён:** 30 августа 2026 — тройная сверка кода, проверок и операционных документов
**Владелец плана:** команда AutoCare Hub
**Финальный go/no-go источник:** [`PILOT_SCOPE_FREEZE.md`](./PILOT_SCOPE_FREEZE.md). Этот документ сохраняет исторические порции и команды как доказательства, но не меняет фиксированный scope и проценты без явной новой версии freeze.

> 05.09.2026: финальная ревизия v2 завершена. Текущие findings и пределы
> доказательств: [FINAL_PROJECT_AUDIT_2026-09-05.md](./FINAL_PROJECT_AUDIT_2026-09-05.md).
> Старые ID и проценты ниже исторические; новые V2-ID не переопределяют их.
> Галочки source-only/autonomous задач не закрывают найденные runtime defects.

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

1. `PILOT_SCOPE_FREEZE.md` — единственный источник фиксированного scope, процентов и go/no-go.
2. Этот файл — журнал исторических evidence-порций; он подтверждает только конкретную дату и окружение.
3. `PROJECT_PLAN.md` — исторический продуктовый roadmap; он не подтверждает release readiness.
4. Если старый документ и scope freeze расходятся, приоритет у scope freeze до явного выпуска новой версии freeze.
5. Immutable TypeORM-миграции не переписываются ради очистки терминов. Их наличие не означает доступность прежней функции.

## Текущая оценка после ревизии

> Это снимок на дату ревизии. Дальнейшие проценты и список обязательных условий фиксируются только в [`PILOT_SCOPE_FREEZE.md`](./PILOT_SCOPE_FREEZE.md).

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

### Результат сто первой исполняемой порции (30.08.2026)

- `[x]` Owner-заявки больше не оставляют unhandled rejection при отказе quote, reschedule, no-show или complete API: каждый `unwrap()` перехватывается в обработчике действия.
- `[x]` При отказе мутации черновик quote и выбранное время переноса сохраняются, а существующие inline retryable errors остаются источником обратной связи для пользователя.
- `[x]` Ошибка подтверждения заявки теперь также выводится в доступном `role="alert"`; кнопки не создают ложное состояние успеха.
- `[x]` Добавлена компонентная регрессия отказов owner actions: **1 файл / 1 тест PASS**; полный frontend suite — **127 файлов / 438 тестов PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Реальный staging replay отказов и повторных действий с несколькими владельцами остаётся внешним gate §2.3 и `ADD-C02`, `ADD-C06`, `ADD-C08`.

### Результат сто второй исполняемой порции (30.08.2026)

- `[x]` Сохранение режима связи владельца теперь перехватывает отказ API, поэтому `unwrap()` не создаёт unhandled rejection и форма остаётся доступной для повторной отправки.
- `[x]` Ошибка сохранения продолжает отображаться через существующий доступный `role="alert"`, без маскировки отказа и без ложного сообщения об успехе.
- `[x]` Добавлена компонентная регрессия rejected-save для communication settings: **1 файл / 1 тест PASS**.
- `[x]` Полный frontend suite после порции: **128 файлов / 439 тестов PASS**; TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Реальный staging replay изменения communication mode и параллельные действия нескольких владельцев остаются внешними gates `ADD-C06`, §2.3 и `ADD-C15`.

### Результат сто третьей исполняемой порции (30.08.2026)

- `[x]` Owner onboarding теперь безопасно обрабатывает отказ отправки verification-запроса; ошибка не становится unhandled rejection, а кнопку можно использовать повторно.
- `[x]` Отмена pending change-request переведена на `unwrap()` с явным `role="alert"` при конфликте/отказе API и disabled-состоянием на время операции.
- `[x]` Profile change form перехватывает отказ родительского mutation-handler и не очищает локальный draft, поэтому повторная отправка не требует повторного ввода данных.
- `[x]` Добавлены component regressions onboarding/profile-change: **3 теста PASS**; полный frontend suite — **130 файлов / 442 теста PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Реальный staging workflow moderation/acceptance, email delivery и multi-owner replay остаются внешними gates `ADD-C06`, `ADD-C11`, §2.2.

### Результат сто четвёртой исполняемой порции (30.08.2026)

- `[x]` Админская модерация отзывов теперь перехватывает отказ публикации ответа и удаления отзыва через `try/catch`; rejected `unwrap()` больше не создаёт unhandled promise rejection.
- `[x]` Ошибка действия показывается в доступном `role="alert"`, draft ответа сохраняется для повторной отправки, а сообщение об успехе не появляется после неудачной публикации.
- `[x]` Добавлена component regression для отказов ответа и удаления отзыва: **1 файл / 1 тест PASS**; полный frontend suite — **131 файл / 443 теста PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Реальный staging moderation replay с несколькими администраторами, audit evidence и подтверждением прав super-admin остаётся внешним gate `ADD-C11`, §2.2.

### Результат сто пятой исполняемой порции (30.08.2026)

- `[x]` Клиентская форма отзыва теперь перехватывает отказ `createPlatformReview` через `try/catch`; `unwrap()` больше не приводит к unhandled promise rejection.
- `[x]` При ошибке отправки введённый текст сохраняется, сообщение об успехе не показывается, а доступный `role="alert"` даёт retryable обратную связь с деталями API.
- `[x]` Добавлена component regression для отклонённой отправки отзыва: **1 файл / 1 тест PASS**; полный frontend suite — **132 файла / 444 теста PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Реальный moderation turnaround, duplicate/idempotency replay и staging-проверка клиентских отзывов остаются внешними gates `ADD-C08`, `ADD-C11`, §2.2.

### Результат сто шестой исполняемой порции (30.08.2026)

- `[x]` Решение клиента по quote теперь безопасно обрабатывается на странице follow-up после заявки и в кабинете «Мои заявки»: отказ accept/decline перехватывается, поэтому не возникает unhandled promise rejection.
- `[x]` Ошибка quote выводится в доступном `role="alert"`, кнопки остаются доступными для повторной попытки, а UI не показывает ложное подтверждение принятия или отклонения.
- `[x]` Добавлены regressions для обеих поверхностей клиентского quote-flow: **2 файла / 2 теста PASS**; полный frontend suite — **134 файла / 446 тестов PASS**.
- `[x]` Добавлена отдельная i18n-подпись `clientServiceRequestsQuoteError` для RU и EN.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Реальный quote expiry/replay с несколькими клиентами и staging concurrency остаются внешними gates `ADD-C06`, `ADD-C08`, §2.3.

### Результат сто седьмой исполняемой порции (30.08.2026)

- `[x]` Решение клиента по переносу визита в кабинете заявок теперь выполняется через отдельный async-handler с `try/catch`; rejected `unwrap()` не создаёт unhandled promise rejection.
- `[x]` Ошибка переноса отображается в доступном `role="alert"`, повторная попытка остаётся доступной, а устаревшая ошибка quote очищается при новом действии (и наоборот).
- `[x]` Расширена component regression клиентского кабинета: quote accept/decline и reschedule accept покрыты отказами API без unhandled rejection; полный frontend suite — **134 файла / 446 тестов PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Реальный multi-actor reschedule/cancellation matrix, conflict replay и staging booking evidence остаются внешним gate `ADD-C06`, §2.3.

### Результат сто восьмой исполняемой порции (30.08.2026)

- `[x]` Создание гарантийного обращения после визита теперь перехватывает отказ API; прямой `unwrap()` больше не создаёт unhandled promise rejection.
- `[x]` Введён retryable `role="alert"` с API-сообщением, введённое описание обращения сохраняется до успешного создания, а ошибка очищается при редактировании.
- `[x]` Добавлена component regression для отклонённого guarantee claim: **1 файл / 1 тест PASS**; полный frontend suite — **135 файлов / 447 тестов PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Реальная обработка гарантийных обращений, SLA поддержки и production moderation evidence остаются внешними gates `ADD-C11`, §2.2.

### Результат сто девятой исполняемой порции (30.08.2026)

- `[x]` Owner-предложение в панели broadcast-запросов теперь перехватывает отказ создания offer через `try/catch`; unhandled promise rejection исключён.
- `[x]` При отказе API введён доступный `role="alert"`, сумма предложения сохраняется для повторной отправки, а ошибка очищается при редактировании или выборе другого запроса.
- `[x]` Добавлена component regression для rejected broadcast offer: **1 файл / 1 тест PASS**; полный frontend suite — **136 файлов / 448 тестов PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Реальный multi-provider broadcast replay, конкурентная отправка предложений и staging confirmation остаются внешними gates `ADD-C02`, `ADD-C06`, §2.3.

### Результат сто десятой исполняемой порции (30.08.2026)

- `[x]` Mounted-панель автопарков владельца теперь перехватывает отказ создания fleet через `try/catch`; rejected `unwrap()` не создаёт unhandled promise rejection.
- `[x]` При отказе API введён доступный `role="alert"` с деталями ошибки, название автопарка сохраняется для повторной отправки, а ошибка очищается при редактировании.
- `[x]` Добавлена component regression для rejected fleet creation: **1 файл / 1 тест PASS**; полный frontend suite — **137 файлов / 449 тестов PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Автопарки и fleet/B2B остаются post-MVP scope (`ADD-N10`); real multi-owner replay и staging authorization для этого экрана остаются внешними gates `ADD-C01`, `ADD-C02`, §2.3.

### Результат сто одиннадцатой исполняемой порции (30.08.2026)

- `[x]` Создание support/provider/admin чатов в рабочем пространстве теперь выполняется через обработанный async-handler; отказ `createChat` не оставляет unhandled promise rejection.
- `[x]` Для ошибок создания чата добавлен доступный retryable `role="alert"`; кнопка повторной попытки сбрасывает защиту автостарта provider-чата, а выбранный/введённый контекст не теряется.
- `[x]` Добавлена component regression отклонённого создания support-чата без unhandled rejection: **1 файл / 1 новый тест PASS**; полный frontend suite — **137 файлов / 450 тестов PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Multi-process Redis/WebSocket reconnect, signed media и staging chat moderation остаются внешними gates `ADD-C03`, `ADD-C04`, §2.4.

### Результат сто двенадцатой исполняемой порции (30.08.2026)

- `[x]` Решение клиента по offer в `ServiceRequestChat` теперь выполняется отдельным async-handler с `try/catch`; rejected `decideOffer().unwrap()` больше не создаёт unhandled promise rejection.
- `[x]` При конфликте или закрытом предложении сообщение API показывается через доступный `role="alert"`, кнопки остаются retryable, а ложное состояние успеха не показывается.
- `[x]` Добавлена i18n-подпись `chatOfferDecisionError` для RU и EN и component regression rejected offer decision: **1 файл / 1 тест PASS**.
- `[x]` Полный frontend suite после порции — **138 файлов / 451 тест PASS**; TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Реальный multi-actor offer replay, Redis/WebSocket delivery и staging moderation остаются внешними gates `ADD-C06`, `ADD-C08`, §2.4.

### Результат сто тринадцатой исполняемой порции (30.08.2026)

- `[x]` Отмена клиентской записи теперь сохраняет причину и открытый диалог при отказе API; `cancelMyBooking().unwrap()` остаётся обработанным, а retry не требует повторного открытия формы.
- `[x]` Ошибка отмены дублируется доступным inline `role="alert"`; поле причины получает `aria-invalid`/`aria-describedby`, ошибка очищается при редактировании и повторном открытии диалога.
- `[x]` Добавлена component regression rejected cancellation: **1 файл / 1 тест PASS**; полный frontend suite после порции — **139 файлов / 452 теста PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Реальный multi-actor cancel/reschedule matrix, idempotency replay и staging booking evidence остаются внешними gates `ADD-C06`, `ADD-C17`, §2.3.

### Результат сто четырнадцатой исполняемой порции (30.08.2026)

- `[x]` Диалог выпуска скидки в кабинете владельца теперь перехватывает отказ `issuePromo`; rejected `unwrap()` больше не создаёт unhandled promise rejection и не закрывает форму.
- `[x]` Ошибка выпуска промокода и недоступность clipboard отображаются через доступный `role="alert"`; значения скидки и срока сохраняются для повторной попытки, а ошибка очищается при редактировании или повторном открытии.
- `[x]` Кнопка копирования промокода теперь проверяет наличие Clipboard API и обрабатывает отклонённый `writeText`, не показывая ложное состояние «скопировано».
- `[x]` Добавлена component regression для rejected promo issue: **1 файл / 1 тест PASS**; полный frontend suite после порции — **140 файлов / 453 теста PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Промокоды остаются post-MVP scope (`ADD-N07`); production abuse limits, audit evidence и payment-free rollout проверяются отдельными staging gates.

### Результат сто пятнадцатой исполняемой порции (30.08.2026)

- `[x]` Runtime-интерфейс очищен от пользовательских подписей про оплату: landing hero, results trust strip, профиль сервиса, summary заявки, booking panel и карточка визита больше не рекламируют и не описывают платёжный flow.
- `[x]` Из активной модели удобств удалено `card_payment`; mock-профили и mock API больше не создают эту capability, а иконка и default-набор синхронизированы.
- `[x]` Owner-маркетинг больше не обещает «бесплатный старт» или «скрытые платежи»; формулировки заменены на нейтральный быстрый старт и настройку профиля.
- `[x]` Удалены ставшие неиспользуемыми runtime-ключи payment/direct-payment из RU и EN каталога переводов; исторические и юридические документы сохранены неизменными.
- `[x]` TypeScript и targeted frontend regression suite: **11 файлов / 26 тестов PASS**; runtime-поиск подтверждает отсутствие активных payment/card_payment/direct-payment UI-ссылок.
- `[~]` Юридическая редактура текстов, где payment упоминается как граница ответственности платформы, остаётся отдельным согласуемым product/legal gate; платёжные системы в продукт не добавляются.

### Результат сто шестнадцатой исполняемой порции (30.08.2026)

- `[x]` Ошибка onboarding-запроса владельца теперь объявляется через доступный `role="alert"`, одинаково для проверки сервиса и отправки изменения профиля.
- `[x]` Ошибка не блокирует повторную попытку и не меняет существующий mutation-flow; добавлена component regression для rejected onboarding request: **1 файл / 1 новый тест PASS**.
- `[x]` Полный frontend suite после порции — **140 файлов / 454 теста PASS**; TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Staging authorization и реальная moderation evidence для onboarding остаются внешними gates `ADD-C01`, `ADD-C11`, §2.2.

### Результат сто семнадцатой исполняемой порции (30.08.2026)

- `[x]` Post-MVP resource-панель больше не оставляет unhandled rejection при добавлении или переключении специалиста/поста/подъёмника/оборудования.
- `[x]` Ошибка мутации показывается через `role="alert"`; введённые название и вместимость ресурса сохраняются для повторной попытки и очищаются только после успешного добавления.
- `[x]` Добавлены regressions для rejected create и toggle resource: **1 файл / 2 теста PASS**.
- `[x]` Полный frontend suite после порции — **141 файл / 456 тестов PASS**; TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Панель ресурсов по-прежнему скрыта из compact MVP и остаётся post-MVP `ADD-N02`; исправление не включает подъёмники или оборудование в пользовательский scope.

### Результат сто восемнадцатой исполняемой порции (30.08.2026)

- `[x]` Expert Question и Multi-provider request cards сохраняют введённый текст при отклонении API и используют сообщение сервера вместо безличного fallback, когда оно доступно.
- `[x]` Ошибка multi-provider запроса теперь объявляется через доступный `role="alert"`; оба действия остаются retryable и не создают unhandled promise rejection.
- `[x]` Добавлена component regression для обоих клиентских сценариев: **1 файл / 2 теста PASS**.
- `[x]` Полный frontend suite после порции — **142 файла / 458 тестов PASS**; TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Реальная broadcast idempotency, multi-provider concurrency и production SLA поддержки остаются внешними gates `ADD-C06`, `ADD-C08`, §2.3.

### Результат сто девятнадцатой исполняемой порции (30.08.2026)

- `[x]` Ошибки переноса визита, отметки no-show и завершения визита в кабинете владельца теперь объявляются через доступный `role="alert"`, а не только визуальным красным текстом.
- `[x]` Existing retryable mutation-flow не изменён: введённая дата переноса и остальные данные формы сохраняются после отказа API; unhandled promise rejection не возникает.
- `[x]` Regression расширена проверкой доступных alerts для owner request actions; полный frontend suite — **142 файла / 458 тестов PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Multi-actor reschedule/no-show/completion matrix, idempotency replay и staging authorization остаются внешними gates `ADD-C06`, `ADD-C17`, `ADD-C18`, §2.3.

### Результат сто двадцатой исполняемой порции (30.08.2026)

- `[x]` Ошибки загрузки каталога услуг владельца теперь объявляются через доступный `role="alert"` и сохраняют кнопку повторной попытки.
- `[x]` Ошибка сохранения цены/режима записи в редакторе предложения и ошибки валидации формы создания услуги теперь доступны скринридерам; значения редактора сохраняются до успешного сохранения.
- `[x]` Ошибка редактирования клиентского отзыва теперь объявляется через `role="alert"`, не закрывает форму и остаётся retryable.
- `[x]` Добавлены component regressions для сохранения цены при отклонённом API и доступного сообщения ошибки отзыва: **2 файла / 2 теста PASS**; полный frontend suite — **144 файла / 460 тестов PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Полные authorization/integration проверки owner service mutations и реальный moderation evidence для отзывов остаются внешними gates `ADD-C01`, `ADD-C11`, §2.1–§2.2.

### Результат сто двадцать первой исполняемой порции (30.08.2026)

- `[x]` Ошибки валидации клиентской и owner-записи теперь объявляются через доступные `role="alert"` в общих booking-полях; ошибка комментария клиента также связана с полем и объявляется скринридеру.
- `[x]` Ошибка создания owner-записи в заголовке формы и ошибки загрузки списка клиентов владельца теперь доступны как alerts с сохранённой retry-кнопкой.
- `[x]` Добавлена component regression для двух общих booking field wrappers; полный frontend suite — **145 файлов / 461 тест PASS**.
- `[x]` TypeScript, ESLint `--max-warnings=0`, Next production build и `git diff --check` проходят.
- `[~]` Реальный booking retry/idempotency, cross-branch authorization и multi-actor transition matrix остаются внешними gates `ADD-C01`, `ADD-C06`, `ADD-C17`, §2.3.

### Результат сто двадцать второй исполняемой порции (30.08.2026)

- `[x]` Полный локальный MVP quality gate повторно пройден на commit `ae62e3296d91`: frontend lint, frontend tests, Next production build, backend build, API/route/legacy/security/loading/state/client/design/interaction contracts и responsive Chromium matrix — PASS.
- `[x]` Runtime gate запускался с разрешённым loopback-портом; это устраняет только ограничение sandbox `listen EPERM` и не меняет код, origin policy или production preflight.
- `[x]` Результат привязан к `MVP-03` и ручному checklist `MVP_MANUAL_ACCEPTANCE_CHECKLIST.md`; evidence обновлено без изменения обязательного scope и процентов.
- `[~]` `MVP-01` clean PostgreSQL reset/seed, `MVP-02` real-API fault matrix и `MVP-04` real owner/admin/super-admin replay по-прежнему требуют доступного Docker/PostgreSQL runtime; ручные `MVP-05/MVP-06` gates не закрываются автоматическим прогоном.

### Результат сто двадцать третьей исполняемой порции (30.08.2026)

- `[x]` Mock Chromium workflow для `MVP-04` повторно прошёл **4/4**: owner onboarding/evidence/team/communication, compact branch calendar без resource editor, admin moderation decision с обязательной причиной и super-admin country → city → zone editors.
- `[x]` Прогон выполнен командой `npm run test:e2e -- e2e/autocare-release-audit.spec.ts --project=chromium --grep "owner onboarding|owner requests|admin moderation|super-admin market" --reporter=line` с разрешённым loopback-портом; код и production authorization policy не ослаблялись.
- `[x]` Результат добавлен в `PILOT_SCOPE_FREEZE.md` как дополнительное mock-доказательство; обязательный scope и текущие проценты не изменены.
- `[~]` Реальный local API replay onboarding/change-request, invitation accept/revoke, moderation mutation и branch denial остаётся внешним gate `MVP-01/MVP-04` до восстановления Docker/PostgreSQL.

### Результат сто двадцать четвёртой исполняемой порции (30.08.2026)

- `[x]` `npm run check:state-matrix` повторно прошёл **6/6** source invariants: recoverable client states, real-state coverage contract, reviews/attachments, communication modes, retry/idempotency и mobile shell.
- `[x]` Объединённый mock Chromium state smoke прошёл **7/7**: error, stale, offline, permission-denied и suspended client states, а также offline/timeout retry без потери idempotency key.
- `[x]` Прогон выполнен с разрешённым loopback-портом; production rate limits, CSRF и retry policy не изменялись.
- `[x]` Evidence добавлено в `PILOT_SCOPE_FREEZE.md`; новые обязательные пункты и изменение процентов не добавлялись.
- `[~]` Полная `MVP-02` real-API matrix остаётся внешним gate: нужен clean PostgreSQL reset/seed и реальный replay `MVP-01`.

### Результат сто двадцать пятой исполняемой порции (30.08.2026)

- `[x]` `npm run check:client-path` повторно прошёл **7/7** source checks: vehicle identity snapshot, immutable booking snapshot, bonus lifecycle, quote lifecycle, review resolution, reviews shell и browser regression coverage.
- `[x]` Mock Chromium client-path smoke прошёл **5/5**: garage/attachment viewer, idempotent bonus redemption, refund/expiry history, accepted quote with preserved booking snapshot и expired quote без action.
- `[x]` Evidence обновлено в `PILOT_SCOPE_FREEZE.md`; данные, бонусные операции и quote UI проверены без изменения production payment scope.
- `[~]` Real API vehicleId/snapshot persistence, удаление автомобиля/сервиса, edit review/photo и staging bonus lifecycle остаются внешними gates `MVP-02`, §1.2 и §2.2.

### Результат сто двадцать шестой исполняемой порции (30.08.2026)

- `[x]` `npm run check:loading-shell` повторно прошёл **15/15** source controls для public, owner, admin и auth layout: shape-matched form, disabled controls, map surface и light/dark skeleton tokens.
- `[x]` Loading-shell node regression прошёл **2/2**, а component suite для loading skeletons, boot shell и state card — **24/24**.
- `[x]` Проверено, что загрузка сохраняет основной контейнер и форму, оставляет поля видимыми/disabled и не подменяет карту вложенными skeletons; белые skeleton surfaces в dark theme не допускаются контрактом.
- `[x]` Evidence добавлено в `PILOT_SCOPE_FREEZE.md`; обязательный scope и проценты не изменены.
- `[~]` Browser transition с искусственной задержкой и ручная visual/device verification остаются external gates `MVP-05/MVP-06`; исходная среда должна разрешать loopback browser session.

### Результат сто двадцать седьмой исполняемой порции (30.08.2026)

- `[x]` `npm run check:interaction-contract` прошёл **16 invariants**, `npm run check:design-tokens` — **15 semantic roles / 26 foundation tokens** с light/dark overrides.
- `[x]` Mock Chromium keyboard/focus/Escape smoke прошёл **3/3**: protected workspace tab order, city listbox arrows/Home/End/Escape и gallery Escape с возвратом focus на trigger.
- `[x]` Проверены rounded focus-visible surfaces, отсутствие native square outline, disabled controls и стабильная тема; production authorization и rate limits не менялись.
- `[x]` Evidence обновлено в `PILOT_SCOPE_FREEZE.md`, обязательный scope и проценты не изменены.
- `[~]` Ручная visual/keyboard приёмка владельца и VoiceOver/TalkBack на реальных устройствах остаются внешними gates `MVP-05/MVP-06`.

### Результат сто двадцать восьмой исполняемой порции (30.08.2026)

- `[x]` Legacy cleanup повторно прошёл: manifest/replacement coverage **5/5**, migration inventory **124/124**, historical migrations **67** с checksum и AutoCare replacement migrations **57**.
- `[x]` `npm run check:no-bookly-runtime`, `npm run check:no-legacy-provider` и file-level classification подтвердили отсутствие активного Bookly/payment runtime и классификацию всех **75** legacy/compatibility файлов.
- `[x]` Безопасных файлов для удаления без потери replacement/coverage не найдено; immutable migrations, archives, PWA/test tooling и compatibility entities сохранены по explicit disposition.
- `[x]` Evidence добавлено в `PILOT_SCOPE_FREEZE.md`; обязательный scope, платёжное исключение и проценты не изменены.
- `[~]` Удаление historical migrations/archives требует отдельного подтверждения миграций и не выполняется автоматически.

### Результат сто двадцать девятой исполняемой порции (30.08.2026)

- `[x]` Полный mock release audit `e2e/autocare-release-audit.spec.ts` прошёл **18/18** за 3 минуты с разрешённым loopback-портом.
- `[x]` Aggregate smoke включает auth boundary, responsive discovery, keyboard/focus/Escape, 20 locales, RU/EN/ES/RO mobile, owner services/privacy/onboarding, compact calendar, admin moderation reason и super-admin hierarchy.
- `[x]` Существующие production payment exclusions и authorization policy не изменялись; результат добавлен в `PILOT_SCOPE_FREEZE.md` как mock evidence.
- `[~]` Полный release audit не закрывает внешний real API replay, manual visual acceptance и VoiceOver/TalkBack gates `MVP-01/MVP-02/MVP-04/MVP-05/MVP-06`.

### Результат сто тридцатой исполняемой порции (30.08.2026)

- `[x]` Полный `npm run check:local-mvp` повторно прошёл: frontend lint/tests, Next production build, backend build, API/route/legacy/security/loading/state/client/design/interaction contracts и responsive Chromium matrix.
- `[x]` Повторная TCP-проверка подтверждает отсутствие локального real runtime: Docker daemon unavailable, PostgreSQL `5433`, Redis `6379` и API `4000` недоступны.
- `[x]` Зафиксировано, что это внешний блокер инфраструктуры, а не причина ослаблять production preflight или считать `MVP-01/MVP-02/MVP-04` закрытыми.
- `[x]` Evidence обновлено в `PILOT_SCOPE_FREEZE.md`; обязательный scope, проценты и payment exclusions не изменены.
- `[~]` Для продолжения real-API части нужен запуск Docker Desktop и штатного `npm run server:db:up`; после этого выполняется `npm run test:e2e:real` с clean demo seed.

### Результат сто тридцать первой исполняемой порции (31.08.2026)

- `[x]` Закрыт `MVP-01`: локальные PostgreSQL и Redis подняты; `demo:reset` → `demo:seed` → `autocare:seed` выполняются без ручной коррекции, а health/catalog/read smoke входит в real browser suite.
- `[x]` Закрыт `MVP-02`: базовый `npm run test:e2e:real` прошёл **22/22** на реальном API; добавленный owner/admin recoverable-state сценарий прошёл отдельно **1/1**. Проверены public/client/owner/admin/super-admin маршруты, partial/stale/error/suspended/permission-denied states, expired session, offline/timeout retry и idempotent request в PostgreSQL.
- `[x]` Исправлены три реальные contract/runtime ошибки, обнаруженные во время replay: timezone demo-филиалов задаётся из рынка, строковые query-флаги `false` не превращаются в `true`, а PostgreSQL numeric trust score нормализуется в number до публичного API. Для каждого случая добавлен regression.
- `[x]` Стабилизирован real e2e runner: он передаёт точечные Playwright аргументы, выдерживает корректный `429 Retry-After` без ослабления login rate limit и даёт partial-state загрузке достаточный browser timeout.
- `[x]` Закрыт `MVP-04`: расширенный `npm --prefix server run test:integration` прошёл **14 файлов / 60 тестов** на PostgreSQL/Redis. В набор включены branch denial, owner change request → admin decision с обязательной причиной, invitation accept/revoke, moderation evidence и country → city → zone.
- `[x]` В `provider-branch-access.integration.test.ts` добавлен реальный transaction replay изменения профиля владельцем и одобрения администратором; проверяются статус, причина, actor и фактическое сохранение профиля.
- `[x]` Финальный `npm run check:local-mvp` PASS: lint, frontend tests, Next production build, backend build, API/route/legacy/security/loading/state/client/design/interaction contracts и responsive Chromium matrix.
- `[x]` После добавления owner/admin recoverable-state проверки полный gate повторён ещё раз: **21/21 checks PASS**, frontend regression **145 файлов / 461 тест**, `npm run lint -- --max-warnings=0`, Next build, backend build и `git diff --check` зелёные.
- `[x]` После расширения real suite отдельные сценарии timeout-retry и owner/admin state повторно проходят; один aggregate dev-run не использован как evidence из-за зависшего Next dev worker после 22 успешных тестов. Это ограничение тестового процесса, не production runtime; preview mode также исключён из evidence, потому что не поднимает API proxy этого проекта.
- `[x]` `MVP_MANUAL_ACCEPTANCE_CHECKLIST.md` синхронизирован с текущим evidence: `MVP-01`, `MVP-02` и `MVP-04` отмечены закрытыми автоматическими прогонами; ручные `MVP-05/MVP-06` оставлены внешними gates.
- `[~]` Локальный MVP теперь **96%**. Единственные оставшиеся обязательные пункты — `MVP-05` (ручная visual/keyboard приёмка владельца) и `MVP-06` (VoiceOver/TalkBack на реальных телефонах); автоматизация не может честно закрыть их вместо реальных устройств.

### Результат сто тридцать второй исполняемой порции (31.08.2026)

- `[x]` Server pilot scripts теперь одинаково подхватывают `server/.env` при запуске из корня через `npm --prefix server run …`; значения процесса сохраняют приоритет, вывод dotenv приглушён и секреты не печатаются.
- `[x]` Локальный pilot-quality preflight прошёл: 4 активных провайдера, 23 активных предложения, 100% coverage предложений и 100% coverage цен.
- `[x]` Cross-process Redis/WebSocket smoke прошёл с двумя подписчиками и повторной доставкой одного `eventId`; это частичное evidence для `PILOT-06`.
- `[x]` Backend unit regression после изменения загрузки окружения: **183 файла / 583 теста**, backend build PASS.
- `[x]` Backend tooling tests для Docker/операционного preflight прошли **5/5**; unavailable daemon остаётся корректным внешним blocker без утечки stderr.
- `[x]` Локальные результаты и внешние blockers вынесены в `docs/operations/PILOT_LOCAL_GATE_EVIDENCE_2026-08-31.md`; demo-данные не засчитываются как реальные SLA или pilot evidence.
- `[~]` Pilot reliability намеренно остаётся заблокированным до реальных samples: 0 response samples, 1 локальное подтверждение; mock/demo данные не засчитываются как SLA.
- `[~]` `PILOT-01…PILOT-11` и `SEC-01…SEC-10` не переведены в `[x]`: staging secrets, S3/ClamAV, SMTP, backup vault, alerts, две API-реплики, реальные сервисы/клиенты и независимый review требуют внешнего доступа и фактических доказательств.

### Результат сто тридцать третьей исполняемой порции (31.08.2026)

- `[x]` Общий frontend regression повторён после pilot changes: lint без предупреждений, **145 файлов / 461 тест**, Next production build и `git diff --check` PASS.
- `[x]` Operations harness и production-contract tests прошли **9/9**; security controls прошли **5/5**.
- `[x]` `check:staging-api` подтвердил локальный API parity contract; внешний probe пропущен только потому, что `STAGING_API_BASE_URL` не задан.
- `[x]` Добавлена проверка содержимого real-pilot evidence: PII-подобные ключи и email/телефон/VIN значения блокируются даже при `piiRedacted: true`; anonymized identifiers и capture flags разрешены regression-тестами.
- `[~]` Процент пилота остаётся **58%**: локальные contracts и catalog quality не заменяют staging/production evidence, реальные response samples, сервисы, клиентов и go/no-go.

### Результат сто тридцать четвёртой исполняемой порции (31.08.2026)

- `[x]` Финально проверена защита real-pilot evidence: валидатор отклоняет PII-подобные ключи и email/телефон/VIN значения даже при установленном `piiRedacted=true`; anonymized identifiers, `plateCaptured`/`vinCaptured` и числовой `reviewPhotoCount` проходят regression **5/5**.
- `[x]` Повторная проверка server-local dotenv загрузки подтверждает детерминированный запуск pilot scripts из корня и из `server/`; process environment имеет приоритет, секреты не выводятся.
- `[x]` Локальное evidence собрано в [`PILOT_LOCAL_GATE_EVIDENCE_2026-08-31.md`](./PILOT_LOCAL_GATE_EVIDENCE_2026-08-31.md) и включает quality, realtime smoke, backend unit/build, operations/security harness и staging API parity contract.
- `[~]` Все внешние пункты `PILOT-01…PILOT-11` и `SEC-01…SEC-10` остаются в исходных статусах: для их закрытия нужны staging/production secrets, две API-реплики, private media/AV, backup vault/restore, SMTP/alerts, независимый review и реальные участники пилота. Фиктивные evidence-файлы не создаются.

### Результат сто тридцать пятой исполняемой порции (31.08.2026)

- `[x]` Повторный production-operations preflight с `--env-file server/.env` подтвердил, что все repository controls (worker, outbox/dead-letter, backup/restore harness, alerts, rollback и Redis fail-closed guidance) проходят; секреты и значения конфигурации не выводятся.
- `[x]` Локальный Docker availability check корректно возвращает блокирующее состояние без утечки Docker stderr; запуск staging/production service-backed smoke не имитировался.
- `[~]` Статусы и проценты пилота не меняются: `PILOT-01…PILOT-11` и `SEC-01…SEC-10` требуют фактической инфраструктуры, реальных сервисов/клиентов и подписанного evidence. Новых обязательных задач не добавлено.

### Результат сто тридцать шестой исполняемой порции (31.08.2026)

- `[x]` Production-policy rehearsal Redis повторён с синтетической конфигурацией без вывода секретов: распределённый limiter доступен и `fail-closed` подтверждён.
- `[x]` Account-deletion/retention checker завершился без нарушений invariant; в локальной базе нет завершённых удалений, поэтому результат не засчитывается как staging rehearsal.
- `[~]` Production media preflight корректно остановлен до внешней операции: локальный runtime не настроен на S3 + ClamAV. Это ожидаемый blocker `PILOT-03/SEC-02`, а не причина разрешать filesystem storage в production.

### Результат сто тридцать седьмой исполняемой порции (31.08.2026)

- `[x]` Полный `npm run quality:backend` завершён: migration order/inventory/validation, legacy/payment guards, demo-reset, API/OpenAPI parity, route/runtime boundaries, threat surface, loading/state/client/capacity contracts, backend tooling, unit tests и TypeScript build прошли.
- `[x]` В рамках aggregate gate повторно подтверждены owner-route authorization, branch denial, idempotency/retry, theme-aware loading shell, compact capacity calendar и отсутствие Bookly/payment runtime.
- `[~]` Это repository-level evidence и не закрывает внешние `PILOT-01…PILOT-11`/`SEC-01…SEC-10`; staging, real providers/clients, backup restore, media AV и независимый review остаются обязательными условиями.

### Результат сто тридцать восьмой исполняемой порции (31.08.2026)

- `[x]` PostgreSQL/Redis integration-набор повторно прошёл: **14 файлов / 60 тестов**. Проверены branch denial, booking/quote переходы, invitation/moderation и иерархия рынков на service-backed тестовом окружении.
- `[~]` Повторный `npm run test:e2e:real` не засчитан как evidence: demo reset/seed завершились, но API не удалось запустить из-за недоступного PostgreSQL на `127.0.0.1:5433` и отсутствующего Docker daemon; последующие browser timeout вызваны отсутствующим backend, а не изменением UI-кода.
- `[x]` Зафиксировано, что локальная автоматическая часть порции закрыта без ослабления production-проверок; проценты и обязательный scope не изменены.
- `[~]` Для real API replay нужен доступный PostgreSQL/Docker и запущенный backend; после восстановления инфраструктуры прогон повторяется с clean demo seed.

### Результат сто тридцать девятой исполняемой порции (31.08.2026)

- `[x]` В `test:e2e:real` добавлен обязательный health-preflight `check:real-api`: проверяется `/health/live` до запуска Playwright, поддерживается base path и ограничивается HTTP(S)-origin без query/fragment.
- `[x]` Ошибки недоступного API теперь завершают прогон сразу с безопасной диагностикой и командами восстановления; сетевые ошибки не протоколируются вместе с потенциальными credentials.
- `[x]` Добавлен root script `npm run check:real-api` и regression-набор **5/5** для URL validation, healthy/non-success responses, timeout/connection error и отсутствия утечки секретов; frontend lint PASS.
- `[x]` `test:e2e:real` проверяет API **до** `demo:reset`/seed, поэтому недоступная инфраструктура не запускает лишнюю очистку локальных demo-данных; runner повторяет health-check перед браузером.
- `[x]` Health-preflight включён в `test:ops-harness`, поэтому общий operations quality gate теперь не может пропустить сломанный real-API runner.
- `[x]` После изменения повторно подтверждено: недоступный текущий backend определяется preflight до браузерных тестов, поэтому ложные UI timeout-ошибки больше не маскируют инфраструктурный blocker.
- `[~]` Автоматический real API replay по-прежнему требует доступных PostgreSQL/Redis и запущенного backend; preflight повышает диагностируемость, но не подменяет staging evidence.

### Результат сто сороковой исполняемой порции (31.08.2026)

- `[x]` Общий operations harness расширен real-API preflight regression и прошёл **14/14** тестов; проверяются Docker/backup/restore/production controls, Bookly guard и безопасная диагностика недоступного API.
- `[x]` Повторно прошли frontend lint и `git diff --check`; изменение runner не затрагивает runtime auth, storage policy или payment exclusions.
- `[~]` Real API, staging и production evidence остаются внешними gates: локальный preflight лишь предотвращает ложный браузерный шум и случайный demo reset при недоступном backend.

### Результат сто сорок первой исполняемой порции (31.08.2026)

- `[x]` Закрыт локальный privacy-gap account deletion: произвольная причина удаления теперь очищается в той же транзакции перед завершением anonymization и больше не остаётся в admin queue.
- `[x]` Добавлен интеграционный retention regression для `completed` + `reason = null` с проверкой сохранённой записи после reload; rollback semantics и pending/cancelled причины не меняются.
- `[~]` Запуск этого service-backed regression в текущей среде заблокирован недоступным PostgreSQL `127.0.0.1:5433`; TypeScript build и backend unit **183/583** проходят.
- `[~]` Фактическая staging/production deletion rehearsal и object-store lifecycle по-прежнему требуют внешней БД, private storage и backup evidence; локальный фикс не подменяет этот gate.

### Результат сто сорок второй исполняемой порции (31.08.2026)

- `[x]` Account deletion теперь удаляет pending/failed outbox-события удалённого пользователя или его прежнего email и редактирует payload уже завершённых/dead-letter событий до `{ redacted: true }`.
- `[x]` В `AUTOCARE_DELETION_INVARIANTS` добавлена проверка, что оставшиеся outbox payload с `userId` уже помечены `redacted`; in-flight необезличенное событие блокирует завершение удаления.
- `[x]` Обновлён integration regression для pending notification и completed email payload; in-flight worker rows намеренно не переписываются без lease-контроля.
- `[x]` Backend unit **183/583** и build проходят; frontend lint и `git diff --check` проходят.
- `[~]` Service-backed запуск нового retention regression ожидает доступный PostgreSQL `127.0.0.1:5433`; staging worker race и backup/restore остаются внешними gates.

### Результат сто сорок третьей исполняемой порции (31.08.2026)

- `[x]` При отклонении `provider_cover`/`provider_gallery` moderation evidence ссылка удаляется из профиля транзакционно, а соответствующий локальный media object удаляется сразу после commit.
- `[x]` Ошибка удаления объекта не откатывает уже принятую moderation decision: orphan cleanup повторит удаление, при этом внутренняя ошибка не попадает в ответ модератору.
- `[x]` Добавлен regression для namespace-safe media target (`4/4` unit tests); backend build проходит.
- `[~]` Реальная private storage ACL/S3 lifecycle и staging-проверка rejected media остаются внешним gate `ADD-C07`; локальное удаление не подменяет production evidence.

### Результат сто сорок четвёртой исполняемой порции (31.08.2026)

- `[x]` Добавлена единая output-policy для provider media: публичный mapper принимает только сгенерированные `/uploads/autocare/...` ссылки и ограниченный набор bundled `/images/autocare/providers/...` assets; внешние URL, protocol-relative ссылки, query/path traversal и неподходящие namespaces отбрасываются.
- `[x]` `getAutoCareProviderProfile` больше не переопределяет очищенный `coverImageUrl` сырым значением entity, поэтому профиль и discovery используют одну и ту же media policy.
- `[x]` Moderation queue теперь создаёт evidence только для application-generated cover/gallery uploads; bundled demo assets считаются доверенными build-артефактами, а произвольные внешние ссылки не становятся moderation evidence.
- `[x]` Добавлены regression-тесты для очистки public media, deduplication gallery и фильтрации moderation references; полный backend unit после добавления policy прошёл **184 файла / 587 тестов**, backend build, lint и `git diff --check` зелёные.
- `[~]` S3/private ACL, AV quarantine, signed URLs и миграция уже сохранённых legacy/external media требуют staging storage и остаются внешним gate `PILOT-03/SEC-02`; output-policy не выдаёт такие ссылки клиенту, но не заменяет очистку исторических строк в production базе.

### Результат сто сорок пятой исполняемой порции (31.08.2026)

- `[x]` Review photo URLs теперь проходят ту же строгую output-policy: внешние и повреждённые ссылки не выдаются ни в публичном review response, ни в moderation evidence viewer; bundled provider assets и application-generated media остаются разрешёнными.
- `[x]` `createAutoCareBroadcastRequest` больше не принимает публичные `http(s)` photo URLs: до включения private uploader разрешены только opaque `private://autocare/(requests|broadcasts)/...` references. OpenAPI contract обновлён тем же pattern.
- `[x]` Добавлены schema/output regression-тесты для внешних review/broadcast URL, private reference и deduplicated approved assets.
- `[x]` Полный backend unit после изменения прошёл **184 файла / 589 тестов**, backend build, frontend lint и `git diff --check` зелёные.
- `[~]` Private review/broadcast uploader, signed read access, AV quarantine и migration/cleanup исторических URL требуют staging S3/ClamAV; до этого API безопасно отклоняет публичные ссылки и не раскрывает legacy external media.

### Результат сто сорок шестой исполняемой порции (31.08.2026)

- `[x]` Opaque broadcast media references дополнительно ограничены безопасными path-сегментами: `..`, пустые сегменты, traversal и завершающий slash не проходят schema/OpenAPI contract.
- `[x]` Regression расширен path-traversal кейсом; targeted schema/policy tests **11/11**, backend build и `git diff --check` PASS.
- `[~]` Реальный private uploader и signed URL lifecycle по-прежнему не включены; этот guard предотвращает небезопасные ссылки до staging-интеграции и не засчитывает её как выполненную.

### Результат сто сорок седьмой исполняемой порции (31.08.2026)

- `[x]` Единая `PRIVATE_REFERENCE_PATTERN` применена к owner provider documents и provider change-request payload; document references с traversal, пустыми сегментами, внешними URL и неоднозначными разделителями отклоняются.
- `[x]` Moderation queue отклоняет invalid private references до записи evidence, а admin/provider-change responses не возвращают legacy malformed document references.
- `[x]` Добавлены regression-тесты для private reference normalization, schema traversal и output redaction; полный backend unit — **184 файла / 590 тестов**, backend build, lint и `git diff --check` PASS.
- `[~]` Фактическая выдача документа модератору через signed private URL, AV quarantine и S3 ACL остаётся staging gate; сейчас наружу выдаётся только безопасный opaque key, без bytes или public URL.

### Результат сто сорок восьмой исполняемой порции (31.08.2026)

- `[x]` Чтение chat/service-request attachments теперь принимает только безопасные image content types (`image/jpeg`, `image/png`, `image/webp`); legacy или изменённая в базе строка с `text/html` скрывается как `404`, не попадая в inline response или signed URL.
- `[x]` Redirect на private signed URL помечается `cache-control: private, no-store` и `content-disposition: inline`; прямой filesystem-ответ сохраняет `no-store`, `nosniff`, `ETag` и тот же content-type policy.
- `[x]` Добавлены regression-проверки allow-list content type и HTTP headers для готового attachment; backend unit после изменения прошёл **184 файла / 591 тест**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Service-backed HTTP header regression в `provider-branch-access.integration.test.ts` подготовлен, но текущий запуск заблокирован отсутствующим PostgreSQL на `127.0.0.1:5433` (`EPERM`); это не засчитывается как новое integration evidence.
- `[~]` Фактический S3 signed URL response, private ACL и cross-tenant replay остаются staging gates `PILOT-03/SEC-01/SEC-02`; локальная policy не выдаёт доступ к произвольному object key и не заменяет внешний storage evidence.

### Результат сто сорок девятой исполняемой порции (31.08.2026)

- `[x]` Retention cleanup теперь перед удалением object store проверяет количество строк, ссылающихся на тот же `objectKey`; shared object не удаляется, пока остаётся другая attachment-запись.
- `[x]` Если объект уже стал orphan (`0` ссылок), metadata-строка удаляется, а сам файл оставляется orphan sweep до его grace period; это предотвращает преждевременную потерю данных при гонке cleanup.
- `[x]` Добавлен regression для reference-count policy (`1` удаляется, `0/2/NaN` сохраняются); полный backend unit — **184 файла / 592 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальная concurrent retention rehearsal и проверка object-store delete/restore остаются staging gates `PILOT-04/SEC-02/SEC-03`; локальный guard не заменяет backup/restore evidence.

### Результат сто пятидесятой исполняемой порции (31.08.2026)

- `[x]` При выдаче chat/service-request attachment `objectKey` теперь обязан соответствовать parent UUID (`autocare-chats/<threadId>/...` или `autocare-requests/<requestId>/...`); корректная роль без такой связи получает `404`, а не bytes чужого обращения.
- `[x]` Chat endpoint допускает только собственный thread key и request key связанного service-request; account deletion удаляет object store только при единственной ссылке и только в разрешённом parent scope.
- `[x]` Добавлены regression-тесты для parent binding и cross-scope denial; полный backend unit — **184 файла / 593 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный HTTP replay двух филиалов и проверка shared-key/retention race на PostgreSQL остаются staging gates `SEC-01/SEC-03`; текущая среда не предоставила PostgreSQL `127.0.0.1:5433`.

### Результат сто пятьдесят первой исполняемой порции (31.08.2026)

- `[x]` Пользовательская data export больше не содержит внутренний `objectKey` private storage; экспорт сохраняет пользовательские метаданные вложения (id, тип, размер, checksum, статус) без раскрытия пути хранения.
- `[x]` Добавлен regression для export privacy и проверки, что `passwordHash` и private object key не попадают в JSON; полный backend unit — **184 файла / 594 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный export/deletion/restore rehearsal и проверка политики хранения остаются внешним gate `SEC-03/SEC-07`; изменение не удаляет пользовательское содержимое из исходных данных и не меняет payment scope.

### Результат сто пятьдесят второй исполняемой порции (31.08.2026)

- `[x]` Добавлена PostgreSQL-миграция `1786280000000-HardenAutoCareAttachmentIntegrity`: новые вложения обязаны использовать разрешённый MIME, opaque object-key формата и parent scope своего request/thread.
- `[x]` Существующая parent-проверка теперь заменяется на scope-aware `CHK_autocare_attachments_parent`; все новые записи проверяются сразу, а legacy rows оставлены `NOT VALID` до контролируемого backfill/validation.
- `[x]` TypeORM entity checks и schema-contract policy синхронизированы с миграцией; attachment checks и `FK_autocare_attachments_thread` теперь входят в обязательный schema gate.
- `[x]` Добавлен migration regression: **2/2**; полный backend unit — **185 файлов / 596 тестов**, migration-order check, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Фактическое применение/`VALIDATE CONSTRAINT` в PostgreSQL, исправление legacy rows и service-backed replay требуют staging database; локальный PostgreSQL в этой порции недоступен, поэтому это не считается внешним runtime evidence.

### Результат сто пятьдесят третьей исполняемой порции (31.08.2026)

- `[x]` Upload-путь получил единый runtime guard content type: `decodeAutoCareAttachment` и `normalizeAutoCareAttachment` теперь отклоняют неподдерживаемый MIME до чтения или нормализации байтов.
- `[x]` Это закрывает обход TypeScript/Zod-контрактов при прямом вызове сервиса и не позволяет неизвестному MIME попасть в magic-byte fallback или metadata storage.
- `[x]` Добавлен regression для `text/html` на decode/normalize и отдельной assertion-функции; targeted attachment tests **12/12**, полный backend unit — **185 файлов / 597 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальное сохранение в PostgreSQL/S3 и AV quarantine по-прежнему требуют staging storage/database; runtime guard не подменяет `SEC-02/SEC-03` evidence.

### Результат сто пятьдесят четвёртой исполняемой порции (31.08.2026)

- `[x]` При чтении attachment из filesystem теперь проверяется SHA-256 против checksum из БД; повреждённый или подменённый объект скрывается как `404` до отправки bytes.
- `[x]` Для S3 signed URL добавлена `HeadObject`-проверка приватной metadata `sha256`; отсутствующая или несовпадающая metadata не позволяет подписать ссылку.
- `[x]` Проверка принимает только валидный 64-символьный SHA-256, поддерживает legacy `null` checksum без ложного отказа и не раскрывает причину integrity failure наружу.
- `[x]` Regression покрывает корректный/несовпадающий filesystem checksum и S3 metadata; storage tests **12/12**, полный backend unit — **185 файлов / 599 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный S3 signed download после выдачи URL и race между `HeadObject` и GET требуют staging object-store rehearsal; локальный preflight не заменяет `SEC-02/SEC-03` evidence.

### Результат сто пятьдесят пятой исполняемой порции (31.08.2026)

- `[x]` Для attachment read добавлена сверка фактической длины объекта с `bytes` из БД; усечённый или дописанный filesystem/S3 object не отправляется клиенту.
- `[x]` Перед S3 signed URL проверяется `ContentLength` через `HeadObject`; ожидаемый размер должен быть безопасным и совпадать с metadata объекта.
- `[x]` Проверка сохраняет совместимость с legacy `null` checksum и не выделяет память по значению `ContentLength` из внешнего object store.
- `[x]` Добавлен regression для byte-length guard; storage tests **13/13**, полный backend unit — **185 файлов / 600 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный S3 object mutation после `HeadObject` и concurrent read race требуют staging object-store rehearsal; это остаётся внешним `SEC-02/SEC-03` gate.

### Результат сто пятьдесят шестой исполняемой порции (31.08.2026)

- `[x]` S3 integrity preflight теперь запускается при наличии любого DB metadata: checksum **или** `bytes`; legacy attachment без checksum больше не получает signed URL без проверки `ContentLength`.
- `[x]` Добавлен явный helper `hasAutoCareAttachmentIntegrityMetadata`, чтобы nullable checksum не мог отключить size preflight.
- `[x]` Regression покрывает checksum-only, bytes-only и полностью legacy metadata; storage tests **14/14**, полный backend unit — **185 файлов / 601 тест**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Race после `HeadObject` и фактическая S3 GET-проверка остаются staging object-store gate; приложение не может атомарно связать последующий браузерный GET с предварительным HEAD.

### Результат сто пятьдесят седьмой исполняемой порции (31.08.2026)

- `[x]` Retention cleanup теперь проверяет parent scope перед удалением object store: `objectKey` обязан принадлежать request/thread той же строки.
- `[x]` Legacy/malformed attachment row очищается из БД, но чужой или невалидный object store key не удаляется; это защищает shared/foreign media от ошибочного retention delete.
- `[x]` Добавлен regression для foreign request key, собственного key и malformed key; storage tests **15/15**, полный backend unit — **185 файлов / 602 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальная concurrent retention race и object-store restore остаются staging gates `SEC-02/SEC-03`; локальный guard не заменяет backup/restore rehearsal.

### Результат сто пятьдесят восьмой исполняемой порции (31.08.2026)

- `[x]` Перед S3 signed URL проверяется private storage state: объект с metadata `state=quarantine` больше не подписывается.
- `[x]` Если S3 возвращает сохранённый `Content-Type`, он должен совпадать с безопасным MIME из attachment metadata; несовпадение скрывается как `404`.
- `[x]` Legacy object без этих optional metadata не ломается, но новые private uploads уже записывают `state=private`, `sha256` и content type.
- `[x]` Добавлены regression для quarantine state, private state и MIME mismatch; storage tests **16/16**, полный backend unit — **185 файлов / 603 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Фактическая S3 ACL/bucket-policy проверка и race после `HeadObject` остаются staging gates `SEC-01/SEC-02`.

### Результат сто пятьдесят девятой исполняемой порции (31.08.2026)

- `[x]` Добавлено DB-level ограничение checksum attachment: значение может быть `NULL` для legacy rows либо ровно 64 hex-символа SHA-256.
- `[x]` TypeORM entity и schema-contract policy синхронизированы с `CHK_autocare_attachments_checksum`; новый malformed checksum физически не сохраняется после применения миграции.
- `[x]` Добавлена отдельная миграция `1786290000000-HardenAutoCareAttachmentChecksum` и regression **2/2**; migration-order check, полный backend unit — **186 файлов / 605 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Применение миграции и backfill/`VALIDATE CONSTRAINT` legacy checksum требуют staging PostgreSQL; локальная БД в этой порции не запускалась.

### Результат сто шестидесятой исполняемой порции (31.08.2026)

- `[x]` Низкоуровневый `saveAutoCareAttachmentObject` теперь принимает только разрешённый image MIME и передаёт в S3 именно нормализованный content type.
- `[x]` Invalid `application/octet-stream` и произвольные MIME отклоняются до создания directory/file или запроса к S3; service upload и test fixtures используют явный MIME.
- `[x]` Добавлен regression на отсутствие filesystem side effect; storage tests **17/17**, полный backend unit — **186 файлов / 606 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` AV quarantine, private bucket ACL и реальный S3 upload остаются staging gates `SEC-01/SEC-02`; storage helper guard не выдаётся за production media evidence.

### Результат сто шестьдесят первой исполняемой порции (31.08.2026)

- `[x]` Локальное чтение attachment теперь открывает файл с `O_NOFOLLOW` и валидирует размер уже открытого inode; подмена файла symlink между предварительной проверкой и чтением не может увести чтение во внешний путь.
- `[x]` Обработаны `ENOENT`, `ELOOP` и `ENOTDIR` как безопасный `404`; file handle закрывается в `finally`, а лимит размера повторно проверяется после чтения.
- `[x]` Существующий symlink regression продолжает проходить; полный backend unit — **186 файлов / 606 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Защита касается локального filesystem fallback; атомарность private S3 GET, bucket policy и object-store race по-прежнему требуют staging evidence `SEC-01/SEC-02`.

### Результат сто шестьдесят второй исполняемой порции (31.08.2026)

- `[x]` Чтение provider cover/gallery media теперь открывает файл с `O_NOFOLLOW` и проверяет размер уже открытого inode; symlink/TOCTOU-подмена не может направить bytes за пределы media root.
- `[x]` Streaming API использует тот же безопасный file descriptor с `autoClose`, а ошибки `ENOENT`, `ELOOP` и `ENOTDIR` скрываются как `404`; oversize повторно блокируется до выдачи.
- `[x]` Существующие symlink и oversized media regressions прошли; полный backend unit — **186 файлов / 606 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Production private media, S3 signed access, AV quarantine и bucket policy остаются внешними staging gates `SEC-01/SEC-02`; локальная защита не считается production storage evidence.

### Результат сто шестьдесят третьей исполняемой порции (31.08.2026)

- `[x]` Provider media orphan cleanup теперь использует `lstat`, поэтому symlink, directory и oversized entry не попадают в кандидаты удаления.
- `[x]` Retention не следует по symlink при сборе `mtime` и не удаляет внешний файл; добавлен regression с orphan-файлом и symlink на внешний target.
- `[x]` Provider storage tests **5/5**, полный backend unit — **186 файлов / 607 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Production object storage retention, concurrent cleanup и backup/restore остаются staging gates `SEC-02/SEC-03`; локальный filesystem cleanup не заменяет внешний rehearsal.

### Результат сто шестьдесят четвёртой исполняемой порции (31.08.2026)

- `[x]` Provider media cover/gallery теперь проверяют media root до записи, чтения, streaming и удаления: symlink или не-директория не принимаются.
- `[x]` Перед созданием нового каталога выполняется boundary check, поэтому подменённый root не получает даже временный upload; добавлен regression с symlink root и внешним target.
- `[x]` Provider storage tests **6/6**, полный backend unit — **186 файлов / 608 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Защита локального root не заменяет private S3 bucket policy, signed access, AV quarantine и production storage rehearsal (`SEC-01/SEC-02`).

### Результат сто шестьдесят пятой исполняемой порции (31.08.2026)

- `[x]` Provider logo storage получил тот же root boundary и TOCTOU guard: чтение открывает файл с `O_NOFOLLOW`, streaming использует проверенный descriptor, а root symlink блокируется до записи.
- `[x]` Logo orphan cleanup использует `lstat` и пропускает symlink, directory и oversized entry; удаление не следует по ссылке к внешнему target.
- `[x]` Добавлены regressions для symlink logo, symlink root и cleanup; logo storage tests **5/5**, полный backend unit — **186 файлов / 610 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Production logo bucket policy, private media migration, AV quarantine и backup/restore остаются staging gates `SEC-01/SEC-02/SEC-03`.

### Результат сто шестьдесят шестой исполняемой порции (31.08.2026)

- `[x]` Filesystem cabinet image storage получил root boundary: symlink или не-директория не допускаются перед `put`, `remove`, `list` и streaming.
- `[x]` Cabinet image stream открывает объект через `O_NOFOLLOW` и проверяет размер открытого inode; symlink/TOCTOU-подмена не выдаёт bytes.
- `[x]` Добавлен regression на symlink storage root; cabinet storage regressions и полный backend unit — **186 файлов / 611 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Production cabinet media migration, private object storage, bucket policy и backup/restore остаются staging gates `SEC-01/SEC-02/SEC-03`.

### Результат сто шестьдесят седьмой исполняемой порции (31.08.2026)

- `[x]` Для `autocare_service_attachments.objectKey` добавлен non-unique индекс `IDX_autocare_attachments_object_key`, ускоряющий reference-count проверки retention и account deletion без запрета shared legacy rows.
- `[x]` Миграция `1786300000000-AddAutoCareAttachmentObjectKeyIndex` добавлена в inventory; TypeORM entity и schema-contract query/policy синхронизированы.
- `[x]` Migration regression **2/2** включён в unit config; полный backend unit — **187 файлов / 613 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Применение индекса на staging PostgreSQL и production-like query plan остаются внешним migration/benchmark gate; локальная БД недоступна.

### Результат сто шестьдесят восьмой исполняемой порции (31.08.2026)

- `[x]` Низкоуровневый `FileSystemCabinetImageStorage.put` теперь проверяет фактический размер `Buffer` до проверки root, создания каталога и временного файла: пустой объект отклоняется, а размер больше `MAX_CABINET_IMAGE_BYTES` возвращает стабильный `CABINET_IMAGE_TOO_LARGE`.
- `[x]` Ошибка пустого содержимого возвращает `CABINET_IMAGE_INVALID_CONTENT`; оба guard-а используют тот же HTTP 400 контракт, что и upload validation, поэтому прямой вызов storage не обходит API-ограничения.
- `[x]` Добавлен regression на empty/oversized writes и отсутствие файлового side effect; cabinet storage tests **7/7**, полный backend unit — **187 файлов / 614 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` MIME/magic-byte/decode-проверки по-прежнему выполняются upload/service-слоем; private production object storage, AV quarantine и backup/restore остаются внешними staging gates `SEC-01/SEC-02/SEC-03`.

### Результат сто шестьдесят девятой исполняемой порции (31.08.2026)

- `[x]` Filesystem private attachments больше не создают весь путь через `mkdir(..., recursive)` до проверки: каталоги root/scope/parent создаются по одному с `lstat`-проверкой и закрываются при symlink или не-директории.
- `[x]` Attachment root вычисляется из актуального `CABINET_UPLOADS_DIR`, поэтому смена storage-конфигурации не оставляет stale boundary; запись в подменённый root отклоняется до внешнего side effect.
- `[x]` Добавлен regression с symlink filesystem root и проверкой, что внешний каталог остаётся пустым; attachment storage tests **18/18**, полный backend unit — **187 файлов / 615 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Полная атомарность filesystem write при атаке с заменой каталога между проверками требует staging threat review; production private S3/AV, backup/restore и независимый security review остаются внешними gates.

### Результат сто семидесятой исполняемой порции (31.08.2026)

- `[x]` Перед выдачей S3 signed URL теперь всегда выполняется `HeadObject`, включая legacy attachment rows без checksum/bytes; отсутствие integrity metadata больше не отключает preflight.
- `[x]` Head metadata проверяет безопасный диапазон `ContentLength`, приватное состояние объекта и допустимый `Content-Type`; `quarantine`, oversized/empty object и MIME mismatch не получают signed URL.
- `[x]` Добавлен pure regression для legacy и unsafe S3 metadata; attachment storage tests **19/19**, полный backend unit — **187 файлов / 616 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный S3 bucket policy, permission на `HeadObject`, race между HEAD и последующим GET и независимый security review остаются staging gates `SEC-01/SEC-02/SEC-08`.

### Результат сто семьдесят первой исполняемой порции (31.08.2026)

- `[x]` Private attachment reads теперь отклоняют пустой объект на всех путях: filesystem inode/content, S3 `ContentLength`, streamed body и `transformToByteArray`.
- `[x]` Вынесен единый `assertAutoCareAttachmentStoredByteLength`: проверяются safe integer, диапазон `1..10 MB` и фактический размер, включая legacy rows без DB metadata.
- `[x]` Regression расширен для пустого filesystem объекта, `ContentLength=0`, NaN и boundary cases; attachment storage tests **19/19**, полный backend unit — **187 файлов / 616 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальная S3 GET после HEAD и object-store race остаются staging gates `SEC-02`; private bucket policy и независимый review не подменяются локальными тестами.

### Результат сто семьдесят второй исполняемой порции (31.08.2026)

- `[x]` Public provider media, provider logos и legacy cabinet image streams теперь отклоняют пустые файлы так же, как oversized и symlink объекты.
- `[x]` Guard проверяется по уже открытому inode и по фактически прочитанному содержимому там, где storage возвращает `Buffer`; пустой объект не выдаётся клиенту с успешным `200`.
- `[x]` Regression расширен для cover/gallery, logo и cabinet stream; три storage suites **18/18**, полный backend unit — **187 файлов / 616 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальные CDN/S3 object policies, media quarantine и production retention остаются внешними `SEC-02/SEC-03` gates.

### Результат сто семьдесят третьей исполняемой порции (31.08.2026)

- `[x]` Provider media и logo file names получили верхний лимит 128 символов; UUID‑имена текущего runtime остаются совместимыми.
- `[x]` Ограничение применяется в filename assertions, URL namespace parsing и orphan cleanup, поэтому длинный или подменённый путь не доходит до `lstat`/`unlink`.
- `[x]` Добавлены regressions для чрезмерно длинных media/logo names; provider media/logo suites **11/11**, полный backend unit — **187 файлов / 616 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` WAF/proxy request-size и staging threat review остаются внешними perimeter gates `SEC-02/SEC-06`; локальный filename bound не заменяет их.

### Результат сто семьдесят четвёртой исполняемой порции (31.08.2026)

- `[x]` Account-deletion outbox invariant теперь проверяет не только `userId`, но и исходные `email`/`toEmail`, которые уже учитываются в фактической redaction-операции.
- `[x]` Инвариант получает оригинальный email до анонимизации пользователя; при retention-проверке без email передаётся `NULL`, поэтому проверка не подставляет анонимизированный адрес и не создаёт ложных совпадений.
- `[x]` Добавлены regressions на SQL-поля `userId`/`email`/`toEmail`, режим параметров и передачу исходного email; полный backend unit — **187 файлов / 617 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Retention rehearsal для уже завершённых удалений без сохранённого исходного email всё ещё требует staging evidence; production backup/restore и независимый security review остаются внешними gates `SEC-03/SEC-08`.

### Результат сто семьдесят пятой исполняемой порции (31.08.2026)

- `[x]` Outbox redaction и deletion invariant теперь сопоставляют email-идентификаторы через `LOWER(TRIM(...))`; регистр и случайные пробелы не позволяют payload обойти удаление.
- `[x]` Integration fixture расширен payload-ом с uppercase/whitespace email, чтобы проверять реальный путь очистки, а не только exact-match случай.
- `[x]` Добавлен regression на нормализованное SQL-сопоставление; полный backend unit — **187 файлов / 617 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Service-backed deletion regression и retention для уже завершённых аккаунтов требуют PostgreSQL/staging; локальный SQL-контракт не заменяет production backup/restore и worker-race rehearsal.

### Результат сто семьдесят шестой исполняемой порции (31.08.2026)

- `[x]` Provider profile change requests получили единый строгий валидатор payload, синхронизированный с owner-профилем: длины строк, email/URL, числовые диапазоны и размеры коллекций ограничены до записи в JSONB.
- `[x]` Телефоны, amenities и brand specializations нормализуются с trim/deduplication; документы ограничены 20 элементами, принимают только opaque private references и валидный ISO datetime с offset.
- `[x]` Добавлены regression-тесты на корректную нормализацию и отказ oversized/invalid/public payload; новый policy suite **9/9**, полный backend unit — **188 файлов / 626 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Фактический HTTP replay owner/admin change-request в staging PostgreSQL и private document storage остаётся внешним moderation/security gate; локальный policy не выдаёт signed document access.

### Результат сто семьдесят седьмой исполняемой порции (31.08.2026)

- `[x]` Для appeals добавлен partial unique index `UQ_autocare_appeals_pending_subject` по `submittedById + subject + subjectId` при `status = 'pending'`; это закрывает дубль unresolved appeal на уровне PostgreSQL при параллельных запросах.
- `[x]` `createAutoCareAppeal` теперь воспринимает PostgreSQL `23505` только как возможную гонку дублей, возвращает строку, победившую в гонке, и повторно выбрасывает конфликт, если причина не относится к pending appeal.
- `[x]` Entity, schema-contract inventory и migration `1786310000000-AddAutoCareAppealPendingUniqueIndex` синхронизированы; policy/migration regressions прошли **10/10**, полный backend unit — **189 файлов / 629 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Перед применением миграции на staging нужно проверить и вручную разрешить уже существующие pending-дубли; применение на production PostgreSQL и multi-process concurrency rehearsal остаются внешними gates `SEC-06/SEC-08`.

### Результат сто семьдесят восьмой исполняемой порции (31.08.2026)

- `[x]` Миграция appeals получила отдельный duplicate-preflight: до DDL группируются pending-записи по ключу уникальности и проверяется безопасный числовой результат.
- `[x]` При исторических pending-дублях миграция останавливается с понятным сообщением о числе групп, требующих reconciliation; некорректный ответ preflight также блокирует DDL.
- `[x]` Добавлены regressions на чистый preflight, duplicate-группу и invalid count; migration suite прошёл **4/4**, полный backend unit — **189 файлов / 631 тест**, backend build и frontend lint PASS.
- `[~]` Фактическая сверка и разрешение дублей в staging/production PostgreSQL всё ещё выполняются оператором до запуска миграции; локальный mock не является данными окружения.

### Результат сто семьдесят девятой исполняемой порции (31.08.2026)

- `[x]` Экспорт пользовательских данных теперь включает отправленные пользователем appeals, их причины, статусы, даты решений и evidence references в bounded-коллекции.
- `[x]` Из экспорта appeals исключён `decidedById`, поэтому внутренний идентификатор модератора не раскрывается пользователю; приватные attachment `objectKey` по-прежнему не экспортируются.
- `[x]` Реальный data-export service, OpenAPI-схема и mock-ответ синхронизированы; serializer/openapi regressions прошли **4/4**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Сервисный PostgreSQL replay с реальными appeal rows и ручная проверка содержимого экспортного архива остаются staging/privacy gate; обязательные проценты freeze не меняются без полного пункта `SEC-03`.

### Результат сто восьмидесятой исполняемой порции (31.08.2026)

- `[x]` Evidence для guarantee claims теперь принимает только opaque private-media references из namespace `private://autocare/claims/...`; произвольные HTTPS URLs, traversal и другие namespaces отклоняются на schema boundary.
- `[x]` Mock API и OpenAPI contract синхронизированы с private claims media policy, включая лимит 20 evidence references и bounded path pattern.
- `[x]` Добавлен regression для public/traversal/valid claim evidence; schema/OpenAPI regressions прошли **13/13**, полный backend unit — **189 файлов / 633 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальная загрузка claim evidence через private S3/AV pipeline и signed access остаётся внешним gate `PILOT-03/SEC-02`; schema policy не подменяет staging storage evidence.

### Результат сто восемьдесят первой исполняемой порции (31.08.2026)

- `[x]` Прямой вызов `createAutoCareGuaranteeClaim` теперь повторно нормализует и проверяет evidence references перед записью; schema bypass не позволяет сохранить public URL, traversal или значение не-строкового типа.
- `[x]` Нормализатор ограничивает коллекцию 20 элементами и trim-ит безопасные private references; invalid input возвращает стабильный `422 VALIDATION_ERROR`.
- `[x]` Добавлен private-reference policy suite **2/2**, полный backend unit — **190 файлов / 635 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` HTTP/storage replay claim evidence через private S3/AV/signed access остаётся внешним `PILOT-03/SEC-02` gate.

### Результат сто восемьдесят второй исполняемой порции (31.08.2026)

- `[x]` Прямой вызов `createAutoCareBroadcastRequest` теперь повторно нормализует и проверяет `photoUrls` перед сохранением; schema bypass не позволяет записать public URL, traversal или значение не-строкового типа.
- `[x]` Нормализатор поддерживает только namespaces `requests` и `broadcasts`, trim-ит ссылки и ограничивает коллекцию 12 элементами; invalid input возвращает стабильный `422 VALIDATION_ERROR`.
- `[x]` Private-reference policy suite расширен до **3/3**, полный backend unit — **190 файлов / 636 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` HTTP/storage replay broadcast photos через private S3/AV/signed access остаётся внешним `PILOT-03/SEC-02` gate.

### Результат сто восемьдесят третьей исполняемой порции (31.08.2026)

- `[x]` Очередь moderation-evidence для документов владельца теперь повторно нормализует записи перед сохранением; прямой вызов не может записать не-объект, пустой/слишком длинный label, public reference или невалидную дату.
- `[x]` Для документов действует bounded-коллекция максимум 20 элементов, trim для label/reference и обязательный timezone offset для строковых дат; переполнение и malformed input дают стабильный `422 VALIDATION_ERROR`, а не молчаливое усечение или `500`.
- `[x]` Создание provider передаёт документы в единый нормализатор; private-reference policy suite расширен до **4/4**, полный backend unit — **190 файлов / 637 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальная проверка документов через private storage, AV/quarantine и signed moderator access остаётся внешним `PILOT-03/SEC-02` gate.

### Результат сто восемьдесят четвёртой исполняемой порции (31.08.2026)

- `[x]` Создание профиля автосервиса теперь строго нормализует `logoUrl`, `coverImageUrl` и `galleryImageUrls` перед записью; прямой вызов не может сохранить внешний, protocol-relative, static или traversal URL.
- `[x]` Для owner media действует лимит 12 gallery references, trim и deduplication; malformed/non-string input даёт стабильный `422 VALIDATION_ERROR`, а response-фильтрация legacy rows остаётся неизменной.
- `[x]` Добавлен strict write-boundary regression для generated logo/cover/gallery и unsafe input; public-media suite расширен до **5/5**, полный backend unit — **190 файлов / 638 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальная загрузка, AV/quarantine, private storage ACL и moderation replay остаются внешними `PILOT-03/SEC-02` gates.

### Результат сто восемьдесят пятой исполняемой порции (31.08.2026)

- `[x]` `createAutoCareReview` и `updateClientAutoCareReview` теперь повторно нормализуют рейтинг и текст непосредственно перед записью; прямой вызов не может сохранить NaN/дробный/вне диапазона рейтинг или короткий/не-строковый текст.
- `[x]` Текст приводится к NFKC и trim-ится, сохраняется исходный регистр; ограничения совпадают с review schema (рейтинг 1–5, текст 10–1000 символов), invalid input даёт стабильный `422 VALIDATION_ERROR`.
- `[x]` Добавлен review-content regression; review-integrity suite расширен до **5/5**, полный backend unit — **190 файлов / 639 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный staging review submission, moderation decision, attached review media и multi-client replay остаются внешними `PILOT-02/PILOT-03/SEC-06` gates.

### Результат сто восемьдесят шестой исполняемой порции (31.08.2026)

- `[x]` Сообщения service-request и generic chat теперь нормализуют тело непосредственно перед сохранением: NFKC, trim и bounded длина 1–4000 символов; пустые, non-string и oversized значения дают `422 VALIDATION_ERROR`.
- `[x]` Service-request idempotency key теперь проходит тот же safe runtime-контракт при прямом вызове, что и HTTP header: только 8–128 символов `[A-Za-z0-9_-]`; retry fingerprint строится по нормализованному телу.
- `[x]` Добавлены message-content и direct-idempotency regressions; полный backend unit — **191 файл / 642 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Multi-process Redis/WebSocket delivery, reconnect/retry и staging chat moderation остаются внешними `PILOT-06/SEC-06/SEC-09` gates.

### Результат сто восемьдесят седьмой исполняемой порции (31.08.2026)

- `[x]` `createAutoCareServiceOffer` теперь повторно нормализует payload непосредственно перед транзакцией: type, title, description, discount, coupon, amount, currency и expiry не могут обойти HTTP schema при прямом вызове.
- `[x]` Купоны и валюты сохраняются в каноническом верхнем регистре, amount/currency проверяются как согласованная пара, alternative-offer не принимает discount/coupon поля, а discount требует целый процент 1–100.
- `[x]` Сервис использует нормализованный title в message body, repair event и notification; добавлен отдельный offer-policy regression suite **3/3**, полный backend unit — **192 файла / 645 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Quote/offer replay с реальными PostgreSQL locks и staging multi-process concurrency остаётся внешним `PILOT-04/SEC-06` gate; платежные системы намеренно не входят в проверку.

### Результат сто восемьдесят восьмой исполняемой порции (31.08.2026)

- `[x]` `createAutoCareServiceQuote` теперь повторно нормализует payload непосредственно перед транзакцией: сумма, валюта, note, line items, налоги, комиссии, expiry и `priceLocked` не могут обойти HTTP schema при прямом вызове.
- `[x]` Line items ограничены 100 элементами, имеют bounded title/kind/quantity/unit price, а `totalMinor` вычисляется только после безопасной проверки чисел; необязательные поля получают канонические defaults.
- `[x]` Валюта и note нормализуются, malformed даты/числа и неконсистентные line items дают стабильный `422 VALIDATION_ERROR`; добавлен quote-input regression suite **4/4**, полный backend unit — **193 файла / 649 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный PostgreSQL quote replay, блокировки и multi-process concurrency остаются внешним `PILOT-04/SEC-06` gate; платежные системы намеренно не входят в проверку.

### Результат сто восемьдесят девятой исполняемой порции (31.08.2026)

- `[x]` Запрос переноса визита теперь повторно нормализует `proposedAt` и причину на сервисной границе; обязательна offset-aware дата, а reason ограничен 1 000 символами и приводится к NFKC/trim.
- `[x]` Решение по переносу также проверяет reason до транзакции, поэтому non-string и oversized значения не доходят до `resolutionReason` или audit event; прошлое время по-прежнему возвращает бизнес-конфликт 409.
- `[x]` Добавлен reschedule-input regression suite **3/3**, полный backend unit — **194 файла / 652 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный multi-process reschedule race и staging PostgreSQL capacity replay остаются внешним `PILOT-04/SEC-06` gate.

### Результат сто девяностой исполняемой порции (31.08.2026)

- `[x]` Причины отмены, no-show и завершения визита теперь проходят единый bounded normalizer до открытия транзакции; non-string и тексты длиннее 1 000 символов дают стабильный `422 VALIDATION_ERROR`.
- `[x]` Причины приводятся к NFKC/trim, пустые значения канонизируются в `null`, а сохранённые значения в request, repair event и audit flow больше не зависят от небезопасного прямого вызова.
- `[x]` Reschedule policy regression расширен до **3/3**, полный backend unit — **194 файла / 652 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальное PostgreSQL transition matrix для cancel/no-show/complete и multi-process race остаётся внешним `PILOT-04/SEC-06` gate.

### Результат сто девяносто первой исполняемой порции (31.08.2026)

- `[x]` `createAutoCareServiceRequest` теперь повторно нормализует вход непосредственно перед lookup и транзакцией; прямой вызов не может обойти route schema и записать повреждённые идентификаторы, даты, snapshots, заметку или idempotency key.
- `[x]` UUID приводятся к каноническому lowercase, `preferredAt` требует offset-aware datetime и сохраняется в UTC ISO, contact/vehicle JSONB проходят bounded allow-list и NFKC/trim, note ограничена 4 000 символами, а idempotency key использует общий safe-контракт 8–128 символов до обращения к БД.
- `[x]` Добавлен request-input regression suite **4/4**, полный backend unit — **195 файлов / 656 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный PostgreSQL create-request idempotency/concurrency replay и внешняя доставка email/телефона остаются staging gates `PILOT-02/PILOT-04/SEC-06`; partial contact snapshots сохранены только для совместимости внутренних fixtures, HTTP route по-прежнему требует полный контактный schema-контракт.

### Результат сто девяносто второй исполняемой порции (31.08.2026)

- `[x]` Appeal create boundary теперь проверяет subject, subjectId/providerId и evidence UUID до обращений к БД; reason нормализуется NFKC/trim, evidence ограничены 20 валидными UUID без молчаливого усечения и дубликатов.
- `[x]` Admin appeal decision boundary теперь безопасно обрабатывает malformed payload: статус ограничен `accepted/rejected`, reason нормализуется и ограничен 2 000 символами; прямой вызов больше не падает на `.trim()` или не пишет невалидный статус.
- `[x]` Appeal policy regression расширен до **4/4**, полный backend unit — **195 файлов / 657 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный HTTP/PostgreSQL appeal lifecycle, evidence ownership replay и multi-process moderation race остаются внешними gates `PILOT-03/SEC-06`; route schema и private storage policy продолжают действовать независимо от сервисного normalizer.

### Результат сто девяносто третьей исполняемой порции (31.08.2026)

- `[x]` Create chat report boundary теперь повторно проверяет категорию и описание до lookup/save; описание приводится к NFKC/trim, пустое значение становится `null`, максимум — 2 000 символов.
- `[x]` Chat block boundary нормализует UUID участника и причину до поиска/записи; malformed target/reason даёт стабильный `422 VALIDATION_ERROR`, а не TypeORM/`trim()` exception.
- `[x]` Admin chat-report decision boundary ограничивает статус `resolved/dismissed`, причину 2 000 символами и `blockUser` boolean; добавлен policy suite **5/5**, полный backend unit — **196 файлов / 662 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный multi-process chat moderation/reconnect, private media quarantine и staging queue replay остаются внешними gates `PILOT-03/PILOT-06/SEC-06`.

### Результат сто девяносто четвёртой исполняемой порции (31.08.2026)

- `[x]` `createAutoCareChat` теперь повторно нормализует type, subject и optional provider/request UUID до provider lookup и thread persistence; NFKC/trim и bounded subject не позволяют сохранить управляющие символы или oversized тему.
- `[x]` Прямой malformed вызов возвращает стабильный `422 VALIDATION_ERROR`, а существующая role/provider/chat-enabled логика не изменена; canonical UUID используются в permission и duplicate checks.
- `[x]` Добавлен chat-input policy suite **4/4**, полный backend unit — **197 файлов / 666 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Привязка optional `requestId` к новым inquiry/support thread и реальный multi-process chat replay остаются отдельными staging/contract задачами; эта порция закрывает только безопасную нормализацию текущего create flow.

### Результат сто девяносто пятой исполняемой порции (31.08.2026)

- `[x]` Upload envelope для service-request и chat attachments теперь повторно проверяет fileName, MIME, declared size и base64 до decode/storage; direct-call bypass больше не может передать `null`, non-string или oversized envelope в attachment pipeline.
- `[x]` File names нормализуются NFKC/trim и ограничены 255 символами без управляющих code points; `decodeAutoCareAttachment` сам возвращает стабильный `422 VALIDATION_ERROR` для malformed runtime input.
- `[x]` Attachment content regression расширен, полный backend unit — **197 файлов / 667 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Private S3 ACL, ClamAV/quarantine, signed delivery и production storage rehearsal остаются внешними gates `PILOT-03/SEC-02`; текущая порция усиливает только локальную write boundary.

### Результат сто девяносто шестой исполняемой порции (31.08.2026)

- `[x]` Client vehicle create/update теперь повторно нормализуют payload на сервисной границе; прямой вызов не может записать неизвестные поля, невалидные года/числа, неподдерживаемый fuel type или повреждённый VIN.
- `[x]` Марка/модель/цвет/идентификаторы приводятся к NFKC/trim, `brandId` канонизируется в lowercase, VIN проверяется по 17-символьному allow-list и uppercase; nullable plate/internal number безопасно превращаются в `null`.
- `[x]` Добавлен client-vehicle policy suite **4/4**, полный backend unit — **198 файлов / 671 тест**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальная PostgreSQL persistence vehicleId/snapshot в заявке, удаление автомобиля и staging client-path replay остаются внешними gates `MVP-02/PILOT-02`; fleet vehicle scope намеренно не расширяется.

### Результат сто девяносто седьмой исполняемой порции (31.08.2026)

- `[x]` Favorites create/remove/sync теперь повторно проверяют UUID кабинета на сервисной границе и канонизируют идентификаторы в lowercase до lookup/upsert/delete.
- `[x]` Sync payload больше не принимает `null`, non-array, malformed IDs или превышение лимита 100; сервис возвращает стабильный `422 VALIDATION_ERROR`, а duplicate IDs дедуплицируются без изменения порядка.
- `[x]` Favorites policy suite добавлен в unit gate (**3/3**), полный backend unit — **199 файлов / 674 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный PostgreSQL favorite replay и multi-device concurrency остаются внешними client-path/staging checks; платежи и подписочные связи не затрагиваются.

### Результат сто девяносто восьмой исполняемой порции (31.08.2026)

- `[x]` Обновление пользовательских preferences теперь повторно проверяет partial payload на сервисной границе до notification mutation и `UserEntity.save`.
- `[x]` Email switches требуют boolean, locale проходит supported-locale policy, city/categories нормализуются whitespace/NFKC, ограничиваются длинами/количеством, а неизвестные ключи и malformed runtime values дают стабильный `422 VALIDATION_ERROR`.
- `[x]` Preference policy suite добавлен в unit gate (**4/4**), полный backend unit — **200 файлов / 678 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный PostgreSQL preference/notification replay и проверка consent/retention в staging остаются внешним `PILOT-02/SEC-03` gate.

### Результат сто девяносто девятой исполняемой порции (31.08.2026)

- `[x]` Admin moderation evidence decision теперь повторно нормализует `status` и `reason` непосредственно перед транзакцией; прямой вызов не может сохранить неизвестные поля, нестроковую причину или неподдерживаемый статус.
- `[x]` Причина проходит NFKC/trim и bounded-ограничение 1–2 000 символов, а malformed payload возвращает стабильный `422 VALIDATION_ERROR` до блокировки строки и изменения provider/review.
- `[x]` Moderation-evidence policy suite расширен до **6/6**, полный backend unit — **201 файл / 684 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Полноценный evidence viewer, private media access, AV/quarantine и staging moderation replay остаются внешними gates `PILOT-03/SEC-02/SEC-06`; локальная сервисная нормализация их не подменяет.

### Результат двухсотой исполняемой порции (31.08.2026)

- `[x]` Список appeals в admin service теперь повторно нормализует query на сервисной границе; статусы и subjects ограничены enum, `limit` — целым диапазоном 1–100, а неизвестные поля и malformed runtime values отклоняются до запроса к PostgreSQL.
- `[x]` Withdraw и admin decision канонизируют `appealId` как UUID до блокировки строки; malformed identifier получает стабильный `422 VALIDATION_ERROR`, а не TypeORM/DB exception.
- `[x]` Значение по умолчанию зафиксировано на 50 записей; route-compatible `cursor` принимается bounded-проверкой до завершения миграции списка на полноценную cursor pagination, но текущий array response contract не изменён.
- `[x]` Appeal policy suite расширен до **5/5**, полный backend unit — **201 файл / 685 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Полноценная cursor pagination admin appeals и staging HTTP replay остаются отдельными задачами; эта порция закрывает только bounded query boundary без изменения API-формата.

### Результат двести первой исполняемой порции (31.08.2026)

- `[x]` Admin moderation evidence queue теперь повторно нормализует status filter на сервисной границе; принимаются только `pending`, `approved` и `rejected`, с NFKC/trim/lowercase canonicalization.
- `[x]` Unknown, legacy `verified`, non-string и malformed status values получают стабильный `422 VALIDATION_ERROR` до обращения к TypeORM; прежний лимит выборки 100 и response contract не изменены.
- `[x]` Moderation-evidence policy suite расширен до **7/7**, полный backend unit — **201 файл / 686 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Полноценная moderation queue UI, evidence viewer, private media access и staging queue replay остаются внешними `PILOT-03/SEC-02/SEC-06` gates.

### Результат двести второй исполняемой порции (31.08.2026)

- `[x]` `evidenceId` в admin moderation decision и `providerId` в owner evidence list теперь канонизируются как UUID до обращения к PostgreSQL; пробелы и регистр нормализуются, malformed identifiers отклоняются.
- `[x]` Прямой вызов с повреждённым идентификатором получает стабильный `422 VALIDATION_ERROR`, а branch ownership lookup и moderation lock работают только с canonical UUID.
- `[x]` Moderation-evidence policy suite расширен до **8/8**, полный backend unit — **201 файл / 687 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальная owner/admin HTTP-проверка ownership, private media ACL и staging moderation replay остаются внешними `PILOT-03/SEC-02/SEC-06` gates.

### Результат двести третьей исполняемой порции (31.08.2026)

- `[x]` Admin provider change request queue теперь повторно нормализует status/kind filter на сервисной границе; enum values приводятся к NFKC/trim/lowercase, unknown значения отклоняются до PostgreSQL.
- `[x]` Admin decision канонизирует request UUID и статус `approved/rejected`, нормализует nullable reason с лимитом 2 000 символов и возвращает стабильный `422 VALIDATION_ERROR` для malformed direct calls.
- `[x]` Provider change request policy suite расширен до **11/11**, полный backend unit — **201 файл / 689 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный admin/provider HTTP replay, PostgreSQL lock race и private document moderation остаются внешними `PILOT-03/SEC-06/SEC-02` gates.

### Результат двести четвёртой исполняемой порции (31.08.2026)

- `[x]` Catalog-gap admin queue теперь повторно нормализует status filter; принимаются только `pending`, `approved` и `rejected`, с NFKC/trim/lowercase canonicalization.
- `[x]` Admin decision канонизирует request UUID и статус `approved/rejected`, нормализует reason до 2 000 символов и требует непустую причину для rejection; malformed direct calls получают `422 VALIDATION_ERROR` до lock и catalog mutation.
- `[x]` Добавлен catalog-gap policy suite **4/4**, полный backend unit — **202 файла / 693 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный catalog-gap HTTP/PostgreSQL replay, уникальность service slug под гонкой и admin audit/evidence остаются внешними `PILOT-03/SEC-06` gates.

### Результат двести пятой исполняемой порции (31.08.2026)

- `[x]` Admin service-definition update теперь повторно нормализует category, localized labels, price type, comparison attributes и active flag до записи; неизвестные поля, malformed types и normalized label collisions отклоняются.
- `[x]` Definition UUID канонизируется до lookup, labels/attributes проходят NFKC/trim и bounded-лимиты, дубликаты attributes дедуплицируются без молчаливого усечения.
- `[x]` Catalog-gap policy suite расширен до **6/6**, полный backend unit — **202 файла / 695 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный admin catalog HTTP replay, PostgreSQL slug uniqueness/concurrency и audit evidence остаются внешними `PILOT-03/SEC-06` gates.

### Результат двести шестой исполняемой порции (31.08.2026)

- `[x]` Создание catalog-gap request теперь повторно нормализует полный payload до permission lookup и записи; provider UUID, proposed slug, category, labels, price type, comparison attributes и rationale получают канонические типы и bounded-лимиты.
- `[x]` Unknown fields, malformed/public identifiers, invalid slug/locale/price values и oversized collections/reason отклоняются через `422 VALIDATION_ERROR`; attributes дедуплицируются без молчаливого усечения, provider permission проверяется по canonical UUID.
- `[x]` Catalog-gap policy suite расширен до **8/8**, полный backend unit — **202 файла / 697 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный catalog-gap HTTP/PostgreSQL replay, duplicate pending race и slug uniqueness под конкуренцией остаются внешними `PILOT-02/PILOT-03/SEC-06` gates.

### Результат двести седьмой исполняемой порции (31.08.2026)

- `[x]` Admin chat reports queue теперь повторно нормализует status filter на сервисной границе; принимаются только `pending`, `resolved`, `dismissed`, с NFKC/trim/lowercase canonicalization.
- `[x]` Admin report decision канонизирует `reportId` как UUID до lookup; malformed identifiers получают стабильный `422 VALIDATION_ERROR`, не доходя до moderation mutation.
- `[x]` Chat-moderation policy suite расширен до **6/6**, полный backend unit — **202 файла / 698 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный moderation queue/reconnect replay, private attachments и staging multi-process race остаются внешними `PILOT-03/PILOT-06/SEC-06` gates.

### Результат двести восьмой исполняемой порции (31.08.2026)

- `[x]` Chat thread lookup теперь канонизирует `chatId` до access check; revoke block дополнительно проверяет `chatId` и `blockId` до запроса и изменения статуса.
- `[x]` Chat attachment lookup и request-thread lookup получили тот же UUID-boundary, поэтому malformed direct calls получают `422 VALIDATION_ERROR` до чтения private object или сообщения.
- `[x]` Chat-input policy suite расширен до **5/5**, полный backend unit — **202 файла / 699 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный chat authorization replay, private attachment ACL, signed delivery и multi-process reconnect остаются внешними `PILOT-03/PILOT-06/SEC-02` gates.

### Результат двести девятой исполняемой порции (31.08.2026)

- `[x]` Owner provider change request теперь повторно нормализует provider UUID, request kind и profile payload до permission lookup/duplicate check; verification request не принимает профильные поля.
- `[x]` Owner list/cancel paths канонизируют provider/request UUID, а malformed envelope, неизвестные поля и unsafe profile values получают стабильный `422 VALIDATION_ERROR` до PostgreSQL.
- `[x]` Provider change request policy suite расширен до **13/13**, полный backend unit — **202 файла / 701 тест**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный owner/admin workflow, multi-owner race и private document moderation остаются внешними `PILOT-02/PILOT-03/SEC-02/SEC-06` gates.

### Результат двести десятой исполняемой порции (31.08.2026)

- `[x]` Owner membership/invitation list, create и revoke paths теперь канонизируют provider, invitation и membership UUID до permission lookup и запросов; malformed identifiers получают стабильный `422 VALIDATION_ERROR`.
- `[x]` Invitation envelope принимает только поддерживаемые роли `manager/staff`, валидный email и UUID service location; неизвестные поля и небезопасные значения отклоняются до записи.
- `[x]` Invitation token trim/формат/длина проверяются до SHA-256 lookup, поэтому malformed direct calls не доходят до хеширования и транзакции принятия.
- `[x]` Добавлен provider membership policy suite **4/4**, полный backend unit — **203 файла / 705 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальная доставка приглашений через SMTP, HTTP replay, multi-process accept race и staging branch-scoped workflow остаются внешними `PILOT-02/PILOT-03/SEC-06` gates.

### Результат двести одиннадцатой исполняемой порции (31.08.2026)

- `[x]` Owner bonus programme и liability paths теперь канонизируют provider UUID до permission lookup и чтения/записи provider-scoped данных.
- `[x]` Redeem и manual grant повторно проверяют payload на сервисной границе: UUID клиента/заявки, целые bounded points, reason/name, проценты, срок действия, active flag и unknown fields; malformed direct calls получают `422 VALIDATION_ERROR` до транзакции.
- `[x]` Idempotency-Key для bonus mutation нормализуется общим safe-character контрактом; grant требует ключ, а redeem сохраняет прежний deterministic fallback при его отсутствии.
- `[x]` Добавлен bonus input policy suite **5/5**, полный backend unit — **204 файла / 710 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный owner/client HTTP replay, PostgreSQL bonus race и staging audit/retention остаются внешними `PILOT-02/SEC-03/SEC-06` gates.

### Результат двести двенадцатой исполняемой порции (31.08.2026)

- `[x]` Owner analytics теперь принимает только canonical provider UUID и передаёт его в capability lookup, provider query, branch-scoped requests, reviews, bonus liability и daily metrics.
- `[x]` Malformed direct calls получают стабильный `422 VALIDATION_ERROR` до проверки разрешений и любого обращения к PostgreSQL; uppercase/whitespace UUID приводятся к одному ключу scope.
- `[x]` Добавлены analytics service boundary tests **2/2**, полный backend unit — **205 файлов / 712 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный analytics HTTP replay, consent/retention evidence и staging multi-location aggregation остаются внешними `PILOT-02/SEC-03/SEC-06` gates.

### Результат двести тринадцатой исполняемой порции (31.08.2026)

- `[x]` Owner reviews и review-promo paths теперь канонизируют provider/review/request UUID до provider lookup, branch permission и review mutation; optional provider filter не может расширить список чужих сервисов.
- `[x]` Promo input/code получают NFKC/trim/uppercase normalization и bounded-проверки discount, service slug и expiry; malformed direct calls получают `422 VALIDATION_ERROR` до PostgreSQL и transaction lock.
- `[x]` Client review create/update теперь отклоняет malformed request/review identifiers до чтения заявки/отзыва; redeem promo проверяет код до транзакции.
- `[x]` Добавлены review policy и service-boundary suites **6/6**, полный backend unit — **207 файлов / 718 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный review HTTP replay, moderation evidence/private media, promo redemption race и staging branch-scoped audit остаются внешними `PILOT-02/PILOT-03/SEC-02/SEC-06` gates.

### Результат двести четырнадцатой исполняемой порции (31.08.2026)

- `[x]` Public provider profile, offers и reviews теперь канонизируют provider UUID до чтения профиля, филиалов, офферов и approved reviews.
- `[x]` Public service filter нормализуется через NFKC/trim и bounded-лимит, а review limits получают безопасный диапазон `1..50`; malformed direct calls возвращают `422 VALIDATION_ERROR` до PostgreSQL.
- `[x]` Добавлены public-provider policy и service-boundary suites **5/5**, полный backend unit — **209 файлов / 723 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный публичный HTTP replay, provider discovery rate limit и staging media/SEO evidence остаются внешними `PILOT-02/PILOT-05/SEC-06` gates.

### Результат двести пятнадцатой исполняемой порции (31.08.2026)

- `[x]` Owner calendar/capacity resources и reservations теперь канонизируют provider/location/resource UUID до branch permission, default-resource reads и reservation queries.
- `[x]` Resource create/update payloads проходят allow-list, enum, NFKC/trim, capacity `1..100`, boolean и bounded JSON metadata; reservation ranges требуют offset datetime и безопасный порядок `from < to`.
- `[x]` Malformed direct calls получают `422 VALIDATION_ERROR` до authorization/transaction, а canonical branch scope используется во всех capacity reads/writes.
- `[x]` Добавлены capacity policy и service-boundary suites **7/7**, полный backend unit — **211 файлов / 730 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Полный resource-level concurrency, multi-process calendar replay и staging branch schedule остаются внешними `PILOT-02/SEC-06` gates; lifts/equipment не расширялись.

### Результат двести шестнадцатой исполняемой порции (31.08.2026)

- `[x]` Owner communication settings теперь канонизируют provider UUID до owner-scoped lookup; пробелы и регистр не меняют branch scope, malformed identifiers получают `422 VALIDATION_ERROR` до PostgreSQL.
- `[x]` Communication payload принимает только allow-list полей; team/business enums, booleans, response window `15..10 080`, contact note и cross-field правила проходят bounded/NFKC-проверку до `Object.assign` и `save`.
- `[x]` Добавлены communication policy и service-boundary suites **8/8**, полный backend unit — **213 файлов / 738 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный owner HTTP replay, SMTP delivery и staging consent/retention evidence остаются внешними `PILOT-02/SEC-06` gates.

### Результат двести семнадцатой исполняемой порции (31.08.2026)

- `[x]` Создание профиля сервиса владельцем теперь канонизирует market/zone UUID до repository lookup; пробелы и регистр не меняют рынок или зону.
- `[x]` Невалидные или смешанные market/zone references получают `422 VALIDATION_ERROR` до чтения PostgreSQL и открытия транзакции; проверка принадлежности активной зоны выбранному рынку сохранена.
- `[x]` Добавлены provider-location policy и service-boundary suites **4/4**, полный backend unit — **215 файлов / 742 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный owner onboarding HTTP replay и staging multi-location verification остаются внешними `PILOT-02/SEC-06` gates.

### Результат двести восемнадцатой исполняемой порции (31.08.2026)

- `[x]` Owner offer update теперь канонизирует provider/offer/resource UUID до lookup и permission check; описание, цена, режим записи и resource arrays проходят allow-list, NFKC и bounded-проверки.
- `[x]` Offer mutation подтверждает принадлежность оффера выбранному provider через `service_location`; owner provider-wide scope больше не может изменить оффер чужого сервиса по одному `offerId`.
- `[x]` Добавлены owner-offer policy и service-boundary suites **7/7**, полный backend unit — **217 файлов / 749 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный owner catalog HTTP replay, PostgreSQL resource race и staging branch audit остаются внешними `PILOT-02/SEC-06` gates.

### Результат двести девятнадцатой исполняемой порции (31.08.2026)

- `[x]` Offer update теперь проверяет совместимость выбранных active resources с заявленными resource types; lift/equipment не могут незаметно попасть в offer, объявленный только для bay/specialist.
- `[x]` Проверка выполняется после provider/location scope и до `save`, без изменения существующего поведения для офферов без явных resource IDs.
- `[x]` Policy и service-boundary suites расширены до **9/9**, полный backend unit — **217 файлов / 751 тест**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Полная reservation concurrency и staging resource replay остаются внешними `PILOT-02/SEC-06` gates.

### Результат двести двадцатой исполняемой порции (31.08.2026)

- `[x]` Все chat/quote/offer/attachment/confirm/reschedule/no-show/complete/cancel service-request paths теперь канонизируют request UUID до repository lookup или transaction; malformed direct calls получают `422 VALIDATION_ERROR`.
- `[x]` Offer decisions дополнительно проверяют message UUID, а attachment reads — attachment UUID до participant lookup и signed-object access.
- `[x]` Добавлены request UUID policy и service-boundary suites **7/7**, полный backend unit — **218 файлов / 754 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный HTTP replay переходов, PostgreSQL concurrency и staging delivery остаются внешними `PILOT-02/PILOT-03/SEC-06` gates.

### Результат двести двадцать первой исполняемой порции (31.08.2026)

- `[x]` Availability теперь канонизирует provider/location/offering UUID до активного-provider lookup и расчёта слотов; все запросы заново используют canonical scope.
- `[x]` Дата availability проходит строгую календарную проверку (включая leap day), а невозможные даты и malformed direct calls получают `422 VALIDATION_ERROR` до PostgreSQL.
- `[x]` Добавлены availability policy и service-boundary suites **5/5**, полный backend unit — **220 файлов / 759 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный availability HTTP replay, timezone matrix и staging capacity evidence остаются внешними `PILOT-02/SEC-06` gates.

### Результат двести двадцать второй исполняемой порции (31.08.2026)

- `[x]` AutoCare favorites add/remove/sync теперь канонизируют provider/location UUID и повторно проверяют bounded sync list до PostgreSQL.
- `[x]` Duplicate provider IDs дедуплицируются, malformed references и списки свыше 100 элементов получают `422 VALIDATION_ERROR`; owner/client scope поведения не менялся.
- `[x]` Добавлены favorites policy и service-boundary suites **5/5**, полный backend unit — **222 файла / 764 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный client favorites HTTP replay и staging deletion/retention evidence остаются внешними `PILOT-02/SEC-03` gates.

### Результат двести двадцать третьей исполняемой порции (31.08.2026)

- `[x]` Публичный trust endpoint теперь канонизирует provider UUID до active-provider lookup, evidence/snapshot reads и response projection.
- `[x]` Malformed direct calls получают `422 VALIDATION_ERROR` до PostgreSQL; uppercase/whitespace UUID приводятся к одному публичному provider scope.
- `[x]` Добавлены trust service-boundary tests **2/2**, полный backend unit — **223 файла / 766 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный trust HTTP replay, snapshot expiry/rollout staging и production moderation evidence остаются внешними `PILOT-02/SEC-06` gates.

### Результат двести двадцать четвёртой исполняемой порции (31.08.2026)

- `[x]` Marketplace service теперь канонизирует UUID для repair timeline, broadcast request/offer, guarantee claim и fleet vehicle до repository lookup, workspace authorization и transaction.
- `[x]` Malformed direct calls получают `422 VALIDATION_ERROR` до PostgreSQL, включая location UUID в offer mutation; существующие owner/client authorization paths не изменены.
- `[x]` Добавлены marketplace identifier boundary tests **3/3 (8 assertions)**, полный backend unit — **224 файла / 769 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный marketplace HTTP replay, transaction race и staging branch-scoped workflow остаются внешними `PILOT-02/PILOT-03/SEC-06` gates.

### Результат двести двадцать пятой исполняемой порции (03.09.2026)

- `[x]` Fair-price query теперь нормализует service, market, make, model и fuel references до bounded NFKC/trim-значений перед каталогом.
- `[x]` Некорректные или oversized references и `engineLiters` получают `422 VALIDATION_ERROR` до repository access; нормализованный service reference используется в первом definition lookup.
- `[x]` Добавлены marketplace fair-price boundary tests **2/2 (5 assertions)**, полный backend unit — **224 файла / 771 тест**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный fair-price HTTP replay, catalog seed parity и production benchmark остаются внешними `PILOT-02/PILOT-05/SEC-06` gates.

### Результат двести двадцать шестой исполняемой порции (03.09.2026)

- `[x]` Public location-zones query теперь нормализует market reference и parent zone UUID, проверяет лимит `1..100` и координаты до обращения к каталогу.
- `[x]` Trimmed market code используется в fallback/DB lookup, а canonical parent UUID — в zone query; malformed direct calls получают `422 VALIDATION_ERROR` до PostgreSQL.
- `[x]` Добавлены location-zones boundary tests **4/4**, полный backend unit — **225 файлов / 775 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный location-zones HTTP replay, market hierarchy seed и production geospatial benchmark остаются внешними `PILOT-02/PILOT-05/SEC-06` gates.

### Результат двести двадцать седьмой исполняемой порции (03.09.2026)

- `[x]` Public discovery query теперь повторно нормализуется на service boundary до cache key и SQL: bounded текстовые фильтры, UUID зоны, enum sort/price type, boolean-флаги, радиус и лимиты.
- `[x]` Проверяются finite числовые диапазоны, `minPrice <= maxPrice`, cursor length и unknown fields; malformed direct calls получают `422 VALIDATION_ERROR` до cache/репозитория.
- `[x]` Добавлен discovery input policy suite **4/4**, полный backend unit — **226 файлов / 779 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный discovery HTTP replay, cursor/market load benchmark и staging rate-limit evidence остаются внешними `PILOT-02/PILOT-05/SEC-06` gates.

### Результат двести двадцать восьмой исполняемой порции (03.09.2026)

- `[x]` Public analytics events теперь канонизируют provider UUID перед SQL-записью; malformed profile-open IDs не вызывают запрос к БД.
- `[x]` Discovery impression batches дедуплицируются, суммируются и ограничены 100 provider IDs; пустые/oversized/non-array входы отбрасываются без SQL.
- `[x]` Добавлены analytics event boundary tests **4/4**, полный backend unit — **227 файлов / 783 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный analytics HTTP replay, consent/retention evidence и production metrics storage остаются внешними `PILOT-02/SEC-03/SEC-06` gates.

### Результат двести двадцать девятой исполняемой порции (03.09.2026)

- `[x]` Expert-question service теперь повторно нормализует symptoms, categorySlug и vehicleSnapshot перед JSONB persistence; прямые вызовы не могут обойти границы HTTP-схемы.
- `[x]` Симптомы и категория проходят NFKC/trim и bounded-проверки, vehicle snapshot использует общий строгий allow-list с request boundary, а неизвестные поля отклоняются до repository access.
- `[x]` Добавлены expert-question policy и service-boundary suites **7/7**, полный backend unit — **229 файлов / 790 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный expert-question HTTP replay, moderation/PII retention evidence и staging workflow остаются внешними `PILOT-02/SEC-03/SEC-06` gates.

### Результат двухсот тридцатой исполняемой порции (03.09.2026)

- `[x]` Fleet account и fleet vehicle service теперь повторно нормализуют name, notes, label и approvalPolicy до repository access; прямые вызовы не могут обойти route schema.
- `[x]` Fleet vehicle JSONB ограничен scalar-record контрактом: только безопасные ключи, строки/целые числа/null, максимум 24 поля и bounded длины; текущие UI-поля `brandId`, `registrationNumber`, `internalReference` сохранены.
- `[x]` Добавлен fleet input policy и service-boundary regression **5/5**, полный backend unit — **230 файлов / 795 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Fleet/B2B остаётся вне обязательного пилотного scope; реальный multi-owner workflow и staging authorization не закрываются этой локальной порцией.

### Результат двухсот тридцать первой исполняемой порции (03.09.2026)

- `[x]` Owner provider onboarding теперь повторно прогоняет полный payload через runtime-схему до market lookup и транзакции; прямые вызовы не могут записать невалидные core/profile, schedule или communication поля.
- `[x]` Канонизация market/zone UUID сохранена до Zod-проверки, поэтому uppercase/whitespace UUID продолжают поддерживаться, а malformed profile values получают `422 VALIDATION_ERROR` без repository и transaction access.
- `[x]` Provider location boundary suite прошёл **3/3**, полный backend unit — **230 файлов / 796 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный owner onboarding HTTP replay, moderation/SMTP delivery и staging multi-location workflow остаются внешними `PILOT-02/PILOT-03/SEC-06` gates.

### Результат двухсот тридцать второй исполняемой порции (03.09.2026)

- `[x]` Repair-event helper и внутренний transaction-helper переходов заявки теперь повторно нормализуют request/actor UUID, eventType, title и notes до JSONB/row persistence.
- `[x]` Metadata ограничены 32 безопасными ключами, scalar-значениями или bounded scalar-массивами, с finite safe integers и максимальным размером 8 KB; nested objects, traversal-подобные ключи и oversized payload отклоняются.
- `[x]` Добавлены repair-event policy и service-boundary suites **7/7**, полный backend unit — **232 файла / 803 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный PostgreSQL audit replay, PII-retention verification и multi-process transition evidence остаются внешними `PILOT-02/SEC-03/SEC-06` gates.

### Результат двухсот тридцать третьей исполняемой порции (03.09.2026)

- `[x]` Broadcast-request service теперь повторно нормализует service/market references, issueDescription, vehicleSnapshot, private photo references, preferredAt и maxProviders до каталога и записи.
- `[x]` Неизвестные поля, короткие/oversized описания, public/traversal media, malformed dates/snapshots и лимиты вне `1..10` получают `422 VALIDATION_ERROR` без repository access; даты сохраняются канонически в UTC.
- `[x]` Добавлен broadcast-request policy и service-boundary regression **6/6**, полный backend unit — **233 файла / 809 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный broadcast HTTP replay, private media storage/AV и multi-provider staging concurrency остаются внешними `PILOT-02/PILOT-03/SEC-02/SEC-06` gates.

### Результат двухсот тридцать четвёртой исполняемой порции (03.09.2026)

- `[x]` Guarantee-claim service теперь повторно нормализует requestId, claimType, summary и evidenceUrls до client/request lookup и persistence.
- `[x]` Claim types ограничены `price/quality/warranty/no_show/safety`, summary проходит NFKC/trim и 10–4 000 символов, evidence остаются private claim references максимум 20; invalid direct calls получают `422 VALIDATION_ERROR` до PostgreSQL.
- `[x]` Добавлены guarantee-claim policy и service-boundary regressions **6/6**, полный backend unit — **234 файла / 815 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный guarantee HTTP replay, moderation/PII retention, private S3/AV и multi-process claim race остаются внешними `PILOT-02/PILOT-03/SEC-02/SEC-03/SEC-06` gates.

### Результат двухсот тридцать пятой исполняемой порции (03.09.2026)

- `[x]` Appeal create/decision policies теперь отклоняют неизвестные поля; сервисные функции принимают `unknown` и используют runtime-валидацию до subject/evidence lookup и транзакции.
- `[x]` Для appeal payload сохранены allow-list полей `subject/subjectId/providerId/reason/evidenceIds`, bounded reason/evidence и UUID-нормализация; decision payload принимает только `status/reason`.
- `[x]` Добавлены regressions для unsupported fields, полный backend unit — **234 файла / 815 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный appeal HTTP replay, moderation evidence viewer, retention/PII review и staging authorization остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот тридцать шестой исполняемой порции (03.09.2026)

- `[x]` Chat и service-request message mutations теперь принимают `unknown`, проверяют object shape и allow-list полей до participant/thread lookup; прямые `null`, массивы и лишние поля получают `422 VALIDATION_ERROR` вместо `TypeError/500`.
- `[x]` Общая message policy канонизирует NFKC/trim body и service idempotency key; idempotency продолжает использовать прежнее строгое правило безопасных 8–128 символов.
- `[x]` Добавлены message-policy и service-request boundary regressions **7/7**, полный backend unit — **234 файла / 818 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Multi-process chat delivery/reconnect, private S3/AV, moderation queue и staging WebSocket smoke остаются внешними `PILOT-02/PILOT-03/SEC-02/SEC-06` gates.

### Результат двухсот тридцать седьмой исполняемой порции (03.09.2026)

- `[x]` Chat moderation report policy теперь канонизирует категорию и статус через NFKC/trim/lowercase и отклоняет неизвестные поля до сохранения отчёта.
- `[x]` Chat creation policy дополнительно отклоняет unsupported fields; существующие UUID, subject и role checks не изменены.
- `[x]` Добавлены regressions для canonical moderation values и лишних полей, полный backend unit — **234 файла / 818 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Полноценная moderation queue UI, multi-process delivery, private S3/AV и staging chat replay остаются внешними `PILOT-02/PILOT-03/SEC-02/SEC-06` gates.

### Результат двухсот тридцать восьмой исполняемой порции (03.09.2026)

- `[x]` Chat и service-request conversation queries теперь нормализуют pagination input до thread/request lookup: поддерживаются только cursor, beforeCursor и integer limit, конфликтующие курсоры и лишние поля отклоняются.
- `[x]` `null`, массивы, non-string cursors и нецелочисленные limits получают контролируемый `422 VALIDATION_ERROR`; valid cursor decoding и прежний `400` для повреждённых/oversized cursors сохранены.
- `[x]` Добавлены shared cursor-policy и service boundary regressions **13/13**, полный backend unit — **234 файла / 822 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный HTTP pagination replay, multi-process chat reconnect и staging load остаются внешними `PILOT-02/PILOT-03/SEC-06` gates.

### Результат двухсот тридцать девятой исполняемой порции (03.09.2026)

- `[x]` `markNotificationAsRead` теперь канонизирует notification UUID до repository lookup и возвращает `422 VALIDATION_ERROR` для malformed direct calls вместо потенциальной ошибки PostgreSQL.
- `[x]` Добавлены notification UUID policy и service-boundary tests **3/3**; в общий unit gate также включён ранее не подключённый `notification-action-policy.test.ts`.
- `[x]` Полный backend unit — **236 файлов / 825 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный notification HTTP replay, SMTP delivery, retention и staging observability остаются внешними `PILOT-02/PILOT-03/SEC-03` gates.

### Результат двухсот сороковой исполняемой порции (03.09.2026)

- `[x]` Notifications list query теперь повторно нормализует cursor, limit, read и category до repository lookup; категории канонизируются через NFKC/trim/lowercase.
- `[x]` `null`, массивы, неверные типы, oversized cursor и unsupported fields получают `422 VALIDATION_ERROR`, а user-scoped SQL и прежний cursor response contract сохранены.
- `[x]` Добавлены notification query policy и service-boundary regressions **6/6**, полный backend unit — **237 файлов / 830 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный notification HTTP replay, SMTP delivery, retention и staging observability остаются внешними `PILOT-02/PILOT-03/SEC-03` gates.

### Результат двухсот сорок первой исполняемой порции (03.09.2026)

- `[x]` CRUD иерархии супер-админа (страна, город, зона) теперь повторно проверяет payload после HTTP-слоя: только разрешённые поля, NFKC/trim строк, schema constraints, enum и парные координаты.
- `[x]` Сервисные функции принимают `unknown`, нормализуют UUID страны/города/зоны и parent zone до repository lookup; malformed direct calls получают контролируемый `422 VALIDATION_ERROR`, а super-admin authorization и hierarchy ownership не изменены.
- `[x]` Добавлены regressions для нормализации, неизвестных полей, координат, enum и UUID **5/5**, полный backend unit — **238 файлов / 835 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный super-admin HTTP replay, staging authorization matrix, audit viewer и production rollout остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот сорок второй исполняемой порции (03.09.2026)

- `[x]` Platform review create теперь повторно проверяет rating `1..5`, текст `10..1000`, idempotency key и неизвестные поля непосредственно на сервисной границе; текст и ключ канонизируются через NFKC/trim.
- `[x]` Moderator response, public limit и review UUID также получили bounded runtime-нормализацию до repository lookup; malformed direct calls получают `422 VALIDATION_ERROR`, существующая idempotency race recovery сохранена.
- `[x]` В общий unit gate подключены ранее не запускавшиеся platform-review tests и добавлены regressions **12/12**; полный backend unit — **241 файл / 847 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный platform-review HTTP replay, moderation queue, abuse-rate-limit replay, PII/retention и staging authorization остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот сорок третьей исполняемой порции (03.09.2026)

- `[x]` Обновление trust policy супер-админом теперь повторно проверяет полный payload на сервисной границе: policy version, bounded numeric thresholds, rollout shape и неизвестные поля.
- `[x]` Rollout market IDs нормализуются в lowercase UUID, дубликаты и malformed IDs отклоняются до чтения рынков; проверка существования market scope и super-admin authorization сохранены.
- `[x]` Добавлены trust-policy input и service-boundary regressions **5/5**, полный backend unit — **243 файла / 852 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный trust-policy HTTP replay, badge reassessment, rollout staging и независимый security review остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот сорок четвёртой исполняемой порции (03.09.2026)

- `[x]` Admin provider-status mutation теперь повторно проверяет provider UUID и enum-статус после HTTP-слоя и до provider lookup; malformed direct calls получают `422 VALIDATION_ERROR`.
- `[x]` Canonical lowercase UUID и NFKC/trim status сохраняют прежний branch/provider response и не меняют admin authorization или audit flow.
- `[x]` Добавлены provider-status policy и service-boundary regressions **3/3**, полный backend unit — **245 файлов / 855 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный admin status HTTP replay, staging authorization matrix, suspended-provider UX и независимый security review остаются внешними `PILOT-02/PILOT-03/SEC-06` gates.

### Результат двухсот сорок пятой исполняемой порции (03.09.2026)

- `[x]` Outbox retry и dead-letter mutations теперь повторно проверяют event UUID после HTTP-слоя и до repository lookup; malformed direct calls получают `422 VALIDATION_ERROR`.
- `[x]` Canonical lowercase UUID не меняет существующие outbox state guards, retry/dead-letter transitions и admin authorization.
- `[x]` Добавлены outbox event policy и service-boundary regressions **3/3**, полный backend unit — **247 файлов / 858 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный outbox worker/retry replay, dead-letter operations, Redis/SMTP delivery и staging rollback rehearsal остаются внешними `PILOT-02/PILOT-03/SEC-06` gates.

### Результат двухсот сорок шестой исполняемой порции (03.09.2026)

- `[x]` Security Center event detail, status mutation и session-revoke paths теперь повторно проверяют UUID после авторизации и до repository lookup; malformed direct calls получают `422 VALIDATION_ERROR`.
- `[x]` Status и assignee канонизируются через enum/lowercase UUID, operator note получает строгий NFKC/trim и лимит 1 000 символов; self-session conflict и super-admin-only authorization сохранены.
- `[x]` Добавлены security-center input и service-boundary regressions **8/8**, полный backend unit — **248 файлов / 862 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный Security Center HTTP replay, active super-admin assignment, session revocation, Redis outage и staging threat review остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот сорок седьмой исполняемой порции (03.09.2026)

- `[x]` System incident recording повторно проверяет тип, severity, title, requestId, metadata shape и неизвестные поля до транзакции; malformed internal calls безопасно игнорируются без открытия БД-транзакции.
- `[x]` System incident status mutation теперь канонизирует incident UUID и статус после super-admin authorization и до repository lookup; переходы `open/acknowledged/resolved` и запрет reopen сохранены.
- `[x]` Добавлены system-incident input и service-boundary regressions **6/6**, полный backend unit — **250 файлов / 868 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный incident ingestion, alert delivery, status HTTP replay, retention и staging rollback rehearsal остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот сорок восьмой исполняемой порции (03.09.2026)

- `[x]` Security Mitigations query/create/revoke/extend paths теперь повторно проверяют runtime input после авторизации и до repository/transaction access; неизвестные поля, `null`, массивы и неверные типы получают контролируемый `422 VALIDATION_ERROR`.
- `[x]` UUID приводятся к каноническому lowercase, IP — к bounded display/canonical lookup value, reason — к NFKC/trim без control characters; status/kind/cursor/limit и TTL/extension minutes ограничены allow-list и безопасными диапазонами.
- `[x]` Добавлены security-mitigation input и service-boundary regressions **7/7**, полный backend unit — **251 файл / 873 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный IP-block HTTP replay, Redis cache fail-closed, production incident response и rollback rehearsal остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот сорок девятой исполняемой порции (03.09.2026)

- `[x]` Security Events reader теперь повторно валидирует query после super-admin authorization и до repository access; неизвестные поля, `null`, массивы и неверные типы получают контролируемый `422 VALIDATION_ERROR`.
- `[x]` Event type ограничен значениями `SecurityEventType`, user UUID приводится к lowercase canonical form, cursor и limit нормализуются и ограничены безопасными диапазонами; прежние redaction, сортировка и cursor response сохранены.
- `[x]` Добавлены security-events input и service-boundary regressions **6/6**, полный backend unit — **252 файла / 877 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный security-events HTTP replay, PII/retention review, audit viewer и staging observability остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот пятидесятой исполняемой порции (03.09.2026)

- `[x]` Admin Audit Logs list/export теперь повторно валидируют query после admin authorization и до repository access; неизвестные поля, `null`, массивы и неверные типы получают контролируемый `422 VALIDATION_ERROR`.
- `[x]` Поиск, action, targetType, actor UUID, cursor и limits проходят bounded NFKC/trim-нормализацию; export limit ограничен `1..10 000`, formula-safe CSV и существующая redaction сохранены.
- `[x]` Исправлены null-boundary регрессии в Security Events и Security Mitigations query policies; добавлены audit input и service-boundary regressions **8/8**, полный backend unit — **253 файла / 882 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный audit HTTP/export replay, полный audit viewer, PII/retention review и staging authorization остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот пятьдесят первой исполняемой порции (03.09.2026)

- `[x]` Admin Users list и status/role mutations теперь повторно валидируют input после admin/super-admin authorization и до repository access; неизвестные поля, `null`, массивы, неверные enum, UUID и pagination получают контролируемый `422 VALIDATION_ERROR`.
- `[x]` Поиск нормализуется через NFKC/whitespace bounds, role/status канонизируются в lowercase, UUID — в canonical form; сохранены self-block guard, last-super-admin protection, session invalidation и cursor response.
- `[x]` Добавлены admin-users policy и service-boundary regressions **5/5**, полный backend unit — **255 файлов / 887 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный admin users HTTP authorization matrix, PII redaction review и staging audit/rollback evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот пятьдесят второй исполняемой порции (03.09.2026)

- `[x]` Admin Account Deletion Requests list/status теперь повторно валидируют input после super-admin authorization и до repository/transaction access; неизвестные поля, `null`, массивы, неверные status, UUID и pagination получают контролируемый `422 VALIDATION_ERROR`.
- `[x]` Queue status канонизируется через NFKC/trim, mutation допускает только `cancelled/completed`, request UUID приводится к lowercase canonical form; сохранены pessimistic lock, retention gate, idempotent terminal updates, anonymization и deletion invariants.
- `[x]` Добавлены account-deletion input и service-boundary regressions **6/6**, полный backend unit — **256 файлов / 892 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный deletion HTTP replay, storage-failure retry, backup/restore и staging retention evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот пятьдесят третьей исполняемой порции (04.09.2026)

- `[x]` Admin Cabinets status mutation теперь повторно валидирует cabinet UUID и статус после admin authorization и до SQL; malformed direct calls получают контролируемый `422 VALIDATION_ERROR`.
- `[x]` UUID канонизируются в lowercase, статус ограничен `draft/active/blocked`; сохранены bounded legacy list, owner notification, audit metadata и текущий response contract.
- `[x]` Добавлены admin-cabinet policy и service-boundary regressions **3/3**, полный backend unit — **258 файлов / 895 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный admin cabinet HTTP authorization matrix, moderation UX и staging audit/notification delivery остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот пятьдесят четвёртой исполняемой порции (04.09.2026)

- `[x]` Создание администратора теперь повторно валидирует payload после super-admin authorization и до user lookup/save, token generation и email outbox; неизвестные поля, `null`, массивы и неверные типы получают контролируемый `422 VALIDATION_ERROR`.
- `[x]` Name/email нормализуются через NFKC и auth bounds, frontend origin проходит URL/origin policy, locale ограничен поддерживаемым набором; сохранены duplicate-email conflict, pre-verified admin и безопасный password-setup outbox.
- `[x]` Добавлены admin-create input и service-boundary regressions **6/6**, полный backend unit — **260 файлов / 901 тест**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный super-admin HTTP replay, SMTP delivery и staging bootstrap evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот пятьдесят пятой исполняемой порции (04.09.2026)

- `[x]` Обновление legacy-профиля рынка супер-администратором теперь повторно проверяет market UUID и полный профиль payload после authorization и до repository lookup/save; malformed direct calls получают контролируемый `422 VALIDATION_ERROR`.
- `[x]` Переиспользованы ограничения legacy market schema: NFKC/trim для строк, default-locale inclusion, поддерживаемые locale/currency/timezone, allow-list capability/legal-link полей и отклонение неизвестных ключей; canonical UUID сохранён.
- `[x]` Добавлены legacy market update policy и service-boundary regressions **3/3**, полный backend unit — **261 файл / 904 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный market-admin HTTP replay, staging authorization, audit/rollout evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот пятьдесят шестой исполняемой порции (04.09.2026)

- `[x]` Добавлен отдельный service-boundary gate для market hierarchy CRUD: country, city и zone операции отклоняют malformed UUID/payload до repository access.
- `[x]` Проверено, что `getSuperAdminMarketHierarchy` и все мутации сохраняют super-admin-only authorization: обычный admin получает `403` до валидации payload и чтения БД.
- `[x]` Добавлены hierarchy service-boundary regressions **5/5** (13 boundary assertions), полный backend unit — **262 файла / 909 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный hierarchy HTTP authorization matrix, duplicate/ownership conflicts и staging audit/rollout evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот пятьдесят седьмой исполняемой порции (04.09.2026)

- `[x]` Appeals service получил отдельный runtime boundary gate: malformed create/subject/evidence references и withdrawal UUID отклоняются до repository/transaction access.
- `[x]` Admin appeal list, decision и pending-count paths повторно подтверждают bounded query/decision input и admin authorization; обычный client получает `403` до чтения БД.
- `[x]` Добавлены appeal service-boundary regressions **5/5**, полный backend unit — **263 файла / 914 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный appeal HTTP replay, evidence viewer, moderation queue, notification delivery и staging retention остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот пятьдесят восьмой исполняемой порции (04.09.2026)

- `[x]` Chat service получил отдельный runtime boundary gate: malformed chat/request/attachment/block identifiers и message/report/block/attachment payloads отклоняются до repository lookup или transaction.
- `[x]` Admin chat-report list и decision paths сохраняют authorization-first порядок: обычный client получает `403`, admin с malformed status/id — контролируемый `422`; provider/support/admin-escalation creation guards также проверены.
- `[x]` Добавлены chat service-boundary regressions **5/5**, полный backend unit — **264 файла / 919 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный chat HTTP replay, multi-process reconnect, private media/AV, moderation queue и staging WebSocket evidence остаются внешними `PILOT-02/PILOT-03/SEC-02/SEC-06` gates.

### Результат двухсот пятьдесят девятой исполняемой порции (04.09.2026)

- `[x]` Bonus service получил отдельный runtime boundary gate: программы владельца, liability, redemption и manual grant повторно проверяют provider/client/request UUID и payload до repository/transaction access.
- `[x]` Ролевые ограничения подтверждены до чтения и записи: только client видит/списывает бонусы, только owner управляет программой и выдачей; обязательный idempotency key для manual grant сохранён.
- `[x]` Добавлены bonus service-boundary regressions **5/5**, полный backend unit — **265 файлов / 924 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный bonus lifecycle replay, concurrent redemption/grant, deletion retention и staging pilot evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот шестидесятой исполняемой порции (04.09.2026)

- `[x]` Provider membership/invitation service получил runtime boundary gate: provider, invitation и membership UUID, invitation payload и token повторно проверяются до repository/transaction access.
- `[x]` Owner-only authorization подтверждена для списка, создания и отзыва staff-доступа; client получает `403` до проверки идентификаторов и БД.
- `[x]` Добавлены provider-membership service-boundary regressions **5/5**, полный backend unit — **266 файлов / 929 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный invitation email/acceptance replay, multi-location permission matrix, token expiry и staging audit evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот шестьдесят первой исполняемой порции (04.09.2026)

- `[x]` Provider change-request list теперь явно требует owner role до provider lookup; ранее роль проверялась только в create/cancel paths.
- `[x]` Owner create/cancel и admin list/decision paths получили отдельные boundary regressions: malformed provider/request IDs, payloads и filters отсекаются до repository/transaction access, client получает `403` до валидации.
- `[x]` Добавлены provider-change-request service-boundary regressions **5/5**, полный backend unit — **267 файлов / 934 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный change-request moderation replay, document evidence viewer, notification delivery и staging multi-location authorization остаются внешними `PILOT-02/PILOT-03/SEC-02/SEC-06` gates.

### Результат двухсот шестьдесят второй исполняемой порции (04.09.2026)

- `[x]` Catalog-gap creation и admin service-definition update получили отдельный runtime boundary gate: malformed provider/definition/request UUID и payload отклоняются до provider lookup, repository или transaction access.
- `[x]` Admin list/decision paths сохраняют authorization-first порядок и bounded status/decision values; client получает `403` до валидации и чтения БД.
- `[x]` Добавлены catalog-gap service-boundary regressions **5/5**, полный backend unit — **268 файлов / 939 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный catalog moderation replay, duplicate slug race, service-catalog rollout и staging audit evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот шестьдесят третьей исполняемой порции (04.09.2026)

- `[x]` Booking service теперь канонизирует booking/cabinet UUID для истории, reschedule, cancel, owner status/note и occupied slots до repository lookup; malformed direct calls получают `422 VALIDATION_ERROR` вместо потенциального PostgreSQL `500`.
- `[x]` Client/owner role guards сохраняют authorization-first порядок для booking reads и mutations; status/reschedule/cancel workflow и существующие concurrency/idempotency guards не изменены.
- `[x]` Добавлены booking service-boundary regressions **4/4**, полный backend unit — **269 файлов / 943 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный booking/reschedule/cancellation/no-show concurrency replay, PostgreSQL restore и staging pilot evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот шестьдесят четвёртой исполняемой порции (04.09.2026)

- `[x]` Query списка бронирований у клиента и владельца теперь повторно нормализуется внутри сервиса до построения SQL: cursor, limit, status и календарные даты проходят bounded-проверки, неизвестные поля, `null`, массивы, невалидные/обратные диапазоны получают контролируемый `422 VALIDATION_ERROR`.
- `[x]` Валидация не меняет cursor-response contract и существующие role/idempotency/concurrency guards; безопасные фильтры передаются в query-builder только в канонической форме.
- `[x]` Добавлены booking list-policy и service-boundary regressions **2/2**, включён отдельный policy-файл в unit-конфигурацию; полный backend unit — **270 файлов / 951 тест**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный booking list HTTP replay, PostgreSQL load/concurrency, restore и staging pilot evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот шестьдесят пятой исполняемой порции (04.09.2026)

- `[x]` `/bookings/occupied` теперь требует активную authenticated session и валидирует query через отдельную `occupiedSlotsQuerySchema`; сырые `cabinetId/date` больше не попадают в сервис из unauthenticated route.
- `[x]` Service boundary повторно проверяет canonical cabinet UUID и календарную дату `YYYY-MM-DD` с реальной датой до repository access; invalid, `null` и non-string dates получают контролируемый `422 VALIDATION_ERROR`.
- `[x]` Добавлены occupied-slot policy и service-boundary regressions **2/2**, полный backend unit — **270 файлов / 953 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный occupied-slots HTTP authorization replay, PostgreSQL booking availability и staging pilot evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот шестьдесят шестой исполняемой порции (04.09.2026)

- `[x]` Создание бронирования клиентом и владельцем теперь повторно нормализует полный payload до idempotency lookup, client/cabinet/service lookup и slot validation: UUID, дата, `HH:mm`, comment, experiment/source и idempotency key получают bounded canonical form, неизвестные поля отклоняются.
- `[x]` Client и owner role guards остаются первыми; malformed direct calls получают контролируемый `422 VALIDATION_ERROR`, а существующие book-again, availability, idempotency, notification и PostgreSQL contention flows не изменены.
- `[x]` Добавлены booking creation policy и service-boundary regressions **2/2**, полный backend unit — **270 файлов / 955 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный create-booking HTTP replay, duplicate/retry race, PostgreSQL concurrency и staging pilot evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот шестьдесят седьмой исполняемой порции (04.09.2026)

- `[x]` Client reschedule request и owner reschedule decision теперь повторно нормализуют payload до booking lookup/slot checks/transaction: дата, `HH:mm`, decision, reason и неизвестные поля получают bounded canonical form.
- `[x]` Owner booking status и note повторно проверяются после role/booking UUID guard; неизвестный enum и нестроковая/слишком длинная заметка получают контролируемый `422 VALIDATION_ERROR`, а уведомления и status-history используют канонический status.
- `[x]` Добавлены booking mutation policy и service-boundary regressions **2/2**, полный backend unit — **270 файлов / 957 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный reschedule/status/note HTTP replay, duplicate decision race, PostgreSQL concurrency и staging pilot evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот шестьдесят восьмой исполняемой порции (04.09.2026)

- `[x]` Owner action-center и client experiment telemetry теперь канонизируют event name через allow-list/NFKC/trim до записи метрики; произвольные labels, `null`, объекты и неизвестные события получают контролируемый `422 VALIDATION_ERROR`.
- `[x]` Существующие owner/client role guards, HTTP schemas и rate limits сохранены; фиксированные privacy-safe metric labels не принимают пользовательские значения.
- `[x]` Добавлены telemetry normalizer и service-boundary regressions **3/3**, полный backend unit — **270 файлов / 960 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный telemetry HTTP replay, metrics backend cardinality review и staging observability evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот шестьдесят девятой исполняемой порции (04.09.2026)

- `[x]` Client telemetry теперь сохраняет authorization-first порядок: роль клиента проверяется до event normalization, поэтому не-client с любым payload получает `403`, а client с неизвестным событием — `422`.
- `[x]` Вынесен переиспользуемый client role guard для route-wrapper и metric writer; произвольные labels по-прежнему не достигают metrics registry.
- `[x]` Добавлена telemetry authorization-order regression **1/1**, полный backend unit — **270 файлов / 961 тест**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный telemetry HTTP replay и staging observability evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот семидесятой исполняемой порции (04.09.2026)

- `[x]` Client-only transitions `confirm`, `reschedule decision` и `cancel` теперь выполняют `clientOnly` до request UUID validation, repository lookup и transaction; чужая роль получает `403` независимо от malformed identifier.
- `[x]` Существующие client ownership, state-transition, idempotency и resource-release guards не изменены; добавлена проверка отсутствия DB/transaction side effects на отказе роли.
- `[x]` Добавлена authorization-order regression **1/1**, полный backend unit — **270 файлов / 962 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный service-request HTTP authorization matrix, transition concurrency и staging pilot evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот семьдесят первой исполняемой порции (04.09.2026)

- `[x]` Client-only решение по service offer теперь выполняет `clientOnly` до проверки request/message UUID и decision; чужая роль получает `403` без обращения к БД или transaction.
- `[x]` Решение offer принимает только канонические значения `accept`/`decline`; malformed direct calls получают контролируемый `422 VALIDATION_ERROR`, а canonical message UUID используется в запросе и сохранённом переходе.
- `[x]` Добавлены offer decision policy и service-boundary regressions **2/2**, полный backend unit — **270 файлов / 964 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный offer HTTP replay, повторное принятие/отклонение при конкуренции и staging pilot evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот семьдесят второй исполняемой порции (04.09.2026)

- `[x]` Client quote accept/decline теперь канонизирует request UUID после проверки client role и до открытия transaction; malformed direct calls получают контролируемый `422 VALIDATION_ERROR` без чтения или блокировки PostgreSQL.
- `[x]` Существующие expiry, повторное принятие, quote-version, booking snapshot, capacity/resource reservation и concurrent decision guards не изменены.
- `[x]` Добавлена quote-decision service-boundary regression **1/1**, полный backend unit — **270 файлов / 965 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный quote HTTP replay, PostgreSQL lock/concurrency и staging pilot evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот семьдесят третьей исполняемой порции (04.09.2026)

- `[x]` Broadcast-offer service теперь повторно нормализует location UUID, сумму, валюту, note, длительность и `validUntil` до workspace lookup и transaction; unknown fields и malformed direct calls получают контролируемый `422 VALIDATION_ERROR`.
- `[x]` Offer snapshot сохраняет только канонические значения, а fallback duration от опубликованной услуги и существующие provider-scope, duplicate и max-provider guards не изменены.
- `[x]` Добавлены broadcast-offer policy и service-boundary regressions **4/4**, полный backend unit — **270 файлов / 966 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный broadcast HTTP replay, provider-limit race и staging pilot evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот семьдесят четвёртой исполняемой порции (04.09.2026)

- `[x]` Public location-zones service теперь безопасно отклоняет `null`, массивы и другие не-объектные coordinates до чтения `latitude/longitude`, возвращая контролируемый `422 VALIDATION_ERROR` вместо runtime `TypeError`.
- `[x]` Существующие bounds для широты/долготы, market/parent UUID, limit и fallback/database response contract не изменены.
- `[x]` Добавлены coordinate-shape regressions **2/2**, полный backend unit — **270 файлов / 966 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный location-zones HTTP replay, market hierarchy seed и production geospatial benchmark остаются внешними `PILOT-02/PILOT-05/SEC-06` gates.

### Результат двухсот семьдесят пятой исполняемой порции (04.09.2026)

- `[x]` Изменения состояния избранного (`sync`, `add`, `remove`) теперь требуют подтверждённую почту через `requireVerifiedEmail`; чтение списка избранного остаётся доступным authenticated users.
- `[x]` MSW mock/API parity синхронизирован: те же три mutation-ветки отклоняют неподтверждённую почту с кодом `EMAIL_VERIFICATION_REQUIRED`, поэтому локальная mock-проверка не маскирует real-server guard.
- `[x]` Rate limit, client-only service boundary, canonical provider/location UUID и существующие upsert/delete semantics сохранены; отказ неподтверждённого пользователя возвращает контролируемый `403 EMAIL_VERIFICATION_REQUIRED` до вызова favorites service.
- `[x]` Добавлены regressions для `requireVerifiedEmail` **2/2** (неподтверждённая и подтверждённая почта), полный backend unit — **270 файлов / 968 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный favorites HTTP replay с двумя профилями email verification, session/revocation matrix и staging pilot evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот семьдесят шестой исполняемой порции (04.09.2026)

- `[x]` Public trust endpoint ограничивает чтение evidence последними 100 записями (`createdAt DESC`) до формирования ответа; потенциально неограниченный объём provider evidence больше не загружается целиком на один публичный запрос.
- `[x]` Расчёт trust score, фильтрация approved/non-expired evidence, snapshots и публичный response contract сохранены; ограничение не меняет существующую оценку или правила rollout.
- `[x]` Добавлена regression на `take: 100`, полный backend unit — **270 файлов / 968 тестов**, backend build и `git diff --check` PASS.
- `[~]` Реальный trust HTTP replay, production data-volume benchmark и staging observability evidence остаются внешними `PILOT-02/PILOT-05/SEC-06` gates.

### Результат двухсот семьдесят седьмой исполняемой порции (04.09.2026)

- `[x]` Все AutoCare owner routes теперь проходят `requireVerifiedEmail` до `validateParams`, `validateQuery` и `validateBody`: capacity/resources, evidence, communication, membership/invitations, change requests, bonus program, offers, reviews и media uploads.
- `[x]` Ошибки авторизации больше не зависят от формы входных данных: неподтверждённый или неаутентифицированный запрос не получает schema/identifier feedback до guard; существующие provider-scope permissions и service-level checks сохранены.
- `[x]` Контракт `check:owner-route-auth` усилен проверкой порядка auth-before-validation; добавлена regression **4/4**, полный backend unit — **270 файлов / 968 тестов**, backend build и `git diff --check` PASS.
- `[~]` Реальный HTTP replay с malformed owner inputs, session/revocation matrix и staging pilot evidence остаются внешними `PILOT-02/PILOT-03/SEC-03/SEC-06` gates.

### Результат двухсот семьдесят восьмой исполняемой порции (04.09.2026)

- `[x]` Защищённые AutoCare client routes для избранного, chat reports/blocks/attachments, редактирования отзывов и service-request detail/offer decision/attachments/reschedule теперь аутентифицируют запрос до `validateParams`, `validateQuery` и `validateBody`.
- `[x]` Admin moderation routes для appeals, evidence, provider change requests, catalog gaps и chat reports получили тот же auth-before-validation порядок; malformed unauthenticated input больше не раскрывает schema/UUID feedback.
- `[x]` Существующие verified-email, role, provider-scope, ownership, audit и rate-limit guards сохранены. Контракт `check:owner-route-auth` расширен на owner и admin поверхности и поддерживает generic Fastify route type parameters; regression **6/6**.
- `[x]` Полный backend unit — **270 файлов / 968 тестов**, backend build, route-auth contract и `git diff --check` PASS.
- `[~]` Реальный HTTP replay с malformed client/admin inputs, session/revocation matrix, PostgreSQL concurrency и staging pilot evidence остаются внешними `PILOT-02/PILOT-03/SEC-01/SEC-06` gates.

### Результат двухсот семьдесят девятой исполняемой порции (04.09.2026)

- `[x]` Для `client_vehicles` добавлен PostgreSQL partial unique index `UQ_client_vehicles_primary`: у одного клиента физически не может быть более одного `isPrimary = TRUE`.
- `[x]` Migration preflight блокирует rollout при существующих duplicate-primary группах и не выполняет DDL до их явной reconciliation; rollback удаляет только созданный индекс.
- `[x]` Создание, изменение и удаление автомобиля сериализуются под pessimistic lock строки пользователя внутри одной транзакции; проверка лимита 20 машин и promotion следующего primary больше не расходятся при параллельных запросах.
- `[x]` Schema-contract добавил обязательный индекс, migration order/inventory, migration regression **4/4**, полный backend unit — **271 файл / 972 теста**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный PostgreSQL multi-client race, account-deletion replay и staging evidence остаются внешними `PILOT-10/SEC-03/SEC-05` gates.

### Результат двухсот восьмидесятой исполняемой порции (04.09.2026)

- `[x]` Входная политика расписания филиала теперь требует ровно по одной записи для каждого weekday; дубли дней отклоняются до записи в PostgreSQL.
- `[x]` Исключения календаря отклоняют невозможные даты и дублирующиеся даты; blocked periods используют строгую ISO calendar-date проверку вместо одного regex.
- `[x]` Полная замена weekly schedule выполняется внутри одной TypeORM-транзакции, поэтому ошибка сохранения не оставляет филиал без расписания или с частично обновлёнными днями.
- `[x]` Добавлена отдельная cabinet schedule policy и regression suite **3/3**; полный backend unit — **272 файла / 975 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный календарный HTTP replay, конкурентное редактирование расписания и staging booking-availability evidence остаются внешними `PILOT-07/SEC-05` gates.

### Результат двухсот восемьдесят первой исполняемой порции (04.09.2026)

- `[x]` Записи расписания, исключений и заблокированных периодов теперь сериализуются блокировкой строки филиала `pessimistic_write` внутри транзакции замены; параллельные owner-изменения одного календаря не смешивают результаты.
- `[x]` Owner scope повторно проверяется через `getOwnerCabinetById` до блокировки; если филиал удалён между проверками, возвращается контролируемый `404`, а частичная запись календаря не выполняется.
- `[x]` Существующие уникальные ограничения weekday/date, входная валидация, delete/save/find-семантика и response contract сохранены.
- `[x]` Полный backend unit — **272 файла / 975 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный конкурентный calendar HTTP replay и staging booking-availability evidence остаются внешними `PILOT-07/SEC-05` gates.

### Результат двухсот восемьдесят второй исполняемой порции (04.09.2026)

- `[x]` Legacy booking create, owner create/status и client/owner reschedule теперь выполняют проверку слота тем же `EntityManager`, который пишет результат, после блокировки активного филиала `pessimistic_write`.
- `[x]` Client reschedule блокирует booking до проверки pending-запроса, owner decision блокирует request и booking; параллельные переходы не используют устаревший внешний snapshot расписания и вместимости.
- `[x]` Существующие exclusion/idempotency constraints, status guards, notification/audit semantics и controlled conflict responses сохранены.
- `[x]` Полный backend unit — **272 файла / 975 тестов**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный PostgreSQL multi-client HTTP replay для legacy booking и staging contention evidence остаются внешними `PILOT-03/SEC-05` gates.

### Результат двухсот восемьдесят третьей исполняемой порции (04.09.2026)

- `[x]` `GET /bookings/occupied` теперь разрешён только client или owner; owner видит занятость только собственного активного кабинета, а admin и прочие роли получают контролируемый `403`.
- `[x]` Draft/blocked и чужие кабинеты не раскрывают occupied slots: сервер и MSW mock возвращают `404`, а mock/API parity сохраняет одинаковую границу доступа.
- `[x]` Добавлена service-boundary проверка role-before-lookup; полный backend unit — **272 файла / 975 тестов**, frontend unit — **145 файлов / 461 тест**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный HTTP replay с профилями client/owner/admin и staging privacy evidence остаются внешними `PILOT-02/SEC-03` gates.

### Результат двухсот восемьдесят четвёртой исполняемой порции (04.09.2026)

- `[x]` Публичный `GET /v1/providers/:providerId/availability` получил отдельный IP-based rate limit `autocare:availability` — не более 60 запросов в минуту; дорогой расчёт слотов теперь имеет bounded request budget.
- `[x]` Публичность availability для booking discovery сохранена: provider/location/offering/date schema validation, существующие discovery/trust/mutation limits и response contract не изменены.
- `[x]` Threat-surface source contract проверяет наличие availability rate limit и его pre-handler; полный backend unit — **272 файла / 975 тестов**, frontend unit — **145 файлов / 461 тест**, backend build, frontend lint и `git diff --check` PASS.
- `[~]` Реальный распределённый abuse replay, Redis fail-closed в нескольких процессах и staging throughput evidence остаются внешними `PILOT-02/SEC-03/SEC-06` gates.

### Результат двухсот восемьдесят пятой исполняемой порции (04.09.2026)

- `[x]` Исправлен локальный migration-validation gate: forward-анализ учитывает легитимный `DROP CONSTRAINT → ADD CONSTRAINT` при замене схемного правила и не считает rollback-only `down` повторным live constraint.
- `[x]` Настоящее повторное имя без предварительного `DROP` по-прежнему блокируется; добавлены regressions для drop-and-replace, rollback-only re-add и duplicate без drop — **5/5** тестов контракта.
- `[x]` Полный `check:local-mvp` теперь проходит все автоматические проверки: lint, frontend tests/build, backend build, API/mock parity, route/legacy/threat/auth/migration/loading/state/client/design/interaction contracts; остаётся только ручной responsive browser gate из-за запрета loopback-порта в текущей среде.
- `[x]` Дополнительно прошли ops harness, security headers, capacity UI, API runtime/contract, OpenAPI shape/structure и performance/SEO repository budgets; production Lighthouse/HTML metadata остаются ручными deployment gates.
- `[~]` Проценты freeze не меняются: `MVP-05/MVP-06`, staging infrastructure, real providers/clients и `SEC-01…SEC-10` evidence требуют внешнего доступа или ручной приёмки.

### Результат двухсот восемьдесят шестой исполняемой порции (04.09.2026)

- `[x]` Выполнена автономная ревизия 100 подпунктов из уже утверждённого MVP/pilot/security scope; создан отдельный чеклист [`PILOT_AUTONOMOUS_100_EXECUTION.md`](./PILOT_AUTONOMOUS_100_EXECUTION.md).
- `[x]` Все доступные локальные подпункты подтверждены командами: API/mock parity, route/auth boundaries, state/loading/design/interaction, capacity, legacy/payment guards, migration validation, threat-surface, OpenAPI, operations harness, security headers, SEO/performance budgets и synthetic discovery benchmark.
- `[x]` Synthetic discovery benchmark выполнен без PostGIS на 10 000 и 100 000 записей: 3 итерации, p95 **4.2 ms** и **21.5 ms** соответственно; PostGIS production benchmark остаётся staging gate.
- `[x]` Исправление migration-validation добавлено в regression suite и включено в локальный release gate; фиктивные pilot/staging evidence не создавались.
- `[~]` Ручные MVP device-gates и все внешние staging/pilot/security evidence сохранены как `[~]/[E]` в чеклисте; новые обязательные пункты и изменения frozen процентов не добавлялись.

### Результат двухсот восемьдесят седьмой исполняемой порции (04.09.2026)

- `[x]` Добавлен `check:error-codes`: registry содержит 20 канонических кодов, значения уникальны, формат uppercase/underscore соблюдён, а все `ERROR_CODES.*` ссылки в `server/src` разрешаются.
- `[x]` Staging compatibility probe разделён на тестируемые функции OpenAPI/path/cache policy; добавлены regressions **3/3**, внешний HTTP probe по-прежнему запускается только при заданном `STAGING_API_BASE_URL`.
- `[x]` Добавлен `check:pilot-autonomous-plan`: он проверяет ровно 100 уникально пронумерованных пунктов, статусы `[x]/[~]/[E]` и strict mode; regressions **3/3**, текущий чеклист — **92 complete / 8 partial**.
- `[x]` Автономные контракты error-codes и plan aggregator подключены к package scripts и проходят `git diff --check`; текущий backend/frontend quality baseline не изменён.
- `[~]` Реальный staging API, Redis multi-process, S3/signed media, deletion/restore, real pilot evidence, production SEO и ручные device gates остаются внешними условиями.

### Результат двухсот восемьдесят восьмой исполняемой порции (04.09.2026)

- `[x]` После запуска собранного Next production server на `127.0.0.1:4175` responsive Chromium matrix прошла **30/30** для home, services и provider на ширинах 360, 390, 414, 540, 682, 768, 790, 1024, 1280 и 1440 px; horizontal overflow и обязательный chrome не обнаружены.
- `[x]` Локальный пункт полного автоматического `check:local-mvp` больше не блокируется sandbox browser launch/loopback: все автоматические проверки и responsive matrix зелёные; ручная visual/keyboard/device приёмка остаётся отдельным владельческим gate.
- `[x]` Чеклист автономной части обновлён до **93 complete / 7 partial**; внешний staging, real pilot, production media/backup и independent review не помечены выполненными.

### Результат двухсот восемьдесят девятой исполняемой порции (04.09.2026)

- `[x]` Error-code registry, staging compatibility regressions и autonomous plan aggregator подключены в `quality:backend`; новые проверки теперь запускаются вместе с backend quality gate.
- `[x]` Повторно пройдены `check:pilot-autonomous-plan`, `check:error-codes`, `test:error-codes`, `test:staging-api`, `test:pilot-autonomous-plan` и `git diff --check` — все проверки PASS.
- `[x]` Полный `npm run quality:backend` завершился успешно: migration/legacy/demo-reset/ops/auth/API/OpenAPI/threat/loading/state/client/capacity checks, tooling, **272 backend-файла / 975 тестов** и backend build PASS.
- `[x]` Aggregator подтверждает ровно 100 уникальных пунктов: **93 complete / 7 partial**; partial-статусы не маскируются под production evidence.
- `[~]` Семь оставшихся partial-пунктов требуют staging/production инфраструктуры или реального пилота: staging URL, Redis multi-process outage, private S3/signed media, retention replay, PostgreSQL multi-process replay, anonymized pilot evidence и production Lighthouse/rendered HTML.

### Результат двухсот девяностой исполняемой порции (04.09.2026)

- `[x]` Staging compatibility probe получил bounded timeout, HTTPS-проверку для удалённых endpoint'ов, запрет embedded credentials и безопасную диагностику сетевых ошибок; regressions **5/5**.
- `[x]` Production media preflight теперь проверяет, что подписанный URL имеет точный TTL, ведёт только к `private/` и не раскрывает `quarantine/`; дополнительно проверяется AES256 и `state=private` после promotion; regressions **4/4**.
- `[x]` Retention rehearsal получил bounded `--limit` (1–10 000), JSON-вывод и импортируемые pure helpers; regressions **3/3**.
- `[x]` SEO probe отклоняет insecure remote/credential-bearing base URL; SEO regressions **2/2**. Эти проверки добавлены в полный локальный MVP gate.
- `[x]` Full `npm run check:local-mvp` с разрешённым loopback завершился PASS: frontend lint/tests/build, backend build, 23 статические проверки и responsive Chromium matrix.
- `[x]` Backend unit после добавления preflight regressions: **274 файла / 982 теста**; backend build, `quality:backend`, `test:ops-harness`, `test:staging-api`, `test:seo` и `git diff --check` PASS.
- `[~]` Внешние доказательства семи partial-пунктов и frozen-проценты не изменены; реальные secrets, buckets, базы, участники и production URL не подменялись локальными фикстурами.

### Результат двухсот девяносто первой исполняемой порции (04.09.2026)

- `[x]` Добавлен детерминированный JSON snapshot mock/backend маршрутов без пользовательских данных: **227 mock / 257 backend / 2 WebSocket**; drift и дубликаты ловятся regression-тестами.
- `[x]` Добавлен source-contract формы поиска: пустой/ошибочный/частичный ответ, disabled-поля во время loading, dark/light skeleton tokens, длинные RU/EN подписи и narrow-card overflow.
- `[x]` Реальный results route теперь передаёт `isLoading` в общую форму; поля и кнопка остаются на месте и становятся disabled, карта сохраняется смонтированной.
- `[x]` `ProviderResultCard` получил `overflow-hidden` и `break-words`; это предотвращает горизонтальное переполнение длинных названий и метаданных.
- `[x]` Новые проверки подключены к `check:local-mvp` и `quality:backend`; `check/test:discovery-form`, `check/test:route-snapshot`, frontend **145/461**, backend build и `git diff --check` — PASS.
- `[~]` Внешние staging/production gates, реальные участники пилота и независимый security review по-прежнему не закрыты и не имитировались.

### Результат двухсот девяносто второй исполняемой порции (04.09.2026)

- `[x]` Staging compatibility probe получил JSON-режим с безопасным `skipped/blocked/pass` результатом, SHA-256 OpenAPI и bounded response body (**2 MiB**).
- `[x]` Добавлены retry/backoff для 502/503/504, нормализация discovery query, Content-Type и cache-policy проверки для двух вариантов discovery, security headers и optional CORS origin allow-list.
- `[x]` Запросы выполняются с `credentials: omit`, без cookies/Authorization; timeout и network failures получают безопасные коды `STAGING_TIMEOUT`/`STAGING_NETWORK_ERROR`.
- `[x]` `REQUIRE_STAGING_API=true` остаётся fail-closed; добавлен шаблон [`STAGING_API_EVIDENCE_TEMPLATE.md`](./STAGING_API_EVIDENCE_TEMPLATE.md) с hash фактического OpenAPI.
- `[x]` Regression suite staging compatibility: **9/9**; локальный `check:staging-api -- --json` возвращает безопасный `skipped` без URL.
- `[~]` Реальный HTTPS staging endpoint, его security/CORS headers и OpenAPI hash требуют внешнего запуска и не считаются закрытыми локальной фикстурой.

### Результат двухсот девяносто третьей исполняемой порции (04.09.2026)

- `[x]` Production media preflight получил JSON summary без содержимого файлов и bounded streaming body read (лимит **10 MiB**).
- `[x]` После S3 promotion проверяются checksum metadata (`sha256`), `state=private`, AES256 и `Content-Disposition=inline`; signed URL дополнительно требует `private, no-store` cache policy.
- `[x]` Добавлены regressions для expired TTL, quarantine-path, path-style/virtual-hosted S3 URL; MIME mismatch и EXIF removal уже подтверждены backend unit tests.
- `[x]` Контракт media pipeline подключён к local MVP и `quality:backend`; media contract PASS, preflight/attachment/storage targeted suite **38/38 PASS**.
- `[~]` Реальные S3/ClamAV bucket, cleanup-on-failure replay и orphan report требуют staging credentials; локальный контракт не выдаётся за production evidence.

### Результат двухсот девяносто четвёртой исполняемой порции (04.09.2026)

- `[x]` Retention rehearsal получил `--dry-run`: он не открывает БД и возвращает versioned JSON summary (`schemaVersion`, `status`, `limit`, `checked`, `failures`).
- `[x]` Лимит rehearsal ограничен диапазоном 1–10 000; blocked JSON содержит только имена инвариантов и не раскрывает userId/email.
- `[x]` Outbox payload redaction invariant и retry/dead-letter policies покрыты unit regressions; повторный запуск pure report deterministic.
- `[x]` Retention targeted suite и backend build после изменений проходят; локальные команды не создают production deletion/restore evidence.
- `[~]` Реальный account deletion replay, восстановление из backup и проверка pending/failed/dead-letter строк требуют staging PostgreSQL и backup vault.

### Результат двухсот девяносто пятой исполняемой порции (04.09.2026)

- `[x]` Добавлен отдельный backup/restore contract: checksum archive проверяется до restore, manifest привязан к basename, restore в исходную БД запрещён по умолчанию, имена архивов уникальны, диагностика редактирует secrets, а runbook требует RPO/RTO и изолированный target.
- `[x]` Добавлен неразрушающий orphan-media report с явным `destructiveAction: false`; stale quarantine/private кандидаты перечисляются до cleanup, а TTL/grace-period policy остаётся bounded и idempotent.
- `[x]` Synthetic restore fixture создаётся во временной директории с gzip payload и SHA-256 checksum, без production данных; `check:backup-restore` и regressions **4/4 PASS**, attachment storage regression **20/20 PASS**.
- `[~]` Реальные encrypted backup vault, WAL/PITR, off-site immutable retention и staging restore с RPO/RTO всё ещё требуют инфраструктуры и оператора; локальный harness не выдаётся за production evidence.

### Результат двухсот девяносто шестой исполняемой порции (04.09.2026)

- `[x]` Локальный MVP interaction contract закрепляет keyboard dropdown/Escape smoke, focus-visible стили, aria-label icon-only действий и отсутствие text-only full-screen loader.
- `[x]` Discovery retry не сбрасывает URL/draft filters; deterministic mock fixtures покрывают offline/reconnect, а platform payment-provider guard блокирует Stripe и payment flags в runtime.
- `[x]` Единый JSON local-gate summary содержит commit, timestamp, per-check statuses и counts; `check:mvp-interaction` и regressions **2/2 PASS** подключены к local MVP и backend quality gates.
- `[~]` Реальные device/VoiceOver/TalkBack проверки остаются ручными; внешние staging/production evidence и pilot participants не подменяются локальными контрактами.

### Результаты автономных порций 301–302 (04.09.2026)

- `[x]` SEO/release checks закрыли локальные пункты 90–99: bounded HTML reader
  (2 MiB), HTML metadata report по 12 public/provider routes, OG asset existence,
  canonical/robots parity, HTTPS/credential URL policy, RU/EN/ES/RO coverage,
  migration inventory SHA-256, historical migration immutability, retained
  replacement coverage и versioned local release summary.
- `[x]` `npm run check:seo` и `node --test scripts/check-seo-release.test.mjs`
  проходят; `node --test scripts/check-release-summary.test.mjs` — **2/2 PASS**;
  `npm run check:release-summary -- --json` возвращает `blocked=0` и
  `productionClaims=false`.
- `[~]` Production Lighthouse, deployed HTML, encrypted backup vault, staging
  replay и реальный pilot по-прежнему требуют внешнего окружения; локальный
  summary намеренно не засчитывает их как production evidence.

### Результат следующей исполняемой порции (05.09.2026)

- `[x]` Reliability attribution переведена с ошибочного сравнения
  `message.senderId` с `provider.id` на owner/active membership `users.id` с
  проверкой branch `request.locationId`; client/system/revoked/чужие branch
  messages не попадают в response samples.
- `[x]` Обновлены pilot quality/reliability scripts и admin quality monitoring;
  regression owner/member/branch boundaries, backend build и 276/1000 unit
  tests PASS; local MVP static gate сохранил 39 автоматических PASS.
- `[~]` CHANGE-C012 закрыт только на уровне локальной attribution-семантики:
  пять реальных response samples, confirmation SLO и staging multi-user replay
  остаются обязательным внешним pilot evidence.

### Результат следующей исполняемой порции (05.09.2026)

- `[x]` После asynchronous `FileReader` в request attachment flow добавлен
  повторный context/generation guard перед mutation; старый draft не продолжает
  upload после смены identity/provider/location/offering.
- `[x]` Client-path contract проверяет idempotency, in-flight guard,
  `Promise.allSettled` и post-read context check; targeted UI tests и local MVP
  static checks PASS.
- `[~]` Slow-network real API, deployed browser identity-switch и private
  storage cleanup/replay остаются внешними условиями `CHANGE-C014`.

### Результат следующей исполняемой порции (05.09.2026)

- `[x]` Release summary учитывает unstaged, staged и untracked migration paths;
  historical immutability больше не обходится подготовленным к commit diff.
- `[x]` Release summary/promotion regressions PASS; local report остаётся
  `productionClaims=false` и явно содержит dirty provenance manifest.
- `[~]` Clean immutable SHA, artifact/applied migration hashes, signed evidence
  и approvals остаются внешними условиями `CHANGE-C005…C007`.
