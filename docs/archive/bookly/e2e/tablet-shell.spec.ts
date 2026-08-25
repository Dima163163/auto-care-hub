import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page, email: string) {
    await page.goto('/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: /sign in|войти/i }).click()
    await expect(page).toHaveURL(/\/owner\/dashboard$/)
}

async function expectNoHorizontalOverflow(page: Page) {
    await expect.poll(() => page.evaluate(() =>
        document.documentElement.scrollWidth <= window.innerWidth + 1,
    )).toBe(true)
}

test.describe('tablet shell navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 })
        await page.addInitScript(() => {
            window.localStorage.setItem('autocare-hub-locale', 'en')
            window.localStorage.setItem('autocare-hub-theme', 'light')
        })
    })

    test('guest More menu keeps secondary public links reachable', async ({ page }) => {
        await page.goto('/cabinets')

        const menuButton = page.getByRole('button', { name: /menu/i })
        await expect(menuButton).toBeVisible()
        await menuButton.click()

        await expect(page.getByRole('banner').getByRole('link', { name: /help center/i })).toBeVisible()
        await expect(page.getByRole('link', { name: /pricing/i })).toBeVisible()
        await expectNoHorizontalOverflow(page)
    })

    test('owner workspace keeps More menu and compact actions usable', async ({ page }) => {
        await signIn(page, 'sophia.miller@example.com')

        await expect(page.getByRole('button', { name: /more/i })).toBeVisible()
        await page.getByRole('button', { name: /more/i }).click()
        await expect(page.getByRole('link', { name: /pricing/i })).toBeVisible()
        await expect(page.getByRole('banner').getByRole('link', { name: /create cabinet/i })).toBeVisible()
        await expectNoHorizontalOverflow(page)
    })
})
