# Автономные исправления и UI/UX-приёмка — 04.10.2026

Разрешение: выполнить доступные без новых решений владельца исправления и все
локальные UI/UX-проверки. Основной агент работает напрямую; отдельные коммиты,
один общий push и protected dev→main PR. Отложенные D01/D02/D09/D10/D11/D18/D19/
D22/D37/D43 сохраняются. Новые эстетические варианты не подменяют выбор владельца.

## Срочные

| ID | Приоритет | Находка | Статус / приёмка |
| --- | --- | --- | --- |
| U08 | P2 | Mock-граф и synthetic contacts присутствуют в production Next; старый guard сканирует только Vite | Исправлено: real Next 192 / Vite 91 files чисты, 8 guard tests PASS; оба CI artifacts проверяются |
| UX14 | P2 | На 360px workspace mobile header обрезает уведомления и account menu; overflow скрыт, root-width guard не ловит | Исправлено: client/admin workspace и signed-in public toolbar доступны на 360px; bounds/hit-test/menu/theme/notifications regressions PASS в обеих темах |
| U01 | P1 | Production KMS adapter отсутствует | Открыто: требуется выбор инфраструктуры |
| U02 | P1 | Ciphertext не привязан к record/owner scope | Открыто: зависит от U01 и versioned rollout |
| U03 | P1 | Mandatory privileged MFA/step-up | Открыто: требуется MFA/recovery policy |

## Несрочные

| ID | Приоритет | Находка | Статус / приёмка |
| --- | --- | --- | --- |
| UX01 | P2 | Mobile Security Center keyboard scenario иногда не открывает drawer с первой попытки | Исправлено: cold placeholder не считается событием; actionable row + focus assert, delayed-query Enter/Space regression; 6/6 browser PASS с первой попытки. Исходный CI trace не опубликован; воспроизведён тот же механизм hidden drawer, точная историческая причина не заявляется |
| UX02 | P2 | Mobile event drawer не объявлен modal dialog и не управляет focus/Escape/return focus | Исправлено: dialog/complementary roles, initial focus, Tab/Shift+Tab, Escape, inert и return focus; открытый dialog axe PASS |
| UX03 | P2 | Auth recovery/verification и own reviews без main; auth controls/provider hero вне landmarks | Исправлено: main в каждом recovery/verification/reviews state; auth theme/nav/hero и provider hero именованы; matrix PASS |
| UX04 | P2 | Tablet public sign-in link теряет доступное имя при скрытом span | Исправлено: aria-label сохраняет имя при скрытом tablet span; matrix PASS |
| UX05 | P2 | Контраст: dark feature stats 2.12:1; provider rating поверх фото 3.81:1; destructive text 4.13–4.30:1; chat timestamp 4.07:1 | Исправлено: destructive token, feature statistics, rating поверх фото и timestamp opacity; full axe PASS |
| UX06 | P2 | Заголовок столбца действий vehicles пуст для screen readers | Исправлено: sr-only Actions header, relative containment сохраняет table scroll без page overflow; matrix PASS |
| UX07 | P2 | Workspace landmarks с одинаковыми именами на booking/chat routes | Исправлено: named complementary sidebar различим на booking/chat routes; matrix PASS |
| UX08 | P2 | Selected appointment-layout test предполагает свободные slots сегодня, падает вечером/в выходные | Исправлено: future working date, все три viewport profiles PASS; production availability не менялась |
| UX09 | P2 | Guest real favorites сохраняют UUID, но страница умеет отображать только remote client favorites или mock fixtures | Исправлено: guest UUID → public profile; demo IDs отбрасываются; real display/remove и unavailable-profile removal PASS |
| UX10 | P2 | Mobile Security Center drawer с z=1100 остаётся внутри main z=0: шапка/нижнее меню перекрывают верх/низ modal | Исправлено: mobile portal, корректный div dialog role, edge-hit/axe/return-focus regression; native screenshot подтвердил слой над chrome |
| UX11 | P3 | Несколько inline controls имеют высоту 16px: map/clear, следующие дни, change vehicle, garage edit/delete, fleet add | Рекомендация увеличить touch area до 44px; размеры сами по себе не доказывают WCAG 2.5.8 failure (spacing/native exceptions). D11/D19 остаются отложенными; новый layout не применяется |
| UX12 | P2 | Несколько BrandLogo SVG используют один aria-labelledby/title id, давая duplicate-id-aria | Исправлено: useId, уникальные title references, 0 duplicate referenced IDs на всех 200 cases |
| UX13 | P3 | Именованные div badges/provider selector без role теряют aria-label | Исправлено: role=group на results list и analytics provider chooser; aria-prohibited-attr incomplete устранён |
| UX15 | P2 | Авторизованный onboarding: progress div использует запрещённый aria-label без роли; гостевой маршрут проверял только redirect на login | Исправлено локально после PR #14: named group; 8/8 client/owner onboarding в full axe, production build, 635 unit, strict types/full lint PASS. Дополнительный push не выполняется в рамках ограничения одного push |
| QA02 | P3 | Audit не подтверждает фактические auth role/locale/theme; сохранённый locale аккаунта может подменить язык профиля, обычный admin не включён | В работе локально: actual login role, выбор языка через UI для каждого route, expected guest redirect, отдельные admin/superadmin и client/owner onboarding |
| DOC01 | P3 | План/контекст сохраняют устаревшие ожидания публикации N11 и выбранного дизайна | Исправлено: PROJECT_PLAN/CONTEXT/FULL audit сверены с merged PR #12/#13 и actual Quality evidence |
| N09 | P2 | Production encryption backfill adapter/scale/restore | Engine готов; deployment зависит от U01/U02 |

