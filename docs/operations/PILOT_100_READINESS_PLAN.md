# AutoCare Hub — план готовности к пилоту 100%

**Статус:** канонический release-план
**Обновлён:** 27 августа 2026
**Владелец плана:** команда AutoCare Hub
**Заменяет как go/no-go источник:** разрозненные статусы в `PROJECT_PLAN.md`. Исторические документы остаются доказательствами, но не меняют этот план.

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

## Текущая оценка после ревизии

| Контур | Оценка | Пояснение |
| --- | ---: | --- |
| Локальный MVP на mock/локальном API | **≈ 86%** | Основные пользовательские сценарии и Next.js shell есть; нужны финальные runtime проверки, auth и state matrix. |
| Техническая готовность к закрытому пилоту | **≈ 58%** | Кодовая основа есть, но не подключены обязательные production-подобные инфраструктурные контуры. |
| Защита и сохранность данных для пилота | **≈ 45%** | Авторизационная модель продвинута, но медиа-хранилище, AV, backup/restore, Redis rehearsal и независимый review не закрыты. |

Эти проценты не являются разрешением на публичный запуск. Разрешение определяется закрытием всех пунктов раздела 2 и `ADD-C`.

---

# 1. Локальный MVP: mock API и локальный Next.js/Fastify/PostgreSQL

Цель: любой основной сценарий воспроизводим локально без белого экрана, потери введённых данных или обхода роли.

## 1.1 Runtime, маршруты и очистка наследия

- `[x]` Next.js является основным `dev`, `build` и `start` runtime.
- `[x]` Vite сохранён только как совместимый PWA/test runtime, а не production entrypoint.
- `[x]` Основные прямые URL, 404, protected redirect и динамические provider routes имеют Next route contract и smoke-тесты.
- `[x]` Удалены неиспользуемые legacy page families: home/cabinet/provider-owner legacy UI и скрытая `/pricing` страница.
- `[x]` Dev seed больше не создаёт legacy wellness-кабинеты, услуги и бронирования — только пользователей для AutoCare fixtures.
- `[x]` Runtime-поверхность platform payments/tariffs/subscriptions удалена из маршрутов, feature flags, super-admin overview и mock/API DTO.
- `[x]` Полная таблица URL и владельцев runtime содержит 56 route constants; inventory и route contract прошли 27.08.2026.
- `[ ]` Перепроверить каждый dynamic URL: provider, request, legacy redirect, owner provider/reviews — c mock API и с real API.
- `[ ]` Провести финальный import/dependency audit Vite и оставить только подтверждённо нужное для Vitest/PWA.
- `[ ]` Рефакторинг `demo:reset`: убрать оставшийся legacy fixture cleanup только после безопасного AutoCare reset сценария и real-DB smoke.

## 1.2 Основные сценарии клиента

- `[x]` Поиск, фильтры, карта, сортировка, сравнение и пустой результат города.
- `[x]` Страница сервиса: услуги, карта, галерея, отзывы, фото отзывов и placeholder.
- `[x]` Garage: марка, модель, год, госномер, VIN и внутренний номер; booking snapshot хранит исторические данные.
- `[x]` Заявка, quote, accept/decline и booking snapshot имеют API/mock контракты.
- `[x]` Отзывы: пустое состояние, один/много отзывов, фотографии и отдельная страница отзывов.
- `[~]` Реальный API: vehicleId в заявке, сохранение всех полей snapshot, удалённый автомобиль и недоступный сервис.
- `[~]` Реальный API: edit review, review photo и состояние suspended/removed service.
- `[~]` Проверить все публичные режимы связи сервиса: online booking, request + callback, phone-only.
- `[~]` Бонусы: UI списания, expiry, refund и история клиента.

## 1.3 Кабинеты и branch permissions

- `[x]` Client, owner, manager, staff, admin и super-admin роли существуют.
- `[x]` Owner видит все назначенные точки; scoped membership ограничивает staff/manager конкретными locationId в основных AutoCare service/request/review/chat paths.
- `[x]` Владелец может задать режим связи филиала: чат, телефон, callback, фото проблемы и response window.
- `[x]` Для маленького сервиса поддержан сценарий «заявка + звонок» без обязательства мгновенно отвечать в чате.
- `[~]` Exhaustive endpoint matrix: staff/manager A не получает B на requests, offers, reviews, chats, media, discounts, bonuses, analytics и capacity.
- `[~]` Полный owner onboarding/change-request workflow.
- `[~]` Calendar/work queue и capacity UI — базовые экраны есть, нужна сценарная проверка с ресурсами.
- `[~]` Evidence viewer, moderation queues и audit viewer — контракт/часть UI есть, нужен полный workflow.
- `[~]` CRUD страна → город → зона и market policy в super-admin — UI/API foundation есть, нужен полный local smoke.

