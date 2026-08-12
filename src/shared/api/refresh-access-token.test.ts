import { describe, expect, it } from 'vitest'

import { refreshAccessTokenSingleFlight } from './refresh-access-token'

describe('refreshAccessTokenSingleFlight', () => {
    it('shares one refresh request across concurrent callers', async () => {
        let resolveRequest: ((token: string | null) => void) | undefined
        let requestCount = 0
        const request = () => {
            requestCount += 1

            return new Promise<string | null>((resolve) => {
                resolveRequest = resolve
            })
        }

        const requests = Array.from({ length: 10 }, () =>
            refreshAccessTokenSingleFlight(request),
        )

        expect(requestCount).toBe(1)
        resolveRequest?.('access-token')

        await expect(Promise.all(requests)).resolves.toEqual(
            Array.from({ length: 10 }, () => 'access-token'),
        )
    })

    it('allows a new refresh after the previous request settles', async () => {
        const request = async () => 'next-access-token'

        await expect(refreshAccessTokenSingleFlight(request)).resolves.toBe(
            'next-access-token',
        )
        await expect(refreshAccessTokenSingleFlight(request)).resolves.toBe(
            'next-access-token',
        )
    })
})
