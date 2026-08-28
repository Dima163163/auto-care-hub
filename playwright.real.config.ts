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
const usePreviewServer = process.env.REAL_E2E_PREVIEW === 'true'

export default defineConfig({
    testDir: './e2e',
    testMatch: 'autocare-real-mode.smoke.spec.ts',
    fullyParallel: false,
    workers: 1,
    reporter: 'list',
    use: {
        baseURL: 'http://127.0.0.1:5174',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        launchOptions: localChromiumPath
            ? { executablePath: localChromiumPath }
            : undefined,
    },
    webServer: {
        command: usePreviewServer
            ? 'npm run preview -- --host 127.0.0.1 --port 5174'
            : 'NEXT_DIST_DIR=.next-real-e2e NEXT_PUBLIC_API_MODE=real NEXT_PUBLIC_API_BASE_URL=/api npm run dev -- --hostname 127.0.0.1 --port 5174',
        url: 'http://127.0.0.1:5174',
        reuseExistingServer: usePreviewServer ? false : !process.env.CI,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
})
