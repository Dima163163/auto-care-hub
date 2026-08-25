import { access } from 'node:fs/promises'
import { constants, existsSync } from 'node:fs'

import { chromium } from 'playwright'

const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    chromium.executablePath(),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
].filter((candidate) => typeof candidate === 'string' && candidate.trim().length > 0)

const executablePath = candidates.find((candidate) => existsSync(candidate))

try {
    if (!executablePath) {
        throw new Error('No Chromium-compatible executable found')
    }

    await access(executablePath, constants.X_OK)
    console.log(`Playwright Chromium is ready: ${executablePath}`)
} catch {
    console.error(`Chromium-compatible executable is missing or not executable: ${executablePath ?? 'none found'}`)
    console.error('Install it with: npx playwright install chromium or set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.')
    console.error('For CI, run the install step before npm run check:e2e:browser.')
    process.exitCode = 1
}
