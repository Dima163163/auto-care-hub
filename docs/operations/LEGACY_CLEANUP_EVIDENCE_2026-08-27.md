# Legacy cleanup evidence — 2026-08-27

## Scope

This record covers the final entity/migration/replacement audit requested for
the cabinet-booking inheritance. It deliberately distinguishes dead runtime
code from compatibility code and immutable database history.

## Automated result

Commands:

```bash
npm run check:legacy-cleanup
npm run test:legacy-cleanup
```

Result: **passed**.

- 5 legacy families have an explicit lifecycle status in
  `docs/architecture/legacy-cleanup-manifest.json`.
- 2 retained compatibility families have replacement paths, coverage tests and
  recorded runtime consumers.
- 123 TypeORM migrations pass filename/order validation.
- 67 migrations are historical (before `1785700000000`) and 56 are AutoCare
  migrations at or after the boundary.
- The Bookly-runtime and legacy-payment static guards are green.

## Removed in this audit

The following files had no runtime imports from the app, worker, routes or
tests and were removed:

- `server/src/modules/commission/commission.service.ts`
- `server/src/modules/commission/commission.service.test.ts`
- unused legacy page families under `src/pages/home`, `src/pages/cabinets`,
  `src/pages/cabinet-details`, `src/pages/owner-cabinets`,
  `src/pages/owner-cabinet-create`, `src/pages/owner-cabinet-edit`,
  `src/pages/owner-bookings` and `src/pages/admin-cabinets`;
- the hidden `/pricing` route and its runtime feature flag.

The decision and rollback note are archived in
`docs/archive/bookly/commission-removal-2026-08-27.md`.

## Retained until replacement gates close

The following are not dead code. They remain compatibility surfaces and are
therefore not removed:

- cabinet/service/booking/favorite entities;
- legacy cabinets, services and bookings modules;
- historical TypeORM migrations, including old payment/commission history.

They still have active route, export, redirect or data-compatibility
consumers. Deletion requires all of the following: AutoCare catalog and
provider-location replacements, booking/export data migration, compatibility
redirect coverage, real API E2E evidence and a reviewed rollback/data plan.

## Follow-up

Run the legacy cleanup audit in CI and before every future deletion. Do not
rewrite or delete historical migrations; use a fresh AutoCare database for new
deployments when legacy data is not required, or use an approved mapping and
reconciliation plan when it is required.
