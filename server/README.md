# AutoCare Hub Server — Migration Baseline

Это текущий Fastify backend, унаследованный от AutoCare Hub. Во время миграции он
остаётся рабочей платформенной основой, но описанные ниже cabinet/payment routes
являются текущим legacy-контрактом, а не целевой моделью AutoCare Hub. Целевая
архитектура находится в `../ARCHITECTURE.md`.

## Стек

- Fastify
- TypeScript
- PostgreSQL
- TypeORM (Entities + Migrations)
- Redis (Rate limiting)
- Zod
- JWT
- httpOnly refresh token cookie
- Docker Compose
- dotenv

## Структура

```txt
server/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   ├── database/
│   ├── entities/
│   ├── modules/
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── bookings/
│   │   ├── cabinets/
│   │   ├── oauth/
│   │   ├── services/
│   │   └── users/
│   ├── routes/
│   └── shared/
│
├── sql/
├── docker-compose.yml
├── .env.example
├── package.json
└── tsconfig.json
```

## Environment variables

Создай локальный `.env`:

```bash
cp .env.example .env
```

Пример:

```env
NODE_ENV=development
RUNTIME_MODE=all

PORT=4000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
FRONTEND_ORIGIN=http://localhost:5173

DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_USER=autocarehub
DATABASE_PASSWORD=autocarehub
DATABASE_NAME=autocarehub

JWT_ACCESS_SECRET=change-me-in-local-env
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change-me-refresh-secret-in-local-env
JWT_REFRESH_EXPIRES_IN=7d
REFRESH_TOKEN_COOKIE_NAME=autocarehub_refresh_token
CSRF_TOKEN_COOKIE_NAME=autocarehub_csrf_token

MAIL_MODE=logger

OAUTH_STATE_COOKIE_NAME=autocarehub_oauth_state

GOOGLE_OAUTH_CLIENT_ID=dev-google-client-id
GOOGLE_OAUTH_CLIENT_SECRET=dev-google-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:4000/auth/oauth/google/callback

YANDEX_OAUTH_CLIENT_ID=dev-yandex-client-id
YANDEX_OAUTH_CLIENT_SECRET=dev-yandex-client-secret
YANDEX_OAUTH_REDIRECT_URI=http://localhost:4000/auth/oauth/yandex/callback
```

Development uses `MAIL_MODE=logger` and writes one-time email content to the
backend log.

Production requires SMTP:

```env
MAIL_MODE=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=smtp-user
SMTP_PASSWORD=change-me
MAIL_FROM=AutoCare Hub <no-reply@example.com>
```

`MAIL_MODE=logger` and incomplete `MAIL_MODE=smtp` credentials are rejected
when `NODE_ENV=production`, because password setup links must not be written to
production logs. The server verifies the SMTP connection during startup.

## Установка

```bash
npm install
```

## Миграции и база данных

В проекте используется система миграций TypeORM. Все изменения схемы и начальные данные (seed) находятся в `src/database/migrations`.

### Настройка базы данных

1. Запусти PostgreSQL и Redis:

```bash
docker compose up -d
```

2. Выполни миграции отдельным release-шагом:

```bash
npm run release:migrate
```

В production этот шаг выполняется один раз до запуска web-реплик. Не включай
миграции в команду запуска каждой реплики.

Для read-only диагностики перед запуском API используй проверку schema
contract. Она не применяет миграции, выводит безопасный JSON с отсутствующими
таблицами, колонками, индексами или миграциями и возвращает ненулевой код при
неполной схеме:

```bash
npm run schema:check
```

Для отката последней миграции:

```bash
npm run migration:revert
```

Локальная PostgreSQL доступна так: `localhost:5433`.

`npm run db:up` сначала проверяет Docker daemon и при остановленном Docker
Desktop выводит короткую инструкцию вместо необработанной ошибки compose.

## Запуск сервера

Development mode:

```bash
npm run dev
```

Runtime ownership can be separated with `RUNTIME_MODE=api`, `worker`, or
`all`. `api` starts HTTP traffic without maintenance jobs, `worker` starts
maintenance without an HTTP listener, and `all` is the local default.
`BACKGROUND_JOB_PHASE_TIMEOUT_MS` bounds each maintenance phase independently;
the cycle timeout remains an outer guard.

`BOOKING_REMINDER_HOURS` controls how far in advance the maintenance worker
queues client booking reminders. It defaults to 24 hours and accepts integer
values from 1 to 168; delivery still respects the account and booking email
preferences.

Production-like build:

```bash
npm run build
npm run start:server
```

Для локального convenience-запуска с миграциями используй `npm run start:with-migrations`.

Перед PostgreSQL/Redis integration suite проверь переменные подключения и
обязательные auth secrets:

```bash
npm run check:integration-prerequisites
npm run test:integration
```

Health check:

```bash
curl http://localhost:4000/health/ready
```

Ожидаемый ответ:

```json
{
  "status": "ok",
  "service": "autocare-hub-api",
  "database": "connected",
  "checks": {
    "database": { "status": "ok", "latencyMs": 3 },
    "redis": { "status": "ok", "latencyMs": 1 },
    "outbox": {
      "status": "ok",
      "latencyMs": 4,
      "pending": 0,
      "deadLetter": 0,
      "oldestAgeMs": null
    },
    "storage": { "status": "ok", "latencyMs": 2 }
  }
}
```

## Auth flow

Реализовано:

- Register
- Login
- Logout
- Refresh access token
- Get current user
- Password hashing через bcryptjs
- JWT access token
- JWT refresh token
- Refresh token в httpOnly cookie
- Role-based protected endpoints

## OAuth status

Google/Yandex OAuth полностью реализован.

Реализовано:
- Provider configuration.
- OAuth URL generation.
- Exchange OAuth `code` на provider tokens.
- Получение provider profile.
- Создание или обновление local user.
- Выдача local access/refresh tokens.
- Привязка OAuth к существующим аккаунтам.

## API modules

### Health

```txt
GET /health
GET /health/live
GET /health/ready
```

### Auth

```txt
GET  /auth/csrf
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/password/setup/verify
POST /auth/password/setup/complete
POST /auth/password/reset/request
POST /auth/password/reset/verify
POST /auth/password/reset/complete
GET  /auth/me
```

Password reset request uses a neutral success response for existing and
unknown emails. Request and completion require the normal CSRF handshake:
`GET /auth/csrf`, cookie credentials, and `X-CSRF-Token`.

### OAuth preparation

```txt
GET /auth/oauth/google/url
GET /auth/oauth/yandex/url
GET /auth/oauth/google/callback
GET /auth/oauth/yandex/callback
```

### Public catalog

```txt
GET /cabinets
GET /cabinets/:id
GET /services?cabinetId=...
```

### Client bookings

```txt
GET   /bookings/my
POST  /bookings
PATCH /bookings/:id/cancel
```

### Owner bookings

```txt
GET   /owner/clients
GET   /owner/bookings
POST  /owner/bookings
PATCH /bookings/:id/status
```

### Owner cabinets

```txt
GET    /owner/cabinets
GET    /owner/cabinets/:id
POST   /cabinets
PATCH  /cabinets/:id
DELETE /cabinets/:id
```

### Owner services

```txt
GET    /owner/services
POST   /services
PATCH  /services/:id
PATCH  /services/:id/status
DELETE /services/:id
```

### Admin

```txt
GET   /admin/users
PATCH /admin/users/:id/status

GET   /admin/cabinets
PATCH /admin/cabinets/:id/status
```

## Бекапы и восстановление

### Создание бекапа

Скрипт создает сжатый SQL-дамп базы данных в папке `server/backups/`:

```bash
npm run db:backup
```

Скрипт автоматически:
- Использует переменные из `.env`.
- Если база запущена в Docker, использует `docker exec`.
- Если база удаленная (например, на Render), использует локальный `pg_dump`.
- Хранит бекапы за последние 7 дней, удаляя старые.

### Восстановление из бекапа

Для восстановления из сжатого дампа:

```bash
# Распаковать
gunzip -k backups/db_backup_TIMESTAMP.sql.gz

# Восстановить в Docker
docker exec -i autocarehub-postgres psql -U autocarehub -d autocarehub < backups/db_backup_TIMESTAMP.sql

# Или восстановить в удаленную базу
psql -h HOST -p PORT -U USER -d NAME < backups/db_backup_TIMESTAMP.sql
```

Стандартизированный restore в отдельную базу:

```bash
npm run db:restore -- backups/db_backup_TIMESTAMP.sql.gz autocarehub_restore
```

Скрипт требует существующую целевую базу, проверяет gzip-архив и останавливает
`psql` при первой SQL-ошибке. Он отказывается использовать значение
`DATABASE_NAME` как target, если явно не задано
`ALLOW_SAME_DATABASE_RESTORE=true`. Для другой инфраструктуры используются
`RESTORE_DATABASE_HOST`, `RESTORE_DATABASE_PORT`, `RESTORE_DATABASE_USER` и
`RESTORE_DATABASE_PASSWORD`.

## Полезные команды

Build:

```bash
npm run build
```

Start dev server:

```bash
npm run dev
```

Start compiled server:

```bash
npm run start:server
```

Проверить таблицы в базе:

```bash
docker exec -it autocarehub-postgres psql \
  -U autocarehub \
  -d autocarehub \
  -c '\dt'
```

Проверить пользователей:

```bash
docker exec -it autocarehub-postgres psql \
  -U autocarehub \
  -d autocarehub \
  -c 'SELECT id, email, role, status, provider FROM users;'
```

## Текущие ограничения

- SQL scripts используются вместо полноценной migration system.
- Полный Google/Yandex OAuth token exchange запланирован.
- Production deployment выполнен через Render Web Service.
- Production PostgreSQL размещён на Render.
- Automated backend tests запланированы.