## 1.4 UI states, responsive, accessibility, locale

- `[x]` Header/footer и форма/карта там, где данные для них не нужны, отображаются сразу.
- `[x]` Skeleton применяется к серверным блокам, имеет светлую/тёмную тему, и не должен заменять весь экран текстовым loader.
- `[x]` Есть базовые loading, empty, error, stale, retry, permission-denied и suspended контракты.
- `[~]` Пройти real API state matrix: offline, expired session, partial response, retry и повторная отправка в PostgreSQL.
- `[x]` Автоматическая Chromium matrix на 360, 390, 414, 540, 682, 768, 790, 1024, 1280 и 1440px: 30 route/width checks без horizontal overflow; header/footer/map/gallery и Escape в галерее проверены 27.08.2026.
- `[~]` Ручная визуальная приёмка форм, модалок и таблицы автомобилей на тех же ширинах остаётся перед пилотом.
- `[~]` Полный keyboard/Axe pass: Tab order, Escape, Enter/Space, visible focus, listbox города, custom select, upload и form errors.
- `[~]` Проверить RU/EN/ES/RO, длинные города/услуги/языки, plural/date/currency/timezone.
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
npm run check:responsive
npm run check:e2e:browser
```

Текущий локальный evidence от 27.08.2026: frontend lint/build и 107 файлов / 379 тестов; backend build и полный server test suite; API parity 227/227, route inventory 56 и responsive matrix 30/30. Полная проверка с реальным API остаётся отдельным пунктом этого плана.

Дополнительно обязательны локальные login smoke для **MSW** и **real API**. `CSRF_ORIGIN_MISMATCH` при корректной локальной конфигурации — `ADD-C01`.

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
- `[ ]` Проверить idempotency с real PostgreSQL при duplicate click, offline replay и timeout retry.

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

---

# 3. Безопасность, сохранность данных и критичные баги

## Исправлять сразу, если проявляются в локальном MVP

- `[ ]` **ADD-C01** Local login is blocked by `CSRF_ORIGIN_MISMATCH` for a correctly configured Next/MSW or Next/API origin. Fix allow-list/configuration without weakening production CSRF.
- `[ ]` **ADD-C02** Any white screen, Runtime ReferenceError, unhandled rejection or missing route on public/auth/owner/admin screens.
- `[ ]` **ADD-C03** Any header, burger, floating-label, modal, gallery or filter overlap that blocks input/click on supported viewport.
- `[ ]` **ADD-C04** A static shell/form/map disappears during loading instead of preserving layout while data-only blocks show themed skeletons.
- `[ ]` **ADD-C05** Duplicate request/booking after retry, offline recovery or repeated click.

## Обязательны до открытия пилота

- `[~]` **ADD-C06** Branch-scoped authorization regression matrix (owner/manager/staff, all sensitive categories and direct API). Foundation implemented; complete integrated proof remains.
- `[ ]` **ADD-C07** Private media, AV/quarantine, signed access, EXIF removal and retention.
- `[ ]` **ADD-C08** PostgreSQL concurrency matrix for every booking/quote transition.
- `[ ]` **ADD-C09** Redis rate limit must fail closed for login/upload/mutation; test outage with multiple instances.
- `[ ]` **ADD-C10** Separate platform-review rate limit and idempotency abuse tests.
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
- `[ ]` **ADD-N06** Native iOS/Android, fleet API, paid promotion, all payment/tariff/subscription functionality — explicitly outside product scope.

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

**Локальный MVP готов** — когда раздел 1 зелёный и `ADD-C01…C05` закрыты.
**Закрытый пилот готов** — когда раздел 2, все `ADD-C06…C15` и раздел 4 закрыты доказательствами.
**Публичный бесплатный MVP готов** — только после успешного пилота, независимого security review, backup/restore, accessibility review и финального go/no-go.
