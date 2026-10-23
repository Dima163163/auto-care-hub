# Dependency upgrade — 2026-10-22

Checkout: `autocare-hub-weakness-audit`, branch
`fix/request-chat-state-isolation-2026-10-20`. Это локальная проверка
зафиксированных npm lockfiles, не подтверждение deployed candidate.

## Причина и результат

До обновления свежий `npm audit` обнаружил в web lockfile 8 записей
(2 critical, 4 high, 2 moderate), в API lockfile 6 (3 high, 3 moderate).
После установки контролируемых версий и повторного `npm audit` — **0 в обоих**.
Проверены публичные advisories для [Next.js](https://github.com/advisories/GHSA-3w37-wq28-93x7),
[sharp](https://github.com/advisories/GHSA-wq5f-xc86-pv6w),
[shell-quote](https://github.com/advisories/GHSA-pqg4-j6r4-53mv) и
[Vitest](https://github.com/advisories/GHSA-qxg6-89mg-rqv8).

| Пакет | Было | Стало в lockfile | Область |
| --- | --- | --- | --- |
| Next.js | 16.3.6 | 16.4.2 | Web runtime |
| sharp | 0.35.4 | 0.35.5 | Web и API runtime |
| concurrently | 9.2.4 | 9.2.5 | Web tooling |
| shell-quote | 1.9.0 | 1.12.0 | Web transitive tooling |
| source-map-js | 1.2.1 | 1.2.2 | Web и API transitive tooling |
| Vite | web 8.2.2; API 8.1.5 | 8.3.5 | Build/test tooling |
| Vitest / mocker | 4.1.11 | 4.1.12 | Web и API tests |

## Локальная проверка

- `npm ci` из обоих lockfiles: PASS.
- Web unit 647/647 и API unit 1436/1436: PASS.
- Web ESLint, TypeScript/Vite build, API TypeScript build: PASS.
- Next 16.4.2 production build с `NEXT_PUBLIC_API_MODE=real`: PASS;
  fixture leakage 193 файлов PASS, Next runtime boundary и route contract PASS.
- `check:migration-inventory`: 141 файл PASS; `check:migration-checksum`
  требует `PUBLISHED_MIGRATION_MANIFEST` опубликованного окружения и локально
  не закрыт.

PostgreSQL/Redis integration, SMTP, authenticated real E2E и staging smoke
на exact published candidate не запускались. Нулевой npm audit означает
только отсутствие известных advisories в момент проверки.

## Дополнение 22 октября: Fastify

Повторный полный API audit после первоначального обновления обнаружил одну
новую запись низкой степени риска:
[GHSA-389g-gv7q-r4x8](https://github.com/advisories/GHSA-389g-gv7q-r4x8)
для Fastify 5.12.5. Прямую зависимость и lockfile обновили до 5.12.7.
После установки API `npm audit` показал 0 уязвимостей; root audit тоже 0.
Сборка API и 1465 unit tests прошли повторно на этом кандидате; опубликованный
Quality CI остаётся критерием принятия PR.
