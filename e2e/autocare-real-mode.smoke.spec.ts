import { expect, test, type Page } from '@playwright/test'

const apiBaseUrl = process.env.REAL_API_BASE_URL ?? 'http://127.0.0.1:4000'
const demoPassword = '123456'

async function signIn(page: Page, email: string) {
    await page.goto('/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(demoPassword)
    await page.getByRole('button', { name: /sign in|войти/i }).click()
    await expect(page).not.toHaveURL(/\/login/)
}

type InjectedRequestState = 'error' | 'offline' | 'permission-denied' | 'stale' | 'suspended'

async function injectRequestState(page: Page, state: InjectedRequestState) {
    await page.route(/\/api\/v1\/service-requests\/my(?:\?|$)/, async (route) => {
        if (state === 'offline') {
            await route.abort('internetdisconnected')
            return
        }

        const status = state === 'permission-denied' ? 403 : state === 'suspended' ? 423 : state === 'stale' ? 503 : 500
        await route.fulfill({
            status,
            contentType: 'application/json',
            body: JSON.stringify({
                code: state === 'permission-denied' ? 'FORBIDDEN' : state === 'suspended' ? 'ACCOUNT_SUSPENDED' : state === 'stale' ? 'STALE_DATA' : 'INTERNAL_ERROR',
                message: `Injected ${state} response`,
            }),
        })
    })
}

async function injectPartialDiscovery(page: Page) {
    await page.route(/\/api\/v1\/discovery\/providers(?:\?|$)/, async (route) => {
        const response = await route.fetch()
        const payload = await response.json() as Record<string, unknown>

        await route.fulfill({
            response,
            contentType: 'application/json',
            body: JSON.stringify({ ...payload, partial: true }),
        })
    })
}

async function expireAuthenticatedSession(page: Page) {
    await page.route(/\/api\/auth\/(?:me|refresh)(?:\?|$)/, async (route) => {
        await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ code: 'SESSION_EXPIRED', message: 'Injected expired session' }),
        })
    })
}

