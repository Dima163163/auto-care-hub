# Итоговая локальная проверка AutoCare Hub для пилота — 21 октября 2026

## Решение и граница проверки

**NO-GO для пилота с реальными пользовательскими данными.** Подготовка staging
и демонстрация на синтетических данных допустимы в пределах
[канонических 54 условий](../operations/PILOT_SCOPE_FREEZE.md). Локальный PASS
не заменяет staging, внешнее управление ключами, юридическое решение,
независимую проверку безопасности и реальные пользовательские сценарии.

Проверен checkout `autocare-hub-weakness-audit`, ветка
`fix/request-chat-state-isolation-2026-10-20`, HEAD `26da803`. На 21 октября
remote `dev` остаётся `8840ae8`, `main` — `6d1e6b6`. Пять исправлений этой
ветки локальны: U22, UX17, UX18, UX16, U14. Они не находятся в remote `dev` и
не проходили exact-candidate PR/Actions или развёрнутую приёмку. Первые четыре
UI/privacy fixes проверены в production Next mock; U14 — на отдельной
PostgreSQL16. Подробности ниже и в [рабочем реестре](FULL_PROJECT_AUDIT_2026-10-03.md).

## Что проверено сейчас

| Область | Фактический результат | Предел доказательства |
| --- | --- | --- |
| Frontend unit | `197` файлов, `647/647` тестов PASS | Не заменяет реальные API/browser journeys |
| Frontend lint/build | `npm run lint` и production Next real-mode build PASS | Build не означает deployed acceptance |
| Mock leakage | `192` файла production Next artifact, синтетических account/contact markers нет | Проверяются перечисленные markers, не весь возможный private content |
| Backend Quality | `quality:backend` PASS с тестовой конфигурацией; unit `388` файлов, `1408/1408` тестов | Первый запуск без обязательного `DATABASE_HOST` закономерно остановился на unit import; повтор с fake loopback URL прошёл |
| Миграции и U14 | `140` миграций применены к собственной disposable PostgreSQL16; raw JSONB, повтор enqueue, legacy backfill и blind-index lookup PASS | Не production backfill, не worker/mail E2E и не нагрузка на большую таблицу |
| Frontend contracts | Design tokens, 16 interaction invariants, 120 endpoint runtime boundary, Next boundary и CI policy PASS | Статические контракты не доказывают поведение каждого маршрута |
| Диаграммы | `62` source anchors / 4 inventories PASS; `08-outbox-maintenance.puml` syntax/render/XML и визуальный просмотр PASS | Fingerprint и SVG не доказывают безопасность |
| Документы | `174` индексированных файла существуют; `220` локальных ссылок проверены, отсутствующих целей нет | `131` файл не получил semantic сверки, `30` сверены частично; anchors/внешние ссылки не проверены исчерпывающе |

Предыдущая матрица 20 октября: `240/240` closed-page route/role/profile cases,
120 screenshots и отдельные interaction probes. Она **не была повторена
целиком на HEAD `26da803`**. После неё четыре найденные проблемы интерфейса
исправлены, проверены targeted unit и браузерными сценариями. Текущая ветка не
проходила полный real-API browser E2E, staging replay, native device,
screen-reader или настоящий 200% zoom.

`check:mvp-readiness` блокируется отсутствующими в локальном окружении
PostgreSQL/Redis/JWT, SMTP, persistent media path и bootstrap admin настройками.
`check:production-operations` дополнительно требует production mode, S3,
legal approval, staging HTTPS URL и внешние репетиции; в текущем checkout
`check:pilot-evidence` не находит обязательный anonymized
`docs/operations/pilot-evidence.json`. `check:migration-checksum` требует
внешний `PUBLISHED_MIGRATION_MANIFEST`. Эти сигналы означают **нет
подтверждения допуска**, а не что конкретная production-инфраструктура
заведомо настроена неверно.

## Подтверждённые проблемы перед пилотом

