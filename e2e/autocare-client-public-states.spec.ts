import { expect, test, type Page } from '@playwright/test'

const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+lyQqUQAAAABJRU5ErkJggg==',
    'base64',
)

async function signInAsClient(page: Page) {
    await page.goto('/login')
    await page.locator('#email').fill('emily.carter@example.com')
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: /sign in|войти/i }).click()
    await expect(page).toHaveURL(/\/profile/)
}

async function useMockScenario(page: Page, scenario: 'error' | 'stale' | 'offline' | 'permission-denied' | 'suspended', apiPath: string) {
    await page.addInitScript(({ apiPath: path, mockScenario }) => {
        const originalFetch = window.fetch.bind(window)

        window.fetch = (input, init) => {
            const url = typeof input === 'string'
                ? input
                : input instanceof URL
                    ? input.toString()
                    : input.url

            if (!url.includes(path)) return originalFetch(input, init)

            const requestHeaders = input instanceof Request ? input.headers : undefined
            const headers = new Headers(requestHeaders)
            new Headers(init?.headers).forEach((value, key) => headers.set(key, value))
            headers.set('x-autocare-mock-state', mockScenario)

            return originalFetch(input, { ...init, headers })
        }
    }, { apiPath, mockScenario: scenario })
}

async function useReviewFixture(page: Page, fixture: 'empty' | 'one' | 'photos') {
    await page.addInitScript(({ reviewFixture }) => {
        const originalFetch = window.fetch.bind(window)

        window.fetch = (input, init) => {
            const url = typeof input === 'string'
                ? input
                : input instanceof URL
                    ? input.toString()
                    : input.url

            if (!url.includes('/v1/providers/') || !url.includes('/reviews')) return originalFetch(input, init)

            const requestHeaders = input instanceof Request ? input.headers : undefined
            const headers = new Headers(requestHeaders)
            new Headers(init?.headers).forEach((value, key) => headers.set(key, value))
            headers.set('x-autocare-review-fixture', reviewFixture)

            return originalFetch(input, { ...init, headers })
        }
    }, { reviewFixture: fixture })
}

async function useStaleAfterDiscoveryCacheFill(page: Page) {
    await page.addInitScript(() => {
        const originalFetch = window.fetch.bind(window)
        let discoveryRequests = 0

        window.fetch = (input, init) => {
            const url = typeof input === 'string'
                ? input
                : input instanceof URL
                    ? input.toString()
                    : input.url

            if (!url.includes('/v1/discovery/providers')) return originalFetch(input, init)

            discoveryRequests += 1
            if (discoveryRequests === 1) return originalFetch(input, init)

            const requestHeaders = input instanceof Request ? input.headers : undefined
            const headers = new Headers(requestHeaders)
            new Headers(init?.headers).forEach((value, key) => headers.set(key, value))
            headers.set('x-autocare-mock-state', 'stale')
            return originalFetch(input, { ...init, headers })
        }
    })
}

async function failNextRequestSubmission(page: Page, failure: 'offline' | 'timeout') {
    await page.addInitScript(({ failureMode }) => {
        const originalFetch = window.fetch.bind(window)
        let failed = false

        window.fetch = (input, init) => {
            const url = typeof input === 'string'
                ? input
                : input instanceof URL
                    ? input.toString()
                    : input.url
            const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

            if (failed || method !== 'POST' || !url.includes('/api/v1/service-requests')) {
                return originalFetch(input, init)
            }

            failed = true
            if (failureMode === 'offline') {
                return Promise.reject(new TypeError('Failed to fetch'))
            }

            return new Promise((_, reject) => {
                window.setTimeout(() => reject(new TypeError('Request timed out')), 250)
            })
        }
    }, { failureMode: failure })
}

