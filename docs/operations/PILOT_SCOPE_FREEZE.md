# AutoCare Hub — окончательный план готовности закрытого пилота

**Версия:** final scope freeze v2.0
**Дата фиксации:** 5 сентября 2026
**Статус:** единственный канонический источник обязательных условий и go/no-go

Распределение этих же ID по срочности и ответственности, накопительный прогресс
и отдельный учёт дополнений: [PILOT_TASK_ALLOCATION.md](PILOT_TASK_ALLOCATION.md).
Распределение от 05.09.2026 не меняет ни 54 условия, ни их критерии закрытия.

Этот документ заменяет прежние проценты `96/58/45`. Они смешивали локальный код,
ручную приёмку и отсутствующую внешнюю инфраструктуру, поэтому создавали ложное
ощущение, что готовность может уменьшаться после очередной проверки. Исторический
журнал порций в `PILOT_100_READINESS_PLAN.md` остаётся evidence-журналом, но не
определяет scope и не добавляет обязательных задач.

## 1. Граница пилотного продукта

В пилот входят: поиск и сравнение автосервисов, карточка сервиса, заявка, quote,
двустороннее подтверждение записи, перенос/отмена/no-show/завершение, автомобили
клиента, отзывы и фото, provider-scoped бонусы, текстовый чат и приватные
изображения, кабинеты клиента/владельца/сотрудника/admin/super-admin, филиалы,
модерация, audit, экспорт и удаление данных.

Платформа не принимает оплату за ремонт и не имеет Stripe, checkout, комиссий,
тарифов, подписок, payout, платного продвижения или subscription-промокодов.
Исторические миграции с такими именами сохраняются неизменными только ради
воспроизводимости старой схемы и не являются функциями продукта.

Не входят в обязательный пилотный scope:

- рабочее место управления подъёмниками, оборудованием и отдельными постами;
- расширенное resource-level планирование сверх вместимости филиала;
- native iOS/Android, fleet/B2B API и интеграции партнёров;
- PostGIS/GiST до подтверждённой необходимости нагрузочным тестом;
- realtime-polish чатов сверх надёжного REST/polling и базового WebSocket;
- новые локали сверх RU/EN/ES/RO и расширенная продуктовая аналитика.

## 2. Неизменяемые правила прогресса

Ревизия v2 однократно разрешена владельцем 05.09.2026. Все новые ID имеют
префикс `V2-`: старые `MVP/SEC/PILOT-*` в исторических журналах не получают
нового значения задним числом. Реестр состоит из **54 обязательных условий**:
10 local, 2 manual, 14 operations, 20 security, 8 pilot. Findings ниже — подзадачи
этих строк, а не дополнительные единицы в знаменателе.

Текущее решение: **NO-GO для реальных пользовательских данных**. Разрешена
подготовка staging и демонстрация на синтетических данных. Начало пилота и
успешное завершение пилота — разные решения: сначала закрываются контуры
A–D и согласие участников, затем выполняются реальные journeys контура E.

Статусы: `[x]` — доказательство фактически получено; `[~]` — кодовая подготовка
есть, но строка ещё не закрыта; `[ ]` — отсутствует; `[E]` — нужен внешний доступ,
инфраструктура, независимый специалист или решение владельца.

1. У каждого обязательного условия есть постоянный ID. Текущая приёмка закрыта
   только при `[x]`; `[~]` и `[E]` не дают зачёта за подготовку.
2. Накопительный процент выполнения контура = число уникальных ID с доказанным
   первым принятием / фиксированное число условий контура. Зачёт сохраняется в
   журнале; приёмка новой строки увеличивает процент, подготовка его не меняет.
   Контуры не складываются в один субъективный процент готовности.
3. Текущий допуск GO/NO-GO ведётся отдельно. Регрессия переоткрывает актуальный
   gate, не стирая историю работы; даже 100% накопительного выполнения не означает
   разрешение запуска при критическом дефекте. Ошибочный зачёт исправляется явно.
