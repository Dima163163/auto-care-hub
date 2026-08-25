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

## Result

`6 passed (1.3m)`

The suite covered:

- discovery shell at 375, 390, 768, 820, 1024, 1120 and 1280 px without
  horizontal overflow;
- filter and sort keyboard operation;
- desktop-to-burger navigation boundary at 768, 790, 1120 and 1280 px;
- Axe accessibility checks for the public discovery page;
- all 20 supported locale URLs without missing translation keys or overflow;
- owner workspace service and privacy controls.

## Remaining external evidence

The local Chromium run does not close the release gate for physical iOS/Android
devices, a real screen reader, production map/media budgets, or recruited
provider/customer pilot traffic. Those remain external checks in the stable-web
release register.
