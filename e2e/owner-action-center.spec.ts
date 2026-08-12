import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page) {
    await page.goto('/login')
    await page.locator('#email').fill('sophia.miller@example.com')
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: /sign in|войти/i }).click()
    await expect(page).toHaveURL(/\/owner\/dashboard$/)
}

test.describe('owner action center', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('autocare-hub-locale', 'en')
            window.localStorage.setItem('autocare-hub-theme', 'light')
        })
    })

    test('shows owner-scoped work and deep links to resolving workspaces', async ({ page }) => {
        await signIn(page)

        const center = page.getByRole('region', { name: /work that needs your attention/i })

        await expect(center).toBeVisible()
        await expect(center.getByText('Pending bookings')).toBeVisible()
        await expect(center.getByText('Go-live readiness')).toBeVisible()
        await expect(center.getByRole('link', { name: /pending bookings/i })).toHaveAttribute('href', '/owner/bookings')
        await expect(center.getByRole('link', { name: /go-live readiness/i })).toHaveAttribute('href', '/profile')

        const eventRequest = page.waitForRequest((request) =>
            request.url().endsWith('/api/owner/action-center/events') && request.method() === 'POST'
        )
        await center.getByRole('link', { name: /pending bookings/i }).click()
        expect((await eventRequest).postDataJSON()).toEqual({ action: 'pending_bookings' })
        await expect(page).toHaveURL(/\/owner\/bookings$/)
    })
})
