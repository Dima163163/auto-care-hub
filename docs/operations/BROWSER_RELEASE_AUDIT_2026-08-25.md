# Browser release audit — 2026-08-25

This is a local release-gate record for the public AutoCare web shell. It is
repository evidence only; it does not replace real-device, screen-reader or
production traffic sign-off.

## Environment

- Playwright `1.61.1`
- Chromium executable: local Playwright Chromium `1161`
- Frontend mode: `NEXT_PUBLIC_API_MODE=mock`
- Test command:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="$HOME/Library/Caches/ms-playwright/chromium-1161/chrome-mac/Chromium.app/Contents/MacOS/Chromium" \
  npm run test:e2e -- --project=chromium e2e/autocare-release-audit.spec.ts
```

The route release matrix is also executed against an isolated production
server started with `npm run start` (`next start`). This is separate from the
Vite compatibility preview and is the production web runtime.

## Result

`6 passed (1.3m)`

The Next.js production route smoke additionally passed `15/15` on the
isolated `next start` process, including direct dynamic URLs, 404 handling and
the unauthenticated protected-route redirect.

The suite covered:

- discovery shell at 375, 390, 768, 820, 1024, 1120 and 1280 px without
  horizontal overflow;
- filter and sort keyboard operation;
- desktop-to-burger navigation boundary at 768, 790, 1120 and 1280 px;
- Axe accessibility checks for the public discovery page;
- all 20 supported locale URLs without missing translation keys or overflow;
- owner workspace service and privacy controls.

## Responsive/performance follow-up — 2026-08-26

The dedicated production-runtime matrix was run against an isolated `next
start` server with the local Chromium executable:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="$HOME/Library/Caches/ms-playwright/chromium-1161/chrome-mac/Chromium.app/Contents/MacOS/Chromium" \
RESPONSIVE_BASE_URL=http://127.0.0.1:4180 npm run check:responsive
```

Result: `30/30` route/width checks passed at 360, 390, 414, 540, 682, 768,
790, 1024, 1280 and 1440 px. The matrix checks horizontal overflow, header,
footer, map/gallery presence, the responsive navigation boundary, and opening
and closing the provider gallery with Escape.

The performance budget check also passed: entry JS 398.3 kB raw, largest
non-entry JS 232.0 kB, largest CSS 167.3 kB and 87 JS chunks. These are local
production-build measurements, not a substitute for a Lighthouse run against
the deployed production URL.

## Remaining external evidence

The local Chromium run does not close the release gate for physical iOS/Android
devices, a real screen reader, production map/media budgets, or recruited
provider/customer pilot traffic. Those remain external checks in the stable-web
release register.
