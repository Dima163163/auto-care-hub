import { expect, test } from '@playwright/test'

test.describe('profile preference accessibility', () => {
    test('keeps notification switches named, described, and keyboard focusable', async ({ page }) => {
        await page.goto('/login')
        await page.locator('#email').fill('emily.carter@example.com')
        await page.locator('#password').fill('password123')
        await page.getByRole('button', { name: /sign in/i }).click()
        await expect(page).toHaveURL(/\/profile$/)

        await page.setViewportSize({ width: 320, height: 844 })
        await page.goto('/profile')

        const emailToggle = page.getByRole('checkbox', { name: /email notifications$/i })
        const bookingToggle = page.getByRole('checkbox', { name: /booking email updates/i })

        await expect(emailToggle).toHaveAttribute('aria-describedby', 'email-notifications-description')
        await expect(bookingToggle).toHaveAttribute('aria-describedby', 'booking-email-notifications-description')

        await emailToggle.focus()
        await expect(emailToggle).toBeFocused()
        await expect(page.getByTestId('email-notifications-track')).toHaveClass(/peer-focus-visible:ring-2/)

        await page.getByRole('switch', { name: /switch to dark theme/i }).click()
        await bookingToggle.focus()
        await expect(bookingToggle).toBeFocused()
        await expect(page.getByTestId('booking-email-notifications-track')).toHaveClass(/peer-focus-visible:ring-2/)
        await expect(page.locator('html')).toHaveClass(/dark/)
    })

    test('exposes profile sections as URL-synchronized tabs', async ({ page }) => {
        await page.goto('/login')
        await page.locator('#email').fill('emily.carter@example.com')
        await page.locator('#password').fill('password123')
        await page.getByRole('button', { name: /sign in/i }).click()
        await expect(page).toHaveURL(/\/profile$/)

        const securityTab = page.getByRole('tab', { name: 'Security' })
        await expect(page.getByRole('tablist')).toBeVisible()
        await expect(page.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true')
        await expect(securityTab).toHaveAttribute('aria-selected', 'false')

        await securityTab.click()

        await expect(page).toHaveURL(/\/profile\?tab=security$/)
        await expect(securityTab).toHaveAttribute('aria-selected', 'true')
        await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'profile-tab-security')
    })

    test('supports arrow and boundary keyboard navigation between profile tabs', async ({ page }) => {
        await page.goto('/login')
        await page.locator('#email').fill('emily.carter@example.com')
        await page.locator('#password').fill('password123')
        await page.getByRole('button', { name: /sign in/i }).click()
        await expect(page).toHaveURL(/\/profile$/)

        const generalTab = page.getByRole('tab', { name: 'General' })

        await generalTab.focus()
        await generalTab.press('End')
        await expect(page.getByRole('tab', { name: 'Sessions' })).toHaveAttribute('aria-selected', 'true')

        await page.getByRole('tab', { name: 'Sessions' }).press('ArrowLeft')
        await expect(page.getByRole('tab', { name: 'Security' })).toHaveAttribute('aria-selected', 'true')

        await page.getByRole('tab', { name: 'Security' }).press('Home')
        await expect(generalTab).toHaveAttribute('aria-selected', 'true')
    })
})