4. Ни ошибки, ни идеи не расширяют 54 строки. Подзадача существующего критерия
   учитывается только в его ID. Действительно необходимая работа вне критериев
   получает отдельный EXT-пакет с фиксированным знаменателем, срочностью и
   ответственностью. Новая находка не снижает процент уже принятого пакета.
   Необязательные функции уходят в POST без процентов готовности. Угроза данным
   блокирует запуск немедленно независимо от согласования доппакета.
5. Local fixture, source-contract или unit-тест не подменяет staging/production
   evidence. Секреты, PII, реальные фото и backup-файлы в Git не коммитятся.

## 3. Контур A — автоматический локальный MVP

**3/10 условий подтверждены в указанном локальном объёме; 7 требуют завершения
или повторной приёмки.** Реализованные сценарии и прежние результаты сохранены,
но найденные quote/timezone/logout/URL-дефекты исключают заявление «локальный MVP
готов на 100%». Это новая проверенная базовая линия v2, а не пересчёт старых
субъективных процентов. Источники и ограничения: `FINAL_PROJECT_AUDIT_2026-09-05.md`.

| Статус | ID | Условие закрытия |
| --- | --- | --- |
| `[x]` | `V2-MVP-01` | Локальные lint, frontend unit (149/470), Next production build и backend TypeScript build прошли 05.09.2026; это evidence рабочего дерева, не опубликованного SHA. |
| `[~]` | `V2-MVP-02` | Проверить все опубликованные migration checksums, staging applied inventory и изменение 1786310000000; затем fresh install и upgrade предыдущей версии на изолированной БД, integrity и restore. Доказательство: logs/checksum/DB identity, без destructive reset общих данных. |
| `[x]` | `V2-MVP-03` | Source inventory 57 route constants и 5 route-contract tests проходят; это статические URL/404/redirect контракты. Browser execution проверяется отдельно в V2-MVP-08/09 и V2-OPS-13. |
| `[x]` | `V2-MVP-04` | Route snapshot/parity 227 mock / 257 backend / 2 WebSocket и локальные compatibility contracts проходят; runtime DTO validation и negative API execution остаются в V2-MVP-05/08. |
| `[~]` | `V2-MVP-05` | Search/filter/map/profile + запись сохраняют серверное startsAt/timezone; malformed date/slot/query не ломает render. Реальные обработчики проверены на mock/API, browser timezone отличается от timezone сервиса. |
| `[~]` | `V2-MVP-06` | Request → quote → booking → reschedule/cancel/no-show/complete → review/bonus проходит; accept содержит увиденную quoteId/version, stale intent даёт 409, expiry и повтор подтверждения детерминированы. PostgreSQL tests вызывают реальные services, не только policy simulator. |
| `[~]` | `V2-MVP-07` | Роли/branch denial, invitation accept/revoke, provider suspension и moderation проверены через HTTP. Единая политика разрешённых reads/mutations для suspended; revoke закрывает уже открытые WS. |
| `[~]` | `V2-MVP-08` | Errors/offline/retry/session states сохраняют ввод в разрешённом identity scope; failed logout очищает private RTK cache, late refresh не восстанавливает старую сессию; malformed URL/DTO не приводит к белому экрану. Browser tests двух identities и network races. |
| `[~]` | `V2-MVP-09` | После исправлений — production Next mock и real-API browser matrices: светлая/тёмная загрузка, подписи без перекрытий, одинаковый shell, кнопки/карточки, клавиатура/Axe, RU/EN/ES/RO, 360–1440 px; нет console/runtime errors. Source checks уже PASS. |
| `[~]` | `V2-MVP-10` | Удалить оставшийся пользовательский текст о подписках, согласовать активные architecture/product/design docs, проверить контакты/числа/изображения/карты на demo-only данные и права использования. Исторические migrations сохраняются. Остальное наследие удаляется только после доказанного отсутствия ссылок. |

Основная команда: `npm run check:local-mvp`. Полный release-кандидат также требует
`npm run quality:backend`, `npm test -- --run`, `npm run lint`, `npm run build` и
`git diff --check` на конкретном commit SHA.

## 4. Контур B — ручная MVP-приёмка

