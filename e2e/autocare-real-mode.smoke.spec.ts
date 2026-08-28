import { expect, test, type Page } from '@playwright/test'

const apiBaseUrl = process.env.REAL_API_BASE_URL ?? 'http://127.0.0.1:4000'
const demoPassword = '123456'

async function signIn(page: Page, email: string) {
    await page.goto('/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(demoPassword)

    const loginButton = page.getByRole('button', { name: /sign in|войти/i })
    const loginResponse = page.waitForResponse((response) =>
        response.url().includes('/api/auth/login')
        && response.request().method() === 'POST',
    )
    await loginButton.click()

    const response = await loginResponse
    if (response.status() === 429) {
        // The real suite intentionally exercises several isolated sessions.
        // They share a loopback IP, so a long run can legitimately hit the
        // production login limiter. Honour Retry-After instead of weakening
        // the server policy or masking a failed login.
        const retryAfterSeconds = Number(response.headers()['retry-after'] ?? '1')
        const retryAfterMs = Math.min(
            Math.max(Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1_000 : 1_000, 1_000),
            75_000,
        )
        await page.waitForTimeout(retryAfterMs + 100)

        const retryResponse = page.waitForResponse((retry) =>
            retry.url().includes('/api/auth/login')
            && retry.request().method() === 'POST',
        )
        await loginButton.click()
        await expect((await retryResponse).ok()).toBe(true)
    }

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

    test('real API hydrates every public provider route variant', async ({ page }) => {
        for (const route of [
            '/services/api-proservice-moscow',
            '/services/api-proservice-moscow/',
            '/services/api-proservice-moscow/request',
            '/services/api-proservice-moscow/request/',
            '/services/api-proservice-moscow/request?service=oil-change',
        ]) {
            await page.goto(route)
            await expect(page.getByRole('main'), route).toBeVisible()
        }
    })

    test('real API keeps a repeated request idempotent in PostgreSQL', async ({ page }) => {
        await signIn(page, 'client.demo@autocarehub.test')

        const result = await page.evaluate(async () => {
            const csrfResponse = await fetch('/api/auth/csrf')
            const csrf = await csrfResponse.json() as { csrfToken?: string }
            if (!csrf.csrfToken) throw new Error('Real API did not return a CSRF token.')

            // Refresh once inside the test page and keep the returned access
            // token local to this isolated API flow. Navigating to a cabinet
            // can start another refresh rotation in parallel and revoke the
            // session while the idempotency assertions are running.
            const sessionResponse = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: { 'x-csrf-token': csrf.csrfToken },
            })
            const session = await sessionResponse.json() as { accessToken?: string }
            if (!session.accessToken) throw new Error('Real API did not return an access token.')
            const token = session.accessToken
            const authorization = { Authorization: `Bearer ${token}` }

            const discoveryResponse = await fetch('/api/v1/discovery/providers?serviceId=oil-change&marketId=moscow&radiusKm=25&limit=8', {
                headers: authorization,
            })
            const discovery = await discoveryResponse.json() as {
                items?: Array<{
                    provider?: { id?: string; location?: { id?: string } }
                    offer?: { id?: string; bookingMode?: string }
                }>
            }
            const item = discovery.items?.find((candidate) => candidate.offer?.bookingMode === 'request') ?? discovery.items?.[0]
            const providerId = item?.provider?.id
            const locationId = item?.provider?.location?.id
            const offeringId = item?.offer?.id
            if (!providerId || !locationId || !offeringId) {
                throw new Error('Real discovery did not return a request-capable provider offering.')
            }

            const idempotencyKey = `real-e2e-request-${crypto.randomUUID()}`
            const body = {
                providerId,
                locationId,
                offeringId,
                preferredAt: '2099-02-15T10:00:00+03:00',
                vehicleId: null,
                vehicleSnapshot: null,
                contactSnapshot: {
                    name: 'Demo Client',
                    email: 'client.demo@autocarehub.test',
                    phone: '+79990000000',
                },
                note: 'Real API idempotency smoke request.',
            }
            const headers = {
                'content-type': 'application/json',
                'x-csrf-token': csrf.csrfToken,
                'idempotency-key': idempotencyKey,
                ...authorization,
            }
            const firstResponse = await fetch('/api/v1/service-requests', {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            })
            const firstPayload = await firstResponse.json() as unknown
            const first = firstPayload as { id?: string }
            const secondResponse = await fetch('/api/v1/service-requests', {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            })
            const secondPayload = await secondResponse.json() as unknown
            const second = secondPayload as { id?: string }
            const requestsResponse = await fetch('/api/v1/service-requests/my', { headers: authorization })
            const requestsPayload = await requestsResponse.json() as unknown
            const requests = Array.isArray(requestsPayload) ? requestsPayload as Array<{ id?: string }> : []

            return {
                firstStatus: firstResponse.status,
                secondStatus: secondResponse.status,
                firstId: first.id,
                secondId: second.id,
                persistedCount: requests.filter((request) => request.id === first.id).length,
                firstPayload,
                secondPayload,
                tokenLength: token.length,
                requestsStatus: requestsResponse.status,
                requestsPayloadType: Array.isArray(requestsPayload) ? 'array' : typeof requestsPayload,
            }
        })

        expect(result.firstStatus, JSON.stringify(result)).toBe(200)
        expect(result.secondStatus, JSON.stringify(result)).toBe(200)
        expect(result.firstId).toBeTruthy()
        expect(result.secondId).toBe(result.firstId)
        expect(result.persistedCount).toBe(1)
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
