# Спецификация MVP: дата записи и согласие с версией сметы

**Версия:** 1.0
**Дата:** 2026-09-11
**Статус:** исполняемая спецификация для существующих `V2-MVP-05`,
`V2-MVP-06`, `CHANGE-C002`, `CHANGE-C004` и `CHANGE-C010`.

Этот документ не добавляет новый обязательный пункт и не меняет знаменатель
плана. Он описывает наблюдаемое поведение, по которому проверяем уже
существующие условия MVP.

## 1. Границы

В область входят экран заявки клиента, availability API, создание записи и
принятие/отклонение quote. В область не входят новый дизайн, платежи,
подписки, resource-level capacity и production infrastructure.

## 2. Нормативные требования

### REQ-DATE-01 — каноническая дата

Дата из URL и формы принимается только в формате `YYYY-MM-DD`, с реальным
календарным днём и ограниченным годом. Некорректное значение не попадает в
availability API и нормализуется из URL без исключения рендера.

### REQ-DATE-02 — часовой пояс сервиса

Дата «сегодня/завтра/другая дата» вычисляется в часовом поясе филиала, а не
браузера. Переходы через полночь и DST не меняют календарный день сервиса.

### REQ-DATE-03 — серверный момент слота

При отправке заявки клиент передаёт `slot.startsAt`, полученный от сервера.
Клиент не пересчитывает UTC-момент через локальный `Date#setHours`.
Отсутствующий или невалидный `startsAt` блокирует отправку.

### REQ-QUOTE-01 — согласие с конкретной версией

HTTP accept/decline quote принимает `quoteId` и положительный целый
`quoteVersion`. Сервер сравнивает их с актуальной quote внутри транзакции.

### REQ-QUOTE-02 — stale/expiry без побочных эффектов

Несовпавшие ID/version дают `409`; booking snapshot, reservation и terminal
decision не создаются. Истёкшая quote не принимается и возвращает
конфликтный результат, переводя request в предусмотренное состояние ожидания.

### REQ-QUOTE-03 — повторяемость

Повтор того же уже применённого решения возвращает тот же результат без второй
reservation/ledger side effect. Новая quote требует нового explicit consent.

## 3. Таблица сценариев

| ID | Given | When | Then |
| --- | --- | --- | --- |
| S-DATE-01 | Сервис `Europe/Moscow`, браузер `America/New_York` | Открыть заявку без `date` | Дата запроса соответствует сервисному календарю |
| S-DATE-02 | `date=2026-02-30` или `date=2026-02-29` в невисокосном году | Открыть/перезагрузить URL | Рендер не падает, запрос получает каноническую дату |
| S-DATE-03 | Slot `10:00` имеет server `startsAt=...Z` | Отправить заявку | `preferredAt` равен `startsAt` byte-for-byte |
| S-DATE-04 | Сервисная дата пересекает полночь/DST | Выбрать день и слот | День и instant не сдвигаются в браузерной зоне |
| S-QUOTE-01 | У клиента quote `id=v1`, `version=1` | Принять с `v1/1` | Созданы один booking snapshot и одна reservation |
| S-QUOTE-02 | На сервере уже `v2` | Принять со старым `v1/1` | `409`, нет booking/reservation side effect |
| S-QUOTE-03 | Quote expired | Принять `id/version` | `409`, quote не принимается |
| S-QUOTE-04 | Решение `v1/1` уже принято | Повторить тот же запрос | Идемпотентный результат без дубликата side effect |

## 4. Evidence и закрытие

Минимальный локальный evidence:

- frontend: `RequestForm.test.tsx`, `request-date.test.ts`;
- backend: `quote-input-policy.test.ts`, `autocare-capacity.integration.test.ts`,
  `service-chat.gateway.test.ts` и соответствующий unit/integration runner;
- browser acceptance: `e2e/autocare-client-public-states.spec.ts` (provider
  communication modes ждут `provider-page-main`, а не общий loading shell);
- static/API contracts: `npm run check:mvp-remaining-blocks`,
  `npm run check:migration-validation`, `npm run check:api-parity`.

Unit/mock PASS не закрывает deployed browser, PostgreSQL, Redis или staging
evidence. Для полного `[x]` исходной строки требуются все её критерии из
`PILOT_SCOPE_FREEZE.md`; эта спецификация только делает их проверяемыми.
