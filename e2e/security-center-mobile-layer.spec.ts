import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('Russian compact event dialog stays above the workspace chrome', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 844 })
    await page.addInitScript(() => localStorage.setItem('autocare-hub-locale', 'ru'))
    await page.goto('/login')
    await page.locator('#email').fill('admin@autocarehub.test')
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    await expect(page).toHaveURL(/\/(?:admin|super-admin)\/dashboard$/)
    await page.goto('/admin/security-center')
    const row = page.locator('tbody tr[tabindex="0"]').first()
    await row.focus()
    await row.press('Enter')
    const drawer = page.getByRole('dialog', { name: 'Детали события' })
    await expect(drawer).toBeVisible()
    await expect.poll(() => drawer.evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        return [bounds.top + 8, bounds.bottom - 8].every((y) => {
            const target = document.elementFromPoint(bounds.left + bounds.width / 2, y)
            return target !== null && element.contains(target)
        })
    })).toBe(true)
    const axe = await new AxeBuilder({ page }).include('[data-testid="security-center-detail-drawer"]').analyze()
    expect(axe.violations).toEqual([])
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(row).toBeFocused()
})
