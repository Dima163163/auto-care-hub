import { expect, test, type Page } from '@playwright/test'

async function expectNoHorizontalOverflow(page: Page) {
    await expect.poll(() => page.evaluate(() =>
        document.documentElement.scrollWidth <= window.innerWidth + 1,
    )).toBe(true)
}

test.describe('Help Center public page', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('autocare-hub-locale', 'en')
            window.localStorage.setItem('autocare-hub-theme', 'light')
        })
    })

    test('offers searchable topics and expandable answers', async ({ page }) => {
        await page.goto('/help')

        const search = page.getByRole('searchbox', { name: /search help topics/i })
        await expect(search).toBeVisible()
        await expect(page.getByText(/how do i book a cabinet/i)).toBeVisible()

        await search.fill('account')
        await expect(page.getByRole('heading', { name: /account and safety/i })).toBeVisible()
        await expect(page.getByText(/how can i protect my account/i)).toBeVisible()
        await expect(page.getByRole('heading', { name: /find a space/i })).toHaveCount(0)

        await page.getByRole('button', { name: /clear search/i }).click()
        await expect(search).toHaveValue('')
        await expect(page.getByRole('heading', { name: /find a space/i })).toBeVisible()
    })

    test('matches the approved desktop information architecture', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.goto('/help')

        await expect(page.getByRole('heading', { level: 1, name: /help for clients and owners/i })).toBeVisible()
        await expect(page.getByRole('tablist', { name: /choose who you are/i })).toBeVisible()
        await expect(page.getByRole('tab')).toHaveCount(3)
        await expect(page.getByRole('heading', { name: /browse help topics/i })).toBeVisible()
        await expect(page.getByRole('link', { name: /find a space/i })).toBeVisible()
        await expect(page.getByRole('contentinfo')).toBeVisible()

        await page.getByRole('tab', { name: /client/i }).click()
        await expect(page.getByRole('tab', { name: /client/i })).toHaveAttribute('aria-selected', 'true')
        await expectNoHorizontalOverflow(page)
    })

    test('keeps the help workflow usable on tablet', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 })
        await page.goto('/help')

        await expect(page.getByRole('heading', { level: 1, name: /help for clients and owners/i })).toBeVisible()
        await expect(page.getByLabel(/search help topics/i)).toBeVisible()
        await expect(page.getByRole('link', { name: /report a safety issue/i })).toBeVisible()
        await expectNoHorizontalOverflow(page)
    })
})
