# Production Readiness Checklist

- [ ] Configure production-only secrets in the hosting provider; never commit `.env` files.
- [ ] Run `npm run lint`, `npm test`, `npm run build`, `npm --prefix server test`, and `npm --prefix server run build`.
- [ ] Apply and verify database migrations before serving new application code.
- [ ] Record `npm run check:migration-inventory` count and checksum with the
      release artifact before applying migrations.
- [ ] Check `/health/live` and `/health/ready`, application logs, and error alerts after deployment.
- [ ] Tune `DATABASE_POOL_*`, database timeout variables, `OAUTH_*` request
      limits, and `STRIPE_*` network limits against the hosting plan; verify
      slow-query events contain no request parameters or secrets.
- [ ] Verify database backup creation and perform a restore rehearsal in a non-production environment.
- [ ] Configure Stripe webhook signing secret, then test payment success, failure, payout readiness, and refund procedures.
- [ ] Exercise payment retries, webhook replay, bounded reconciliation, and terminal-state protections with provider errors that contain sensitive text.
- [ ] Verify trusted-proxy/CORS/CSRF configuration rejects wildcard, ambiguous, malformed, and untrusted origins in production mode.
- [ ] Verify owner Stripe Connect status and payout capability for the intended country and currency.
- [ ] Review audit-log export access and retention policy with the project owner.
- [ ] Run the Phase L design QA checklist on supported desktop and mobile browsers.
- [ ] Only at final client handoff and after two explicit confirmations: remove local personal/test data, rotate exposed keys, and leave `.env.example` placeholders only.
