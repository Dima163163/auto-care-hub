import { expect, test } from '@playwright/test'

for (const [role, email, route] of [
    ['client', 'emily.carter@example.com', '/profile/vehicles'],
    ['admin', 'admin@autocarehub.test', '/admin/security-center'],
] as const) {
    test(`compact ${role} toolbar keeps account, theme and notifications reachable`, async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 844 })
        await page.addInitScript(() => localStorage.setItem('autocare-hub-locale', 'en'))
        await page.goto('/login')
        await page.locator('#email').fill(email)
        await page.locator('#password').fill('password123')
        await page.getByRole('button', { name: 'Sign in', exact: true }).click()
        await expect(page).not.toHaveURL(/\/login/)
        await page.goto(route)
        const header = page.locator('header:visible')
        const account = header.getByRole('button', { name: 'Open account menu' })
        await expect(account).toBeVisible()
        for (const control of [account, header.getByRole('link', { name: 'Notifications', exact: true }), header.getByRole('switch')]) {
            const bounds = await control.boundingBox()
            expect(bounds).not.toBeNull()
            expect(bounds!.x).toBeGreaterThanOrEqual(0)
            expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(360)
        }
        await account.click()
        await expect(page.getByRole('menu')).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(page.getByRole('menu')).toBeHidden()
        const theme = header.getByRole('switch')
        for (let iteration = 0; iteration < 2; iteration++) {
            const checked = await theme.getAttribute('aria-checked')
            await theme.click()
            await expect(theme).toHaveAttribute('aria-checked', checked === 'true' ? 'false' : 'true')
            await expect.poll(() => header.getByRole('link', { name: 'Notifications', exact: true }).evaluate((link) => {
                const bounds = link.getBoundingClientRect()
                const target = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
                return target !== null && link.contains(target)
            })).toBe(true)
        }
        await header.getByRole('link', { name: 'Notifications', exact: true }).click()
        await expect(page).toHaveURL(/\/notifications$/)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })
}

test('compact signed-in public navigation keeps its menu reachable', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 844 })
    await page.addInitScript(() => localStorage.setItem('autocare-hub-locale', 'en'))
    await page.goto('/login')
    await page.locator('#email').fill('emily.carter@example.com')
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page).not.toHaveURL(/\/login/)
    await page.goto('/chats')
    const header = page.locator('header:visible')
    const menu = header.getByTestId('mobile-home-menu')
    await expect(menu).toBeVisible()
    const bounds = await menu.boundingBox()
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(360)
    await menu.click()
    await expect(menu).toHaveAttribute('aria-expanded', 'true')
    await header.getByRole('link', { name: 'Auto services', exact: true }).click()
    await expect(page).toHaveURL(/\/services(?:[/?#]|$)/)
})
