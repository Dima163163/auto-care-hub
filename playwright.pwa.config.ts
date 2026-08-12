import { defineConfig, devices } from '@playwright/test'

const localChromiumPath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? undefined
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
        command: `VITE_API_MODE=real VITE_API_BASE_URL=/api npm run build && PWA_PORT=${testPort} node scripts/pwa-preview-server.mjs`,
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