| Приоритет | Проблема | Влияние / нужная приёмка |
| --- | --- | --- |
| P0 | [U20](DEEP_PROJECT_AUDIT_2026-10-13.md#u20--p1--сохранение-устаревшего-userentity-может-вернуть-старые-security-fields): полный stale `UserEntity` может перезаписать `status`, password hash и token version | Block/password reset может быть отменён конкурентным запросом; нужны narrow/CAS writes и PostgreSQL race test |
| P0 | [U15](DEEP_PROJECT_AUDIT_2026-10-13.md#u15--p1--superadmin-может-писать-в-частную-переписку-через-request-api): старый request API допускает запись superadmin в чужую переписку | Единая private-write policy для сообщений и вложений, отрицательные tests всех entrypoints |
| P0 | [U17](DEEP_PROJECT_AUDIT_2026-10-13.md#u17--p1--production-приглашение-не-доставляет-необходимый-acceptance-token): production invite не доставляет acceptance token | Новые сотрудники не могут завершить приглашение; нужен адресный одноразовый канал и end-to-end replay/expiry tests |
| P0 | [U18](DEEP_PROJECT_AUDIT_2026-10-13.md#u18--p1--истечение-потраченного-начисления-списывает-свежие-бонусы): истечение уже потраченного lot списывает свежие баллы | Потеря баланса; нужны per-lot remaining/FIFO/refund правила и конкурентная сверка ledger |
| P0 | [U19](DEEP_PROJECT_AUDIT_2026-10-13.md#u19--p1--повторные-неподтверждённые-жалобы-искусственно-снижают-trust-score): повторные неподтверждённые claims портят публичный trust score | Манипулируемая репутация; уникальность case и разделение complaint/proven violation |
| P0 | [U01–U03](FULL_PROJECT_AUDIT_2026-10-03.md): нет production KMS/row binding и завершённого privileged MFA/step-up | Криптографическая и административная защита не принята для реальных данных |
| P0 | [U21](DEEP_PROJECT_AUDIT_2026-10-13.md): текущие lockfiles содержат уязвимые версии | См. свежий аудит ниже; нужны controlled upgrades и exact-candidate проверки |
| P1 | [U16, N24, N30, N32](DEEP_PROJECT_AUDIT_2026-10-13.md): encrypted reference exact lookup, гонка revision, усечённая current quote и общий notification key | Потеря moderation evidence, двойная правка, неверная смета и пропуск уведомления; нужны DB concurrency и versioned identity tests |
| P1 | [N26–N28](DEEP_PROJECT_AUDIT_2026-10-13.md): password byte policy, неполный runtime-boundary guard и сбой cleanup при denied storage | Уточнить критичные границы auth/frontend, добавить negative browser/source tests |
| P1 | [N04, N09, N12](FULL_PROJECT_AUDIT_2026-10-03.md): размер чтения чатов, масштабная encryption migration, фильтрация broadcast после LIMIT | Требуются измеримые лимиты памяти/запросов, rehearsal backfill и SQL-first фильтрация |

Список не означает, что все P0 имеют одинаковую вероятность эксплуатации.
Указанный эффект U15/U17/U18/U19 воспроизведён прежним source/service проходом;
U20 — TypeORM update diff, **не доказанный live account takeover**. Их исходники
не менялись пятью локальными commits этой ветки. U14 и U22/UX16–UX18 исправлены
локально; эксплуатационная приёмка остаётся отдельной.

## Свежий аудит зависимостей

`npm audit` 21 октября: web **6 packages** (2 critical, 4 high), API
**3 packages** (3 high). С `--omit=dev`: web **3 high** (`next`, `sharp`,
`source-map-js`), API **1 high** (`sharp`). Это число пакетов/advisory,
не оценка числа эксплуатируемых runtime путей.

- `next@16.3.6` ниже исправленной `16.3.8`. Проект использует App Router,
  root catch-all и статические страницы; часть advisory относится к SSG/ISR
  cache poisoning, но точная применимость к конкретным маршрутам требует
  отдельного replay. `images.remotePatterns` не настроен, поэтому SSRF advisory
  для allow-listed remote URLs по опубликованному условию здесь не подтверждён.
  Источники: [cache poisoning](https://github.com/advisories/GHSA-mcj8-r9mp-w47p),
  [Image Optimization SSRF](https://github.com/advisories/GHSA-cjq9-62q9-8jv4).
- `sharp@0.35.4` используется серверной обработкой изображений; upstream
  исправил librsvg issue в `0.35.5`. Возможность RCE зависит от среды и
  декодирования SVG, поэтому её не объявляем доказанной в AutoCare Hub.
  [Advisory](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).
- `shell-quote` через `concurrently` и Vite относятся к toolchain/dev path;
  критический advisory `shell-quote` требует особого сочетания comment token и
  untrusted newline. Это не доказанная команда, доступная внешнему клиенту.
  [Advisory](https://github.com/advisories/GHSA-pqg4-j6r4-53mv).
- `source-map-js@1.2.1` отмечен и при `--omit=dev`, но эксплуатация требует
  разбора специально подготовленной indexed source map. Такой runtime input
  в проекте не воспроизведён. [Advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

## Предлагаемая последовательность улучшений

1. Закрыть U20 и U15: узкие транзакционные обновления security state и одну
   server-side политику private write. Проверить гонки/отказы на PostgreSQL.
2. Обновить `next` и `sharp` в обоих lockfiles без force/major jumps; отдельно
   воспроизвести релевантные advisory и выполнить production build, image
   processing, route/browser и dependency gates на exact candidate.
3. Исправить U17/U18/U19 до пилотной активации invitations, bonuses и trust
   score; до приёмки держать эти сценарии недоступными реальным участникам.
4. Закрыть U01–U03: KMS/row-bound encryption/privileged MFA с recovery;
   выполнить encrypted backup → isolated restore и staged migration U14 на
   объёме, близком к целевому.
5. Стабилизировать сметы и модерацию (U16, N24, N30, N32) через immutable
   version identity, актуальную quote отдельно от истории и атомарные transitions.
6. Собрать evidence для 54 канонических gates: staging URL и credentials,
   worker/Redis/SMTP/S3 smoke, реальные browser journeys клиента и сервиса,
   доступность на устройствах, юридическое/privacy решение и pilot metrics.
   Это последний шаг перед решением GO/NO-GO, а не формальное следствие unit PASS.

Для качества пилота полезно измерять без усложнения продукта: долю завершённых
заявок, время первого ответа сервиса, долю подтверждённых записей без
переноса, ошибки доставки invite/notification, спорные bonus/trust операции и
обращения из пустых/error состояний. Это **предложение метрик**, а не
утверждение о действующей аналитике.

Для интерфейса пилота предлагаю ограниченный проход по основному сценарию:
показывать в заявке текущий статус, ожидаемое действие и кто его выполняет;
проверить, что цена, гарантия и подтверждение времени одинаково понятны на
карточке, сравнении и итоговом экране; дать владельцу сервиса явный сигнал о
заявках без ответа. Затем принять эти сценарии на реальном API в узких
viewport, с клавиатурой, screen reader и увеличением 200%, включая пустые,
ошибочные и просроченные состояния. Это предложения к пилотному UX, а не
утверждение, что каждое из этих состояний сейчас сломано.

## Ограничения документационного аудита

[Индекс](../INDEX.md) и [coverage JSON](evidence/2026-10-20/docs-coverage.json)
сохраняют инвентаризацию: 174 документа/диаграммы, из них 131 не проверен
семантически и 30 сверены частично. Этот проход проверил актуальные инструкции,
pilot scope, security/field-encryption, исправленные flows, карту из 62 anchors,
наличие файлов и 220 локальных ссылок. Полное чтение и сопоставление всех
26 598 строк original text/spec документации не выполнено; не проверенные
файлы остаются явно перечисленными в индексе. Не проводились production
pentest, CI на опубликованном SHA, real-user consent или юридическая экспертиза.
