import { existsSync } from 'node:fs'

import { defineConfig, devices } from '@playwright/test'

const chromiumCandidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
].filter((candidate): candidate is string => Boolean(candidate?.trim()))

const localChromiumPath = chromiumCandidates.find((candidate) => existsSync(candidate))
const testPort = Number(process.env.PLAYWRIGHT_PWA_PORT ?? 4175)
const testBaseUrl = `http://127.0.0.1:${testPort}`

export default defineConfig({
    testDir: './e2e',
    testMatch: 'pwa-preview.spec.ts',
    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: testBaseUrl,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        launchOptions: localChromiumPath
            ? { executablePath: localChromiumPath }
            : undefined,
    },
    webServer: {
        command: `VITE_API_MODE=real VITE_API_BASE_URL=/api npm exec vite -- build && PWA_PORT=${testPort} node scripts/pwa-preview-server.mjs`,
        url: testBaseUrl,
        reuseExistingServer: false,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'mobile-chromium',
            use: {
                ...devices['Desktop Chrome'],
                hasTouch: true,
                viewport: { width: 390, height: 844 },
            },
        },
    ],
})
