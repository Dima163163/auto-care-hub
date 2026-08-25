import { expect, test, type Page } from '@playwright/test'

const mobileWidths = [320, 390, 430]

async function signIn(page: Page, email: string) {
    await page.goto('/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: /sign in|войти/i }).click()

    await expect(page).toHaveURL(
        email.includes('sophia') ? /\/owner\/dashboard/ : /\/admin\/dashboard/,
    )
}

async function expectBottomNavigationDoesNotCoverLastAction(page: Page) {
    const navigation = page.locator('nav[aria-label]:visible').filter({ has: page.locator('a, button') }).last()
    await expect(navigation).toBeVisible()

    const topPadding = await navigation.evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingTop))
    expect(topPadding).toBeGreaterThanOrEqual(8)

    const lastAction = page.locator('main a:visible, main button:visible').last()
    await expect(lastAction).toBeVisible()
    await lastAction.evaluate((element) => {
        element.scrollIntoView({ block: 'center', inline: 'nearest' })
    })

    const geometry = await page.evaluate(() => {
        const navigation = [...document.querySelectorAll('nav[aria-label]')]
            .find((element) => {
                const bounds = element.getBoundingClientRect()
                return bounds.bottom > window.innerHeight - 2 && bounds.height > 0
            })
        const action = [...document.querySelectorAll('main a, main button')]
            .filter((element) => {
                const bounds = element.getBoundingClientRect()
                return bounds.height > 0 && getComputedStyle(element).visibility !== 'hidden'
            })
            .at(-1)

        if (!navigation || !action) {
            return null
        }

        const navigationBounds = navigation.getBoundingClientRect()
        const actionBounds = action.getBoundingClientRect()

        return {
            navigationTop: navigationBounds.top,
            actionBottom: actionBounds.bottom,
        }
    })

    expect(geometry).not.toBeNull()
    expect(geometry!.actionBottom).toBeLessThanOrEqual(geometry!.navigationTop + 1)
}

test.describe('mobile navigation contracts', () => {
    for (const width of mobileWidths) {
        test(`guest navigation stays usable at ${width}px`, async ({ page }) => {
            await page.setViewportSize({ width, height: 844 })
            await page.goto('/cabinets')

            const navigation = page.getByRole('navigation', { name: /main navigation/i })
            await expect(navigation).toBeVisible()
            await expect(navigation.getByRole('link')).toHaveCount(4)
            await expectBottomNavigationDoesNotCoverLastAction(page)
        })
    }

    test('owner navigation keeps secondary destinations in an accessible menu', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 })
        await signIn(page, 'sophia.miller@example.com')
        await page.goto('/owner/dashboard')

        const navigation = page.getByRole('navigation', { name: /main navigation/i })
        await expect(navigation).toBeVisible()
        await expect(navigation.getByRole('button', { name: /more/i })).toBeVisible()
        await expectBottomNavigationDoesNotCoverLastAction(page)
    })

    test('admin navigation exposes primary routes and a secondary menu', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 })
        await signIn(page, 'admin@autocarehub.test')
        await page.goto('/admin/dashboard')

        const navigation = page.getByRole('navigation', { name: /admin workspace/i })
        await expect(navigation).toBeVisible()
        await expect(navigation.getByRole('link')).toHaveCount(3)
        await expect(navigation.getByRole('button', { name: /more/i })).toBeVisible()
        await expectBottomNavigationDoesNotCoverLastAction(page)
    })
})
