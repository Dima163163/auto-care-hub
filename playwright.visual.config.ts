import { defineConfig, devices } from '@playwright/test'

const localChromiumPath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? undefined
const testPort = Number(process.env.PLAYWRIGHT_VISUAL_PORT ?? 4173)
const testBaseUrl = `http://127.0.0.1:${testPort}`

export default defineConfig({
    testDir: './e2e',
    testMatch: 'visual-regression.spec.ts',
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
        command: `VITE_API_MODE=mock npm run dev -- --host 127.0.0.1 --port ${testPort}`,
        url: testBaseUrl,
        reuseExistingServer: !process.env.CI,
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
