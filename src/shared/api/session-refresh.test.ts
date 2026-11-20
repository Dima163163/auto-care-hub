import { configureStore } from '@reduxjs/toolkit'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { clearAccessToken, getAccessToken, startAuthSession } from '@/shared/lib/auth-token'
import { clearSessionExpired, hasSessionExpired } from '@/shared/lib/auth-session-state'
import { baseApi } from './baseApi'

vi.mock('@/shared/config/api', () => ({
    API_BASE_URL: 'http://localhost/api',
    IS_REAL_API: true,
    IS_MOCK_API: false,
}))
vi.mock('@/shared/lib/csrf-token', () => ({
    getCsrfToken: () => 'fixture-csrf',
    setCsrfToken: vi.fn(),
    clearCsrfToken: vi.fn(),
}))

const testApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        sessionRefreshTest: build.query<{ ok: boolean }, void>({
            query: () => '/refresh-test',
        }),
    }),
})

function makeRequest() {
    const store = configureStore({
        reducer: { [baseApi.reducerPath]: baseApi.reducer },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
    })
    return () => store.dispatch(testApi.endpoints.sessionRefreshTest.initiate(undefined, {
        subscribe: false, forceRefetch: true,
    })).unwrap()
}

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })
}

afterEach(() => {
    vi.unstubAllGlobals()
    clearAccessToken()
    clearSessionExpired()
})

describe('session refresh transport', () => {
    it.each([429, 503])('keeps the session after a temporary refresh failure (%s) and can retry', async (status) => {
        startAuthSession('stale-fixture-token')
        let attempts = 0
        vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
            if (request.url.endsWith('/auth/refresh')) {
                attempts += 1
                return attempts === 1 ? json({ code: 'TEMPORARY' }, status) : json({ accessToken: 'new-fixture-token' })
            }
            return request.headers.get('authorization') === 'Bearer new-fixture-token'
                ? json({ ok: true }) : json({ code: 'UNAUTHORIZED' }, 401)
        }))

        const request = makeRequest()
        await expect(request()).rejects.toMatchObject({ status })
        expect(getAccessToken()).toBe('stale-fixture-token')
        expect(hasSessionExpired()).toBe(false)
        await expect(request()).resolves.toEqual({ ok: true })
        expect(attempts).toBe(2)
    })

    it('clears the local session when refresh is rejected with a 401', async () => {
        startAuthSession('stale-fixture-token')
        vi.stubGlobal('fetch', vi.fn(async () => json({ code: 'UNAUTHORIZED' }, 401)))
        await makeRequest()().catch(() => undefined)
        expect(getAccessToken()).toBeNull()
        expect(hasSessionExpired()).toBe(true)
    })
})
