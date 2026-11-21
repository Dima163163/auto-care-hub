import { describe, expect, it } from 'vitest'

import { refreshAccessTokenSingleFlight } from './refresh-access-token'
import type { RefreshOutcome } from './refresh-access-token'

describe('refreshAccessTokenSingleFlight', () => {
    it('shares one refresh request across concurrent callers', async () => {
        let resolveRequest: ((outcome: RefreshOutcome) => void) | undefined
        let requestCount = 0
        const request = () => {
            requestCount += 1

            return new Promise<RefreshOutcome>((resolve) => {
                resolveRequest = resolve
            })
        }

        const requests = Array.from({ length: 10 }, () =>
            refreshAccessTokenSingleFlight(1, request),
        )

        expect(requestCount).toBe(1)
        const outcome = { status: 'refreshed', accessToken: 'access-token' } as const
        resolveRequest?.(outcome)

        await expect(Promise.all(requests)).resolves.toEqual(
            Array.from({ length: 10 }, () => outcome),
        )
    })

    it('allows a new refresh after the previous request settles', async () => {
        const outcome = { status: 'refreshed', accessToken: 'next-access-token' } as const
        const request = async () => outcome

        await expect(refreshAccessTokenSingleFlight(1, request)).resolves.toBe(outcome)
        await expect(refreshAccessTokenSingleFlight(1, request)).resolves.toBe(outcome)
    })

    it('does not reuse an in-flight refresh after the session changes', async () => {
        let resolveFirst: ((outcome: RefreshOutcome) => void) | undefined
        const old = refreshAccessTokenSingleFlight(1, () => new Promise((resolve) => { resolveFirst = resolve }))
        const newOutcome = { status: 'refreshed', accessToken: 'new-session' } as const
        await expect(refreshAccessTokenSingleFlight(2, async () => newOutcome)).resolves.toBe(newOutcome)
        resolveFirst?.({ status: 'rejected' })
        await expect(old).resolves.toEqual({ status: 'rejected' })
    })
})
