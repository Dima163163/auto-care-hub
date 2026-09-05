# Staging API compatibility evidence

Заполняется только на фактическом staging endpoint. Локальный запуск без
`STAGING_API_BASE_URL` подтверждает лишь mock/API parity и намеренно не закрывает
staging gate.

```sh
REQUIRE_STAGING_API=true \
STAGING_API_BASE_URL=https://staging.example.com/api \
npm run check:staging-api -- --json > staging-api-evidence.json
```

Сохраните JSON-отчёт рядом с release evidence. В нём должны быть:

- `status: "pass"`;
- нормализованный `origin` без credentials;
- `openApiSha256` — SHA-256 фактически полученного `/openapi.json`;
- `openApiBytes` и список `discoveryVariants` с размером и cache policy;
- commit SHA и дата запуска из внешнего release job.

Не добавляйте в evidence cookies, Authorization, query с PII или тела заявок.
При timeout/network failure команда возвращает `status: "blocked"`, безопасный
код (`STAGING_TIMEOUT` или `STAGING_NETWORK_ERROR`) и не печатает полный URL.
