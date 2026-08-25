import { expect, test } from '@playwright/test'

test.describe('owner communication settings', () => {
    test('exposes chat switch in the owner provider list and persists it', async ({ page }) => {
        await page.goto('/login')
        await page.locator('#email').fill('sophia.miller@example.com')
        await page.locator('#password').fill('password123')
        await page.getByRole('button', { name: /sign in|войти/i }).click()
        await expect(page).toHaveURL(/\/owner\/dashboard$/)

        await page.goto('/owner/autocare-providers')
        await expect(page.getByTestId('owner-provider-card').first()).toBeVisible()
        const quickChatToggle = page.getByRole('switch', { name: /чаты|chat/i }).first()
        await expect(quickChatToggle).toBeChecked()
        await quickChatToggle.uncheck()
        await expect(quickChatToggle).not.toBeChecked()
        await quickChatToggle.check()
        await expect(quickChatToggle).toBeChecked()
        await page.getByTestId('owner-provider-communication-link').first().click()

        await expect(page).toHaveURL(/\/owner\/autocare-providers\/[^/]+$/)
        await expect(page.getByTestId('owner-communication-settings')).toBeVisible()

        const chatToggle = page.getByTestId('owner-chat-toggle')
        await expect(chatToggle).toBeChecked()
        await chatToggle.uncheck()
        await page.getByRole('button', { name: /сохранить режим связи|save contact settings/i }).click()
        await expect(page.getByRole('status')).toContainText(/сохранены|saved/i)
        await expect(chatToggle).not.toBeChecked()

        await chatToggle.check()
        await page.getByRole('button', { name: /сохранить режим связи|save contact settings/i }).click()
        await expect(page.getByRole('status')).toContainText(/сохранены|saved/i)
        await expect(chatToggle).toBeChecked()

        await page.goto('/profile')
        await expect(page.getByTestId('owner-profile-communication-settings')).toBeVisible()
        await expect(page.getByRole('switch', { name: /чаты клиентов|customer chat/i }).first()).toBeChecked()
        await expect(page.getByRole('switch', { name: /запись по телефону|phone bookings/i }).first()).toBeVisible()
    })
})
