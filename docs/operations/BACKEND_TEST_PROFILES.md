# Backend test profiles

`npm --prefix server run test:unit` discovers every `src/**/*.test.ts` and
`src/**/*.spec.ts` without database setup. Pure policies, schemas and mocked
service boundaries belong here automatically; new files need no whitelist edit.

Real database tests must use `.integration.test.ts`. Five historical filenames
are explicitly classified with reasons in `server/src/test/test-profile-policy.ts`.
`test:integration` discovers both sets and loads the fail-closed disposable target
policy. Always supply explicit `TEST_DATABASE_URL` / `TEST_REDIS_URL`; ordinary
local `.env` database settings do not authorize destructive fixtures.

The admin concurrency fixture mutates only the explicitly guarded disposable CI
database. It creates its own admins and restores temporarily blocked synthetic
admins in cleanup, so a previous test's extra admin/session cannot silently skip
the invariant. Local non-CI execution records a skip before fixture writes.

The full profile remains an additional serial integration regression run. Test
classification never weakens the isolated target policy or changes pilot gates.
