import { expect, test, type Locator, type Page } from '@playwright/test'

async function signIn(page: Page, email: string) {
    await page.goto('/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: /sign in|войти/i }).click()
    await expect(page).toHaveURL(/\/profile|\/owner\/dashboard|\/admin\/dashboard/)
}

async function activateNavigationLink(link: Locator) {
    await link.focus()
    await link.press('Enter')
}

test.describe('role-aware mobile navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto('/cabinets', { waitUntil: 'networkidle' })
        await page.evaluate(() => {
            window.localStorage.clear()
            window.sessionStorage.clear()
        })
        await page.evaluate(async () => {
            await fetch('/api/auth/logout', { method: 'POST' })
        })
        await page.reload({ waitUntil: 'networkidle' })
    })

    test('guest primary action opens sign in', async ({ page }) => {
        await page.goto('/cabinets', { waitUntil: 'networkidle' })
        const navigation = page.getByRole('navigation', { name: /main navigation/i })

        const signInLink = navigation.getByRole('link', { name: /sign in/i })
        await expect(signInLink).toBeVisible()
        await expect(signInLink).toHaveAttribute('href', '/login')

        await activateNavigationLink(signInLink)
        await expect(page).toHaveURL(/\/login$/)
    })

    test('guest primary action opens sign in with a native touch tap', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'mobile-chromium', 'Native touch contract runs on the mobile project only')
        await page.goto('/cabinets', { waitUntil: 'networkidle' })
        const navigation = page.getByRole('navigation', { name: /main navigation/i })
        const signInLink = navigation.getByRole('link', { name: /sign in/i })

        await expect(signInLink).toBeVisible()
        const box = await signInLink.boundingBox()

        if (!box) {
            throw new Error('Guest primary navigation link has no layout box')
        }

        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
        await expect(page).toHaveURL(/\/login$/)
    })

    test('client primary action opens own bookings', async ({ page }) => {
        await signIn(page, 'emily.carter@example.com')
        await page.goto('/cabinets')
        const navigation = page.getByRole('navigation', { name: /main navigation/i })

        await navigation.getByRole('link', { name: /my bookings/i }).first().click()
        await expect(page).toHaveURL(/\/profile\/bookings$/)
    })

    test('owner primary action opens cabinet creation', async ({ page }) => {
        await signIn(page, 'sophia.miller@example.com')
        await page.goto('/cabinets')
        const navigation = page.getByRole('navigation', { name: /main navigation/i })

        await expect(navigation.getByRole('link', { name: /dashboard/i })).toBeVisible()
        await navigation.getByRole('button', { name: /more/i }).click()
        await activateNavigationLink(
            navigation.getByRole('menu').getByRole('menuitem', { name: /create/i }),
        )
        await expect(page).toHaveURL(/\/owner\/cabinets\/create$/)
    })

    test('admin primary action opens admin dashboard', async ({ page }) => {
        await signIn(page, 'admin@autocarehub.test')
        await page.goto('/cabinets')
        const navigation = page.getByRole('navigation', { name: /main navigation/i })

        await activateNavigationLink(navigation.getByRole('link', { name: /admin dashboard/i }))
        await expect(page).toHaveURL(/\/admin\/dashboard$/)
    })

    test('super-admin keeps the admin destination', async ({ page }) => {
        await signIn(page, 'admin@autocarehub.test')
        await page.goto('/cabinets')
        const navigation = page.getByRole('navigation', { name: /main navigation/i })

        await activateNavigationLink(navigation.getByRole('link', { name: /admin dashboard/i }))
        await expect(page).toHaveURL(/\/admin\/dashboard$/)
    })
})
