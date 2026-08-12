import { expect, test } from '@playwright/test'

test.describe('Security Center investigation details', () => {
    test('opens responsive details and supports assignment controls', async ({ page }, testInfo) => {
        await page.goto('/login', { waitUntil: 'networkidle' })
        await page.locator('#email').fill('admin@autocarehub.test')
        await page.locator('#password').fill('password123')
        await page.getByRole('button', { name: /sign in/i }).click()
        await expect(page).toHaveURL(/\/admin\/dashboard$/)

        await page.goto('/admin/security-center', { waitUntil: 'networkidle' })
        await expect(page.getByRole('heading', { name: 'Security center' })).toBeVisible()

        const eventRow = page.locator('tbody tr').first()
        await expect(eventRow).toBeVisible()
        await eventRow.focus()
        await eventRow.press('Enter')

        const details = page.getByTestId('security-center-detail-drawer')
        await expect(details).toBeVisible()
        await expect(details.getByText('Investigation timeline')).toBeVisible()

        if (testInfo.project.name === 'mobile-chromium') {
            await expect.poll(async () => page.evaluate(() => {
                const drawer = document.querySelector('[data-testid="security-center-detail-drawer"]')
                return drawer ? window.getComputedStyle(drawer).position : null
            })).toBe('fixed')
        }

        await page.getByRole('button', { name: 'Assign to me' }).click()
        await expect(page.getByRole('button', { name: 'Remove assignment' })).toBeVisible()

        await page.getByRole('button', { name: 'Remove assignment' }).click()
        await expect(page.getByRole('button', { name: 'Assign to me' })).toBeVisible()

        await details.getByRole('button', { name: 'Close' }).click()
        if (testInfo.project.name === 'mobile-chromium') {
            await expect(details).not.toBeVisible()
        } else {
            await expect(details.getByText('Select an event')).toBeVisible()
        }

        const mitigationIp = testInfo.project.name === 'mobile-chromium'
            ? '192.0.2.102'
            : testInfo.project.name === 'tablet-chromium'
                ? '192.0.2.101'
                : '192.0.2.103'
        await page.getByLabel('IP address').fill(mitigationIp)
        await page.getByLabel('Reason').fill('Browser contract recovery test')
        await page.getByLabel('Duration').selectOption('15')
        await page.getByRole('button', { name: 'Block IP temporarily' }).click()
        await expect(page.getByText(mitigationIp, { exact: true })).toBeVisible()
        await expect(page.getByText('Browser contract recovery test', { exact: true })).toBeVisible()

        await page.getByRole('button', { name: 'Extend block' }).click()
        const extensionDialog = page.getByRole('dialog')
        await expect(extensionDialog).toBeVisible()
        await extensionDialog.getByLabel('Additional duration').selectOption('60')
        await extensionDialog.getByRole('button', { name: 'Extend block' }).click()
        await expect(extensionDialog).not.toBeVisible()
        await expect(page.getByText('Temporary IP block extended.')).toBeVisible()

        await page.getByRole('button', { name: 'Revoke block' }).click()
        const revokeDialog = page.getByRole('dialog')
        await expect(revokeDialog).toBeVisible()
        await expect(revokeDialog.getByText(mitigationIp, { exact: true })).toBeVisible()
        await revokeDialog.getByRole('button', { name: 'Revoke block' }).click()
        await expect(revokeDialog).not.toBeVisible()
        await expect(page.getByRole('code').filter({ hasText: mitigationIp })).not.toBeVisible()
    })
})