test.describe('AutoCare real API smoke', () => {
    test('health, market catalog and discovery are available without MSW', async ({ page, request }) => {
        const liveness = await request.get(`${apiBaseUrl}/health/live`)
        expect(liveness.ok()).toBe(true)

        const readiness = await request.get(`${apiBaseUrl}/health/ready`)
        expect([200, 503]).toContain(readiness.status())
        expect((await readiness.json()).service).toBe('autocare-hub-api')

        const marketsResponse = await request.get(`${apiBaseUrl}/v1/markets`)
        expect(marketsResponse.ok()).toBe(true)
        const markets = await marketsResponse.json() as Array<{ cityCode?: string }>
        expect(markets.length).toBeGreaterThan(0)

        await page.goto('/services?service=oil-change')
        await expect(page.getByRole('main')).toHaveCount(1)
        await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible()
        await expect(page.locator('#comparison-map')).toBeVisible()
        await expect(page.getByText(/mock users|any value for mock login/i)).toHaveCount(0)
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    })

    test('real discovery endpoint returns the selected market contract', async ({ request }) => {
        const marketsResponse = await request.get(`${apiBaseUrl}/v1/markets`)
        expect(marketsResponse.ok()).toBe(true)
        const markets = await marketsResponse.json() as Array<{ cityCode?: string }>
        const marketId = markets.find((market) => market.cityCode === 'moscow')?.cityCode ?? markets[0]?.cityCode
        expect(marketId).toBeTruthy()

        const discoveryResponse = await request.get(`${apiBaseUrl}/v1/discovery/providers?marketId=${encodeURIComponent(marketId!)}&limit=8`)
        expect(discoveryResponse.ok()).toBe(true)
        const payload = await discoveryResponse.json() as { items?: unknown[]; nextCursor?: string | null }
        expect(Array.isArray(payload.items)).toBe(true)
        expect('nextCursor' in payload).toBe(true)
    })

    test('real discovery keeps available providers visible for a partial response', async ({ page }) => {
        await injectPartialDiscovery(page)
        await page.goto('/services?service=oil-change')
        await expect(page.getByRole('main')).toBeVisible()
        await expect(page.locator('[data-state="partial"]')).toBeVisible()
        await expect(page.locator('#search-results article').first()).toBeVisible()
    })

    test('real API keeps protected cabinets behind the expired-session boundary', async ({ page, request }) => {
        const meResponse = await request.get(`${apiBaseUrl}/auth/me`)
        expect(meResponse.status()).toBe(401)

        await page.goto('/profile')
        await expect(page).toHaveURL(/\/login(?:\?reason=session-expired)?$/)
        await expect(page.getByRole('alert').filter({ hasText: /session(?: has)? expired|сессия истекла/i })).toBeVisible()
    })

    test('real API reports an expired active session instead of exposing a protected client page', async ({ page }) => {
        await signIn(page, 'client.demo@autocarehub.test')
        await expireAuthenticatedSession(page)
        await page.goto('/profile/vehicles')
        await expect(page).toHaveURL(/\/login\?reason=session-expired$/)
        await expect(page.getByRole('alert').filter({ hasText: /session(?: has)? expired|сессия истекла/i })).toBeVisible()
    })

    test('real API opens client cabinet and dynamic request routes', async ({ page }) => {
        await signIn(page, 'client.demo@autocarehub.test')
        await page.goto('/profile/vehicles')
        await expect(page.getByRole('main')).toBeVisible()
        await page.goto('/services/api-proservice-moscow/request?service=oil-change')
        await expect(page.getByRole('main')).toBeVisible()
    })

    test('real API redirects a client away from an admin workspace', async ({ page }) => {
        await signIn(page, 'client.demo@autocarehub.test')
        await page.goto('/admin/dashboard')
        await expect(page).toHaveURL(/\/profile(?:$|[/?#])/)
        await expect(page.getByRole('main')).toBeVisible()
    })

    for (const state of ['error', 'offline', 'permission-denied', 'stale', 'suspended'] as const) {
        test(`real client shell survives an injected ${state} request state`, async ({ page }) => {
            await signIn(page, 'client.demo@autocarehub.test')
            await injectRequestState(page, state)
            await page.goto('/profile/bookings')
            await expect(page.getByRole('main')).toBeVisible()
            await expect(page.getByRole('alert')).toBeVisible()
        })
    }

    test('real API opens owner dynamic provider and review routes', async ({ page }) => {
        await signIn(page, 'owner.demo@autocarehub.test')
        await page.goto('/owner/autocare-providers')
        await expect(page.getByRole('main')).toBeVisible()
        await page.goto('/owner/autocare-providers/api-proservice-moscow')
        await expect(page.getByRole('main')).toBeVisible()
        await page.goto('/owner/autocare-providers/api-proservice-moscow/reviews')
        await expect(page.getByRole('main')).toBeVisible()
    })

    test('real API grants a branch-scoped staff member the owner workspace only', async ({ page }) => {
        await signIn(page, 'staff.demo@autocarehub.test')
        await page.goto('/owner/autocare-requests')
        await expect(page.getByRole('main')).toBeVisible()
        await page.goto('/admin/dashboard')
        await expect(page).toHaveURL(/\/owner(?:$|[/?#])/)
    })

    test('real API opens admin workspaces', async ({ page }) => {
        await signIn(page, 'admin.demo@autocarehub.test')
        await page.goto('/admin/dashboard')
        await expect(page.getByRole('main')).toBeVisible()
    })

    test('real API opens super-admin workspace', async ({ page }) => {
        await signIn(page, 'superadmin.demo@autocarehub.test')
        await page.goto('/super-admin/dashboard')
        await expect(page.getByRole('main')).toBeVisible()
    })
})