**Текущий статус: 0/2 закрыто.** Автоматизация подготовлена, но подпись человека не
может быть создана Codex вместо владельца продукта.

| Статус | ID | Условие закрытия |
| --- | --- | --- |
| `[E]` | `V2-MANUAL-01` | Подписан visual/keyboard checklist на 360/390/414/768/1024/1280/1440: формы, dropdown, focus, Escape, темы, карта, кабинеты. |
| `[E]` | `V2-MANUAL-02` | На реальных iOS/Android пройдены VoiceOver/TalkBack: поиск, вход, заявка, запись, отмена и ошибки форм. |

Шаги зафиксированы в `MVP_MANUAL_ACCEPTANCE_CHECKLIST.md`.

## 5. Контур C — staging и production operations

**Текущий статус: 0/14 полностью подтверждено.** Для большинства строк репозиторий
содержит harness/runbook (`[~]`), но подтверждение конфигурации и фактическое
rehearsal evidence для данного кандидата не получено.

| Статус | ID | Обязательное доказательство до реального пилота |
| --- | --- | --- |
| `[E]` | `V2-OPS-01` | Изолированный staging с HTTPS/DNS, закрытыми admin/internal endpoints и отдельными данными. |
| `[E]` | `V2-OPS-02` | PostgreSQL, Redis, сильные JWT/session/outbox/metrics secrets в secret manager; отсутствуют placeholders. |
| `[~]` | `V2-OPS-03` | Release migration job применён один раз; schema/integrity/readiness и checksum проверены на staging. |
| `[E]` | `V2-OPS-04` | SMTP sender-domain настроен; SPF/DKIM/DMARC и реальная доставка setup/reset/notification писем подтверждены. |
| `[E]` | `V2-OPS-05` | Bootstrap super-admin создан однократно, bootstrap secret удалён/ротирован, постоянный privileged access защищён. |
| `[~]` | `V2-OPS-06` | Private S3-compatible bucket и ClamAV подключены; clean/infected/quarantine/promotion/signed-access smoke пройден. |
| `[~]` | `V2-OPS-07` | Отдельный worker выполняет reminder/outbox; retry, dead-letter, lease и restart проверены. |
| `[~]` | `V2-OPS-08` | Метрики, redacted logs, uptime/error monitoring и on-call alerts реально доставляются ответственному. |
| `[~]` | `V2-OPS-09` | Ежедневный encrypted offsite backup, WAL/PITR, object versioning/lifecycle и отдельные ключи настроены. |
| `[~]` | `V2-OPS-10` | Backup восстановлен в изолированную БД; checksum, данные, миграции, медиа, RPO и RTO записаны. |
| `[~]` | `V2-OPS-11` | Выполнен application rollback после release candidate без потери подтверждённых заявок. |
| `[~]` | `V2-OPS-12` | Две API-реплики проходят Redis outage/reconnect и WebSocket/redelivery smoke без local fallback. |
| `[~]` | `V2-OPS-13` | Staging API compatibility, browser E2E, public HTML/OG/robots/sitemap и Lighthouse проверены по deployed URL. |
| `[~]` | `V2-OPS-14` | CI использует immutable release SHA+artifact hash; dirty runs помечены отдельно. Promotion проверяет обязательные evidence/staleness/approvals. Удалённо включены branch protection/required checks, dependency+secret scans, restricted deploy identity; strict local summary не считается release GO. |

`npm run check:mvp-readiness` сейчас честно блокируется отсутствующими runtime
credentials, SMTP, persistent media path и bootstrap super-admin.

## 6. Контур D — безопасность и сохранность пользовательских данных

**Текущий статус для допуска реальных данных: 0/20 полностью подтверждено.**
Локальная реализация и тесты есть у большинства строк, но полный gate требует
staging replay либо независимого evidence. Формулировка «абсолютно безопасно»
невозможна; цель — defense in depth, ограничение ущерба, обнаружение и проверяемое
восстановление.

