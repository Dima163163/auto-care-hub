import { expect, test } from '@playwright/test'

const directRoutes = [
    '/',
    '/services',
    '/services/api-proservice-moscow',
    '/services/api-proservice-moscow/request',
    '/reviews',
    '/for-owners',
    '/help',
    '/login',
    '/register',
    '/profile',
    '/profile/vehicles',
    '/owner/dashboard',
    '/owner/services',
    '/admin/dashboard',
    '/admin/security-center',
    '/super-admin/dashboard',
] as const

test.describe('Next.js direct route runtime', () => {
    test('serves every representative route through the Next shell', async ({ request }) => {
        for (const route of directRoutes) {
            const response = await request.get(route)

            expect(response.status(), route).toBe(200)
            expect(response.headers()['content-type'], route).toContain('text/html')
        }
    })

    test('returns a real 404 for a path outside the route contract', async ({ request }) => {
        const response = await request.get('/this-route-does-not-exist')

        expect(response.status()).toBe(404)
        expect(response.headers()['content-type']).toContain('text/html')
    })

    test('hydrates a direct public URL and keeps the client route after reload', async ({ page }) => {
        await page.goto('/services/api-proservice-moscow')
        await expect(page.getByTestId('provider-gallery')).toBeVisible()

        await page.reload()
        await expect(page).toHaveURL(/\/services\/api-proservice-moscow$/)
        await expect(page.getByTestId('provider-gallery')).toBeVisible()
    })

    test('redirects an unauthenticated direct protected URL to login', async ({ page }) => {
        await page.goto('/profile')

        await expect(page).toHaveURL(/\/login$/)
        await expect(page.locator('#email')).toBeVisible()
    })
})
