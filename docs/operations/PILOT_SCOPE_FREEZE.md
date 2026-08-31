# AutoCare Hub — фиксированный список готовности к пилоту

**Версия:** scope freeze v1.0  
**Зафиксирован:** 30 августа 2026  
**Статус:** единственный список обязательных условий для процентов готовности и go/no-go

Этот документ отделяет конечные условия выпуска от истории мелких исправлений. Файлы с порциями, тестами и командами остаются доказательствами, но не расширяют этот список и не меняют его проценты.

## Граница продукта

Пилот — бесплатная платформа поиска, сравнения и связи водителей с автосервисами. Деньги за ремонт передаются клиентом сервису напрямую вне AutoCare Hub.

В обязательный scope не входят: платёжные системы, Stripe, checkout, комиссии, тарифы, подписки, платное продвижение, payout, native iOS/Android, fleet API, PostGIS/GiST без подтверждённой нагрузки, specialist/bay/lift/equipment workspace и realtime-polish чатов сверх REST/polling. Они не влияют на три процента ниже.

## Правило процентов

| Контур | На freeze | Сейчас | Условие 100% |
| --- | ---: | ---: | --- |
| Локальный MVP | **86%** | **96%** | Все шесть пунктов `MVP-01…MVP-06` закрыты. |
| Закрытый пилот | **58%** | **58%** | Все одиннадцать пунктов `PILOT-01…PILOT-11` закрыты и security-трек достиг 100%. |
| Безопасность и сохранность данных | **45%** | **45%** | Все десять пунктов `SEC-01…SEC-10` закрыты. |

Вес каждого оставшегося пункта указан в таблицах. Сумма оставшихся весов точно доводит соответствующий контур до 100%: local MVP — 4%, pilot — 42%, security — 55%.

Процент меняется только вверх после закрытия пункта с указанным доказательством. Неудачный запуск, найденный некритичный дефект или новая идея не уменьшают опубликованный процент: они блокируют конкретный пункт до исправления.

Статусы: `[x]` — доказательство получено; `[ ]` — можно выполнять; `[E]` — требуется внешний доступ, инфраструктура или ручная приёмка.

## 1. Локальный MVP — оставшиеся 4%

| Статус | ID | Остаток | Владелец | Закрытие только при наличии |
| --- | --- | ---: | --- | --- |
| `[x]` | `MVP-01` — чистая локальная база и seed | +2% | Codex | 31.08.2026: `demo:reset` → `demo:seed` → `autocare:seed` выполняются без ручной коррекции; health/catalog/read smoke вошли в real Chromium suite. |
| `[x]` | `MVP-02` — real-API state matrix | +3% | Codex | 31.08.2026: базовый browser/API прогон 22/22 на PostgreSQL/Redis и дополнительный owner/admin recoverable-state тест 1/1 подтвердили public/client/owner/admin routes, error, offline/timeout retry, expired session, partial, permission denied и suspended states. |
| `[x]` | `MVP-03` — release-browser layout matrix | +3% | Codex | `npm run check:local-mvp` PASS 30.08.2026: Next release server и Chromium прошли 30 route/width checks на 360/390/414/540/682/768/790/1024/1280/1440; header/footer/map/gallery, Escape и отсутствие horizontal overflow подтверждены. |
| `[x]` | `MVP-04` — owner/admin/super-admin execution | +2% | Codex | 31.08.2026: 14 real PostgreSQL/Redis integration files, 60/60 tests — owner change request → admin decision с причиной, invitation accept/revoke, moderation/evidence, country → city → zone и branch denial. |
| `[E]` | `MVP-05` — ручная visual/keyboard приёмка | +2% | Владелец продукта + Codex | Подписанный checklist форм, таблицы автомобилей, тёмной/светлой темы, фокуса, Escape и мобильной навигации на поддерживаемых ширинах. |
| `[E]` | `MVP-06` — screen reader и реальные устройства | +2% | Владелец продукта | VoiceOver и TalkBack на реальных телефонах: поиск, заявка, запись, отмена, ошибки форм и вход. |

Текущее доказательство: полный `npm run check:local-mvp` прошёл 31.08.2026: 21 static/source check и responsive Chromium matrix PASS. Полный mock release audit прошёл **18/18**, включая auth boundary, responsive discovery, keyboard/focus/Escape, 20 локалей, RU/EN/ES/RO mobile, owner services/privacy/onboarding, compact calendar, admin moderation reason и super-admin hierarchy. Базовый real-browser smoke `npm run test:e2e:real` прошёл **22/22** на локальных PostgreSQL/Redis; добавленный owner/admin recoverable-state сценарий прошёл отдельно **1/1**. Вместе покрыты clean reset/seed, public/client/owner/admin/super-admin маршруты, state matrix, idempotency и retry. Расширенный real integration-набор `npm --prefix server run test:integration` прошёл **14 файлов / 60 тестов**, включая branch denial, owner change request → admin decision с причиной, invitation accept/revoke, moderation evidence и country → city → zone. MVP-05 требует ручную visual/keyboard приёмку владельца, MVP-06 — VoiceOver/TalkBack на реальных устройствах.