| Статус | ID | Обязательное доказательство до реального пилота |
| --- | --- | --- |
| `[~]` | `V2-SEC-01` | Threat model и data-flow inventory сверены с deployed архитектурой, всеми хранилищами и subprocessors. |
| `[ ]` | `V2-SEC-02` | Защитить привилегированный доступ MFA или SSO с обязательным вторым фактором и без обходного password login; минимум admin/super-admin, политика для owner/manager/staff с доступом к PII. Проверить recovery, reset, отзыв сессий и step-up для sensitive actions. Это новое hardening-требование ревизии, не доказательство взлома. |
| `[~]` | `V2-SEC-03` | JWT/session rotation/revocation, CSRF, CORS, cookies, trusted proxy, TLS/HSTS/CSP проверены реальными запросами. |
| `[~]` | `V2-SEC-04` | Login/upload/mutation/discovery rate limits fail closed при outage Redis на двух репликах и корректно восстанавливаются. |
| `[~]` | `V2-SEC-05` | IDOR/branch replay owner/manager/staff по двум providers/branches запрещает чужие requests, quotes, chats, media, bonuses, reviews и analytics. |
| `[~]` | `V2-SEC-06` | Admin/super-admin функции, moderation, export, security center и impersonation-like paths разделены least-privilege политикой. |
| `[~]` | `V2-SEC-07` | Все HTTP/WebSocket/background inputs имеют allow-list, type/size/count bounds; injection/fuzz негативные сценарии не дают 500 и утечек. |
| `[~]` | `V2-SEC-08` | Миграции, FK/unique/check constraints, idempotency keys и row locks подтверждены на восстановленной production-like БД. |
| `[~]` | `V2-SEC-09` | Multi-process races booking/quote/reschedule/cancel/no-show/complete дают один результат, ожидаемые 409/idempotent replies и audit. |
| `[~]` | `V2-SEC-10` | Upload: private bucket → quarantine → MIME/decode/re-encode → EXIF strip → AV → promotion; лимиты bytes/pixels/decompression соблюдены. |
| `[~]` | `V2-SEC-11` | Signed URL короткоживущий/no-store; A не читает B, quarantine не адресуется, expired/old URL после deletion недоступен. |
| `[~]` | `V2-SEC-12` | Проверить redaction логов/metrics/alerts, browser storage/URLs/referrers, PWA/RTK caches, traces и exports. No PII/secrets outside approved stores; logout/account switch удаляют identity cache; third-party maps/analytics получают только разрешённые consent-aware данные. |
| `[~]` | `V2-SEC-13` | Export доступен только владельцу данных, bounded/no-store, не содержит hash/secret/internal moderator IDs и проверен выборочно. |
| `[~]` | `V2-SEC-14` | Account deletion/retention удаляет/анонимизирует sessions, contacts, vehicles, chats, media, reviews, bonuses/provider links. Cancel-vs-complete использует общий lock/CAS; storage partial failure безопасно повторяется; restored backups не возвращают удалённые данные в работающий сервис (повтор purge до serving). |
| `[~]` | `V2-SEC-15` | Sensitive reads/mutations создают append-only audit; доступ, экспорт, retention и cleanup audit защищены и проверены. |
| `[E]` | `V2-SEC-16` | Secret manager, least-privilege DB/S3/Redis/service accounts, encryption in transit/at rest и documented key rotation настроены. |
| `[~]` | `V2-SEC-17` | Encrypted backup/PITR/restore защищены раздельными правами и offsite/immutable policy; компрометация app credentials не позволяет удалить backup. Восстановлены DB+media+ключи, проверены checksums, retention/tombstones и реально измеренные RPO/RTO. |
| `[E]` | `V2-SEC-18` | Независимый security review/pentest покрывает auth, IDOR, uploads, WebSocket, admin, deletion и supply chain; P0/P1 исправлены и перепроверены. |
| `[~]` | `V2-SEC-19` | Incident tabletop: обнаружение, изоляция, session/key rotation, сохранение evidence, rollback, recovery и уведомление владельца. |
| `[E]` | `V2-SEC-20` | Утверждены privacy/consent/retention/controller-processor тексты, data hosting/transfers, contacts и breach/complaint procedure для пилотной юрисдикции. |

## 7. Контур E — реальный закрытый пилот

