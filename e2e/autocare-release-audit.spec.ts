import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const guestWidths = [375, 768, 1280] as const

async function expectNoHorizontalOverflow(page: Page) {
    await expect.poll(() => page.evaluate(() =>
        document.documentElement.scrollWidth <= window.innerWidth + 1,
    )).toBe(true)
}

async function expectStableShell(page: Page) {
    await expect(page.locator('header:visible').first()).toBeVisible()
    await expect(page.getByRole('main')).toHaveCount(1)
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expect.poll(() => page.evaluate(() => {
        const text = document.body.innerText
        return !/(?:landing|navigation|common|errors)\.[A-Za-z0-9_.-]+/.test(text)
            && !/\b(?:undefined|null|TODO|FIXME)\b/i.test(text)
    })).toBe(true)
}

test.describe('AutoCare stable-web release gate', () => {
    test('discovery shell stays usable across release breakpoints', async ({ page }) => {
        for (const width of guestWidths) {
            await page.setViewportSize({ width, height: 900 })
            await page.goto('/services?service=oil-change')
            await expectStableShell(page)
            await expect(page.locator('#comparison-map')).toBeVisible()
            await expect(page.getByRole('button', { name: /start search|начать поиск/i })).toBeVisible()
        }
    })

    test('discovery filters and sort controls are keyboard operable', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.goto('/services?service=oil-change')
        await expectStableShell(page)

        const sort = page.locator('select').filter({ has: page.locator('option[value="recommended"]') }).first()
        await expect(sort).toBeVisible()
        await sort.selectOption('price_asc')
        await expect(sort).toHaveValue('price_asc')

        const allFilters = page.getByRole('button', { name: /all filters|все фильтры/i })
        await expect(allFilters).toBeVisible()
        await allFilters.click()
        await expect(page.getByRole('button', { name: /start search|начать поиск/i })).toBeVisible()
        await expectNoHorizontalOverflow(page)
    })

    test('public discovery satisfies the automated accessibility contract', async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('autocare-hub-locale', 'en')
            window.localStorage.setItem('autocare-hub-theme', 'light')
        })
        await page.goto('/services?service=oil-change')
        await expectStableShell(page)
        const results = await new AxeBuilder({ page }).analyze()
        expect(results.violations).toEqual([])
    })

    test('owner workspace exposes AutoCare services and privacy controls', async ({ page }) => {
        await page.goto('/login')
        await page.locator('#email').fill('sophia.miller@example.com')
        await page.locator('#password').fill('password123')
        await page.getByRole('button', { name: /sign in|войти/i }).click()
        await expect(page).toHaveURL(/\/owner\/dashboard$/)

        await page.goto('/owner/services')
        await expectStableShell(page)
        await expect(page.getByRole('heading', { name: /services and pricing|услуги и цены/i })).toBeVisible()
        await expect(page.getByText(/automotive service catalogue|каталог автоуслуг/i)).toBeVisible()

        await page.goto('/profile?tab=account')
        await expect(page.getByTestId('profile-privacy')).toBeVisible()
        await expectNoHorizontalOverflow(page)
    })
})
