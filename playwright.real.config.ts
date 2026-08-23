import { defineConfig, devices } from '@playwright/test'

const localChromiumPath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? undefined
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
            : 'VITE_API_MODE=real VITE_API_BASE_URL=/api npm run dev -- --host 127.0.0.1 --port 5174',
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
