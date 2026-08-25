# UI/runtime fixes — 2026-08-25

## Completed

- Provider profiles now show an explicit empty-state card when the real API
  returns zero published reviews. Rating bars and review filters are hidden
  until at least one review exists, so an empty provider cannot look like a
  broken `0.0` rating.
- Added localized Russian and English copy for the first-review state. Other
  supported locales fall back through the existing translation contract.
- Removed duplicate `AutoCareApiMarket` and `AutoCareApiLocationZone` exports
  from the frontend entity barrel.
- Corrected the super-admin market hierarchy form's create/update input
  narrowing so country and city mutations are type-safe in both modes.
- Removed an unused backend pilot-check import that made the repository lint
  fail despite the pilot script itself being valid.

## Verification

- `npm run lint` — passed.
- `npx tsc -p tsconfig.app.json --noEmit` — passed.
- `npm test -- --run` — 102 files / 340 tests passed.
- `npm run build` — Next.js production build passed.
- `npm --prefix server run build` — passed.
- `npm --prefix server test -- --pool=threads --maxWorkers=1 --reporter=dot`
  — 266 files / 726 tests passed.

The change does not alter the approved desktop design or any API contract.
