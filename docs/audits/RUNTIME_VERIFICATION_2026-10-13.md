# Продолжение аудита: PostgreSQL, Redis, recovery и live API — 13 октября 2026

## Итог

Ограничение доступа к Docker первого прохода снято. Выполнены проверки на
собственных disposable PostgreSQL/Redis и production Next с работающим API.
**10 ранее найденных проблем подтверждены реальной persistence**, добавлен
**U21/P1 — актуальные dependency advisories и необходимость обновления**.
Всего за 13 октября: **22 находки — 7 P1, 12 P2, 3 P3**. Исправления не выполнялись.

Source baseline `8840ae830a641626bcd1d1735d3324bb6f923a77` подтверждён через
GitHub compare: удалённый `dev` идентичен этому commit. Удалённый `main` имеет
merge-base `6d1e6b6843e13b2e0315934fb3b29a3429866130`; сравнение ancestry само по
себе не утверждает tree equality или публикацию текущих дополнений.

Реестр: [FULL_PROJECT_AUDIT_2026-10-03.md](FULL_PROJECT_AUDIT_2026-10-03.md).
Первый углублённый проход: [DEEP_PROJECT_AUDIT_2026-10-13.md](DEEP_PROJECT_AUDIT_2026-10-13.md).
Новые результаты ниже заменяют прежние ограничения «DB integration/load/restore
не выполнены» **в пределах указанных синтетических локальных проверок**.
54 pilot gates и NO-GO сохраняются.

## Окружение и приёмка

Существующие developer PostgreSQL/Redis и чужие контейнеры не использовались.
Созданы отдельные `autocare-audit-20261013-pg` / `autocare-audit-20261013-redis`
из уже локально имеющихся `postgres:17-alpine` / `redis:7-alpine`:
PostgreSQL loopback **29442**, Redis **29389**. PostgreSQL data — tmpfs;
контейнеры disposable с `--rm`. Три отдельные synthetic databases:
integration, live API и restore; Redis DB15/14/13 разделяют сценарии.
Mail только logger; KMS — development/test keyring, production KMS не подменялся.

| Проверка | Фактический результат |
| --- | --- |
| Fresh schema | **139 migrations PASS**; повторный запуск — no pending migrations |
| Synthetic demo/catalog seed | PASS |
| Backend integration | **23 файла / 88 PASS, 0 skip**, включая PostgreSQL admin concurrency |
| Integrity | PASS, **30 pending constraints VALIDATE** |
| Двухпроцессный PostgreSQL smoke | 1 commit + 1 conflict, final committed |
| Двухпроцессный Redis smoke | Fail-closed, 1 allowed + 1 denied |
| Реальные defect reproductions | **10/10 подтвердили дефекты**, список ниже |
| Encrypted backup / isolated restore | Checksum PASS; **76 таблиц / 3742 строки** с одинаковыми counts/content digests; encrypted name дешифруется retained local key |
| Next production real build | PASS; отдельный `.next-real-e2e`, upstream — собственный API 4196 |
| Real artifact fixture leakage | PASS, 192 файла |
| HTTP nonce/CSP | **5 PASS** |
| HTTP SEO и initial JavaScript | **17/17 + 17/17 PASS**; настоящие seeded provider UUIDs |
| Full existing real E2E | **29/29 PASS**, Desktop Chromium, retries=0, 1.6m |
| HTTP discovery sample | 80 запросов, concurrency=8, 0 failures; p95=118.8 ms / p99=158 ms |
| Fresh npm audit, весь dependency graph | Frontend **5 записей: 2 critical + 3 high**; API **2 high**; U21 |
| GitHub evidence на source commit | PR Quality run **37226572467: action_required**, jobs=[]; combined statuses=[] |

Финальная проверка `node --version`: **24.13.1**; version каждого child process
отдельно не записывался. PostgreSQL — **17**, а hosted workflow использует
Node 22 / PostgreSQL 16. Это локальная проверка другого runtime matrix;
она не объявлена exact hosted CI reproduction. `GITHUB_ACTIONS=true` передан
только integration harness для его явно guarded disposable admin fixture;
GitHub Actions фактически не запускался этой настройкой.

