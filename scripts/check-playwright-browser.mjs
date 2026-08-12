import { access } from 'node:fs/promises'

import { chromium } from 'playwright'

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim()
    || chromium.executablePath()

try {
    await access(executablePath)
    console.log(`Playwright Chromium is ready: ${executablePath}`)
} catch {
    console.error(`Playwright Chromium is missing or not executable: ${executablePath}`)
    console.error('Install it with: npx playwright install chromium')
    console.error('For CI, run the install step before npm run check:e2e:browser.')
    process.exitCode = 1
}
