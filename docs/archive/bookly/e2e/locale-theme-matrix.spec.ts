import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const locales = ['en', 'ru', 'ro', 'ar'] as const
const themes = ['light', 'dark'] as const
const publicRoutes = ['/cabinets', '/cabinets/cabinet-1', '/help'] as const

for (const locale of locales) {
    for (const theme of themes) {
        test(`${locale}/${theme} public routes keep their accessibility contract`, async ({ page }) => {
            await page.setViewportSize({ width: 320, height: 900 })
            await page.addInitScript(
                ({ initialLocale, initialTheme }) => {
                    window.localStorage.setItem('autocare-hub-locale', initialLocale)
                    window.localStorage.setItem('autocare-hub-theme', initialTheme)
                },
                { initialLocale: locale, initialTheme: theme },
            )

            for (const route of publicRoutes) {
                await page.goto(route)
                await expect(page.locator('main h1:visible').first()).toBeVisible()
                await expect(page.locator('html')).toHaveAttribute('lang', locale)
                await expect.poll(() => page.evaluate(() =>
                    document.documentElement.scrollWidth <= window.innerWidth + 1,
                )).toBe(true)

                const heading = await page.locator('main h1:visible').first().innerText()
                expect(heading.trim()).not.toBe('')
                expect(heading).not.toMatch(/^(?:landing|navigation|common|errors)\./)

                const results = await new AxeBuilder({ page }).analyze()
                expect(results.violations, `${locale}/${theme} ${route}`).toEqual([])
            }
        })
    }
}
