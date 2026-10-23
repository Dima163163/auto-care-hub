# Повторный аудит интерфейса, дизайна и безопасности — 20 октября 2026

## Статус ранее известного U14 — 21 октября 2026

Raw outbox INSERT теперь использует шифрующий transformer; migration 178642
обрабатывает legacy plaintext recipients. На собственной disposable
PostgreSQL проверены raw JSONB, backfill, idempotency и blind-index lookup
для account deletion. **Локально исправлено; production backfill и deployed
приёмка остаются открытыми.** Исторические воспроизведения ниже сохранены.

## Последующее исправление UX16

`ConfirmDialog` ограничен высотой окна, имеет внутреннюю прокрутку и overlay
выше мобильной навигации. На сверхузком экране действия переносятся и текст
кнопок переносится внутри них. Production Next mock browser подтвердил
достижимость обеих кнопок и hit-test на 320×568, 360×568, 390×844,
568×320 и стрессовом 180×284; axe 0, Escape и возврат фокуса PASS.
Targeted unit 26/26. [Геометрия](evidence/2026-10-20/report-dialog-fix-verification.json),
[скриншот](evidence/2026-10-20/report-dialog-fixed-360x568.png).
**Статус: локально исправлено, без real-device/zoom/deployed приёмки.**

## Последующее исправление UX18

В `fix/request-chat-state-isolation-2026-10-20` таблица, карточка и карта
согласованно форматируют цену; `bookingMode=request`/`quote_required` не
показывают время как подтверждённое. Текст гарантии сохраняется. Добавлен
достижимый горизонтальный scroll таблицы на 360px. Unit RU/EN 9/9 и
production Next mock browser подтвердили Prime Wheels и мобильную геометрию.
[Доказательство](evidence/2026-10-20/comparison-fix-verification.json).
**Статус: локально исправлено, без публикации и real-API приёмки.**

## Последующее исправление UX17

В `fix/request-chat-state-isolation-2026-10-20` форма читает сохранённое время,
сохраняет абсолютную дату сервиса и блокирует отправку, если выбранный слот
исчез. URL date/time имеют приоритет. Unit 12/12; production Next mock browser
подтвердил 20:00→20:00 после reload. [Доказательство](evidence/2026-10-20/request-time-fix-verification.json).
**Статус: локально исправлено, без публикации и real-API приёмки.** Старые
черновики без абсолютной даты не позволяют узнать день до сохранения.

## Последующее исправление U22

В `fix/request-chat-state-isolation-2026-10-20` компонент переписки получает
новое внутреннее состояние при изменении `userId + requestId`. Unit regression
проверяет смену A→B→A, failed send с тем же текстом и другим retry key,
смену пользователя и поздний ответ A. Production Next mock browser подтвердил:
в B пустой composer; новый текст отправлен в `/owner-request-2/messages`;
при возврате A composer пуст. [Схема состояния](../diagrams/03-frontend.puml)
и SVG обновлены. **Статус: локально исправлено, без публикации и real-API
приёмки.** UX16–UX18 остаются открытыми. Ниже сохранён снимок исходного аудита.

## Результат

Добавлены **4 новые подтверждённые находки: 1 P1 и 3 P2**.
U22 относится одновременно к интерфейсу и конфиденциальности переписки.
Повторно подтверждены U14, U15, U20 и уязвимые зависимости U21;
они не посчитаны новыми. Все четыре новые находки открыты.

Срез: `dev` / `8840ae830a641626bcd1d1735d3324bb6f923a77`.
`git ls-remote` 20 октября подтвердил тот же remote dev и main `6d1e6b6`.
Ветка проверки: `audit/ui-security-recheck-2026-10-20`.
Production-код, токены дизайна и зависимости не изменялись.
Рабочий реестр: [FULL_PROJECT_AUDIT_2026-10-03.md](FULL_PROJECT_AUDIT_2026-10-03.md).

| ID | Приоритет | Подтверждённая проблема | Доказательство |
| --- | --- | --- | --- |
| U22 | P1 | Черновик переносится в заявку другого сервиса и отправляется ему | Production Next frontend + Chromium/MSW; сохранён исходящий POST |
| UX16 | P2 | Диалог жалобы обрезан на коротком мобильном экране, кнопки недоступны | Геометрия 360×568 и screenshot |
| UX17 | P2 | Восстановление записи игнорирует сохранённое время | В storage 20:00, после reload выбрано 11:30 |
| UX18 | P2 | Сравнение теряет смысл цены и подтверждения времени | Карточка «Quote required», таблица «RUB 1,700 / Today, 11:30» |

## U22 · P1 · Черновик уходит другому получателю при смене заявки

