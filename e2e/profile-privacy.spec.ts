import { expect, test } from '@playwright/test'

test.describe('profile privacy controls', () => {
    test('keeps unavailable optional channels disabled and allows existing consent withdrawal', async ({ page }) => {
        await page.goto('/login')
        await page.locator('#email').fill('emily.carter@example.com')
        await page.locator('#password').fill('password123')
        await page.getByRole('button', { name: /sign in/i }).click()
        await expect(page).toHaveURL(/\/profile$/)
        await page.goto('/profile?tab=account')
        const privacy = page.getByTestId('profile-privacy')
        const analytics = privacy.locator('input[type="checkbox"]').nth(0)
        const marketing = privacy.locator('input[type="checkbox"]').nth(1)
        for (const consent of [analytics, marketing]) {
            if (await consent.isChecked()) {
                await expect(consent).toBeEnabled()
                await consent.click()
            }
            await expect(consent).not.toBeChecked()
            await expect(consent).toBeDisabled()
        }
        await page.reload()
        await expect(analytics).not.toBeChecked()
        await expect(marketing).not.toBeChecked()
        await expect(analytics).toBeDisabled()
        await expect(marketing).toBeDisabled()
    })

    test('exports data and supports cancelling an account deletion request', async ({ page }) => {
        await page.goto('/login')
        await page.locator('#email').fill('emily.carter@example.com')
        await page.locator('#password').fill('password123')
        await page.getByRole('button', { name: /sign in/i }).click()
        await expect(page).toHaveURL(/\/profile$/)

        await page.goto('/profile?tab=account')

        const privacy = page.getByTestId('profile-privacy')
        await expect(privacy).toBeVisible()

        const downloadPromise = page.waitForEvent('download')
        await privacy.getByRole('button', { name: /download data/i }).click()
        const download = await downloadPromise
        expect(download.suggestedFilename()).toMatch(/^autocarehub-my-data-\d{4}-\d{2}-\d{2}\.json$/)

        await privacy.getByRole('button', { name: /request deletion/i }).click()
        await privacy.getByLabel(/reason/i).fill('Privacy test')
        await privacy.getByRole('button', { name: /submit request/i }).click()
        await expect(privacy.getByText(/deletion request is pending/i)).toBeVisible()

        page.once('dialog', (dialog) => void dialog.accept())
        await privacy.getByRole('button', { name: /cancel request/i }).click()
        await expect(privacy.getByRole('button', { name: /request deletion/i })).toBeVisible()
    })
})
