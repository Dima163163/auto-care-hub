import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page, email: string) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.locator('#email').fill(email)
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: /sign in|войти/i }).click()
    await expect(page).not.toHaveURL(/\/login/)
}

test.describe('selected design interactions', () => {
    test.setTimeout(60_000)
    test('conversation and back action preserve the responsive thread flow', async ({ page }) => {
        await signIn(page, 'emily.carter@example.com')
        await page.goto('/chats')
        const threads = page.getByTestId('chat-thread-list')
        await expect(threads).toBeVisible()
        await threads.getByRole('button', { name: /Диагностика тормозной системы|Brake system diagnosis/i }).click()
        const conversation = page.getByTestId('chat-conversation-view')
        await expect(conversation.getByRole('textbox', { name: /Напишите сообщение|Write a message/i })).toBeEnabled()
        if ((page.viewportSize()?.width ?? 0) < 1024) {
            await expect(threads).toBeHidden()
            const composer = conversation.getByRole('textbox', { name: /Напишите сообщение|Write a message/i })
            await composer.scrollIntoViewIfNeeded()
            const bounds = await composer.boundingBox()
            expect(bounds).not.toBeNull()
            expect(bounds!.y + bounds!.height).toBeLessThan((page.viewportSize()?.height ?? 0) - 64)
            await conversation.getByRole('button', { name: /К списку чатов|Back to chats/i }).click()
            await expect(threads).toBeVisible()
            await expect(conversation).toBeHidden()
            await expect(page).not.toHaveURL(/[?&](?:chat|request|providerId)=/)
        } else {
            await expect(threads).toBeVisible()
        }
    })

    test('switching provider sections preserves an unfinished evidence reference', async ({ page }) => {
        await signIn(page, 'sophia.miller@example.com')
        await page.goto('/owner/autocare-providers/api-proservice-moscow')
        await page.locator('button[aria-controls="provider-section-profile"]').click()
        await page.getByRole('button', { name: /Добавить документ|Add document/i }).click()
        const label = page.locator('input[name="documentLabel"]')
        await label.fill('Design verification draft')
        await page.locator('button[aria-controls="provider-section-team"]').click()
        await expect(label).toBeHidden()
        await page.locator('button[aria-controls="provider-section-profile"]').click()
        await expect(label).toHaveValue('Design verification draft')
    })

    test('assigned staff sees the correct provider context and scoped request link', async ({ page }) => {
        await signIn(page, 'ilya.orlov@proservice.test')
        await page.goto('/owner/dashboard')
        const assignments = page.getByRole('heading', { name: /Назначенные сервисы и филиалы|Assigned providers and branches/i }).locator('..').locator('..')
        await expect(assignments.getByRole('heading', { name: 'ProService', exact: true })).toBeVisible()
        await expect(assignments.getByText(/ул\. Льва Толстого, 18/)).toBeVisible()
        await assignments.getByRole('link', { name: /Открыть заявки|Open requests/i }).click()
        await expect(page).toHaveURL(/\/owner\/autocare-requests\?provider=api-proservice-moscow$/)
        await expect(page.getByTestId('owner-capacity-calendar')).toBeVisible()
    })

    test('owner can reach every offer field inside a bounded chat', async ({ page }) => {
        await signIn(page, 'sophia.miller@example.com')
        await page.goto('/owner/chats')
        await page.getByTestId('chat-thread-list').getByRole('button', { name: /Диагностика тормозной системы|Brake system diagnosis/i }).click()
        const conversation = page.getByTestId('chat-conversation-view')
        await conversation.getByRole('button', { name: /Предложить вариант|Suggest an option/i }).click()
        const description = conversation.getByRole('textbox', { name: /^(?:Описание|Description)$/i })
        await description.fill('Draft offer for design verification')
        const sendOffer = conversation.getByRole('button', { name: /Отправить предложение|Send offer/i })
        await sendOffer.scrollIntoViewIfNeeded()
        const bounds = await sendOffer.boundingBox()
        const chatBounds = await sendOffer.locator('xpath=ancestor::section[1]').boundingBox()
        expect(bounds).not.toBeNull()
        expect(chatBounds).not.toBeNull()
        expect(bounds!.y).toBeGreaterThanOrEqual(chatBounds!.y)
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(chatBounds!.y + chatBounds!.height)
        await expect(description).toHaveValue('Draft offer for design verification')
        await conversation.getByRole('button', { name: /^(?:Закрыть|Close)$/i }).click()
        await expect(sendOffer).toBeHidden()
        await expect(conversation.getByRole('textbox', { name: /Напишите сообщение|Write a message/i })).toBeEnabled()
    })

    test('mobile request summary stays available beside the final action', async ({ page }) => {
        await signIn(page, 'emily.carter@example.com')
        await page.goto('/services/api-proservice-moscow/request?service=oil-change')
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
        const time = page.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first()
        await time.click()
        const selectedTime = await time.innerText()
        await expect(time).toHaveAttribute('aria-pressed', 'true')
        const submit = page.getByRole('button', { name: /Отправить запрос на запись|Send appointment request/i })
        await expect(submit).toBeVisible()
        if ((page.viewportSize()?.width ?? 0) < 1024) {
            const summary = page.getByRole('region', { name: /Проверьте услугу и время|Review the service and time/i })
            await expect(summary).toBeVisible()
            await expect(summary).toContainText('ProService')
            await expect(summary).toContainText('Europe/Moscow')
            await expect(summary).toContainText(selectedTime)
            const summaryBounds = await summary.boundingBox()
            const submitBounds = await submit.boundingBox()
            expect(summaryBounds!.y + summaryBounds!.height).toBeLessThanOrEqual(submitBounds!.y)
        }
    })
})
