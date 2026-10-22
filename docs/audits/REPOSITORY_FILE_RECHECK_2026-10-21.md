# Повторная проверка файлов репозитория — 21 октября 2026

## Область и вывод

Проверен checkout `autocare-hub-weakness-audit`, ветка
`fix/request-chat-state-isolation-2026-10-20`, исходный кодовый срез после
`26da803` и документация после `365e087`. Все **2 585 отслеживаемых файлов**
включены в механическую проверку; это 141 109 741 байт. Файлы сборок,
`node_modules`, временные логи и другие игнорируемые артефакты не входят в
знаменатель. Другой checkout `autocare-hub` не изменялся.

**Новых подтверждённых дефектов исполняемого кода этот проход не обнаружил.**
Открытые U15/U17–U21, U01–U03 и прочие пункты [реестра](DEEP_PROJECT_AUDIT_2026-10-13.md)
остаются открытыми. Решение [пилотной проверки](PILOT_READINESS_RECHECK_2026-10-21.md)
не изменилось: **NO-GO для реальных данных**. Успех тестов и сканирования
файлов не является доказательством отсутствия других дефектов.

## Что сделано с каждым типом файла

| Область | Результат | Предел |
| --- | --- | --- |
| Весь Git inventory | Все 2 585 пути существуют; текст читается как UTF-8, NUL и merge markers не найдены | Наличие/формат не проверяют смысл каждого файла |
| Форматы | 38 JSON разобраны; 37 SVG разобраны как XML; 10 `.puml` учтены, 9 самостоятельных схем имеют start/end; 141 JS/MJS, 2 shell и 11 YAML прошли синтаксическую проверку после исправления YAML | `_style.puml` — include, ему не требуются start/end; JSONC `tsconfig` проверяют сборки |
| Изображения | Все 195 PNG/WebP имеют правильную сигнатуру и открываются macOS `sips` с размерами | Не проводилась ручная визуальная оценка каждого изображения |
| Документация | 140 исходных Markdown-файлов и этот отчёт; 412 локальных файловых ссылок, 0 отсутствующих и 0 ссылок на неотслеживаемые файлы после исправления | Anchors, внешние URL и смысл всех документов не сверены полностью |
| Frontend | 197 тестовых файлов, 647/647 PASS; ESLint, TypeScript/Vite и production Next real build PASS; 192 файла Next artifact прошли fixture leakage check | Нет нового полного real-API browser/deployed прогона |
| Backend | `quality:backend` PASS, 388 unit файлов и 1408/1408 тестов, TypeScript build и статические API/route/contract gates PASS | Интеграционные тесты с PostgreSQL+Redis заново не запускались |
| Повтор известных дефектов | 15/15 synthetic cases снова воспроизвелись: U15–U20 (кроме закрытого U14), N24–N30, N32–N33 | Использованы fake repositories/ORM metadata, не live exploitation или production DB |
| Дополнительные контракты | 120 frontend API endpoints/12 modules, 16 interaction invariants, design tokens, CI policy и 62 PlantUML source anchors PASS | Сверка anchor fingerprints не доказывает поведение runtime |
| Зависимости | Текущий `npm audit --omit=dev`: web 3 high (`next`, `sharp`, `source-map-js`), API 1 high (`sharp`) | Счётчики advisories не равны числу подтверждённых exploit paths |

Исходные машинные результаты: [inventory](evidence/2026-10-21/tracked-file-inventory.json),
[syntax](evidence/2026-10-21/script-syntax.json),
[local links](evidence/2026-10-21/markdown-links.json) и
[literal paths](evidence/2026-10-21/backtick-paths.json) и
[dependency summary](evidence/2026-10-21/dependency-summary.json),
[defect replay](evidence/2026-10-21/findings-reproduction.json). Полный backend Quality
включал migration inventory/validation, API parity/OpenAPI, media, backup,
concurrency и release contracts; запускался с изолированной тестовой
конфигурацией и не обращался к production БД.
Для replay временно использовалась копия исторического synthetic runner без
старого U14 assertion о plaintext; U14 уже исправлен. Временная копия удалена.
Для оценки обновлений нужны условия конкретных advisory:
[Next SSG/ISR](https://github.com/advisories/GHSA-mcj8-r9mp-w47p),
[sharp/librsvg](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) и
[source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

## Обнаруженные расхождения документации

| ID | Файл и факт | Исправление |
| --- | --- | --- |
| D01 | Корневой `SECURITY.md` обещал `SameSite: Strict`, тогда как `auth-cookie.ts` выдаёт `None` в production и `Lax` локально; там же Argon2 назван наряду с bcrypt, хотя runtime использует bcryptjs | Уточнены фактические cookie flags, CSRF/Origin boundary и алгоритм паролей |
| D02 | `SECURITY.md` перечислял как открытые три уже исправленные проблемы: revocation WebSocket, решение по устаревшей смете и гонку отмены удаления | Статус сверен с `service-chat.gateway.ts`, `request-quote.service.ts`, `account-deletion.service.ts` и актуальным disposition; отмечена незавершённая deployed acceptance |
| D03 | `docs/architecture/delivery-plan.yaml` не разбирался YAML-парсером из-за строки с необрамлёнными backticks на строке 28 | Строка заключена в кавычки; все 11 YAML теперь разбираются |
| D04 | `PROJECT_CONTEXT.md` ссылался на абсолютный файл отчёта вне репозитория | Вместо непереносимого адреса дана ссылка на текущий репозиторный disposition и указан внешний статус оригинала |
| D05 | Две исторические ссылки в backticks указывали на устаревшее расширение partner asset и путь cleanup без префикса `server/` | Пути приведены к существующим `.webp` и `server/src/test/...` |

Изменения касаются только документации. Существующий
[индекс документации](../INDEX.md) обновлён. Семантическая сверка всех
исторических ADR/runbook/spec и всех исходников построчно не выполнена;
непроверенная часть остаётся перечисленной в coverage JSON индекса.
Остальные семь отсутствующих backtick путей в выборке 166 ссылок обозначают
удалённые legacy файлы или ещё не созданный `pilot-evidence.json`, поэтому
не исправлялись как broken current source references.

## Что блокирует полноценное «всё проверено»

- Нет локальной конфигурации PostgreSQL+Redis для нового полного integration
  прогона; Docker daemon также недоступен. Ранее U14 проверялся на собственной
  disposable PostgreSQL16, но этот результат не расширяется на все сценарии.
- `check:mvp-readiness` и `check:production-operations` возвращают blocked из-за
  отсутствующих локальных production/staging настроек и внешних репетиций.
  `check:pilot-evidence` не находит анонимизированный реальный pilot evidence;
  `check:migration-checksum` требует опубликованный migration manifest.
- Не проводились заново 240-route браузерная матрица, реальные устройства,
  screen reader, zoom 200%, нагрузка и independent pentest. Предыдущая матрица
  и её границы находятся в [UI/security recheck](UI_SECURITY_RECHECK_2026-10-20.md).
- Не проверены полностью все внешние ссылки и семантика исторической
  документации; это видно в [coverage JSON](evidence/2026-10-20/docs-coverage.json).

Следующий полезный шаг для запуска — устранить открытые code blockers из
[порядка пилотных работ](PILOT_READINESS_RECHECK_2026-10-21.md), затем
провести exact-candidate CI и staging/real-API приёмку. Повторный механический
проход по неизменённым файлам сам по себе не закрывает ни один из 54 gates.
