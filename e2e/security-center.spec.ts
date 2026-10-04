import { expect, test } from '@playwright/test'

test.describe('Security Center investigation details', () => {
    test('opens responsive details and supports assignment controls', async ({ page }, testInfo) => {
        await page.goto('/login', { waitUntil: 'networkidle' })
        await page.locator('#email').fill('admin@autocarehub.test')
        await page.locator('#password').fill('password123')
        await page.getByRole('button', { name: /sign in/i }).click()
        await expect(page).toHaveURL(/\/(?:admin|super-admin)\/dashboard$/)

        await page.goto('/admin/security-center', { waitUntil: 'networkidle' })
        await expect(page.getByRole('heading', { name: 'Security center' })).toBeVisible()

        // A cold query briefly renders a non-interactive empty-state row.
        const eventRow = page.locator('tbody tr[tabindex="0"]').first()
        await expect(eventRow).toBeVisible()
        await eventRow.focus()
        await expect(eventRow).toBeFocused()
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

    test('waits for actionable events during a slow initial query', async ({ page }) => {
        await page.goto('/login', { waitUntil: 'domcontentloaded' })
        await page.locator('#email').fill('admin@autocarehub.test')
        await page.locator('#password').fill('password123')
        await page.getByRole('button', { name: /sign in/i }).click()
        await expect(page).toHaveURL(/\/(?:admin|super-admin)\/dashboard$/)

        // Wrap the already installed MSW fetch, then navigate within the SPA.
        // Hold only the events query until the placeholder has been inspected.
        await page.evaluate(() => {
            const originalFetch = window.fetch.bind(window)
            window.fetch = async (input, init) => {
                const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
                if (new URL(requestUrl, location.origin).pathname === '/api/admin/security-center/events') {
                    await new Promise<void>((resolve) => window.addEventListener('autocare-test-release-events', () => resolve(), { once: true }))
                }
                return originalFetch(input, init)
            }
        })
        const mobileMenu = page.getByRole('button', { name: 'Menu', exact: true })
        if (await mobileMenu.isVisible()) await mobileMenu.click()
        await page.locator('a[href="/admin/security-center"]:visible').first().click()
        await expect(page.getByRole('heading', { name: 'Security center' })).toBeVisible()
        const placeholder = page.locator('tbody tr').first()
        await expect(placeholder).toBeVisible()
        await expect(placeholder).not.toHaveAttribute('tabindex', '0')
        await placeholder.press('Enter')
        const details = page.getByTestId('security-center-detail-drawer')
        await expect(details.getByText('Investigation timeline')).toHaveCount(0)
        await page.evaluate(() => window.dispatchEvent(new Event('autocare-test-release-events')))
        const eventRow = page.locator('tbody tr[tabindex="0"]').first()
        await expect(eventRow).toBeVisible()
        await eventRow.focus()
        await expect(eventRow).toBeFocused()
        await eventRow.press('Space')
        await expect(details).toBeVisible()
        await expect(details.getByText('Investigation timeline')).toBeVisible()
    })

})
