import { expect, test, type Page } from '@playwright/test'

async function expectNoHorizontalOverflow(page: Page) {
    await expect.poll(() => page.evaluate(() =>
        document.documentElement.scrollWidth <= window.innerWidth + 1,
    )).toBe(true)
}

test.describe('tablet homepage', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('autocare-hub-locale', 'en')
            window.localStorage.setItem('autocare-hub-theme', 'light')
        })
    })

    test('keeps the availability-first composition at 768px', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 })
        await page.goto('/')

        await expect(page.getByRole('heading', { level: 1, name: 'AutoCare Hub' })).toBeVisible()
        await expect(page.getByPlaceholder(/where do you need a cabinet/i).last()).toBeVisible()
        await expect(page.getByRole('region', { name: /available today/i })).toBeVisible()
        await expect(page.getByRole('heading', { name: /start with autocarehub/i })).toBeVisible()
        await expect(page.getByRole('link', { name: /help center/i }).first()).toBeVisible()
        await expectNoHorizontalOverflow(page)
    })

    test('uses the compact single-row search and public links at 1024px', async ({ page }) => {
        await page.setViewportSize({ width: 1024, height: 1366 })
        await page.goto('/')

        await expect(page.getByRole('link', { name: /for owners/i }).first()).toBeVisible()
        await expect(page.getByRole('button', { name: /find availability/i })).toBeVisible()
        await expect(page.getByRole('link', { name: /map/i })).toBeVisible()
        await expectNoHorizontalOverflow(page)
    })
})