HTTP benchmark включает cache, seeded каталог и loopback, не моделирует
production traffic, slow clients, geo latency или масштаб supply. Результат
не является capacity/SLO evidence для deployed приложения.

## Подтверждённые ошибки на PostgreSQL

Все SQL reads/writes выполнены настоящими repositories. Для N24 барьер только
задерживает завершённые database reads, не подменяет их результат или persistence.
Для U20 воспроизведён точный порядок read → concurrent state update → stale save,
а не случайный HTTP race. Worker N25 временно изолирован от остальных synthetic
active providers; их исходные статусы восстановлены.

| ID | Сохранённое/прочитанное ошибочное состояние |
| --- | --- |
| U14 | Raw JSONB после настоящего enqueue содержит открытые email/name |
| U15 | Сообщение superadmin сохранено в чужой private service request |
| U16 | Review approved, но связанная encrypted evidence осталась pending |
| U18 | Неистёкшие 100 баллов стали 0 после повторного expiration потраченного earn |
| U19 | 4 одинаковых unresolved safety cases одной AwaitingReply заявки сохранены; fixture trust 45.5 → 0, moderation penalty 40 |
| U20 | Preference save вернул active, прежний hash и tokenVersion=1 после blocked/new hash/version=2 |
| N24 | Две parallel revision операции обе успешны при одном allowance |
| N25 | Три worker passes с limit=1 не обработали provider с null reassessment |
| N23 | 102 заявки → 516 queries; 1002 заявки → 5016 queries |
| N21 | При 1000 последних approved reviews общий pending counter показал **0**, DB содержит **3** pending |

U17 production token delivery, N26 bcrypt boundary, N27 scanner blind spot,
N28 denied storage и N29 TTL остаются подтверждёнными изолированными сценариями
первого прохода. Они не объявлены проверенными production/real-browser flows.
N33/N34 не исправлены; existing E2E не включает их специфические контрпримеры.

### Измеренная история заявок: N23

| Операция | История | SQL queries | Время одного запуска |
| --- | --- | --- | --- |
| Owner request list | 102 | 516 | 108 ms |
| Owner request list | 1002 | 5016 | 845 ms |
| Provider analytics | 102 | 11 | 12 ms |
| Provider analytics | 1002 | 11 | 26 ms |

Число запросов списка линейно растёт, pagination отсутствует. Аналитика имеет
стабильное число запросов, но читает растущий объём rows в процесс.
Heap deltas зависят от GC и могут быть отрицательными; по одному запуску
**утечка памяти и production memory budget не установлены**.

## U21 · P1 · Обновить зависимости по свежим advisories и повторить release gates

**Подтверждение.** Повторный полный `npm audit --json` из официального npm registry
показал 5 frontend и 2 API package entries. Lockfiles не изменялись. Это новые
данные, а не повтор удалённого vulnerable generator из N16: relevant advisories
попали в GitHub database/получили обновления 5–7 октября, после старого PASS.
Исторический N16 result остаётся датированным свидетельством.

| Package / graph | Locked version | Advisory / severity |
| --- | --- | --- |
| shell-quote, frontend tooling via concurrently | 1.9.0 | Critical command injection; patched 1.11.0 |
| concurrently, frontend direct dev dependency | 9.2.4 | Critical transitive entry через shell-quote; не отдельная вторая exploit mechanism |
| next, frontend production dependency | 16.3.6 | Audit entry high; несколько advisory mechanisms, в том числе cache poisoning и image optimization SSRF |
| sharp, frontend/API production dependency | 0.35.4 | High advisory в librsvg; patched 0.35.5 |
| source-map-js, frontend/API transitive dependency | 1.2.1 | High event-loop DoS; patched 1.2.2 |

Frontend/API counts частично повторяют sharp/source-map-js; нельзя складывать
их как семь независимых эксплуатируемых ошибок приложения.

