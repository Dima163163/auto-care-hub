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
const testPort = Number(process.env.PLAYWRIGHT_VISUAL_PORT ?? 4173)
const testBaseUrl = `http://127.0.0.1:${testPort}`

export default defineConfig({
    testDir: './e2e',
    testMatch: 'visual-regression.spec.ts',
    workers: 1,
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
    expect: {
        toHaveScreenshot: {
            animations: 'disabled',
            caret: 'hide',
            maxDiffPixelRatio: 0.01,
        },
    },
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
        command: `NEXT_PUBLIC_API_MODE=mock npm run start -- --hostname 127.0.0.1 --port ${testPort}`,
        url: testBaseUrl,
        reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === 'true',
    },
    projects: [
        {
            name: 'desktop-chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'tablet-chromium',
            use: {
                ...devices['Desktop Chrome'],
                hasTouch: true,
                viewport: { width: 768, height: 1024 },
            },
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
