import { defineConfig, devices } from '@playwright/test'

const localChromiumPath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? undefined
const testPort = Number(process.env.PLAYWRIGHT_PORT ?? 4173)
const testBaseUrl = `http://127.0.0.1:${testPort}`

export default defineConfig({
    testDir: './e2e',
    testIgnore: [
        '**/autocare-real-mode.smoke.spec.ts',
        '**/pwa-preview.spec.ts',
        '**/visual-regression.spec.ts',
    ],
    // The browser mock keeps its demo session inside one MSW service worker.
    // Serializing this fixture-backed suite prevents one context's logout from
    // changing the role used by another project while preserving parallelism
    // in the real production-preview and visual configurations.
    workers: 1,
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
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
        command: `VITE_API_MODE=mock npm run dev -- --host 127.0.0.1 --port ${testPort}`,
        // MSW must be reachable before any browser context is created. Waiting
        // only for the HTML endpoint lets parallel projects race service-worker
        // registration and silently execute against the real API proxy.
        url: `${testBaseUrl}/mockServiceWorker.js`,
        // Reusing an unrelated Vite process can silently switch this suite to
        // real API mode. Opt in explicitly when attaching to an existing mock server.
        reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === 'true',
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
        {
            name: 'tablet-chromium',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1024, height: 1366 },
            },
        },
    ],
})
