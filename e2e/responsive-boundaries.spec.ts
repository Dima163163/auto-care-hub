import { expect, test, type Page } from '@playwright/test'

const viewportWidths = [320, 390, 430, 640, 768, 1024, 1280, 1440]

async function expectNoHorizontalOverflow(page: Page) {
    await expect.poll(() => page.evaluate(() =>
        document.documentElement.scrollWidth <= window.innerWidth + 1,
    )).toBe(true)
}

test.describe('responsive public route boundaries', () => {
    for (const width of viewportWidths) {
        test(`keeps the public shell usable at ${width}px`, async ({ page }) => {
            await page.setViewportSize({ width, height: 900 })
            await page.addInitScript(() => {
                window.localStorage.setItem('autocare-hub-locale', 'en')
                window.localStorage.setItem('autocare-hub-theme', 'light')
            })

            await page.goto('/cabinets')
            await expect(page.getByRole('heading', { level: 1, name: /available cabinets/i })).toBeVisible()
            await expect(page.locator('header:visible').first()).toBeVisible()
            await expectNoHorizontalOverflow(page)

            await page.goto('/cabinets/cabinet-1')
            await expect(page.getByRole('heading', { level: 1, name: /bright beauty cabinet near city center/i })).toBeVisible()
            await expectNoHorizontalOverflow(page)

            await page.goto('/help')
            await expect(page.getByRole('heading', { level: 1, name: /help for clients and owners/i })).toBeVisible()
            await expect(page.getByRole('contentinfo')).toBeVisible()
            await expectNoHorizontalOverflow(page)
        })
    }
})
