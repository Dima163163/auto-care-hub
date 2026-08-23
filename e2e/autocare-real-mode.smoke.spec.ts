import { expect, test } from '@playwright/test'

const apiBaseUrl = process.env.REAL_API_BASE_URL ?? 'http://127.0.0.1:4000'

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
})
