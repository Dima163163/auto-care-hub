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
        const cache = await caches.open('autocare-hub-public-discovery')
        return (await cache.keys()).map((request) => request.url)
    })
}

test.describe('production PWA contracts', () => {
    test('serves cached public AutoCare discovery data while offline', async ({ page }) => {
        const publicAutoCarePaths = [
            '/api/v1/markets',
            '/api/v1/markets/market-moscow/zones?limit=4',
            '/api/v1/service-definitions',
            '/api/v1/discovery/providers?serviceId=brakes&marketId=moscow',
            '/api/v1/platform-reviews?limit=6',
        ]

        await page.goto('/')
        await waitForServiceWorkerControl(page)

        const populated = await page.evaluate(async (paths) => {
            const responses = await Promise.all(paths.map((path) => fetch(path)))
            return responses.every((response) => response.ok)
        }, publicAutoCarePaths)
        expect(populated).toBe(true)

        await expect.poll(
            async () => {
                const urls = await getPublicCacheUrls(page)
                return publicAutoCarePaths.every((path) => urls.some((url) => url.includes(path)))
            },
            { timeout: 10_000 },
        ).toBe(true)

        const authorizedStatus = await page.evaluate(async () => {
            const response = await fetch('/api/v1/discovery/providers?private-cache-probe=1', {
                headers: { Authorization: 'Bearer private-probe' },
            })
            return response.status
        })
        expect(authorizedStatus).toBe(200)
        await expect.poll(() => getPublicCacheUrls(page), { timeout: 2_000 }).not.toContainEqual(
            expect.stringContaining('private-cache-probe=1'),
        )

        await page.context().setOffline(true)
        try {
            const cachedStatuses = await page.evaluate(async (paths) => Promise.all(
                paths.map(async (path) => (await fetch(path)).status),
            ), publicAutoCarePaths)
            expect(cachedStatuses).toEqual(publicAutoCarePaths.map(() => 200))
        } finally {
            await page.context().setOffline(false)
        }
    })

    test('serves cached AutoCare search results during an offline reload and recovers online', async ({ page }) => {
        const discoveryPath = '/api/v1/discovery/providers?serviceId=brakes&marketId=moscow'

        await page.goto('/services?service=brakes')
        await waitForServiceWorkerControl(page)
        await page.evaluate(async (path) => { await fetch(path) }, discoveryPath)
        await expect(page.getByRole('heading', { name: /compare automotive services/i })).toBeVisible()

        await expect.poll(
            async () => {
                const urls = await getPublicCacheUrls(page)
                return urls.some((url) => url.includes(discoveryPath))
            },
            { timeout: 10_000 },
        ).toBe(true)

        await page.context().setOffline(true)
        try {
            await page.goto('/services?service=brakes')
            await expect(page.getByRole('heading', { name: /compare automotive services/i })).toBeVisible()
            await expect(page.getByRole('alert')).toContainText(/you are offline/i)
        } finally {
            await page.context().setOffline(false)
        }

        await page.goto('/services?service=brakes')
        await expect(page.getByRole('heading', { name: /compare automotive services/i })).toBeVisible()
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

            const publicCache = await caches.open('autocare-hub-public-discovery')
            await publicCache.put('/api/v1/discovery/providers', new Response('{"items":[]}'))
        })

        await page.getByRole('button', { name: /logout/i }).last().click()
        await expect(page).toHaveURL(/\/$/)
        await expect.poll(() => page.evaluate(() => caches.keys())).toContain(
            'autocare-hub-public-discovery',
        )
        await expect.poll(() => page.evaluate(() => caches.keys())).not.toContain(
            'autocare-hub-private-preview-client',
        )
    })

    test('never treats an offline mutation as a cached success', async ({ page }) => {
        await page.goto('/')
        await waitForServiceWorkerControl(page)

        await page.context().setOffline(true)
        try {
            const mutationResult = await page.evaluate(async () => {
                try {
                    const response = await fetch('/api/v1/service-requests', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ providerId: 'provider-preview' }),
                    })

                    return { kind: 'response', ok: response.ok, status: response.status }
                } catch {
                    return { kind: 'network-error', ok: false }
                }
            })

            expect(mutationResult).toEqual({ kind: 'network-error', ok: false })
            expect(await getPublicCacheUrls(page)).not.toContainEqual(
                expect.stringContaining('/api/v1/service-requests'),
            )
        } finally {
            await page.context().setOffline(false)
        }
    })

    test('keeps authorized provider details out of the anonymous cache', async ({ page }) => {
        const providerPath = '/api/v1/providers/provider-preview'

        await page.goto('/')
        await waitForServiceWorkerControl(page)

        await page.evaluate(async () => {
            await caches.delete('autocare-hub-public-discovery')
        })

        const authorizedStatus = await page.evaluate(async (path) => {
            const response = await fetch(path, {
                headers: { Authorization: 'Bearer private-probe' },
            })
            return response.status
        }, providerPath)

        expect(authorizedStatus).toBe(200)
        await expect.poll(() => getPublicCacheUrls(page), { timeout: 2_000 }).not.toContainEqual(
            expect.stringContaining(providerPath),
        )

        const publicStatus = await page.evaluate(async (path) => {
            const response = await fetch(path)
            return response.status
        }, providerPath)

        expect(publicStatus).toBe(200)
        await expect.poll(() => getPublicCacheUrls(page), { timeout: 5_000 }).toContainEqual(
            expect.stringContaining(providerPath),
        )
    })

    test('serves a cached public provider detail while offline', async ({ page }) => {
        const detailPath = '/api/v1/providers/provider-preview'

        await page.goto('/')
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
                    title: (await response.json()).name,
                }
            }, detailPath)

            expect(cachedDetail).toEqual({
                status: 200,
                title: 'Preview AutoCare',
            })
        } finally {
            await page.context().setOffline(false)
        }
    })

})
