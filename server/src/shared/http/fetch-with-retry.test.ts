import { describe, expect, it, vi } from 'vitest'

import { fetchWithRetry } from './fetch-with-retry.js'

describe('fetchWithRetry', () => {
    it('retries transient responses and returns the successful response', async () => {
        const fetchMock = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(new Response(null, { status: 503 }))
            .mockResolvedValueOnce(new Response('ok', { status: 200 }))

        const response = await fetchWithRetry('https://provider.example.test/profile', {}, {
            timeoutMs: 100,
            maxRetries: 1,
            retryDelayMs: 0,
        })

        expect(response.status).toBe(200)
        expect(fetchMock).toHaveBeenCalledTimes(2)
        fetchMock.mockRestore()
    })

    it('does not retry non-transient provider errors', async () => {
        const fetchMock = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(new Response(null, { status: 401 }))

        const response = await fetchWithRetry('https://provider.example.test/token', {}, {
            timeoutMs: 100,
            maxRetries: 2,
            retryDelayMs: 0,
        })

        expect(response.status).toBe(401)
        expect(fetchMock).toHaveBeenCalledTimes(1)
        fetchMock.mockRestore()
    })
})
