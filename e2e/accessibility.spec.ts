import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page, email: string) {
    await page.goto('/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: /sign in|войти/i }).click()

    const expectedRoute = email.includes('sophia')
        ? /\/owner\/dashboard/
        : email.includes('admin')
            ? /\/admin\/dashboard/
            : /\/profile/

    await expect(page).toHaveURL(expectedRoute)
}

async function expectAccessiblePage(page: Page) {
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible()
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts?.ready)
    await page.evaluate(() => {
        for (const animation of document.getAnimations()) {
            const iterations = animation.effect?.getTiming().iterations

            if (iterations !== Infinity) {
                animation.finish()
            }
        }
    })

    const results = await new AxeBuilder({ page }).analyze()

    expect(results.violations).toEqual([])
}

test.describe('representative accessibility checks', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            if (!window.localStorage.getItem('autocare-hub-theme')) {
                window.localStorage.setItem('autocare-hub-theme', 'light')
            }
        })
    })

    test('public catalog is accessible and motion-aware', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto('/cabinets')

        await expectAccessiblePage(page)
        await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto')
    })

    test('public catalog remains usable at a 200 percent zoom-equivalent viewport', async ({ page }) => {
        await page.setViewportSize({ width: 640, height: 720 })
        await page.goto('/cabinets')

        await expectAccessiblePage(page)
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
        await expect(page.getByRole('textbox', { name: /search/i })).toBeVisible()
    })

    test('public catalog supports keyboard-only focus traversal', async ({ page }) => {
        await page.goto('/cabinets')

        await page.getByRole('textbox', { name: /search/i }).focus()
        await page.keyboard.press('Tab')
        await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY')
        await expect.poll(() => page.evaluate(() => document.activeElement?.matches(':focus-visible') ?? false)).toBe(true)
    })

    test('dark theme keeps the accessibility contract', async ({ page }) => {
        await page.goto('/cabinets')
        await page.evaluate(() => {
            window.localStorage.setItem('autocare-hub-theme', 'dark')
        })
        await page.reload()

        await expectAccessiblePage(page)
    })

    test('client profile is accessible without mobile overflow', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await signIn(page, 'emily.carter@example.com')
        await page.goto('/profile')

        await expectAccessiblePage(page)

        if (test.info().project.name === 'mobile-chromium') {
            await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
            await expect(page.getByTestId('profile-navigation')).toBeHidden()
        }
    })

    test('owner dashboard is accessible', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await signIn(page, 'sophia.miller@example.com')
        await page.goto('/owner/dashboard')

        await expectAccessiblePage(page)
    })

    test('admin audit workspace is accessible', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await signIn(page, 'admin@autocarehub.test')
        await page.goto('/admin/audit-logs')

        await expectAccessiblePage(page)
    })
})
