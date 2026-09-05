import { expect, test, type Page } from '@playwright/test'

const apiBaseUrl = process.env.REAL_API_BASE_URL ?? 'http://127.0.0.1:4000'
const demoPassword = '123456'

async function signIn(page: Page, email: string) {
    await page.goto('/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(demoPassword)

    const loginButton = page.getByRole('button', { name: /sign in|войти/i })
    const sessionHydrated = page.waitForResponse((response) =>
        response.url().includes('/api/auth/me')
        && response.request().method() === 'GET'
        && response.status() === 200,
        { timeout: 10_000 },
    ).catch(() => null)
    const loginResponse = page.waitForResponse((response) =>
        response.url().includes('/api/auth/login')
        && response.request().method() === 'POST',
    )
    await loginButton.click()

    let response = await loginResponse
    // Each test intentionally creates an isolated session. The backend keeps
    // the production IP limiter enabled, so a long serial smoke run may share
    // the loopback bucket. Wait for the advertised window rather than turning
    // the limiter off or accepting a failed sign-in.
    while (response.status() === 429) {
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
        response = await retryResponse
    }

    await expect(response.ok(), await response.text()).toBe(true)
    await expect(page).not.toHaveURL(/\/login/)
    // Login resets the RTK API cache after the token response is normalized.
    // Wait for the post-reset session query before navigating again; otherwise
    // a fast route change can abort the hydration request and look like an
    // expired session in branch-scoped owner flows.
    await sessionHydrated
}

type InjectedRequestState = 'error' | 'offline' | 'permission-denied' | 'stale' | 'suspended'

async function injectRequestStateSequence(page: Page) {
    let currentState: InjectedRequestState = 'error'

    await page.route(/\/api\/v1\/service-requests\/my(?:\?|$)/, async (route) => {
        if (currentState === 'offline') {
            await route.abort('internetdisconnected')
            return
        }

        const status = currentState === 'permission-denied' ? 403 : currentState === 'suspended' ? 423 : currentState === 'stale' ? 503 : 500
        await route.fulfill({
            status,
            contentType: 'application/json',
            body: JSON.stringify({
                code: currentState === 'permission-denied' ? 'FORBIDDEN' : currentState === 'suspended' ? 'ACCOUNT_SUSPENDED' : currentState === 'stale' ? 'STALE_DATA' : 'INTERNAL_ERROR',
                message: `Injected ${currentState} response`,
            }),
        })
    })

    return (state: InjectedRequestState) => {
        currentState = state
    }
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

async function injectRealStaleAfterDiscoveryCacheFill(page: Page) {
    let discoveryRequests = 0

    await page.route(/\/api\/v1\/discovery\/providers(?:\?|$)/, async (route) => {
        discoveryRequests += 1
        if (discoveryRequests === 1) {
            await route.continue()
            return
        }

        await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({
                statusCode: 503,
                code: 'STALE_DATA',
                message: 'The provider list is temporarily stale.',
            }),
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

async function failNextRealRequestSubmission(page: Page, failure: 'offline' | 'timeout') {
    let failed = false

    await page.route(/\/api\/v1\/service-requests(?:\?|$)/, async (route) => {
        if (failed) {
            await route.continue()
            return
        }

        failed = true
        if (failure === 'offline') {
            await route.abort('internetdisconnected')
            return
        }

        await new Promise((resolve) => setTimeout(resolve, 250))
        await route.abort('timedout')
    })
}

async function findRequestCapableProviderId(page: Page) {
    return page.evaluate(async () => {
        const response = await fetch('/api/v1/discovery/providers?serviceId=oil-change&marketId=moscow&radiusKm=25&limit=8')
        if (!response.ok) {
            throw new Error(`Discovery failed with status ${response.status}.`)
        }

        const payload = await response.json() as {
            items?: Array<{ provider?: { id?: string }; offer?: { bookingMode?: string } }>
        }
        const item = payload.items?.find((candidate) => candidate.offer?.bookingMode === 'request') ?? payload.items?.[0]
        if (!item?.provider?.id) {
            throw new Error('Discovery did not return a provider for the request flow.')
        }

        return item.provider.id
    })
}

test.describe('AutoCare real API smoke', () => {
    // A valid rate-limit response can require waiting for a one-minute window.
    // Keeping the full real suite serial makes its database evidence
    // deterministic, so give every case enough time to honour that response.
    test.describe.configure({ timeout: 120_000 })

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

    test('real provider profiles expose every supported communication mode', async ({ page, request }) => {
        const discoveryResponse = await request.get(`${apiBaseUrl}/v1/discovery/providers?marketId=moscow&radiusKm=25&limit=50`)
        expect(discoveryResponse.ok()).toBe(true)
        const payload = await discoveryResponse.json() as {
            items?: Array<{ provider?: { id?: string; communicationMode?: string; chatEnabled?: boolean; phone?: string | null }; offer?: { serviceSlug?: string } }>
        }
        const providers = payload.items?.map((item) => item.provider).filter((provider): provider is NonNullable<typeof provider> => Boolean(provider?.id)) ?? []
        const byMode = new Map(providers.map((provider) => [provider.communicationMode, provider]))

        for (const mode of ['online', 'request_then_confirm', 'phone_only'] as const) {
            const provider = byMode.get(mode)
            expect(provider, `No real provider was seeded for communication mode ${mode}.`).toBeTruthy()
            expect(provider?.id).toBeTruthy()

            await page.goto(`/services/${provider!.id}`)
            await expect(page.getByRole('main')).toBeVisible()

            if (mode === 'online') {
                await expect(page.getByRole('heading', { name: /your booking|ваша запись/i })).toBeVisible()
                await expect(page.locator('a[href*="/request?"]').first()).toBeVisible()
            } else if (mode === 'request_then_confirm') {
                await expect(page.getByRole('heading', { name: /request first, confirm next|сначала заявка, затем подтверждение/i })).toBeVisible()
                await expect(page.getByRole('link', { name: /call the service|позвонить в сервис/i }).first()).toBeVisible()
                await expect(page.getByRole('heading', { name: /your booking|ваша запись/i })).toHaveCount(0)
            } else {
                await expect(page.getByRole('heading', { name: /book by phone|запись по телефону/i })).toBeVisible()
                await expect(page.getByRole('link', { name: /call the service|позвонить в сервис/i }).first()).toBeVisible()
                await expect(page.locator('a[href*="/request?"]').first()).toHaveCount(0)
                await expect(page.getByRole('heading', { name: /request this service|запросить услугу/i })).toHaveCount(0)
            }
        }
    })

    test('real public route renders a retryable state for a removed provider', async ({ page }) => {
        await page.goto('/services/00000000-0000-0000-0000-000000000404')
        await expect(page.getByRole('main')).toContainText(/failed to load|не удалось загрузить|not found|не найден/i)
        await expect(page.getByRole('button', { name: /retry|повторить/i })).toBeVisible()
    })

    test('real discovery keeps available providers visible for a partial response', async ({ page }) => {
        await injectPartialDiscovery(page)
        await page.goto('/services?service=oil-change')
        await expect(page.getByRole('main')).toBeVisible({ timeout: 15_000 })
        await expect(page.locator('[data-state="partial"]')).toBeVisible({ timeout: 15_000 })
        await expect(page.locator('#search-results article').first()).toBeVisible({ timeout: 15_000 })
    })

    test('real discovery keeps cached providers visible when refresh becomes stale', async ({ page }) => {
        test.setTimeout(90_000)
        await injectRealStaleAfterDiscoveryCacheFill(page)
        await page.goto('/services?service=oil-change')

        const firstCard = page.locator('#search-results article').first()
        await expect(firstCard).toBeVisible({ timeout: 15_000 })

        await page.getByRole('combobox').last().selectOption('price_asc')
        await page.getByRole('button', { name: /start search|начать поиск/i }).click()

        await expect(firstCard).toBeVisible({ timeout: 15_000 })
        const staleState = page.locator('[data-state="stale-error"]')
        await expect(staleState).toBeVisible({ timeout: 15_000 })
        await expect(staleState).toContainText(/failed to load|не удалось загрузить/i)
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

    test('real API logout invalidates the session and protects the next cabinet navigation', async ({ page }) => {
        await signIn(page, 'client.demo@autocarehub.test')

        const result = await page.evaluate(async () => {
            const csrfResponse = await fetch('/api/auth/csrf')
            const csrf = await csrfResponse.json() as { csrfToken?: string }
            if (!csrf.csrfToken) throw new Error('Real API did not return a CSRF token for logout.')

            const logoutResponse = await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'x-csrf-token': csrf.csrfToken },
            })
            const meResponse = await fetch('/api/auth/me')

            return {
                logoutStatus: logoutResponse.status,
                meStatus: meResponse.status,
            }
        })

        expect(result.logoutStatus).toBe(200)
        expect(result.meStatus).toBe(401)

        await page.goto('/profile')
        await expect(page).toHaveURL(/\/login(?:\?[^#]*)?$/)
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

    test('real API hydrates public and owner legacy route variants', async ({ page }) => {
        for (const route of ['/cabinets', '/cabinets/', '/cabinets/cabinet-1', '/cabinets/cabinet-1/']) {
            await page.goto(route)
            await expect(page).toHaveURL(/\/services\/?$/)
            await expect(page.getByRole('main')).toBeVisible()
        }

        await signIn(page, 'owner.demo@autocarehub.test')
        for (const route of [
            '/owner/cabinets',
            '/owner/cabinets/',
            '/owner/cabinets/create',
            '/owner/cabinets/create/',
            '/owner/cabinets/provider-1/edit',
            '/owner/cabinets/provider-1/edit/',
            '/owner/bookings',
            '/owner/bookings/',
        ]) {
            await page.goto(route)
            await expect(page).toHaveURL(/\/owner\/(?:autocare-providers|autocare-requests)(?:\/?(?:\?.*)?)$/)
            await expect(page.getByRole('main')).toBeVisible()
        }
    })

    test('real API hydrates admin legacy route variants', async ({ page }) => {
        await signIn(page, 'admin.demo@autocarehub.test')
        for (const route of ['/admin/cabinets', '/admin/cabinets/']) {
            await page.goto(route)
            await expect(page).toHaveURL(/\/admin\/dashboard\/?$/)
            await expect(page.getByRole('main')).toBeVisible()
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
            let sessionResponse: Response | null = null
            for (let attempt = 0; attempt < 3; attempt += 1) {
                sessionResponse = await fetch('/api/auth/refresh', {
                    method: 'POST',
                    headers: { 'x-csrf-token': csrf.csrfToken },
                })
                if (sessionResponse.status !== 429 || attempt === 2) break
                const retryAfterSeconds = Number(sessionResponse.headers.get('retry-after') ?? '1')
                const retryAfterMs = Math.min(Math.max(Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1_000 : 1_000, 1_000), 75_000)
                await new Promise((resolve) => setTimeout(resolve, retryAfterMs + 100))
            }
            const session = await sessionResponse!.json() as { accessToken?: string; code?: string }
            if (!session.accessToken) throw new Error(`Real API did not return an access token (status ${sessionResponse!.status}, code ${session.code ?? 'unknown'}).`)
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

    for (const failure of ['offline', 'timeout'] as const) {
        test(`real request form recovers after a ${failure} submission failure`, async ({ page }) => {
            test.setTimeout(120_000)
            await signIn(page, 'client.demo@autocarehub.test')
            await failNextRealRequestSubmission(page, failure)
            const providerId = await findRequestCapableProviderId(page)
            const futureDate = new Date()
            futureDate.setDate(futureDate.getDate() + 1)
            const dateParam = futureDate.toISOString().slice(0, 10)
            await page.goto(`/services/${providerId}/request?service=oil-change&date=${dateParam}&time=10:00`)

            const form = page.locator('main form').first()
            const contactInputs = form.locator('input[required]:not([type="checkbox"])')
            await contactInputs.nth(0).fill('Demo Client')
            await contactInputs.nth(1).fill('+79990000000')
            await contactInputs.nth(2).fill('client.demo@autocarehub.test')
            const confirmation = form.locator('input[type="checkbox"]')
            await expect(confirmation).toBeVisible()
            await confirmation.check()

            const submit = form.getByRole('button', { name: /send appointment request|отправить запрос/i })
            await expect(submit).toBeEnabled()
            await submit.click()

            await expect(form.getByRole('alert')).toContainText(/could not send|не удалось отправить/i)
            const retry = form.getByRole('button', { name: /retry|повторить/i })
            await expect(retry).toBeEnabled()
            const retryResponse = page.waitForResponse((response) =>
                response.url().includes('/api/v1/service-requests')
                && response.request().method() === 'POST',
            )
            await retry.click()
            const response = await retryResponse
            const responseBody = await response.text()
            expect(response.ok(), responseBody).toBe(true)

            await expect(page.getByText(/request sent|запрос отправлен/i).first()).toBeVisible()
        })
    }

    test('real API redirects a client away from an admin workspace', async ({ page }) => {
        await signIn(page, 'client.demo@autocarehub.test')
        await page.goto('/admin/dashboard')
        await expect(page).toHaveURL(/\/profile(?:$|[/?#])/)
        await expect(page.getByRole('main')).toBeVisible()
    })

    test('real client shell survives every injected request state', async ({ page }) => {
        await signIn(page, 'client.demo@autocarehub.test')
        const setRequestState = await injectRequestStateSequence(page)

        for (const state of ['error', 'offline', 'permission-denied', 'stale', 'suspended'] as const) {
            setRequestState(state)
            await page.goto('/profile/bookings')
            await expect(page.getByRole('main')).toBeVisible()
            await expect(page.getByRole('alert')).toBeVisible()
        }
    })

    test('real owner and admin shells preserve a recoverable error state', async ({ page }) => {
        const ownerRequestsPattern = /\/api\/owner\/service-requests(?:\?|$)/
        await signIn(page, 'owner.demo@autocarehub.test')
        await page.route(ownerRequestsPattern, async (route) => {
            await route.fulfill({
                status: 503,
                contentType: 'application/json',
                body: JSON.stringify({ code: 'STALE_DATA', message: 'Injected owner state' }),
            })
        })
        await page.goto('/owner/autocare-requests')
        await expect(page.getByRole('main')).toBeVisible()
        await expect(page.getByRole('alert')).toBeVisible()
        await page.unroute(ownerRequestsPattern)

        await page.context().clearCookies()
        const adminProvidersPattern = /\/api\/admin\/autocare-providers(?:\?|$)/
        await signIn(page, 'admin.demo@autocarehub.test')
        await page.route(adminProvidersPattern, async (route) => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Injected admin state' }),
            })
        })
        await page.goto('/admin/dashboard')
        await expect(page.getByRole('main')).toBeVisible()
        await expect(page.getByRole('alert')).toBeVisible()
    })

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

        const ownerRequestsLoaded = page.waitForResponse((response) =>
            response.url().includes('/api/owner/service-requests')
            && response.request().method() === 'GET'
            && response.status() === 200,
            { timeout: 10_000 },
        )
        await page.goto('/owner/autocare-requests')
        await ownerRequestsLoaded
        await expect(page).toHaveURL(/\/owner\/autocare-requests(?:[/?#]|$)/)
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
