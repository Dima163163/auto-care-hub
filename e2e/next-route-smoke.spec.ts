import { expect, test } from '@playwright/test'

const directRoutes = [
    '/',
    '/services',
    '/reviews',
    '/features',
    '/for-owners',
    '/about',
    '/favorites',
    '/notifications',
    '/chats',
    '/blog',
    '/partners',
    '/contacts',
    '/help',
    '/agreement',
    '/rules',
    '/privacy',
    '/cabinets',
    '/login',
    '/login/callback',
    '/register',
    '/forgot-password',
    '/password/setup',
    '/password/reset',
    '/verify-email',
    '/onboarding',
    '/profile',
    '/profile/vehicles',
    '/profile/bookings',
    '/profile/reviews',
    '/owner/dashboard',
    '/owner/autocare-providers',
    '/owner/cabinets',
    '/owner/cabinets/create',
    '/owner/bookings',
    '/owner/autocare-requests',
    '/owner/reviews',
    '/owner/clients',
    '/owner/services',
    '/owner/chats',
    '/admin/dashboard',
    '/admin/users',
    '/admin/owners',
    '/admin/cabinets',
    '/admin/reviews',
    '/admin/platform-reviews',
    '/admin/audit-logs',
    '/admin/security-center',
    '/admin/chats',
    '/super-admin/dashboard',
    '/super-admin/chats',
] as const

const dynamicRoutes = [
    '/services/api-proservice-moscow',
    '/services/api-proservice-moscow/',
    '/services/api-proservice-moscow/request',
    '/services/api-proservice-moscow/request/',
    '/services/api-proservice-moscow/request?service=oil-change',
    '/cabinets/cabinet-1',
    '/owner/autocare-providers/provider-1',
    '/owner/autocare-providers/provider-1/reviews',
    '/owner/cabinets/provider-1/edit',
] as const

test.describe('Next.js direct route runtime', () => {
    test('serves every representative route through the Next shell', async ({ request }) => {
        for (const route of directRoutes) {
            const response = await request.get(route)

            expect(response.status(), route).toBe(200)
            expect(response.headers()['content-type'], route).toContain('text/html')
        }
    })

    test('serves every dynamic route variant through the Next shell', async ({ request }) => {
        for (const route of dynamicRoutes) {
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