**Применимость.** Critical shell-quote advisory требует untrusted string с line
terminator после comment token; такой production entrypoint в приложении не
установлен. Это tooling dependency, не доказанный публичный RCE.
[Maintainer advisory shell-quote](https://github.com/advisories/GHSA-pqg4-j6r4-53mv).

Next image SSRF advisory прямо исключает приложения без images.remotePatterns.
В текущем `next.config.ts` remotePatterns отсутствует, поэтому **именно этот
механизм не установлен для этой конфигурации**. Остальные Next advisories и
необходимость обновления оцениваются отдельно.
[Next advisory](https://github.com/advisories/GHSA-cjq9-62q9-8jv4).

Sharp advisory зависит от librsvg/SVG decoding и Linux runtime conditions.
Upload magic/type guards снижают доступность SVG path; macOS прогон не проверяет
уязвимый Linux runtime. RCE через AutoCare не воспроизводился.
[Sharp maintainer advisory](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).

Source-map-js DoS требует обработки malicious indexed source map. Путь от
публичного запроса пользователя к такому parsing в приложении не установлен.
[Source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

**Последствия.** Текущий dependency graph имеет unresolved high/critical audit
entries и не удовлетворяет зарегистрированной CI policy `npm audit
--audit-level=high`. Это вывод по свежему audit graph и workflow policy;
новый hosted run с этой проверкой в этой порции не выполнялся.

**Исправление.** Отдельная implementation порция: совместимые patched versions,
обновлённые lockfiles, полный audit обоих графов, Next/API builds, fixtures/media,
unit/integration и real E2E. Не применять автоматический force upgrade.

**Приёмка.** High/critical entries устранены либо применимость/компенсирующая
политика официально приняты владельцем; deployment dependency gate проверен
на точном candidate. Unit PASS не закрывает security advisory. Статус: открыто.

## Evidence и повторение

- [postgres-results.json](evidence/2026-10-13/postgres-results.json): 10 defects и scale samples.
- [reproduce-postgres.mjs](evidence/2026-10-13/reproduce-postgres.mjs): реальные persistence cases.
- [backup-results.json](evidence/2026-10-13/backup-results.json): restore comparison/decryption.
- [runtime-verification.json](evidence/2026-10-13/runtime-verification.json): результаты и scope.
- [npm-web-advisories.json](evidence/2026-10-13/npm-web-advisories.json),
  [npm-api-advisories.json](evidence/2026-10-13/npm-api-advisories.json): свежие audit responses.
- [github-verification.json](evidence/2026-10-13/github-verification.json): remote compare и доступные CI ответы.
- [followup-runner.mjs](evidence/2026-10-13/followup-runner.mjs): фиксированные локальные фазы; не принимает arbitrary commands/targets.

Runner ожидает подготовленные private synthetic env files в `/private/tmp`
и именно отдельные loopback audit targets. Это manual harness, не стандартный
CI command. Его defect assertions проверяют ошибочное поведение и после
исправлений должны измениться/быть заменены desired-behavior regressions.
Ключи и encrypted backup находятся вне repository; JSON evidence не содержит
raw passwords, JWT или key material. Run logs — synthetic environment.

## Что по-прежнему не установлено

Production KMS/MFA, external backup scheduling/off-site/PITR, deployed proxy/TLS,
malware/storage acceptance, реальный production load и восстановление с внешним
KMS не проверены. Локальный recovery не закрывает эти условия.

Доступный GitHub wrapper возвращает только первый page PR-triggered runs;
`action_required` и jobs=[] не означают «код провалил тесты», а пустые statuses
не означают PASS. Push checks и точный reason action_required этим ответом не
подтверждены. Remote admission/protection не обходились.

Native devices, screen readers, deployed Lighthouse/CWV и exhaustive state-space
coverage отсутствуют. Полный доступ позволяет продолжать доступные проверки,
но не создаёт production evidence или физические устройства.
