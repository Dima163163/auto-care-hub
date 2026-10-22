# Карта проекта AutoCare Hub

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
- Auth cleanup и production gates остаются открытыми; локальные исправления
  private write, encrypted reference и outbox ожидают real-DB/worker проверок.
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
