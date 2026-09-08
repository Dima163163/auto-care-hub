# AutoCare Hub — post-pilot backlog: локальное evidence

Дата: 08.09.2026.

Этот документ фиксирует только автономно выполненную кодовую часть post-pilot
backlog. Он не добавляет обязательные условия, не меняет знаменатель и не
увеличивает readiness `PILOT_AUTONOMOUS_200`.

## Результат

| ID | Локально сделано | Внешний остаток |
| --- | --- | --- |
| POST-01 | Resource workspace уже имел API, storage, reservations и panel. Панель теперь открывается явной кнопкой для выбранной точки из owner requests; сохранены compact calendar и branch scope. | Реальные branch records, staging permission replay и product acceptance. |
| POST-02 | WebSocket reconnect/dedupe/access re-check уже существовали; добавлен lifecycle presence `connected`/`disconnected`, и UI больше не показывает постоянный online при разрыве. | Реальные multi-replica Redis/WS replay, typing/presence semantics участников и production traffic. |
| POST-03 | Portable discovery benchmark и PostGIS-vs-native benchmark уже есть. Synthetic baseline прошёл: 10 000 записей p95 2.7 ms, 100 000 записей p95 17.5 ms. | PostGIS extension, GiST index и staging load evidence. Локальный geospatial run корректно `skipped`, потому что PostGIS не установлен. |
| POST-04 | Автономная подготовка не создаёт native clients без выбранного scope. | App-store accounts, devices, native implementation and acceptance. |
| POST-05 | Fleet/B2B API families и типы уже инвентаризированы; новый B2B scope не включался автоматически. | Partner decisions, contracts, roles and real multi-owner acceptance. |
| POST-06 | Existing locale contracts and launch coverage checked; новые языки не добавлялись без language/acceptance decision. | Language selection, translation ownership and native-speaker acceptance. |
| POST-07 | Provider-safe analytics, consent/retention fields, CSV export and branch-scoped API are covered locally. | Real analytics traffic, consent evidence, retention approval and production metrics storage. |
| POST-08 | Performance, bundle-splitting, SEO, metadata, image and locale repository checks pass. | Production Lighthouse, deployed rendered HTML and measurements under real traffic. |

## Evidence commands

- `npm run check:capacity-ui` — PASS.
- Optional frontend suite: **4 files / 9 tests PASS**.
- Optional backend capacity/realtime suite: **2 files / 13 tests PASS**.
- Optional backend capacity/analytics/chat suite: **4 files / 19 tests PASS**.
- `npm run check:performance` — PASS: JS 2742.2 kB raw / 799.8 kB gzip.
- `npm run check:bundle-splitting` — PASS: 11 required chunks.
- `npm run check:seo` — repository checks PASS; production Lighthouse and rendered HTML remain manual.
- `npm run lint` — PASS.
- `npm run build` — PASS.
- `git diff --check` — PASS.

## Scope boundary

Current mandatory readiness remains calculated only by the existing 200-point
local audit and its external gates. This file is an evidence register for
optional work, not a second percentage counter and not a production approval.