**Текущий статус: 0/8 закрыто.** Эти строки нельзя закрывать synthetic fixtures.

| Статус | ID | Условие закрытия |
| --- | --- | --- |
| `[E]` | `V2-PILOT-01` | Выбран один конкретный город/зоны, оператор, support contacts и применимые правила. |
| `[E]` | `V2-PILOT-02` | Подключены два согласившихся сервиса: малый и multi-staff/branch; проверены услуги, цены, график, роли, контакты и фото. |
| `[E]` | `V2-PILOT-03` | Подключены 5–10 согласившихся клиентов; реальные PII не попадают в Git или отчёты. |
| `[E]` | `V2-PILOT-04` | Пройдены fixed и quote journeys: request, confirm, reschedule, cancel, no-show, complete, review/photo и bonus. |
| `[E]` | `V2-PILOT-05` | Пройдены duplicate/offline/retry, жалоба, moderation, support и восстановление после ошибки. |
| `[E]` | `V2-PILOT-06` | Собраны обезличенные response/confirmation/cancel/no-show/duplicate/upload/mail/complaint метрики. |
| `[E]` | `V2-PILOT-07` | Нет открытых P0/P1; P2 имеют owner/date/workaround; сервисы и клиенты подтвердили понятность ключевых сценариев. |
| `[E]` | `V2-PILOT-08` | Подписано go/no-go с release SHA, migration checksum, evidence links, rollback owner и датой следующего review. |

## 8. Порядок исполнения и владельцы

- **Блок 1 — Codex, локальный код:** CHANGE-C001…C004 (WS revoke, quote version,
  deletion race, время записи), CHANGE-C009…C012 (logout/URL/refresh, evidence
  tooling и достоверность metrics), CHANGE-C014 (изоляция draft и late completion).
  Исправления с воспроизведением и regression.
- **Блок 2 — Codex, release/CI:** CHANGE-C005…C008, общая suspended-policy,
  V2-SEC-02, public content cleanup, затем все V2-MVP строки на одном кандидате.
  Тесты проверяют поведение; добавление ещё одного source-regex не закрывает bug.
- **Блок 3 — владелец + инфраструктура + Codex:** V2-OPS-01…14, staging только
  с synthetic fixtures; parallel ручная приёмка и legal packet выбранного города.
- **Блок 4 — Codex + reviewer:** V2-SEC-01…20, реальные isolated
  PostgreSQL/Redis/S3 replays, restore/rollback/alerts, независимый review.
- **Блок 5 — владелец + сервисы/клиенты:** после технического допуска A–D
  подтвердить согласия и выполнить V2-PILOT-01…08.
- **Блок 6:** рассмотреть POST backlog после результатов пилота.

Все кодовые исправления/тесты/документы можно подготовить автономно. Настройка
выбранной инфраструктуры требует доступа и её стоимости/провайдера от владельца;
Codex затем выполняет доступные проверки. Подписи, независимый review, выбор
юрисдикции/оператора и реальные участники не подменяются автоматизацией.

## 8.1. Поля доказательства и измеримые границы

Каждой закрываемой строке приложить: `gateId`, `status`, `environment`,
`releaseSha`, `artifactSha256`, `command`, `exitCode`, `threshold`,
`measured`, `evidenceUri`, `executedAt`, `owner`, `reviewer`,
`dependencies`. Для dev runs — также dirty/staged/untracked manifest hash.
Секретные значения не записываются. Evidence без артефакта означает [~].

- Test gate: все ожидаемые сценарии PASS, unexpected 5xx/uncaught errors = 0.
- Authorization: 100% отрицательных кейсов запрещены; private delivery после
  revoke = 0; bypass direct API/WS route = 0.
- Integrity: unintended quote acceptance, overbooking, duplicate mutations,
  negative bonus balance и противоречивый terminal status = 0.
- Pipeline: clean accepted; infected/malformed/oversized/quarantine rejected;
  expired/foreign signed access denied; storage failure оставляет retryable state.
- Pilot: 2 сервиса, 5–10 согласившихся клиентов, fixed+quote paths, минимум 5
  response/confirmation samples. Выборка мала: p95 не выдаётся за статистическое
  доказательство масштабной надёжности; расширенная выборка — post-pilot.