test.describe('public and client AutoCare states', () => {
    test('opens the provider gallery and the service comparison table', async ({ page }) => {
        // The second navigation compiles the dynamic provider route on a cold
        // Next dev server; keep this browser smoke deterministic without
        // relaxing timeouts for the rest of the suite.
        test.setTimeout(60_000)
        await page.goto('/services?service=oil-change')
        const compareButtons = page.getByRole('button', { name: /compare selected|сравнить выбранные/i })
        await expect(compareButtons.first()).toBeVisible()
        await compareButtons.nth(0).click()
        await compareButtons.nth(1).click()
        await expect(page.locator('table')).toBeVisible()

        await page.goto('/services/api-proservice-moscow')
        await expect(page.getByTestId('provider-gallery')).toBeVisible()
        await page.getByTestId('provider-gallery').getByRole('button').last().click()
        const galleryDialog = page.getByRole('dialog', { name: /service gallery|галерея сервиса/i })
        await expect(galleryDialog).toBeVisible()
        await galleryDialog.getByRole('button', { name: /next photo|следующее фото/i }).click()
        await expect(galleryDialog.locator('img').first()).toBeVisible()
    })

    test('renders an explicit empty review state for a provider', async ({ page }) => {
        await useReviewFixture(page, 'empty')
        await page.goto('/services/api-proservice-moscow')

        await expect(page.locator('#reviews')).toContainText(/no reviews for this service yet|no published reviews|отзывов пока нет/i)
    })

    test('renders a single published review fixture without collapsing the review section', async ({ page }) => {
        await useReviewFixture(page, 'one')
        await page.goto('/services/api-proservice-moscow')

        await expect(page.locator('#reviews')).toBeVisible()
        await expect(page.locator('#reviews article')).toHaveCount(1)
    })

    test('renders a one-review fixture with customer photos', async ({ page }) => {
        await useReviewFixture(page, 'photos')
        await page.goto('/services/api-proservice-moscow')

        await expect(page.locator('#reviews img[alt="Фото из отзыва"]')).toHaveCount(1)
    })

    test('renders a recoverable not-found state for a removed provider profile', async ({ page }) => {
        await page.goto('/services/provider-removed-from-public-catalog')

        await expect(page.getByRole('main')).toContainText(/failed to load|не удалось загрузить|not found|не найден/i)
        await expect(page.getByRole('button', { name: /retry|повторить/i })).toBeVisible()
    })

    test('renders the public booking surface for every communication mode', async ({ page }) => {
        const modes = [
            { providerId: 'api-proservice-moscow', heading: /your booking|ваша запись/i },
            { providerId: 'api-autolux-moscow', heading: /request first, confirm next|сначала заявка, затем подтверждение/i },
            { providerId: 'api-formula-moscow', heading: /book by phone|запись по телефону/i },
        ] as const

        for (const { providerId, heading } of modes) {
            await page.goto(`/services/${providerId}`)
            await expect(page.getByRole('main')).toBeVisible()
            await expect(page.getByRole('heading', { name: heading })).toBeVisible()
        }

        await expect(page.getByRole('link', { name: /call the service|позвонить в сервис/i }).first()).toHaveAttribute('href', /^tel:/)
    })

    test('keeps cached discovery cards visible when a refresh becomes stale', async ({ page }) => {
        await useStaleAfterDiscoveryCacheFill(page)

        await page.goto('/services?service=oil-change')
        const firstCard = page.locator('#search-results article').first()
        await expect(firstCard).toBeVisible()

        await page.getByRole('combobox').last().selectOption('price_asc')
        await page.getByRole('button', { name: /start search|начать поиск/i }).click()

        await expect(firstCard).toBeVisible()
        const staleState = page.locator('[data-state="stale-error"]')
        await expect(staleState).toBeVisible()
        await expect(staleState).toContainText(/failed to load|не удалось загрузить/i)
    })

    for (const failure of ['offline', 'timeout'] as const) {
        test(`allows a ${failure} request submission to be retried without losing the idempotency key`, async ({ page }) => {
            test.setTimeout(60_000)
            await signInAsClient(page)
            await failNextRequestSubmission(page, failure)
            await page.goto('/services/api-proservice-moscow/request?service=oil-change')

            const form = page.locator('main form').first()
            const confirmation = form.locator('input[type="checkbox"]')
            await expect(confirmation).toBeVisible()
            await confirmation.check()

            const submit = form.getByRole('button', { name: /send appointment request|отправить запрос/i })
            await expect(submit).toBeEnabled()
            await submit.click()

            await expect(form.getByRole('alert')).toContainText(/could not send|не удалось отправить/i)
            await expect(form.getByRole('button', { name: /retry|повторить/i })).toBeEnabled()
            await form.getByRole('button', { name: /retry|повторить/i }).click()

            await expect(page.getByText(/request sent|запрос отправлен/i).first()).toBeVisible()
        })
    }

    test('renders bonus history, garage controls, and an attachment viewer for a client', async ({ page }) => {
        await signInAsClient(page)

        await page.goto('/profile/vehicles')
        await expect(page.locator('main select')).toHaveCount(5)
        await expect(page.locator('main img')).toHaveCount(1)

        await page.goto('/profile/bookings')
        await expect(page.getByText(/бонусы сервиса|service bonuses/i)).toBeVisible()
        await page.getByRole('button', { name: /замена масла|oil change/i }).first().click()

        const upload = page.getByTestId('service-request-attachment-input')
        await expect(upload).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
        await upload.setInputFiles({ name: 'inspection.png', mimeType: 'image/png', buffer: tinyPng })
        await expect(page.getByTestId('service-request-attachment')).toBeVisible()
        await page.getByTestId('service-request-attachment').last().click()
        await expect(page.getByRole('dialog')).toBeVisible()
    })

    test('redeems client bonus points against a confirmed booking without duplicating the ledger entry', async ({ page }) => {
        await signInAsClient(page)
        await page.goto('/profile/bookings')

        const bonus = page.locator('details').filter({ hasText: /бонусы сервиса|service bonuses/i }).first()
        await expect(bonus).toBeVisible()
        const points = bonus.locator('input[type="number"]')
        await points.fill('100')
        const redeem = bonus.getByRole('button', { name: /списать|redeem/i })
        await expect(redeem).toBeEnabled()
        await redeem.click()
        await expect(bonus).toContainText(/Списание|Redeemed/)

        const beforeRetry = await bonus.locator('li').filter({ hasText: /Списание|Redeemed/ }).count()
        await redeem.click()
        await expect.poll(() => bonus.locator('li').filter({ hasText: /Списание|Redeemed/ }).count()).toBe(beforeRetry)
    })

    test('shows refund and expiry balances with filterable bonus history', async ({ page }) => {
        await signInAsClient(page)
        await page.goto('/profile/bookings')

        const bonus = page.locator('details').filter({ hasText: /бонусы сервиса|service bonuses/i }).first()
        await expect(bonus).toBeVisible()
        await expect(bonus).toContainText(/Возвращено: 120|Refunded: 120/i)
        await expect(bonus).toContainText(/Истекло: 80|Expired: 80/i)

        const historyFilter = bonus.getByRole('combobox', { name: /фильтр операций|transaction filter/i })
        await historyFilter.selectOption('refund')
        await expect(bonus.locator('li').filter({ hasText: /Возврат|Refund/i }).first()).toBeVisible()
        await historyFilter.selectOption('expire')
        await expect(bonus.locator('li').filter({ hasText: /Истечение срока|Expired/i }).first()).toBeVisible()
    })

    test('accepts a pending quote once and preserves the booking snapshot on repeat', async ({ page }) => {
        await signInAsClient(page)
        await page.goto('/profile/bookings')

        await page.getByRole('button', { name: /Диагностика тормозной системы/ }).first().click()
        const accept = page.getByRole('button', { name: /Принять смету|Accept estimate/i })
        await expect(accept).toBeVisible()
        await accept.click()
        await expect(page.getByText(/Запись подтверждена|Booking confirmed/i).first()).toBeVisible()
        await expect(page.getByRole('button', { name: /Принять смету|Accept estimate/i })).toHaveCount(0)
    })

    test('shows an expired quote without an acceptance action', async ({ page }) => {
        await signInAsClient(page)
        await page.goto('/profile/bookings')

        await page.getByRole('button', { name: /Тормозная диагностика — смета истекла|Brake diagnostics — estimate expired/i }).click()
        await expect(page.getByText(/Срок действия сметы истёк|This estimate has expired/i)).toBeVisible()
        await expect(page.getByRole('button', { name: /Принять смету|Accept estimate/i })).toHaveCount(0)
    })

    for (const scenario of ['error', 'stale', 'offline', 'permission-denied', 'suspended'] as const) {
        test(`uses a recoverable ${scenario} state without breaking the client shell`, async ({ page }) => {
            await signInAsClient(page)
            await useMockScenario(page, scenario, '/v1/service-requests/my')
            await page.goto('/profile/bookings')
            await expect(page.getByRole('alert')).toBeVisible()
            await expect(page.getByRole('main')).toBeVisible()
        })
    }

    test('keeps public service and client booking routes within a mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto('/services/api-proservice-moscow')
        await expect(page.getByTestId('provider-gallery')).toBeVisible()
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)

        await signInAsClient(page)
        await page.goto('/profile/bookings')
        await expect(page.getByRole('main')).toBeVisible()
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    })
})
