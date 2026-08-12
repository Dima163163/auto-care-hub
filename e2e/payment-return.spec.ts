import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page) {
    await page.goto('/login')
    await page.locator('#email').fill('emily.carter@example.com')
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/profile$/)
}

test.describe('payment return verification', () => {
    test('shows success only after the authenticated booking is paid', async ({ page }) => {
        await signIn(page)
        await page.setExtraHTTPHeaders({
            'x-autocarehub-test-payment-status': 'paid',
        })

        await page.goto('/profile/bookings?payment=success&booking_id=booking-1')
        await expect(page.getByText('Payment received')).toBeVisible()
        await expect(page).toHaveURL(/\/profile\/bookings$/)
    })

    test('keeps an unconfirmed success return in pending state', async ({ page }) => {
        await signIn(page)
        await page.goto('/profile/bookings?payment=success&booking_id=booking-1')

        await expect(page.getByText('Payment pending')).toBeVisible()
        await expect(page.getByText('Payment received')).toBeHidden()
        await expect(page).toHaveURL(/\/profile\/bookings$/)
    })

    test('renders cancellation separately and removes the return hint', async ({ page }) => {
        await signIn(page)
        await page.goto('/profile/bookings?payment=cancelled')

        await expect(page.getByText('Payment was cancelled')).toBeVisible()
        await expect(page).toHaveURL(/\/profile\/bookings$/)
    })
})