- Reliability: существующие defaults `check-pilot-reliability` — p95 ≤30 min,
  confirmation reliability ≥95%. До сбора данных владелец утверждает окно
  обслуживания, знаменатель, thresholds и способ исключения planned test
  cancellations; результаты нельзя подгонять изменением порога после прогона.
  `PILOT_METRICS_CSV=... PILOT_EVIDENCE_FILE=... npm run check:pilot-metrics`
  связывает anonymized actor/journey rows с aggregate evidence; evidence schema
  и reliability check должны работать вместе.
- Recovery: владелец утверждает численные RPO/RTO до drill; measured значения
  не превышают утверждённых. Пустые границы не допускаются.
- Performance: deployed measurements укладываются в versioned
  `check:performance` budgets и согласованный pilot load; in-memory synthetic
  benchmark не доказывает SQL/index/network capacity.
- Evidence актуально для release SHA/config. Изменение затронутого кода,
  миграции или инфраструктуры требует retest соответствующих gates.

## 9. Автоматический NO-GO

Пилот с реальными данными запрещён, если выполнено хотя бы одно условие:

- отсутствуют MFA/SSO для привилегированных ролей, strong secrets или HTTPS;
- приватные вложения в production хранятся в неподготовленном filesystem/public storage,
  выключен AV или не доказано cross-user denial; одобренные публичные фото сервисов
  не считаются приватными вложениями;
- Redis limiter может fail open; tenant/branch replay не пройден;
- нет encrypted offsite backup, успешного isolated restore или rollback drill;
- deletion/retention, PII redaction, audit и incident alerts не подтверждены;
- юридические/privacy тексты остаются draft для выбранной юрисдикции;
- независимый review имеет открытый P0/P1 либо release CI/build не зелёный;
- staging API/E2E не соответствует release SHA или есть открытый P0/P1 UI-баг;
- реальные участники не дали согласие либо evidence содержит PII.

## 9.1. Открытые findings финального аудита

Все строки ниже входят в 54 условия выше; их выполнение не увеличивает
знаменатель. Статус на момент аудита 05.09.2026 — **не исправлены в рамках
аудита**. Последующая порция 303 устранила локальные regression/accessibility
наблюдения в dirty working tree; строки ниже всё равно остаются подзадачами до
повторной проверки на immutable release и требуемого real/staging evidence.
Severity фиксирует риск; конкретное воспроизведение и критерий закрытия —
в `FINAL_PROJECT_AUDIT_2026-09-05.md`.

