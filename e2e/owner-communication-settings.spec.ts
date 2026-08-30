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

    test('invites a branch manager and surfaces duplicate-scope errors', async ({ page }) => {
        await page.goto('/login')
        await page.locator('#email').fill('sophia.miller@example.com')
        await page.locator('#password').fill('password123')
        await page.getByRole('button', { name: /sign in|войти/i }).click()
        await expect(page).toHaveURL(/\/owner\/dashboard$/)

        await page.goto('/owner/autocare-providers/api-proservice-moscow')
        const team = page.locator('section').filter({ has: page.getByRole('heading', { name: /команда филиала|branch team/i }) }).last()
        await expect(team).toBeVisible()

        const email = `qa.manager+${Date.now()}@autocarehub.test`
        await team.getByLabel(/email сотрудника|staff email/i).fill(email)
        await team.getByLabel(/роль|role/i).selectOption('manager')
        await team.getByRole('button', { name: /пригласить|invite/i }).click()
        await expect(team.getByRole('status')).toContainText(/приглашение создано|invitation created/i)
        await expect(team).toContainText(email)

        await team.getByLabel(/email сотрудника|staff email/i).fill(email)
        await team.getByRole('button', { name: /пригласить|invite/i }).click()
        await expect(team.getByRole('alert')).toContainText(/pending invitation|ожидает/i)

        await team.getByTestId('owner-invitation-revoke').click()
        await expect(team.getByRole('status')).toContainText(/доступ отозван|access revoked/i)
        await expect(team.getByTestId('owner-invitation-revoke')).toHaveCount(0)

        const revokeMember = team.getByTestId('owner-member-revoke').first()
        await expect(revokeMember).toBeVisible()
        await revokeMember.click()
        await expect(team.getByRole('status')).toContainText(/доступ отозван|access revoked/i)
        await expect(team.getByTestId('owner-member-revoke')).toHaveCount(0)
    })
})
