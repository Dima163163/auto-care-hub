import { expect, test } from '@playwright/test'

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
    await expect.poll(() => page.evaluate(() =>
        document.documentElement.scrollWidth <= window.innerWidth + 1,
    )).toBe(true)
}

test.describe('mobile guest homepage', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(test.info().project.name !== 'mobile-chromium', 'Mobile-only visual coverage')
        await page.addInitScript(() => {
            window.localStorage.setItem('autocare-hub-locale', 'en')
            window.localStorage.setItem('autocare-hub-theme', 'light')
        })
    })

    test('matches the availability-first discovery composition', async ({ page }) => {
        await page.clock.install({ time: new Date('2026-08-08T12:00:00.000Z') })
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto('/')
        await page.waitForLoadState('networkidle')
        await expect(page.getByRole('heading', { level: 1, name: /find and book professional rooms/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /^search$/i })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Available today', exact: true })).toBeVisible()
        await expect(page.getByRole('heading', { name: /start with autocarehub/i })).toBeVisible()

        const navigation = page.getByRole('navigation', { name: /main navigation/i })
        await expect(navigation.getByRole('link', { name: /^home$/i })).toBeVisible()
        await expect(navigation.getByRole('link', { name: /^saved$/i })).toBeVisible()
        await expect(navigation.getByRole('link', { name: /sign in/i })).toBeVisible()
        await expectNoHorizontalOverflow(page)

        await expect(page).toHaveScreenshot('mobile-home-guest.png', { fullPage: true })
    })
})
