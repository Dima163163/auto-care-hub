import { afterEach, describe, expect, it, vi } from 'vitest'

import { clearIdentityScopedPwaCaches } from './identity-cache'

describe('identity-scoped PWA cache cleanup', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('removes only private identity cache names', async () => {
        const deleteCache = vi.fn().mockResolvedValue(true)
        const cachesApi = {
            keys: vi.fn().mockResolvedValue([
                'autocare-hub-public-discovery',
                'autocare-hub-private-client-1',
                'autocare-hub-private-owner-2',
            ]),
            delete: deleteCache,
        }
        vi.stubGlobal('caches', cachesApi)

        await clearIdentityScopedPwaCaches()

        expect(deleteCache).toHaveBeenCalledTimes(2)
        expect(deleteCache).toHaveBeenCalledWith('autocare-hub-private-client-1')
        expect(deleteCache).toHaveBeenCalledWith('autocare-hub-private-owner-2')
        expect(deleteCache).not.toHaveBeenCalledWith('autocare-hub-public-discovery')
    })

    it('swallows cache API failures so auth cleanup can continue', async () => {
        vi.stubGlobal('caches', {
            keys: vi.fn().mockRejectedValue(new Error('cache unavailable')),
            delete: vi.fn(),
        })

        await expect(clearIdentityScopedPwaCaches()).resolves.toBeUndefined()
    })
})