## Область UI/UX-проверок

Production Next mock и real artifacts; public/client/provider/admin/super-admin;
mobile/tablet/desktop, RU/EN и supported locale/RTL smoke; обе темы;
keyboard/focus/Escape, accessibility tree/axe, responsive overflow, forms;
loading/empty/error/stale/offline/denied, selected interactions, media, CSP,
initial-route JS/SEO, Vite PWA compatibility. Mock screenshots и browser fixtures
являются synthetic evidence, не приёмкой deployed production.

Фактические результаты и ограничения добавляются по мере выполнения.

## Завершённые проверки закрытых экранов

`UI_UX_BASE_URL=http://127.0.0.1:5197 UI_UX_OUTPUT=output/playwright/ui-ux-final-accepted node scripts/audit-ui-ux.mjs`: **200/200**, 0 failing cases, 100 full-page screenshots. 50 route/role cases × mobile RU dark 360, tablet EN light 768, desktop EN light 1440 и desktop RU dark 1440. Axe без отключения правил, один main/h1, overflow, JS exceptions, translations, broken images, reduced-motion infinite animations.

Начальный полный прогон нашёл 76 проблемных сочетаний; повторные прогоны проверяли каждую коррекцию. Расширенный guard поймал 3 clipped signed-in public menu cases после исправления workspace. Финальная матрица: 0 overflow, 0 clipped header controls, 0 duplicate ARIA references, 0 missing media/keys/JS exceptions и 0 infinite reduced-motion animations. Проверка открытого dialog отдельно: найден invalid dialog role на aside; контейнер заменён на div с dialog/complementary semantics. Native RU screenshot дополнительно подтвердил layering; геометрические checks EN без axe этот дефект не ловили. Не заявляется, что автоматическая проверка закрытых routes проверила все overlays.

Адаптивность: **30/30**, ширины 360, 390, 414, 540, 682, 768, 790, 1024, 1280, 1440. Unit **196 files / 635 tests PASS**, full ESLint и strict TypeScript PASS; design tokens **15 semantic roles / 26 foundation tokens**, interaction contract **16 invariants PASS**. Vite PWA compatibility **12/12**, splitting и raw/gzip budgets PASS. SEO HTTP **17 metadata + 17 initial JS PASS**; CSP HTTP **5 samples PASS**.

Real API: **29/29** с production Next artifact и отдельными synthetic PostgreSQL 17 / Redis 7, включая guest UUID favorites и удаление недоступного профиля; включая parser-inserted CSP: финальный полный real suite **29/29** без retries. U08 Next **192** / Vite **91** files чисты, guard tests **8/8**. Backend development test process не выдаётся за production KMS deployment.

Полный первый browser run: 188 PASS / 4 FAIL без retries; три ошибки времени записи и mobile-menu readiness разобраны, focused replay **24/24**. Финальный полный mock replay **192/192** без retries (13.8m); после последних SVG/toolbar изменений целевая приёмка **18/18** без retries. Текущий полный suite содержит **204** cases, его exact-candidate hosted результат фиксируется в PR/Actions. Открытый dialog отдельно прошёл axe; toolbar проверен bounds и hit-test в обеих темах.

Ограничения: Chromium + native in-app-browser, synthetic local data. Axe incomplete (например contrast поверх изображений) сохраняется в JSON для ручной оценки; 0 violations не означает сертификат полной WCAG-приёмки. Native iOS/Android, полноценный screen-reader walkthrough и deployed LCP/INP/CLS/Lighthouse остаются внешними проверками. Отложенные 10 дизайнов, U01/U02/U03, N09 rollout и 54-gate pilot NO-GO сохраняются.

## Ручная оценка и границы автоматизации

Скриншоты проверены для критических public, auth, vehicle, owner provider, chat и admin modal поверхностей. Native in-app browser подтвердил ARIA/focus, layer и исправленный compact header; test fixtures синтетические. Contrast incomplete преимущественно связан с SVG/images/градиентами: автоматический результат не подменяет инструментальный screen-reader/device audit. Closed-popup aria-controls incomplete относится к ещё не смонтированным popup IDs; open-state menu/listbox/dialog interaction checks проходят. Empty fleet table относится к отсутствию бронирований в fixture, а не потерянным data cells.

UX11 — рекомендация 44px touch area, с учётом spacing/native исключений. Отложенные D11/D19 не реализованы. UX14 устраняет недоступные controls при сохранении существующей toolbar композиции; proposal D01/D02 не применяется. Новых продуктовых функций и публичных контактных каналов не добавлено.

## Публикация и сохранность

14 runtime/test findings закрыты отдельными коммитами; воспроизводимый audit и DOC01 записаны отдельно. Один atomic push feature/dev; main — protected dev→main PR с обоими exact-candidate Quality events. Фактические source/main SHA, workflow IDs и status фиксируются в PR/Actions и `publication.json` локального отчёта.

Primary checkout не использовался для edits: исходные три integrity-файла и их SHA-256 сохранены (3/3). QA использует только собственные ephemeral synthetic PostgreSQL/Redis; постоянные базы владельца не менялись.
