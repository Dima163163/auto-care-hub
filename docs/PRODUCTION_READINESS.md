# Production Readiness Checklist

- [ ] Configure production-only secrets in the hosting provider; never commit `.env` files.
- [ ] Run `npm run lint`, `npm test`, `npm run build`, `npm --prefix server test`, and `npm --prefix server run build`.
- [ ] Apply and verify database migrations before serving new application code.
- [ ] Record `npm run check:migration-inventory` count and checksum with the
      release artifact before applying migrations.
- [ ] Check `/health/live` and `/health/ready`, application logs, and error alerts after deployment.
- [ ] Tune `DATABASE_POOL_*`, database timeout variables, and `OAUTH_*` request
      limits against the hosting plan; verify slow-query events contain no
      request parameters or secrets.
- [ ] Verify database backup creation and perform a restore rehearsal in a non-production environment.
- [x] Legacy payment runtime, provider SDK, webhooks, routes, UI, deployment
      configuration, and background reconciliation are removed. Historical
      migrations remain immutable for existing databases only.
- [ ] Verify trusted-proxy/CORS/CSRF configuration rejects wildcard, ambiguous, malformed, and untrusted origins in production mode.
- [ ] Review audit-log export access and retention policy with the project owner.
- [ ] Run the Phase L design QA checklist on supported desktop and mobile browsers.
- [ ] Only at final client handoff and after two explicit confirmations: remove local personal/test data, rotate exposed keys, and leave `.env.example` placeholders only.
