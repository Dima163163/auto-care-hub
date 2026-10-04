# Автономные исправления и UI/UX-приёмка — 04.10.2026

Разрешение: выполнить доступные без новых решений владельца исправления и все
локальные UI/UX-проверки. Основной агент работает напрямую; отдельные коммиты,
один общий push и protected dev→main PR. Отложенные D01/D02/D09/D10/D11/D18/D19/
D22/D37/D43 сохраняются. Новые эстетические варианты не подменяют выбор владельца.

## Срочные

| ID | Приоритет | Находка | Статус / приёмка |
| --- | --- | --- | --- |
| U08 | P2 | Mock-граф и synthetic contacts присутствуют в production Next; старый guard сканирует только Vite | Исправлено локально: real Next 192 / Vite 91 assets чисты, 8 guard tests PASS; CI добавлен |
| U01 | P1 | Production KMS adapter отсутствует | Открыто: требуется выбор инфраструктуры |
| U02 | P1 | Ciphertext не привязан к record/owner scope | Открыто: зависит от U01 и versioned rollout |
| U03 | P1 | Mandatory privileged MFA/step-up | Открыто: требуется MFA/recovery policy |

## Несрочные

| ID | Приоритет | Находка | Статус / приёмка |
| --- | --- | --- | --- |
| UX01 | P2 | Mobile Security Center keyboard scenario иногда не открывает drawer с первой попытки | Исправлено: cold placeholder не считается событием; actionable row + focus assert, delayed-query Enter/Space regression; 6/6 browser PASS с первой попытки. Исходный CI trace не опубликован; воспроизведён тот же механизм hidden drawer, точная историческая причина не заявляется |
| DOC01 | P3 | План/контекст сохраняют устаревшие ожидания публикации N11 и выбранного дизайна | Актуализировать по merged PR #12/#13 |
| N09 | P2 | Production encryption backfill adapter/scale/restore | Engine готов; deployment зависит от U01/U02 |

## Область UI/UX-проверок

Production Next mock и real artifacts; public/client/provider/admin/super-admin;
mobile/tablet/desktop, RU/EN и supported locale/RTL smoke; обе темы;
keyboard/focus/Escape, accessibility tree/axe, responsive overflow, forms;
loading/empty/error/stale/offline/denied, selected interactions, media, CSP,
initial-route JS/SEO, Vite PWA compatibility. Mock screenshots и browser fixtures
являются synthetic evidence, не приёмкой deployed production.

Фактические результаты и ограничения добавляются по мере выполнения.
