import { afterEach, describe, expect, it, vi } from 'vitest'

import { clearRetiredPublicPwaCaches } from './retired-public-cache'

describe('retired public PWA cache cleanup', () => {
    afterEach(() => {
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    it('removes only the retired public cache', async () => {
        const deleteCache = vi.fn().mockResolvedValue(true)
        vi.stubGlobal('caches', {
            keys: vi.fn().mockResolvedValue([
                'autocare-hub-public-providers',
                'autocare-hub-public-discovery',
                'autocare-hub-private-client-1',
            ]),
            delete: deleteCache,
        })

        await clearRetiredPublicPwaCaches()

        expect(deleteCache).toHaveBeenCalledOnce()
        expect(deleteCache).toHaveBeenCalledWith('autocare-hub-public-providers')
    })

    it('does not prevent app startup when the Cache API fails', async () => {
        vi.stubGlobal('caches', {
            keys: vi.fn().mockRejectedValue(new Error('cache unavailable')),
            delete: vi.fn(),
        })
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

        await expect(clearRetiredPublicPwaCaches()).resolves.toBeUndefined()

        expect(warning).toHaveBeenCalledOnce()
    })
})
