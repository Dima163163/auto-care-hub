import { expect, test, type Page } from '@playwright/test'

async function waitForServiceWorkerControl(page: Page) {
    await expect.poll(
        () => page.evaluate(async () => {
            const registration = await navigator.serviceWorker.getRegistration()
            return registration?.active?.state ?? null
        }),
        { timeout: 20_000 },
    ).toBe('activated')

    if (await page.evaluate(() => navigator.serviceWorker.controller === null)) {
        await page.reload()
    }

    await expect.poll(
        () => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null),
        { timeout: 20_000 },
    ).toContain('/sw.js')
}

async function getPublicCacheUrls(page: Page) {
    return page.evaluate(async () => {
        const cache = await caches.open('autocare-hub-public-providers')
        return (await cache.keys()).map((request) => request.url)
    })
}

async function loginAsPreviewOwner(page: Page) {
    await page.goto('/login')
    await page.locator('#email').fill('preview-owner@example.com')
    await page.locator('#password').fill('preview-password')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/owner\/dashboard/)
}

test.describe('production PWA contracts', () => {
    test('serves the cached public catalog during an offline reload and recovers online', async ({ page }) => {
        await page.goto('/cabinets')
        await waitForServiceWorkerControl(page)
        await page.goto('/cabinets')
        await expect(page.getByRole('heading', { name: /available cabinets/i })).toBeVisible()

        await expect.poll(
            async () => {
                const urls = await getPublicCacheUrls(page)
                return urls.some((url) => url.includes('/api/cabinets'))
            },
            { timeout: 10_000 },
        ).toBe(true)

        const privateProbeStatus = await page.evaluate(async () => {
            const response = await fetch('/api/cabinets?private-cache-probe=1', {
                headers: { Authorization: 'Bearer private-probe' },
            })
            return response.status
        })
        expect(privateProbeStatus).toBe(200)
        await expect.poll(
            () => getPublicCacheUrls(page),
            { timeout: 2_000 },
        ).not.toContainEqual(expect.stringContaining('private-cache-probe=1'))

        await page.context().setOffline(true)
        try {
            await page.goto('/cabinets')
            await expect(page.getByRole('heading', { name: /available cabinets/i })).toBeVisible()
            await expect(page.getByRole('link', { name: /view details/i }).first()).toBeVisible()
            await expect(page.getByRole('alert')).toContainText(/you are offline/i)
        } finally {
            await page.context().setOffline(false)
        }

        await page.goto('/cabinets')
        await expect(page.getByRole('heading', { name: /available cabinets/i })).toBeVisible()
    })

    test('clears identity cache on real-mode logout while retaining public catalog cache', async ({ page }) => {
        await page.goto('/login')
        await page.locator('#email').fill('preview-client@example.com')
        await page.locator('#password').fill('preview-password')
        await page.getByRole('button', { name: /sign in/i }).click()
        await expect(page).toHaveURL(/\/profile$/)

        await page.evaluate(async () => {
            const privateCache = await caches.open('autocare-hub-private-preview-client')
            await privateCache.put('/api/profile/private', new Response('private'))

            const publicCache = await caches.open('autocare-hub-public-providers')
            await publicCache.put('/api/cabinets', new Response('{"items":[]}'))
        })

        await page.getByRole('button', { name: /logout/i }).last().click()
        await expect(page).toHaveURL(/\/$/)
        await expect.poll(() => page.evaluate(() => caches.keys())).toContain(
            'autocare-hub-public-providers',
        )
        await expect.poll(() => page.evaluate(() => caches.keys())).not.toContain(
            'autocare-hub-private-preview-client',
        )

        await page.goto('/login')
        await page.locator('#email').fill('preview-owner@example.com')
        await page.locator('#password').fill('preview-password')
        await page.getByRole('button', { name: /sign in/i }).click()
        await expect(page).toHaveURL(/\/owner\/dashboard/)
        await expect.poll(() => page.evaluate(() => caches.keys())).toContain(
            'autocare-hub-public-providers',
        )
        await expect.poll(() => page.evaluate(() => caches.keys())).not.toContain(
            'autocare-hub-private-preview-client',
        )
    })

    test('never treats an offline mutation as a cached success', async ({ page }) => {
        await page.goto('/cabinets')
        await waitForServiceWorkerControl(page)
        await page.goto('/cabinets')
        await expect(page.getByRole('heading', { name: /available cabinets/i })).toBeVisible()

        await page.context().setOffline(true)
        try {
            const mutationResult = await page.evaluate(async () => {
                try {
                    const response = await fetch('/api/bookings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cabinetId: 'offline-preview' }),
                    })

                    return { kind: 'response', ok: response.ok, status: response.status }
                } catch {
                    return { kind: 'network-error', ok: false }
                }
            })

            expect(mutationResult).toEqual({ kind: 'network-error', ok: false })
            expect(await getPublicCacheUrls(page)).not.toContainEqual(
                expect.stringContaining('/api/bookings'),
            )
        } finally {
            await page.context().setOffline(false)
        }
    })

    test('keeps authorized cabinet details out of the anonymous cache', async ({ page }) => {
        await page.goto('/cabinets')
        await waitForServiceWorkerControl(page)

        await page.evaluate(async () => {
            await caches.delete('autocare-hub-public-providers')
        })

        const authorizedStatus = await page.evaluate(async () => {
            const response = await fetch('/api/cabinets/cabinet-private-probe', {
                headers: { Authorization: 'Bearer private-probe' },
            })
            return response.status
        })

        expect(authorizedStatus).toBe(200)
        await expect.poll(() => getPublicCacheUrls(page), { timeout: 2_000 }).not.toContainEqual(
            expect.stringContaining('/api/cabinets/cabinet-private-probe'),
        )

        const publicStatus = await page.evaluate(async () => {
            const response = await fetch('/api/cabinets/cabinet-public-probe')
            return response.status
        })

        expect(publicStatus).toBe(200)
        await expect.poll(() => getPublicCacheUrls(page), { timeout: 5_000 }).toContainEqual(
            expect.stringContaining('/api/cabinets/cabinet-public-probe'),
        )
    })

    test('serves a cached public cabinet detail while offline', async ({ page }) => {
        const detailPath = '/api/cabinets/cabinet-offline-detail'

        await page.goto('/cabinets')
        await waitForServiceWorkerControl(page)
        await page.evaluate(async (path) => {
            await fetch(path)
        }, detailPath)

        await expect.poll(() => getPublicCacheUrls(page), { timeout: 5_000 }).toContainEqual(
            expect.stringContaining(detailPath),
        )

        await page.context().setOffline(true)
        try {
            const cachedDetail = await page.evaluate(async (path) => {
                const response = await fetch(path)
                return {
                    status: response.status,
                    title: (await response.json()).title,
                }
            }, detailPath)

            expect(cachedDetail).toEqual({
                status: 200,
                title: 'Preview demo cabinet',
            })
        } finally {
            await page.context().setOffline(false)
        }
    })

    test('keeps an interrupted owner mutation recoverable with an account-scoped draft', async ({ page }) => {
        await loginAsPreviewOwner(page)

        await page.getByRole('link', { name: /create cabinet|add space/i }).first().click()
        await expect(page).toHaveURL(/\/owner\/cabinets\/create$/)
        await page.locator('#title').fill('Preview recovery cabinet')
        await page.locator('#description').fill('A draft that must survive a failed preview mutation.')
        await page.locator('#city').fill('Berlin')
        await page.locator('#pricePerHour').fill('1800')
        await page.locator('#address').fill('Preview Street 9')
        await page.getByRole('button', { name: /create cabinet/i }).click()

        await expect(page.getByText(/preview cabinet mutation unavailable/i)).toBeVisible()
        await expect.poll(
            () => page.evaluate(() => localStorage.getItem('autocare-hub:owner-cabinet-create:v2:preview-owner')),
            { timeout: 2_000 },
        ).toContain('Preview recovery cabinet')
    })

    test('blocks a service-worker update while the owner form is dirty', async ({ page }) => {
        await page.goto('/cabinets')
        await waitForServiceWorkerControl(page)
        await loginAsPreviewOwner(page)

        await page.getByRole('link', { name: /create cabinet|add space/i }).first().click()
        await expect(page).toHaveURL(/\/owner\/cabinets\/create$/)
        await page.locator('#title').fill('Dirty update preview')

        await page.request.post('/__pwa-preview/upgrade')
        await page.evaluate(async () => {
            const registration = await navigator.serviceWorker.getRegistration()
            await registration?.update()
        })

        await expect.poll(
            () => page.evaluate(async () => {
                const registration = await navigator.serviceWorker.getRegistration()
                return Boolean(registration?.waiting)
            }),
            { timeout: 10_000 },
        ).toBe(true)
        await expect(page.getByRole('alert')).toContainText(/new version available/i)

        await page.getByRole('button', { name: /^update$/i }).click()
        await expect(page.getByRole('status')).toContainText(/finish or save active work/i)
    })
})
