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

test.describe('AutoCare compact header and results ordering', () => {
    test('switches the public navigation at the 1120px boundary', async ({ page }) => {
        for (const [width, compact] of [[1120, true], [1121, false]] as const) {
            await page.setViewportSize({ width, height: 900 })
            await page.goto('/services?service=oil-change')

            const header = page.locator('header.public-desktop-header:visible')
            await expect(header).toBeVisible()
            const nav = header.locator('.public-desktop-header__nav')
            const burger = header.getByTestId('desktop-public-mobile-menu-trigger')

            if (compact) {
                await expect(nav).not.toBeVisible()
                await expect(burger).toBeVisible()
                await burger.click()
                await expect(header.locator('.public-desktop-header__mobile-menu')).toBeVisible()
            } else {
                await expect(nav).toBeVisible()
                await expect(burger).not.toBeVisible()
            }

            await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
        }
    })

    test('places the results map before provider cards on narrow screens', async ({ page }) => {
        await page.setViewportSize({ width: 760, height: 900 })
        await page.goto('/services?service=oil-change')

        const map = page.locator('#comparison-map')
        const firstCard = page.locator('#search-results article').first()
        await expect(map).toBeVisible()
        await expect(firstCard).toBeVisible()

        const positions = await page.evaluate(() => {
            const mapElement = document.querySelector('#comparison-map')
            const cardElement = document.querySelector('#search-results article')
            return {
                mapTop: mapElement?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
                cardTop: cardElement?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
            }
        })
        expect(positions.mapTop).toBeLessThan(positions.cardTop)
    })
})
