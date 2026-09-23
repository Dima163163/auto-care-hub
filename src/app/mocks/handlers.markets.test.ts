import { afterAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'

import { handlers } from './handlers'
import { clearMockSession, setMockSession } from './session'

const server = setupServer(...handlers)
server.listen({ onUnhandledRequest: 'error' })
afterAll(() => server.close())

async function requestJson<T>(path: string, init?: RequestInit) {
    const response = await fetch(`http://localhost:3000${path}`, init)
    if (!response.ok) throw new Error(`Request failed: ${response.status} ${path}`)
    return response.json() as Promise<T>
}

describe('mock public and super-admin market contracts', () => {
    it('excludes markets withdrawn from launch publicly while retaining them in super-admin hierarchy', async () => {
        setMockSession({ currentUserId: 'user-admin-1', currentRole: 'super_admin' })

        const launchedMarkets = await requestJson<Array<{
            id: string
            cityCode: string
            launchReady: boolean
            defaultLocale: string
            supportedLocales: string[]
            timezone: string
            currencyCode: string
        }>>('/api/v1/markets')
        const market = launchedMarkets[0]
        if (!market) throw new Error('Expected at least one launch-ready mock market')

        const profile = {
            defaultLocale: market.defaultLocale,
            supportedLocales: market.supportedLocales,
            timezone: market.timezone,
            currencyCode: market.currencyCode,
            launchReady: false,
        }
        try {
            await requestJson(`/api/super-admin/markets/${market.id}`, {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(profile),
            })

            const publicMarkets = await requestJson<Array<{ id: string; launchReady: boolean }>>('/api/v1/markets')
            expect(publicMarkets.some((item) => item.id === market.id)).toBe(false)
            expect(publicMarkets.every((item) => item.launchReady)).toBe(true)

            const hierarchy = await requestJson<Array<{ cities: Array<{ id: string; launchReady: boolean }> }>>('/api/super-admin/market-hierarchy')
            expect(hierarchy.flatMap((country) => country.cities)).toContainEqual(expect.objectContaining({ id: market.id, launchReady: false }))
        } finally {
            await requestJson(`/api/super-admin/markets/${market.id}`, {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ ...profile, launchReady: true }),
            })
            clearMockSession()
        }
    })
})
