import { configureStore } from '@reduxjs/toolkit'
import { afterEach, describe, expect, it, vi } from 'vitest'

const prompt = vi.hoisted(() => vi.fn())

vi.mock('@/shared/config/api', () => ({ API_BASE_URL: '/api', IS_REAL_API: true, IS_MOCK_API: false }))
vi.mock('@/shared/lib/auth-token', () => ({
    getAccessToken: () => 'access-token',
    getAuthGeneration: () => 1,
    hasAuthSessionHint: () => true,
    setAccessToken: vi.fn(),
    clearAccessToken: vi.fn(),
}))
vi.mock('@/shared/lib/csrf-token', () => ({
    getCsrfToken: () => 'csrf-token',
    setCsrfToken: vi.fn(),
    clearCsrfToken: vi.fn(),
}))
vi.mock('@/shared/lib/privileged-step-up', () => ({ requestPrivilegedStepUpCode: prompt }))

import { baseApi } from './baseApi'
import { readCsvOrApiError } from '@/features/admin/lib/csv-response'

const testApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        sensitiveStepUpTest: build.mutation<{ success: boolean }, void>({
            query: () => ({ url: '/admin/sensitive-test', method: 'PATCH' }),
        }),
        sensitiveCsvStepUpTest: build.query<Blob, void>({
            query: () => ({ url: '/admin/export-test', responseHandler: readCsvOrApiError }),
        }),
    }),
})

afterEach(() => {
    vi.unstubAllGlobals()
    prompt.mockReset()
})

describe('privileged step-up transport', () => {
    it('prompts once, verifies a new code, then retries the original mutation once', async () => {
        prompt.mockResolvedValue('123456')
        const paths: string[] = []
        const NativeRequest = globalThis.Request
        vi.stubGlobal('Request', class extends NativeRequest {
            constructor(input: RequestInfo | URL, init?: RequestInit) {
                super(typeof input === 'string' && input.startsWith('/') ? `http://localhost${input}` : input, init)
            }
        })
        vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
            const request = input as Request
            const pathname = new URL(request.url).pathname
            paths.push(pathname)
            if (pathname === '/api/auth/step-up') {
                expect(await request.json()).toEqual({ mfaCode: '123456' })
                return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
            }
            if (paths.filter((path) => path === '/api/admin/sensitive-test').length === 1) {
                return new Response(JSON.stringify({ code: 'MFA_STEP_UP_REQUIRED' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
            }
            return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        }))
        const store = configureStore({
            reducer: { [baseApi.reducerPath]: baseApi.reducer },
            middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
        })

        await expect(store.dispatch(testApi.endpoints.sensitiveStepUpTest.initiate()).unwrap())
            .resolves.toEqual({ success: true })
        expect(paths).toEqual(['/api/admin/sensitive-test', '/api/auth/step-up', '/api/admin/sensitive-test'])
        expect(prompt).toHaveBeenCalledOnce()
    })

    it('also retries a CSV export after its JSON step-up denial', async () => {
        prompt.mockResolvedValue('654321')
        const paths: string[] = []
        const NativeRequest = globalThis.Request
        vi.stubGlobal('Request', class extends NativeRequest {
            constructor(input: RequestInfo | URL, init?: RequestInit) {
                super(typeof input === 'string' && input.startsWith('/') ? `http://localhost${input}` : input, init)
            }
        })
        vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
            const path = new URL((input as Request).url).pathname
            paths.push(path)
            if (path === '/api/auth/step-up') return new Response(JSON.stringify({ success: true }), { status: 200 })
            if (paths.filter((value) => value === '/api/admin/export-test').length === 1) {
                return new Response(JSON.stringify({ code: 'MFA_STEP_UP_REQUIRED' }), { status: 403 })
            }
            return new Response('id,action\n1,test', { status: 200, headers: { 'Content-Type': 'text/csv' } })
        }))
        const store = configureStore({
            reducer: { [baseApi.reducerPath]: baseApi.reducer },
            middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
        })

        const csv = await store.dispatch(testApi.endpoints.sensitiveCsvStepUpTest.initiate()).unwrap()
        expect(csv).toBeInstanceOf(Blob)
        expect(await csv.text()).toContain('id,action')
        expect(paths).toEqual(['/api/admin/export-test', '/api/auth/step-up', '/api/admin/export-test'])
    })
})
