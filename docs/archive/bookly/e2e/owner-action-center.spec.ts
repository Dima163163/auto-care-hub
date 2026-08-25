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

        const center = page.getByRole('region', { name: /work that needs your attention|центр задач/i })

        await expect(center).toBeVisible()
        const pendingBookings = center.getByRole('link', { name: /pending bookings/i })
        if (await pendingBookings.count() > 0) {
            await expect(pendingBookings).toHaveAttribute('href', '/owner/bookings')
            const eventRequest = page.waitForRequest((request) =>
                request.url().endsWith('/api/owner/action-center/events') && request.method() === 'POST'
            )
            await pendingBookings.click()
            expect((await eventRequest).postDataJSON()).toEqual({ action: 'pending_bookings' })
            await expect(page).toHaveURL(/\/owner\/bookings$/)
        } else {
            await expect(center.getByText(/everything is up to date|все задачи выполнены/i)).toBeVisible()
        }
    })
})
