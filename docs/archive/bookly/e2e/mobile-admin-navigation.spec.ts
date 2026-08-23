import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page) {
    await page.goto('/login')
    await page.locator('#email').fill('admin@autocarehub.test')
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: /sign in|войти/i }).click()
    await expect(page).toHaveURL(/\/admin\/dashboard/)
}

async function expectNoHorizontalOverflow(page: Page) {
    await expect.poll(() => page.evaluate(() =>
        document.documentElement.scrollWidth <= window.innerWidth + 1,
    )).toBe(true)
}

test.describe('admin mobile navigation', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(test.info().project.name !== 'mobile-chromium', 'Mobile-only navigation contract')
        await page.addInitScript(() => {
            window.localStorage.setItem('autocare-hub-locale', 'en')
            window.localStorage.setItem('autocare-hub-theme', 'light')
        })
    })

    test('exposes every admin workspace route from a compact More menu', async ({ page }) => {
        await signIn(page)

        const navigation = page.getByRole('navigation', { name: /admin workspace/i })
        await expect(navigation.getByRole('link', { name: /admin dashboard/i })).toBeVisible()
        await expect(navigation.getByRole('link', { name: /^users$/i })).toBeVisible()
        await expect(navigation.getByRole('link', { name: /^cabinets$/i })).toBeVisible()
        await expect(navigation.getByRole('button', { name: /more/i })).toBeVisible()
        await expectNoHorizontalOverflow(page)

        await navigation.getByRole('button', { name: /more/i }).click()
        await expect(navigation.getByRole('menu')).toBeVisible()
        await expect(navigation.getByRole('menu').getByRole('menuitem', { name: /^home$/i })).toBeVisible()
        await expect(navigation.getByRole('menu').getByRole('menuitem', { name: /^owners$/i })).toBeVisible()
        await expect(navigation.getByRole('menu').getByRole('menuitem', { name: /^reviews$/i })).toBeVisible()
        await expect(navigation.getByRole('menu').getByRole('menuitem', { name: /audit logs/i })).toBeVisible()
        await expect(navigation.getByRole('menu').getByRole('menuitem', { name: /profile/i })).toBeVisible()
        await expect(navigation.getByRole('menu').getByRole('menuitem', { name: /help center/i })).toBeVisible()

        await navigation.getByRole('menu').getByRole('menuitem', { name: /audit logs/i }).click()
        await expect(page).toHaveURL(/\/admin\/audit-logs/)
        await expect(navigation.getByRole('menu')).toBeHidden()
        await expectNoHorizontalOverflow(page)
    })
})
