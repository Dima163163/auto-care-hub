import { expect, test, type Page } from '@playwright/test'

const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+lyQqUQAAAABJRU5ErkJggg==',
    'base64',
)

async function signInAsClient(page: Page) {
    await page.goto('/login')
    await page.locator('#email').fill('emily.carter@example.com')
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: /sign in|войти/i }).click()
    await expect(page).toHaveURL(/\/profile/)
}

async function useMockScenario(page: Page, scenario: 'error' | 'stale' | 'offline' | 'permission-denied' | 'suspended', apiPath: string) {
    await page.addInitScript(({ apiPath: path, mockScenario }) => {
        const originalFetch = window.fetch.bind(window)

        window.fetch = (input, init) => {
            const url = typeof input === 'string'
                ? input
                : input instanceof URL
                    ? input.toString()
                    : input.url

            if (!url.includes(path)) return originalFetch(input, init)

            const requestHeaders = input instanceof Request ? input.headers : undefined
            const headers = new Headers(requestHeaders)
            new Headers(init?.headers).forEach((value, key) => headers.set(key, value))
            headers.set('x-autocare-mock-state', mockScenario)

            return originalFetch(input, { ...init, headers })
        }
    }, { apiPath, mockScenario: scenario })
}

test.describe('public and client AutoCare states', () => {
    test('opens the provider gallery and the service comparison table', async ({ page }) => {
        await page.goto('/services?service=oil-change')
        const compareButtons = page.getByRole('button', { name: /compare selected|сравнить выбранные/i })
        await expect(compareButtons.first()).toBeVisible()
        await compareButtons.nth(0).click()
        await compareButtons.nth(1).click()
        await expect(page.locator('table')).toBeVisible()

        await page.goto('/services/api-proservice-moscow')
        await expect(page.getByTestId('provider-gallery')).toBeVisible()
        await page.getByTestId('provider-gallery').getByRole('button').last().click()
        const galleryDialog = page.getByRole('dialog', { name: /service gallery|галерея сервиса/i })
        await expect(galleryDialog).toBeVisible()
        await galleryDialog.getByRole('button', { name: /next photo|следующее фото/i }).click()
        await expect(galleryDialog.locator('img').first()).toBeVisible()
    })

    test('renders bonus history, garage controls, and an attachment viewer for a client', async ({ page }) => {
        await signInAsClient(page)

        await page.goto('/profile/vehicles')
        await expect(page.locator('main select')).toHaveCount(5)
        await expect(page.locator('main img')).toHaveCount(1)

        await page.goto('/profile/bookings')
        await expect(page.getByText(/бонусы сервиса|service bonuses/i)).toBeVisible()
        await page.getByRole('button', { name: /замена масла|oil change/i }).first().click()

        const upload = page.getByTestId('service-request-attachment-input')
        await expect(upload).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
        await upload.setInputFiles({ name: 'inspection.png', mimeType: 'image/png', buffer: tinyPng })
        await expect(page.getByTestId('service-request-attachment')).toBeVisible()
        await page.getByTestId('service-request-attachment').last().click()
        await expect(page.getByRole('dialog')).toBeVisible()
    })

    for (const scenario of ['error', 'stale', 'offline', 'permission-denied', 'suspended'] as const) {
        test(`uses a recoverable ${scenario} state without breaking the client shell`, async ({ page }) => {
            await signInAsClient(page)
            await useMockScenario(page, scenario, '/v1/service-requests/my')
            await page.goto('/profile/bookings')
            await expect(page.getByRole('alert')).toBeVisible()
            await expect(page.getByRole('main')).toBeVisible()
        })
    }

    test('keeps public service and client booking routes within a mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto('/services/api-proservice-moscow')
        await expect(page.getByTestId('provider-gallery')).toBeVisible()
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)

        await signInAsClient(page)
        await page.goto('/profile/bookings')
        await expect(page.getByRole('main')).toBeVisible()
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    })
})