**Где:** [ServiceRequestChat.tsx:64](../../src/entities/automotive-service/ui/ServiceRequestChat.tsx#L64),
`:139`, `:159`, [ChatsPage.tsx:184](../../src/pages/chats/ui/ChatsPage.tsx#L184).
Для request-backed переписок компонент получает новый `requestId` без нового
React key. `message` и `pendingMessage` остаются от прежней заявки; submit
использует уже новый `requestId`. Generic chat, напротив, имеет ключ из chat/user.

**Воспроизведение:** synthetic client открывает ProService / `owner-request-1`,
вводит `SYNTHETIC SECRET FOR PROSERVICE ONLY`, выбирает заявку АвтоЛюкс /
`owner-request-2`. Текст остаётся в composer. Нажатие Send создаёт POST
`/api/v1/service-requests/owner-request-2/messages` с этим текстом.

**Последствия:** сведения о машине, VIN, контакты или обсуждение одного сервиса
могут быть отправлены другому. Серверный IDOR не показан: клиент имеет доступ
к обеим заявкам; ошибка находится в изоляции интерфейсного состояния.

**Приёмка исправления:** изолировать состояние по user/request; при смене
сбрасывать или адресно восстанавливать текст, pending key, offer, cursor,
preview и открытые действия. Проверить A→B→A, медленный ответ B, failed send,
одинаковый текст в двух заявках и смену identity. Отправка в B не должна
использовать черновик/idempotency key A. Отдельно проверить provider workspace.

[JSON](evidence/2026-10-20/interaction-probe.json),
[браузерный сценарий](evidence/2026-10-20/interaction-probe.mjs),
[скриншот после отправки](evidence/2026-10-20/cross-chat-draft.png).

## UX16 · P2 · Кнопки жалобы уходят за экран и под нижнюю навигацию

**Где:** [ConfirmDialog.tsx:109](../../src/shared/ui/confirm-dialog/ConfirmDialog.tsx#L109).
Контейнер центрирует содержимое через fixed/inset/flex; у содержимого нет
ограничения высоты и собственного вертикального scroll. Это отдельный
ConfirmDialog, а не исправленный ранее drawer Security Center.

**Воспроизведение:** открыть входящее сообщение в inquiry ProService,
Message actions → Report this message → Threat; viewport 360×568.
Высота dialog 688 px, top −60, bottom 628. Кнопки занимают y=567…603,
при высоте окна 568; нижняя фиксированная навигация дополнительно перекрывает
низ. Заголовок также обрезан. Полный axe в этом открытом состоянии: 0 violations.

**Последствия:** жалобу трудно отправить или отменить касанием; проблема
особенно вероятна на небольшом экране, при увеличенном тексте или клавиатуре.
Последние два условия здесь являются риском по геометрии, не проверкой
реального устройства или browser zoom.

**Приёмка исправления:** содержание длиннее окна прокручивается, действия
достижимы поверх навигации; Escape/возврат фокуса/Tab сохраняются.
Проверить 320×568, 360×568, 390×844, landscape, длинное сообщение, RU/EN и 200%.

[Геометрия](evidence/2026-10-20/interaction-probe.json),
[скриншот](evidence/2026-10-20/report-dialog-360x568.png).

## UX17 · P2 · После reload запись незаметно меняет время

**Где:** [RequestForm.tsx:67](../../src/pages/autocare-request/ui/RequestForm.tsx#L67),
`:70`, `:78`, `:85`; [request-draft.ts](../../src/pages/autocare-request/ui/request-draft.ts).
Draft содержит selectedTime, но useState читает только query `time`, затем
выбирается первый доступный слот. Сохранённое `initialDraft.selectedTime`
не используется.

**Воспроизведение:** выбрать 20:00 в форме ProService без query `time`, дождаться
сохранения storage, перезагрузить страницу. JSON draft содержит 20:00, но UI
выделяет 11:30 и показывает это время в summary. В проверке форма не отправлялась.

**Последствия:** клиент может подтвердить непреднамеренно изменённое время.
Это отличается от исторического A19 о смене даты кнопкой показа слотов.

**Приёмка исправления:** приоритет URL/draft/default определён явно; доступное
сохранённое время восстанавливается; недоступное время требует понятного
повторного выбора. Покрыть reload, back/forward, другой день/timezone и
исчезнувший слот. Не сохранять чувствительные контакты ради этого исправления.

[Storage и выбранное время](evidence/2026-10-20/interaction-probe.json),
[скриншот](evidence/2026-10-20/booking-time-restored.png).

## UX18 · P2 · Таблица сравнения подменяет условия предложения

**Где:** [ComparisonTable.tsx:14](../../src/pages/autocare-results/ui/ComparisonTable.tsx#L14),
`:17`, `:18`; [autocareApiMappers.ts:27](../../src/entities/automotive-service/lib/autocareApiMappers.ts#L27).
Mapper сохраняет `priceType`, `priceTo`, `bookingMode`, `warrantyText`, но таблица
форматирует только `price`, общий nextSlot и отсутствующий warrantyMonths.

**Воспроизведение:** в oil-change/Moscow выбрать ProService и Prime Wheels
Алексеевский. В карточке Prime Wheels: Quote required / Time to be confirmed by
the service. В таблице: RUB 1,700 и Today, 11:30. Для from/range также исчезает
оговорка «от»/верхняя граница. Warranty в обоих столбцах — Not provided, хотя
карточка содержит текст условия гарантии.

**Последствия:** пользователь принимает ориентир за согласованную цену и
время; таблица сравнения противоречит карточке того же предложения.

**Приёмка исправления:** одинаковая семантика fixed/from/range/quote_required
в карточке, profile и comparison; bookingMode=request не обещает готовую запись;
неподтверждённое время и текстовая гарантия представлены достоверно.
Проверить 4 price types × request/instant, разные валюты, RU/EN, mobile table.

[JSON и сценарий](evidence/2026-10-20/comparison-probe.json),
[скриншот таблицы](evidence/2026-10-20/comparison-price.png).

## Безопасность: повторная проверка известных рисков

На заново собранном backend повторно выполнены реальные service functions
с synthetic repositories и TypeORM metadata. Три результата подтвердились:

- **U14 / P1:** enqueue raw INSERT сохраняет открытые email/name вместо
  результата encryption transformer.
- **U15 / P1:** legacy request message function допускает SuperAdmin write;
  modern private chat на том же actor получает 403.
- **U20 / P1:** ORM update diff preference-save включает прежние passwordHash,
  status и tokenVersion из stale UserEntity. Это доказательство diff;
  actual concurrent commit в PostgreSQL 20 октября не запускался.

[Повторяемый сценарий](evidence/2026-10-20/security-reproduce.mjs),
[результат](evidence/2026-10-20/security-reproduce.json).
Сценарий утверждает текущее ошибочное поведение: exit 0 означает, что дефекты
воспроизведены, и не является зелёным security regression gate.
PostgreSQL-доказательства 13 октября сохранены отдельно и не выданы за новый run.
Production KMS, row-bound encryption/AAD и privileged MFA/step-up остаются
открытыми ранее учтёнными U01/U02/U03; новых подтверждений их внедрения нет.

**U21, свежий npm audit:** frontend 5 entries (2 critical / 3 high), API 2 high.
Это те же package entries, а не семь независимых удалённых атак.
[Web JSON](evidence/2026-10-20/npm-web-audit.json),
[API JSON](evidence/2026-10-20/npm-api-audit.json).

Применимость отделена от версии: у Next image SSRF отсутствует обязательная
конфигурация images.remotePatterns; текущий next.config.ts её не задаёт.
[Advisory Next](https://github.com/advisories/GHSA-cjq9-62q9-8jv4).
Для [SSG/ISR cache poisoning](https://github.com/advisories/GHSA-mcj8-r9mp-w47p)
нужна отдельная проверка topology/кэширования; текущие HTML routes возвращают
private, no-store. Это не доказательство отсутствия всех механизмов advisory.
[Sharp/librsvg](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) зависит от пути
SVG decode и runtime; conversation uploads ограничены magic bytes PNG/JPEG/WebP.
[Shell-quote](https://github.com/advisories/GHSA-pqg4-j6r4-53mv) относится к
dev/tooling graph; untrusted invocation в deployed API здесь не показан.
Обновления lockfiles в этом аудите не выполнялись.

## Проверки и дизайн

- Production Next mock artifact собран в отдельном `.next-ui-security-audit-2026-10-20`;
  loopback preview, установленный Chromium, без реальных пользователей/сообщений.
  HTTP backend на 4000 не запускался: отдельные SSR/rewrite запросы дали
  ECONNREFUSED в server log. Browser data обеспечивал MSW; проверка не является
  приёмкой SSR с реальным API. Собственный preview остановлен после проверки.
- **240/240**: 60 route/role cases × mobile RU dark 360, tablet EN light 768,
  desktop EN light 1440, desktop RU dark 1440. Guest/client/owner/staff/admin/
  superadmin; фактическая role, locale, theme, main/h1, overflow, ARIA IDs,
  header controls, media, console exceptions, infinite reduced-motion animation.
- **120 screenshots**, **0 axe violations**; 397 записей rule-level incomplete
  требуют ручной оценки и не считаются passes. Все 120 кадров вручную не
  просмотрены: выборка — desktop home, открытая жалоба и comparison.
- **4 дополнительных defect cases** подтверждены браузером независимо от
  зелёной closed-page matrix. Не заявляется, что проверены все overlays.
- **104/104 backend unit**, 11 files: auth/session denial, CSRF origin/token,
  OAuth redirect, rate limits, provider membership, moderation и media bounds/
  filesystem integrity. Первый запуск: 9 files / 71 tests PASS, 2 suites не
  стартовали из-за отсутствующего DATABASE_HOST. Финальный запуск использовал
  synthetic env с DB port 1 и отдельный temp upload root; DB не подключалась.
- Source contracts: design tokens, interaction, security headers, threat surface,
  owner/admin route authentication — PASS. Они не выявили перечисленные bugs.
- Production HTTP CSP: **5/5**, свежий nonce, caller override, SSR parity,
  no unsafe-eval, private/no-store; DENY/nosniff проверены дополнительно.
- Backend TypeScript build PASS. Syntax/PNG render PlantUML заново не запускались:
  ранее временный JAR больше недоступен; новых `.puml` в этой порции нет.

[Матрица и ограничения](evidence/2026-10-20/route-matrix-summary.json),
[HTTP headers](evidence/2026-10-20/headers.json),
[unit log](evidence/2026-10-20/security-unit-final.log).

### Оценка проверенной дизайн-выборки

Экспертная шкала 0–10, не измерение WCAG и не оценка всего продукта.

| Измерение | Оценка | Основание / адрес дальнейшей работы |
| --- | --- | --- |
| Цвета | 8 | 15 semantic roles и обе темы; `src/index.css`, token contract PASS |
| Типографика | 8 | home H1 и читаемые карточки; `src/pages/autocare-home/`, проверенные screenshots |
| Отступы | 7 | закрытые страницы без overflow; исключение UX16, ConfirmDialog:109 |
| Компонентная согласованность | 6 | разные правила контекста chat; U22, ChatsPage:184 |
| Адаптивность | 6 | 360/768/1440 PASS; 360×568 открытый modal FAIL, UX16 |
| Тёмная тема | 8 | RU dark profiles проходят axe/layout; ручная оценка всех dark overlays отсутствует |
| Движение | 7 | reduced-motion проверен во всей matrix; обычные анимации отдельно не оценены |
| Доступность | 7 | имена/landmarks/axe PASS; действия жалобы обрезаны и есть axe incomplete |
| Плотность информации | 7 | карточки/таблица сканируются; ComparisonTable:14 теряет важные оговорки |
| Состояния и завершённость | 6 | draft/recipient/time не сохраняют намерение, U22/UX17/UX18 |

Это аудит существующей реализации. Новая визуальная композиция не предлагалась
и не внедрялась; mockup будущего redesign в этот отчёт не входит.

## Документация и границы покрытия

Startup text/spec inventory: **151 документ / 26 598 строк** до новых отчётов.
Индекс дополнительно учитывает SVG/HTML references: всего 173 записи,
28 частичных сверок, 9 структурных SVG checks, 134 непроверенных документа
и 2 vendor references, исключённых с причиной. Ещё 78 supporting images
перечислены отдельно; исторические proposal images заново не оценивались.
Выполнена целевая сверка актуальных UI/security contracts и связанных source paths;
полный semantic audit всех документов не завершён. В
[INDEX.md](../INDEX.md) перечислены документы, тип, связь с кодом и статус
«сверено частично» / «не проверено» / «исключено». Точный список и причины:
[docs-coverage.json](evidence/2026-10-20/docs-coverage.json).

Материальные расхождения: SECURITY.md обещает SameSite Strict, код задаёт None
в production и Lax вне production; baseline всё ещё называет открытыми старые
WS/quote/deletion проблемы, которые current disposition и код отмечают как
исправленные; interaction contract описывает исключённые subscriptions/promo;
design brief с Inter/system расходится с действующими Russo One/Onest tokens.
Это документационные расхождения, не новая эксплуатация CSRF.
Старые планы, архивы и внешние release evidence целиком не перечитывались.
Карта: все 51 source anchors / 4 inventories совпали; auth/frontend/access/outbox
схемы использованы и сопоставлены с затронутыми реализациями. Для остальных
схем совпадение fingerprint не выдано за новую полную семантическую проверку.

20 октября не запускались PostgreSQL/Redis integration, real-API E2E, production
pentest, KMS/MFA acceptance, restore, native devices, полноценный screen reader,
200% browser zoom и deployed performance. Матрица UI использует MSW; её PASS
не подтверждает backend authorization. Исправления и закрытие 54 pilot gates
не выполнялись. Приоритет следующей порции: U22, известные U14/U15/U20/U21,
затем UX16–UX18.