MVP-01 final evidence: migration order/inventory PASS, `demo:reset` → `demo:seed` → `autocare:seed` без ручной коррекции, health/catalog/read browser smoke. PostgreSQL, Redis и API были запущены локально; production preflight и origin policy не ослаблялись.

Для MVP-05 keyboard evidence: public traversal по `/`, `/services?service=oil-change` и provider profile — **1/1 PASS**; protected traversal owner/admin/super-admin по всем маршрутам из release gate — **1/1 PASS за 1.1 мин**. Проверены Tab-переходы, focus-visible, Enter/Space и route navigation. Ручная visual/keyboard приёмка владельца остаётся внешним gate.

Воспроизводимый порядок ручной приёмки для `MVP-05` и `MVP-06` зафиксирован в [`MVP_MANUAL_ACCEPTANCE_CHECKLIST.md`](./MVP_MANUAL_ACCEPTANCE_CHECKLIST.md). Checklist не добавляет обязательных пунктов и не меняет веса: он описывает только доказательства visual/keyboard и VoiceOver/TalkBack, необходимые для закрытия уже существующих строк.

## 2. Закрытый пилот — оставшиеся 42%

| Статус | ID | Остаток | Владелец | Закрытие только при наличии |
| --- | --- | ---: | --- | --- |
| `[ ]` | `PILOT-01` — staging foundation | +5% | Владелец продукта / инфраструктура | Изолированные staging PostgreSQL и Redis, сильные JWT/session secrets, HTTPS API, CORS/origin allow-list, bootstrap super-admin и секреты вне репозитория. |
| `[ ]` | `PILOT-02` — email и фоновые процессы | +4% | Владелец продукта / инфраструктура | SMTP sender-domain, реальная доставка письма, reminder/outbox/dead-letter worker и наблюдаемый retry. |
| `[ ]` | `PILOT-03` — private media в staging | +6% | Codex + инфраструктура | S3-compatible private bucket, scanner/quarantine, signed URL, EXIF removal и успешный/rejected upload в staging. Зависит от `SEC-02`. |
| `[ ]` | `PILOT-04` — recovery инфраструктуры | +5% | Владелец продукта / инфраструктура | Внешний encrypted backup vault, расписание, RPO/RTO и успешное восстановление в отдельную БД. Зависит от `SEC-07`. |
| `[ ]` | `PILOT-05` — observability и rollback | +4% | Владелец продукта / инфраструктура | Метрики, alerts, incident channel, worker/dead-letter health и recorded rollback rehearsal. Зависит от `SEC-09`, `SEC-10`. |
| `[ ]` | `PILOT-06` — multi-process smoke | +4% | Codex + инфраструктура | Две API реплики, Redis outage/reconnect, rate-limit fail-closed и WebSocket/reconnect smoke. Зависит от `SEC-04`. |
| `[ ]` | `PILOT-07` — discovery/trust на staging | +3% | Codex + инфраструктура | Staging rate limit/cache policy, traffic benchmark, completed-visit trust snapshot, badge removal/recovery и appeals evidence. |
| `[ ]` | `PILOT-08` — утверждённые правила запуска | +3% | Владелец продукта | Город/зоны, privacy/legal texts, support contact, retention сроки, политика отмены/no-show/review/appeal, видимость телефонов и правила скидок. |
| `[ ]` | `PILOT-09` — два сервиса подключены | +3% | Владелец продукта | Один малый сервис и один multi-staff/multi-branch; реальные адреса, график, цены, услуги, фото, контакты и роли. |
| `[ ]` | `PILOT-10` — реальные клиентские сценарии | +3% | Владелец продукта + Codex | 5–10 согласившихся клиентов прошли search → request → quote → booking → reschedule/cancel/no-show → complete → review/photo → bonus → support. |
| `[ ]` | `PILOT-11` — метрики и go/no-go | +2% | Владелец продукта | Собраны response/confirmation/cancel/no-show/duplicate/upload/mail/complaint метрики; нет P0/P1; есть письменное go/no-go. |

Текущее доказательство старта: `npm run check:mvp-readiness` корректно блокируется без четырёх конфигураций: PostgreSQL/Redis/JWT, SMTP, persistent media storage и bootstrap super-admin. Это не дефект кода и не повод менять список.

