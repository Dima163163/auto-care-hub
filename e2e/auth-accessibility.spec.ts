import { expect, test } from '@playwright/test'

test.describe('authentication accessibility contracts', () => {
    test('keeps one primary landmark and heading on auth routes', async ({ page }) => {
        for (const route of ['/login', '/register']) {
            await page.goto(route)

            await expect(page.locator('main')).toHaveCount(1)
            await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
        }
    })

    test('focuses the first invalid field and wires its error', async ({ page }) => {
        await page.goto('/login')
        await page.getByRole('button', { name: /sign in/i }).click()

        const email = page.locator('#email')
        const emailError = page.locator('#login-email-error')

        await expect(email).toHaveAttribute('aria-invalid', 'true')
        await expect(email).toHaveAttribute('aria-describedby', 'login-email-error')
        await expect(emailError).toHaveAttribute('role', 'alert')
        await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('email')
    })

    test('moves focus to an API error without exposing secret details', async ({ page }) => {
        await page.goto('/login')
        await page.locator('#email').fill('unknown@example.com')
        await page.locator('#password').fill('password123')
        await page.getByRole('button', { name: /sign in/i }).click()

        const formError = page.locator('#login-form-error')
        await expect(formError).toContainText(/invalid email or password/i)
        await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('login-form-error')
    })

    test('connects register field errors to accessible descriptions', async ({ page }) => {
        await page.goto('/register')
        await page.getByRole('button', { name: /create account/i }).click()

        const name = page.locator('#name')
        await expect(name).toHaveAttribute('aria-invalid', 'true')
        await expect(name).toHaveAttribute('aria-describedby', 'register-name-error')
        await expect(page.locator('#register-name-error')).toHaveAttribute('role', 'alert')
    })

    test('clears identity-scoped PWA cache when switching accounts', async ({ page }) => {
        await page.goto('/login')
        await page.locator('#email').fill('emily.carter@example.com')
        await page.locator('#password').fill('password123')
        await page.getByRole('button', { name: /sign in/i }).click()
        await expect(page).toHaveURL(/\/profile$/)

        await page.evaluate(async () => {
            const privateCache = await caches.open('autocare-hub-private-client-1')
            await privateCache.put('/private-resource', new Response('private'))

            const publicCache = await caches.open('autocare-hub-public-providers')
            await publicCache.put('/api/cabinets', new Response('{"items":[]}'))
        })

        const logoutButton = page.getByRole('button', { name: /logout/i }).last()

        await Promise.all([
            page.waitForResponse((response) =>
                response.url().endsWith('/api/auth/logout') && response.ok(),
            ),
            logoutButton.click(),
        ])
        await expect(page).toHaveURL(/\/$/)
        await expect.poll(() => page.evaluate(() => caches.keys())).toContain(
            'autocare-hub-public-providers',
        )
        await expect.poll(() => page.evaluate(() => caches.keys())).not.toContain(
            'autocare-hub-private-client-1',
        )

        const ownerPage = await page.context().newPage()
        try {
            await ownerPage.goto('/login')
            await ownerPage.locator('#email').fill('sophia.miller@example.com')
            await ownerPage.locator('#password').fill('password123')
            await ownerPage.getByRole('button', { name: /sign in/i }).click()
            await expect(ownerPage).toHaveURL(/\/owner\/dashboard/)
            await expect.poll(() => ownerPage.evaluate(() => caches.keys())).toContain(
                'autocare-hub-public-providers',
            )
            await expect.poll(() => ownerPage.evaluate(() => caches.keys())).not.toContain(
                'autocare-hub-private-client-1',
            )
        } finally {
            await ownerPage.close()
        }
    })
})