| ID | Приоритет / когда | Работа | Gate |
| --- | --- | --- | --- |
| CHANGE-C001 | P1, сразу | Отозванная/blocked/expired WS-сессия перестаёт получать private events на обеих репликах и обоих маршрутах. | V2-MVP-07, V2-SEC-03/05 |
| CHANGE-C002 | P1, сразу | Quote acceptance связан с увиденным quoteId/version; новая смета требует нового согласия. | V2-MVP-06, V2-SEC-09 |
| CHANGE-C003 | P1, сразу | Cancel deletion и admin completion сериализованы; Completed не перезаписывается Cancelled, PII reason не возвращается. | V2-SEC-14 |
| CHANGE-C004 | P1, сразу | Запись использует серверный slot.startsAt; browser timezone не меняет момент визита. | V2-MVP-05/06 |
| CHANGE-C005 | Release blocker | Dev evidence не приписывается HEAD без dirty fingerprint; release привязан к clean SHA/artifact. | V2-OPS-14 |
| CHANGE-C006 | Release blocker | Ввести обязательный promotion gate для внешних evidence/approvals; local summary с productionClaims=false остаётся только local diagnostic. | V2-OPS-14 |
| CHANGE-C007 | Release blocker | Проверить публикацию/applied status 1786310000000, forward correction при необходимости; checksum baseline всех опубликованных migrations. | V2-MVP-02, V2-SEC-08 |
| CHANGE-C008 | Release blocker | Full-stack CI запускает production Next + real API, а не Vite preview; direct routes/proxy/auth/runtime errors проверены. | V2-MVP-08/09, V2-OPS-13 |
| CHANGE-C009 | P1/P2, до приёмки | Failed logout очищает RTK/private state; late refresh не устанавливает token после logout/account switch. | V2-MVP-08, V2-SEC-12 |
| CHANGE-C010 | P2, до приёмки | Malformed date/slot/query не вызывает RangeError и белый экран. | V2-MVP-05/08 |
| CHANGE-C011 | Pilot evidence blocker | Полный anonymized evidence template проходит PII validator; ключи plateCaptured/vinCaptured/reviewPhotoCount не считаются значениями PII. Негативные PII examples по-прежнему rejected. | V2-PILOT-06 |
| CHANGE-C012 | Pilot evidence blocker | Надёжность считается из верных actor/request данных, totals согласованы с journeys; evidence+reliability thresholds проверяются вместе. | V2-PILOT-06/08 |
| CHANGE-C013 | Policy consistency, до данных | Общая suspended-provider policy; разрешённые действия по существующим визитам определены явно, запрещённые mutations и WS закрыты. | V2-MVP-07, V2-SEC-05 |
| CHANGE-C014 | P1/P2, до приёмки | Draft привязан к account/provider/location/offering; late create/upload после navigation/logout не меняет чужое состояние. Подтвердить browser regression на медленной сети и смене identity. | V2-MVP-08, V2-SEC-12 |
| CHANGE-N001 | P2, до demo content acceptance | Остаток текста о подписках, неподтверждённые контакты/маркетинговые числа и устаревшие product/design references. | V2-MVP-10 |
| CHANGE-N002 | После пилота | Рефакторинг больших компонентов, extra locale polish, более глубокие performance оптимизации без release blocker. | POST-06/08 |

## 10. Post-pilot и отдельный реестр новых задач

`POST-01` resource workspace (specialists/bays/lifts/equipment); `POST-02`
advanced realtime chat; `POST-03` PostGIS; `POST-04` native clients; `POST-05`
fleet/B2B; `POST-06` дополнительные локали; `POST-07` расширенная аналитика;
`POST-08` глубокая SEO/performance оптимизация после реального трафика.

Платежи, подписки и комиссии не являются post-pilot backlog. Их добавление
потребует отдельного продукта, ADR, legal/security review и явного решения
владельца.

Новые находки сначала сопоставляются с существующими условиями: связанные
`CHANGE-*` — подзадачи, не дополнительный знаменатель. Для работ вне критериев
действует отдельный EXT-реестр в `PILOT_TASK_ALLOCATION.md`: только необходимое
для MVP/безопасного пилота получает отдельный процент; пожелания — POST без
процентов. Срочность определяется риском и сроком допуска, а не одним P-label.

## 11. Канонические evidence-команды и документы

История реализации не удаляется. Старые ID доступны только в контексте старой
версии; источник текущих обязательных условий — этот файл. Вспомогательные
100-step checkers проверяют структуру списков, а не безопасность продукта.

- local code: `npm run check:local-mvp`, `npm run quality:backend`, `npm test -- --run`, `npm run lint`, `npm run build`;
- readiness/ops: `npm run check:mvp-readiness`, `npm run check:production-operations`;
- staging: `REQUIRE_STAGING_API=true npm run check:staging-api`;
- media/Redis/deletion: backend `check:production-media`, `check:redis-rate-limit`, `check:account-deletion-retention`;
- recovery: `BACKUP_RESTORE_RUNBOOK.md` и `BACKUP_RESTORE_EVIDENCE_TEMPLATE.md`;
- pilot: `PILOT_EVIDENCE_TEMPLATE.md` и `PILOT_EVIDENCE_FILE=... npm run check:pilot-evidence`;
- legal/security: `../product/LEGAL_PUBLICATION_CHECKLIST.md`, `../security/THREAT_MODEL.md`, `../DATA_RETENTION.md`, независимый review report;
- historical implementation log: `PILOT_100_READINESS_PLAN.md` и `PILOT_AUTONOMOUS_100_*.md` — только справочно.