## 3. Безопасность и сохранность данных — оставшиеся 55%

| Статус | ID | Остаток | Владелец | Закрытие только при наличии |
| --- | --- | ---: | --- | --- |
| `[ ]` | `SEC-01` — branch authorization в staging | +5% | Codex + независимый reviewer | HTTP replay owner/manager/staff по двум филиалам для requests, offers, reviews, chats, media, discounts, bonuses, analytics и capacity; чужие строки/мутации недоступны. |
| `[ ]` | `SEC-02` — защищённый media pipeline | +9% | Codex + инфраструктура | Private storage, quarantine → decode/re-encode → EXIF strip → AV → Ready, MIME/pixel/decompression limits, signed access и проверка, что A не получает B. |
| `[ ]` | `SEC-03` — удаление и retention | +5% | Codex + инфраструктура | Реальное удаление аккаунта удаляет/анонимизирует данные согласно политике; media, reviews, bonus, chats и audit retention проверены на восстановленной staging-копии. |
| `[ ]` | `SEC-04` — Redis fail-closed | +6% | Codex + инфраструктура | При недоступном Redis две API реплики возвращают контролируемый отказ для login/upload/mutation; нет process-local bypass, после reconnect лимиты корректны. |
| `[ ]` | `SEC-05` — concurrency в staging | +5% | Codex + инфраструктура | Несколько клиентов конкурентно проходят booking/quote/reschedule/cancel/no-show/complete; один факт записи, корректные 409/idempotent replies и записанные p95/p99. |
| `[ ]` | `SEC-06` — perimeter и PII | +5% | Codex + инфраструктура | Staging proxy/WAF/HTTPS headers, duplicate CSRF header, origin policy, redacted log sink и retention логов подтверждены фактическими запросами. |
| `[ ]` | `SEC-07` — backup, restore и PITR | +8% | Владелец продукта / инфраструктура | Encrypted external vault, checksum, restore в отдельную БД, timed recovery, документированные и достигнутые RPO/RTO. |
| `[ ]` | `SEC-08` — независимый security review | +7% | Владелец продукта | Независимый reviewer или pentest покрывает auth, IDOR, media, rate limits, WebSocket, admin и deletion; P0/P1 устранены и перепроверены. |
| `[ ]` | `SEC-09` — audit и incident evidence | +3% | Codex + инфраструктура | Audit events для sensitive action доставляются в защищённое хранилище, доступны ответственному, имеют retention и используются в incident workflow. |
| `[ ]` | `SEC-10` — recovery/rollback drill | +2% | Владелец продукта / инфраструктура | Tabletop и техническая rollback-проверка после миграции/ошибки worker без потери подтверждённых заявок. |

## Закрытые базовые условия, которые не пересчитываются

- `ADD-C01` — local CSRF/origin policy; production loopback не разрешён.
- `ADD-C05` — idempotency для duplicate click/offline retry на локальном PostgreSQL.
- `ADD-C10` — platform review rate limit и idempotency.
- `ADD-C16` — из runtime удалены platform payments/subscriptions/commissions/payouts.
- Локальные контракты branch scope, media policy, concurrency, Redis fail-closed, PII redaction, deletion invariants, audit и backup harness являются основанием стартовых процентов, но не заменяют staging evidence из `SEC-01…SEC-10`.

## Жёсткое правило изменения scope

1. После этой даты новые функции, UX-полировка, аналитика, новые рынки и технический долг попадают только в `POST_PILOT_BACKLOG`; они не меняют список, веса или проценты.
2. Новая ошибка P0/P1 исправляется немедленно, но привязывается к уже существующему `MVP-*`, `PILOT-*` или `SEC-*`; новый обязательный пункт не создаётся и процент не уменьшается.
3. Единственное исключение — новое юридическое требование или подтверждённая критическая уязвимость, для которой нет подходящего пункта. Изменить scope можно только после явного решения владельца продукта и выпуска `scope freeze v1.1` с причиной и новой стартовой точкой.
4. Пока такого решения нет, этот документ не дополняется обязательными задачами. В конце каждого блока я отмечаю только выполненные строки, команду, среду и commit SHA.

## Источники доказательств

- Исторические порции и локальные команды: `docs/operations/PILOT_100_READINESS_PLAN.md`.
- Production/preflight: `npm run check:mvp-readiness`, `npm run check:production-operations`.
- Local release gate: `npm run check:local-mvp`.
- Security policy and drills: `docs/security/LOCAL_SECURITY_REVIEW_2026-08-27.md`, `docs/CONCURRENCY_TEST_MATRIX.md`, `docs/FINANCIAL_DATA_RETENTION.md`.
